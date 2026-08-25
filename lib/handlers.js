// Storage-agnostic request router. Every handler receives { store, env,
// user } and speaks only to the store interface — never touches D1
// directly. Tests drive route() with a memory store, matching the
// pattern in primitive/tests/integration.mjs.

import {
  hashPassword, verifyPassword, signSession, verifySession,
  parseCookies, sessionCookieHeader, clearSessionCookieHeader,
  SESSION_COOKIE,
} from "./auth.js";
import { requireFeature, canAccess, isValidRole } from "./rbac.js";
import { waDeepLink, WA_TEMPLATES } from "./notify.js";
import { scoreDailyForCoord, scoreOverallForCoord } from "./leaderboard.js";

// Pick the right WhatsApp message text for a person, given the
// coordinator that owns them. Uses the coord's custom template when
// set, falls back to the built-in phrasing. Runs {name} interpolation.
function waTextFor(person, coord) {
  const isDaily = person.status === "daily";
  const custom = isDaily ? coord?.wa_template_daily : coord?.wa_template_nondaily;
  const template = (custom && String(custom).trim())
    ? String(custom)
    : (isDaily
        ? WA_TEMPLATES.daily_reminder(person.legal_name)
        : WA_TEMPLATES.followup(person.legal_name));
  return template.replace(/\{name\}/g, person.legal_name || "");
}
import { nowIso, todayInTz } from "./ids.js";

// Compute the 5-color bead for a person on a given day.
//
//   red    — status='daily' but no chant in past 3 days (needs attention)
//   green  — chanted today
//   orange — coord marked "responded" today (contact_state=2, last_marked_at is today)
//   yellow — coord marked "contacted" today (contact_state=1, last_marked_at is today)
//   white  — fresh, nothing marked today
//
// Red overrides everything. Green overrides yellow/orange/white. The
// bead effectively resets each new day because we require
// last_marked_at to be within today for yellow/orange to show.
function beadColorFor(person, chantedToday, chantedInLast3Days, todayIso) {
  if ((person.status === "daily") && !chantedInLast3Days) return "red";
  if (chantedToday) return "green";
  const lastMarked = person.last_marked_at ? String(person.last_marked_at).slice(0, 10) : null;
  if (lastMarked === todayIso) {
    if (person.contact_state === 2) return "orange";
    if (person.contact_state === 1) return "yellow";
  }
  return "white";
}

// Since we only need chant history within a 3-day window, this helper
// derives the ISO date exactly N days before todayIso (inclusive).
function daysAgoIso(todayIso, n) {
  const d = new Date(todayIso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

const json = (body, init = {}) => new Response(JSON.stringify(body), {
  ...init,
  headers: { "content-type": "application/json", ...(init.headers || {}) },
});
const bad = (status, message, extras = {}) =>
  json({ error: message, ...extras }, { status });

const routes = [];
function reg(method, pattern, handler, opts = {}) {
  routes.push({ method, pattern, handler, opts });
}

function matchPath(pattern, pathname) {
  const p = pattern.split("/").filter(Boolean);
  const q = pathname.split("/").filter(Boolean);
  if (p.length !== q.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) params[p[i].slice(1)] = decodeURIComponent(q[i]);
    else if (p[i] !== q[i]) return null;
  }
  return params;
}

async function currentUser(request, ctx) {
  const cookies = parseCookies(request.headers.get("cookie") || "");
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const secret = ctx.env?.SESSION_SECRET;
  if (!secret) return null;
  const payload = await verifySession(token, secret);
  if (!payload) return null;
  const user = await ctx.store.userById(payload.userId);
  if (!user || !user.active) return null;
  return { ...user, password_hash: undefined };
}

export async function route(request, ctx) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  for (const r of routes) {
    if (r.method !== method) continue;
    const params = matchPath(r.pattern, url.pathname);
    if (!params) continue;
    // eager-load user for authed routes
    let user = null;
    if (r.opts.auth || r.opts.feature) {
      user = await currentUser(request, ctx);
      if (!user) return bad(401, "unauthorized");
      if (r.opts.feature) {
        try { await requireFeature(ctx.store, user.role, r.opts.feature); }
        catch (e) { return bad(403, "forbidden", { feature: r.opts.feature }); }
      }
    }
    try {
      return await r.handler(request, { ...ctx, url, params, user });
    } catch (err) {
      if (err && err.status) return bad(err.status, err.message);
      throw err;
    }
  }
  return bad(404, "not_found");
}

// ---------------------------------------------------- health / me ---
reg("GET", "/api/health", async () => json({ ok: true }));

reg("GET", "/api/me", async (req, ctx) => {
  const user = await currentUser(req, ctx);
  if (!user) return json({ user: null });
  const gates = await ctx.store.featureGates();
  return json({ user, gates });
});

// ---------------------------------------------------------- login ---
reg("POST", "/api/login", async (req, ctx) => {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username || !password) return bad(400, "missing_credentials");
  const user = await ctx.store.userByUsername(username);
  // Return the same error whether or not the account exists (primitive §7).
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return bad(401, "invalid_credentials");
  }
  if (!user.active) return bad(401, "invalid_credentials");
  const secret = ctx.env?.SESSION_SECRET;
  if (!secret) return bad(500, "session_secret_missing");
  const token = await signSession({ userId: user.id, role: user.role }, secret);
  await ctx.store.updateUser(user.id, { last_login_at: nowIso() });
  return json({ user: { ...user, password_hash: undefined } }, {
    headers: { "set-cookie": sessionCookieHeader(token) },
  });
});

// The signed-in user updates their own WhatsApp templates. Kept
// separate from the HK-only user-editor so any coord can save their
// own copy without needing admin_feature access.
reg("POST", "/api/me/wa-templates", async (req, ctx) => {
  const body = await req.json().catch(() => ({}));
  const patch = {};
  if (typeof body.wa_template_daily === "string") patch.wa_template_daily = body.wa_template_daily;
  if (typeof body.wa_template_nondaily === "string") patch.wa_template_nondaily = body.wa_template_nondaily;
  if (!Object.keys(patch).length) return bad(400, "no_templates");
  await ctx.store.updateUser(ctx.user.id, patch);
  return json({ ok: true });
}, { auth: true });

reg("POST", "/api/logout", async () => {
  return json({ ok: true }, { headers: { "set-cookie": clearSessionCookieHeader() } });
});

// ------------------------------------------------- coordinator roll ---
// Return the roll of people assigned to the calling user, with each
// person's contact_state, today's chant mark, and a ready wa.me URL.
reg("GET", "/api/roll", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "coordinator_roll");
  const people = await ctx.store.peopleAssignedTo(ctx.user.id);
  const today = todayInTz(ctx.env?.APP_TZ);
  const threeDaysAgo = daysAgoIso(today, 2);   // inclusive of today = 3 days
  const coord = ctx.user;   // the caller IS the coordinator for this endpoint
  const rows = await Promise.all(people.map(async (p) => {
    const chant = await ctx.store.chantOnDate(p.id, today);
    const chantedToday = !!(chant && chant.chanted);
    const recentChant = chantedToday
      ? true
      : await ctx.store.hasChantedSince(p.id, threeDaysAgo);
    return {
      id: p.id,
      name: p.legal_name,
      phone: p.phone,
      status: p.status,
      contact_state: p.contact_state || 0,
      notes: p.notes || "",
      last_marked_at: p.last_marked_at,
      chanted_today: chantedToday,
      bead_color: beadColorFor(p, chantedToday, recentChant, today),
      wa_url: waDeepLink(p.phone, waTextFor(p, coord)),
    };
  }));
  const tally = {
    assigned: rows.length,
    followed_up: rows.filter(r => r.contact_state === 1).length,
    responded:   rows.filter(r => r.contact_state === 2).length,
    needs_visit: rows.filter(r => r.contact_state === 3).length,
    chanted_today: rows.filter(r => r.chanted_today).length,
  };
  return json({ roll: rows, tally, today });
}, { auth: true });

// Cycle a person's contact_state 0→1→2→3→0. Server verifies the
// caller owns this person's roll.
reg("POST", "/api/roll/mark", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "coordinator_roll");
  const body = await req.json().catch(() => ({}));
  const { person_id, contact_state } = body;
  if (!person_id) return bad(400, "person_id_required");
  const person = await ctx.store.personById(person_id);
  if (!person) return bad(404, "person_not_found");
  if (
    person.assigned_to_user_id !== ctx.user.id &&
    ctx.user.role !== "hk_leader" &&
    ctx.user.role !== "njy_leader"
  ) {
    return bad(403, "not_your_roll");
  }
  // Cycle is now 3-state (white/yellow/orange). Red and green are
  // derived server-side; tapping the bead only advances the coord's
  // contact_state.
  const next = Number.isInteger(contact_state)
    ? ((contact_state % 3) + 3) % 3
    : (((person.contact_state || 0) + 1) % 3);
  const now = nowIso();
  await ctx.store.updatePerson(person_id, {
    contact_state: next, last_marked_at: now, last_marked_by: ctx.user.id,
  }, ctx.user.id);
  return json({ person_id, contact_state: next, last_marked_at: now });
}, { auth: true });

// Log a daily chant for one person (coordinator-marked in P1).
reg("POST", "/api/roll/chant", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "coordinator_roll");
  const body = await req.json().catch(() => ({}));
  const { person_id, chanted = true, rounds, entry_date } = body;
  if (!person_id) return bad(400, "person_id_required");
  const person = await ctx.store.personById(person_id);
  if (!person) return bad(404, "person_not_found");
  if (
    person.assigned_to_user_id !== ctx.user.id &&
    ctx.user.role !== "hk_leader" &&
    ctx.user.role !== "njy_leader"
  ) {
    return bad(403, "not_your_roll");
  }
  const date = entry_date || todayInTz(ctx.env?.APP_TZ);
  const row = await ctx.store.upsertChant({
    person_id, entry_date: date,
    chanted: chanted ? 1 : 0,
    rounds: rounds ?? null,
    source: "coordinator",
    marked_by: ctx.user.id,
  });
  return json({ chant: row });
}, { auth: true });

reg("POST", "/api/roll/note", async (req, ctx) => {
  const body = await req.json().catch(() => ({}));
  const { person_id, notes } = body;
  if (!person_id) return bad(400, "person_id_required");
  const person = await ctx.store.personById(person_id);
  if (!person) return bad(404, "person_not_found");
  if (
    person.assigned_to_user_id !== ctx.user.id &&
    ctx.user.role !== "hk_leader" &&
    ctx.user.role !== "njy_leader"
  ) return bad(403, "not_your_roll");
  await ctx.store.updatePerson(person_id, { notes: String(notes || "") }, ctx.user.id);
  return json({ ok: true });
}, { auth: true });

// -------------------------------------------- HK / NJY dashboards ---
reg("GET", "/api/leader/coordinators", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "leader_dashboard");
  const coordinators = await ctx.store.listUsersByRole("njy_coordinator");
  const today = todayInTz(ctx.env?.APP_TZ);
  const rows = await Promise.all(coordinators.map(async (c) => {
    const roll = await ctx.store.peopleAssignedTo(c.id);
    const chants = await Promise.all(
      roll.slice(0, 500).map(p => ctx.store.chantOnDate(p.id, today).then(x => !!(x && x.chanted))),
    );
    // "35/40 one-month daily chanters" per Plan-2 doc — how many daily
    // chanters in this coord's roll have stuck with it for ~a month.
    const monthly = await ctx.store.oneMonthDailyCountFor(c.id, today);
    return {
      user_id: c.id, name: c.display_name,
      assigned: roll.length,
      chanted_today: chants.filter(Boolean).length,
      one_month_daily: monthly.one_month_daily,
      daily_chanter_total: monthly.daily_chanter_total,
      target: 40,   // Plan-2 target per NJY group
      last_login_at: c.last_login_at,
    };
  }));
  return json({ coordinators: rows });
}, { auth: true });

reg("GET", "/api/hk/summary", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "hk_dashboard");
  const today = todayInTz(ctx.env?.APP_TZ);
  // Fetch all four numbers in parallel; each is a single aggregate query.
  // Was doing N*M sequential lookups — this cut load time by ~10x.
  const [total, leaders, coordinators, chanted] = await Promise.all([
    ctx.store.peopleCount(),
    ctx.store.listUsersByRole("njy_leader"),
    ctx.store.listUsersByRole("njy_coordinator"),
    ctx.store.countChantsOnDate(today),
  ]);
  return json({
    total_people: total,
    njy_leaders: leaders.length,
    njy_coordinators: coordinators.length,
    chanted_today: chanted,
    today,
  });
}, { auth: true });

// Drill-down: view another user's roll. Leaders/HK may view anyone;
// a coordinator can only view their OWN roll through this path (used
// by the event "Mark by coordinator" picker when a coord marks their
// own people's attendance).
reg("GET", "/api/user/:userId/roll", async (req, ctx) => {
  const isHk = ctx.user.role === "hk_leader";
  const isLeader = ctx.user.role === "njy_leader";
  const isSelf = ctx.params.userId === ctx.user.id;
  if (!isHk && !isLeader && !isSelf) return bad(403, "forbidden");
  const target = await ctx.store.userById(ctx.params.userId);
  if (!target) return bad(404, "user_not_found");
  const people = await ctx.store.peopleAssignedTo(target.id);
  const today = todayInTz(ctx.env?.APP_TZ);
  const threeDaysAgo = daysAgoIso(today, 2);
  // Drilling in as a leader — use the OWNED coordinator's templates,
  // not the leader's. WhatsApp messages go out in the coord's voice.
  const rows = await Promise.all(people.map(async (p) => {
    const chant = await ctx.store.chantOnDate(p.id, today);
    const chantedToday = !!(chant && chant.chanted);
    const recentChant = chantedToday
      ? true
      : await ctx.store.hasChantedSince(p.id, threeDaysAgo);
    return {
      id: p.id, name: p.legal_name, phone: p.phone,
      status: p.status, contact_state: p.contact_state || 0,
      notes: p.notes || "",
      last_marked_at: p.last_marked_at,
      chanted_today: chantedToday,
      bead_color: beadColorFor(p, chantedToday, recentChant, today),
      wa_url: waDeepLink(p.phone, waTextFor(p, target)),
    };
  }));
  return json({
    target: { id: target.id, name: target.display_name, role: target.role },
    roll: rows,
    tally: {
      assigned: rows.length,
      followed_up: rows.filter(r => r.contact_state === 1).length,
      responded:   rows.filter(r => r.contact_state === 2).length,
      needs_visit: rows.filter(r => r.contact_state === 3).length,
      chanted_today: rows.filter(r => r.chanted_today).length,
    },
    today,
  });
}, { auth: true });

// ------------------------------------------------------ admin users ---
reg("GET", "/api/admin/users", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "feature_admin");
  const users = await ctx.store.listAllUsers();
  return json({ users: users.map(u => ({ ...u, password_hash: undefined })) });
}, { auth: true });

reg("POST", "/api/admin/users", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "feature_admin");
  const body = await req.json().catch(() => ({}));
  const { username, password, display_name, role, phone, email } = body;
  if (!username || !password || !display_name || !role) return bad(400, "missing_fields");
  if (!isValidRole(role)) return bad(400, "bad_role");
  const existing = await ctx.store.userByUsername(username);
  if (existing) return bad(409, "username_taken");
  const password_hash = await hashPassword(password);
  const u = await ctx.store.createUser({
    username, password_hash, display_name, role, phone, email,
  });
  return json({ user: { ...u, password_hash: undefined } });
}, { auth: true });

reg("POST", "/api/admin/assign", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "feature_admin");
  const body = await req.json().catch(() => ({}));
  const { person_ids, user_id } = body;
  if (!Array.isArray(person_ids) || !user_id) return bad(400, "bad_body");
  const target = await ctx.store.userById(user_id);
  if (!target) return bad(404, "user_not_found");
  const r = await ctx.store.assignPeopleToUser(person_ids, user_id);
  return json(r);
}, { auth: true });

// -------------------------------------------- events / attendance ---
reg("GET", "/api/events", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "event_attendance");
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") || undefined;
  const events = await ctx.store.listEvents({ kind });
  return json({ events });
}, { auth: true });

reg("POST", "/api/events", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "feature_admin");
  const body = await req.json().catch(() => ({}));
  const { kind, name, event_date, event_time, venue, capacity, batch_number } = body;
  if (!kind || !name || !event_date) return bad(400, "missing_fields");
  const ev = await ctx.store.createEvent({
    kind, name, event_date, event_time, venue, capacity, batch_number,
  });
  return json({ event: ev });
}, { auth: true });

reg("GET", "/api/events/:eventId", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "event_attendance");
  const ev = await ctx.store.eventById(ctx.params.eventId);
  if (!ev) return bad(404, "event_not_found");
  const attendance = await ctx.store.attendanceForEvent(ev.id);
  const attendedIds = attendance.filter(a => a.attended).map(a => a.person_id);
  // Per-coordinator attendance breakdown (the "20/40 per group" view
  // from Plan 2). For each NJY coordinator, count how many of their
  // assigned chanters attended this event.
  const coords = await ctx.store.listUsersByRole("njy_coordinator");
  const attendedSet = new Set(attendedIds);
  const breakdown = [];
  for (const c of coords) {
    const roll = await ctx.store.peopleAssignedTo(c.id);
    const attendedFromRoll = roll.filter(p => attendedSet.has(p.id)).length;
    if (roll.length === 0) continue;
    breakdown.push({
      user_id: c.id, name: c.display_name,
      attended: attendedFromRoll, assigned: roll.length,
      target: 40,
    });
  }
  breakdown.sort((a, b) => b.attended - a.attended);
  return json({
    event: ev,
    attended_ids: attendedIds,
    attended_count: attendedIds.length,
    breakdown,
  });
}, { auth: true });

reg("GET", "/api/people/search", async (req, ctx) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  if (q.length < 2) return json({ people: [] });
  const rows = await ctx.store.searchPeople(q, 50);
  return json({
    people: rows.map(p => ({
      id: p.id, name: p.legal_name, phone: p.phone,
      status: p.status,
    })),
  });
}, { auth: true });

reg("POST", "/api/events/:eventId", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "feature_admin");
  const body = await req.json().catch(() => ({}));
  const ev = await ctx.store.updateEvent(ctx.params.eventId, body);
  if (!ev) return bad(404, "not_found");
  return json({ event: ev });
}, { auth: true });

reg("DELETE", "/api/events/:eventId", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "feature_admin");
  const r = await ctx.store.deleteEvent(ctx.params.eventId);
  if (!r) return bad(404, "not_found");
  return json({ ok: true });
}, { auth: true });

reg("POST", "/api/events/:eventId/attendance", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "event_attendance");
  const body = await req.json().catch(() => ({}));
  const { person_id, attended = true, notes } = body;
  if (!person_id) return bad(400, "person_id_required");
  const row = await ctx.store.upsertAttendance({
    event_id: ctx.params.eventId, person_id,
    attended: attended ? 1 : 0,
    marked_by: ctx.user.id, notes,
  });
  return json({ attendance: row });
}, { auth: true });

// ------------------------------------------------------ sadhana ---
// Compute chanting_pts from the round buckets:
//   before 7am ×4, 7-8am ×3, 8-10am ×2, after 10am ×1.
// This is the docs' rule; storing the buckets and recomputing here
// keeps the score honest even if the UI is bypassed.
function computeChantingPts(f) {
  return (f.rounds_before_7 || 0) * 4 +
         (f.rounds_7_8      || 0) * 3 +
         (f.rounds_8_10     || 0) * 2 +
         (f.rounds_after_10 || 0) * 1;
}
function computeTotalPts(f) {
  return (f.wake_up_pts     || 0) +
         (f.mangala_arati_pts || 0) +
         (f.chanting_pts    || 0) +
         (f.reading_pts     || 0) +
         (f.hearing_pts     || 0) +
         (f.seva_pts        || 0) +
         (f.preaching_pts   || 0);
}

reg("POST", "/api/sadhana", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "sadhana_chart");
  const body = await req.json().catch(() => ({}));
  const { person_id, entry_date } = body;
  if (!person_id || !entry_date) return bad(400, "missing_fields");
  const chanting_pts = computeChantingPts(body);
  const merged = { ...body, chanting_pts };
  const total_pts = computeTotalPts(merged);
  const row = await ctx.store.upsertSadhana({ ...merged, total_pts });
  return json({ entry: row });
}, { auth: true });

reg("GET", "/api/sadhana", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "sadhana_chart");
  const url = new URL(req.url);
  const limit = Math.min(100, Number(url.searchParams.get("limit") || 20));
  const rows = await ctx.store.recentSadhana(limit);
  const withNames = [];
  for (const r of rows) {
    const p = await ctx.store.personById(r.person_id);
    withNames.push({ ...r, person_name: p ? p.legal_name : "(unknown)" });
  }
  return json({ entries: withNames });
}, { auth: true });

reg("GET", "/api/sadhana/:personId", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "sadhana_chart");
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;
  const entries = await ctx.store.sadhanaFor(ctx.params.personId, from, to);
  const person = await ctx.store.personById(ctx.params.personId);
  return json({ person, entries });
}, { auth: true });

// -------------------------------------------- group planning report ---
reg("POST", "/api/group-reports", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "group_planning_sheet");
  const body = await req.json().catch(() => ({}));
  if (!body.group_id || !body.report_date) return bad(400, "missing_fields");
  const row = await ctx.store.createGroupReport({
    ...body, reported_by: ctx.user.id,
  });
  return json({ report: row });
}, { auth: true });

reg("POST", "/api/group-reports/:reportId", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "group_planning_sheet");
  const body = await req.json().catch(() => ({}));
  const r = await ctx.store.updateGroupReport(ctx.params.reportId, body);
  if (!r) return bad(404, "not_found");
  return json({ report: r });
}, { auth: true });

reg("DELETE", "/api/group-reports/:reportId", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "group_planning_sheet");
  const r = await ctx.store.deleteGroupReport(ctx.params.reportId);
  if (!r) return bad(404, "not_found");
  return json({ ok: true });
}, { auth: true });

reg("DELETE", "/api/sadhana/:entryId", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "sadhana_chart");
  const r = await ctx.store.deleteSadhanaEntry(ctx.params.entryId);
  if (!r) return bad(404, "not_found");
  return json({ ok: true });
}, { auth: true });

reg("DELETE", "/api/duties/:dutyId", async (req, ctx) => {
  const r = await ctx.store.deleteDuty(ctx.params.dutyId);
  if (!r) return bad(404, "not_found");
  return json({ ok: true });
}, { auth: true });

reg("GET", "/api/group-reports", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "group_planning_sheet");
  const url = new URL(req.url);
  const groupId = url.searchParams.get("group_id");
  if (!groupId) return bad(400, "group_id_required");
  const reports = await ctx.store.listGroupReports(groupId);
  return json({ reports });
}, { auth: true });

// -------------------------------------------------- BV structure ---
reg("GET", "/api/bv/structure", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "bv_structure_editor");
  const circles = await ctx.store.listGroupsByKind("circle");
  const sectors = await ctx.store.listGroupsByKind("sector");
  const bvGroups = await ctx.store.listGroupsByKind("bv_group");
  return json({ circles, sectors, bv_groups: bvGroups });
}, { auth: true });

reg("POST", "/api/bv/group", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "bv_structure_editor");
  const body = await req.json().catch(() => ({}));
  const { id, name, kind } = body;
  if (!name || !kind) return bad(400, "missing_fields");
  const row = id
    ? await ctx.store.updateGroup(id, body)
    : await ctx.store.createGroup(body);
  return json({ group: row });
}, { auth: true });

reg("DELETE", "/api/bv/group/:groupId", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "bv_structure_editor");
  const r = await ctx.store.deleteGroup(ctx.params.groupId, ctx.user.id);
  if (!r) return bad(404, "not_found");
  return json({ ok: true });
}, { auth: true });

// Edit an existing user — role, display name, active status.
reg("POST", "/api/admin/users/:userId", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "feature_admin");
  const body = await req.json().catch(() => ({}));
  const patch = {};
  if (body.display_name) patch.display_name = body.display_name;
  if (body.role) {
    if (!isValidRole(body.role)) return bad(400, "bad_role");
    patch.role = body.role;
  }
  if (typeof body.active === "boolean") patch.active = body.active ? 1 : 0;
  if (body.password) patch.password_hash = await hashPassword(body.password);
  // sl_range_start / sl_range_end can be null (clear range) or ints
  if (body.sl_range_start !== undefined) patch.sl_range_start = body.sl_range_start === "" ? null : Number(body.sl_range_start);
  if (body.sl_range_end   !== undefined) patch.sl_range_end   = body.sl_range_end   === "" ? null : Number(body.sl_range_end);
  const u = await ctx.store.updateUser(ctx.params.userId, patch);
  if (!u) return bad(404, "not_found");
  return json({ user: { ...u, password_hash: undefined } });
}, { auth: true });

// Suggest the next 100-wide sl-range for a new coord. Scans existing
// coord users, finds the highest sl_range_end so far, adds 1. If no
// coord has a range yet, seeds at 10001 — the "one-based" starting
// point Prabhuji picked.
reg("GET", "/api/admin/next-sl-range", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "feature_admin");
  const users = await ctx.store.listAllUsers();
  const ends = users
    .map(u => Number(u.sl_range_end))
    .filter(n => Number.isFinite(n) && n < 100000);
  const nextStart = ends.length ? Math.max(...ends) + 1 : 10001;
  return json({ start: nextStart, end: nextStart + 99 });
}, { auth: true });

// The rapid-entry UI calls this to get the sl_no for the row it's
// about to save. Coord-scoped: returns based on the caller's range.
reg("GET", "/api/me/next-sl", async (req, ctx) => {
  const n = await ctx.store.nextSlNoFor(ctx.user.id);
  if (n == null) return bad(409, "range_exhausted_or_missing", {
    hint: "Ask HK Leader to assign or extend your sl-range in Admin → Users.",
  });
  return json({ sl_no: n });
}, { auth: true });

// -------------------------------------------------------- duties ---
reg("GET", "/api/duties", async (req, ctx) => {
  const url = new URL(req.url);
  const includeDone = url.searchParams.get("include_done") === "1";
  const rows = await ctx.store.dutiesFor(ctx.user.id, { onlyPending: !includeDone });
  return json({ duties: rows });
}, { auth: true });

reg("POST", "/api/duties/:dutyId/done", async (req, ctx) => {
  const row = await ctx.store.markDutyDone(ctx.params.dutyId, ctx.user.id);
  if (!row) return bad(404, "duty_not_found");
  return json({ duty: row });
}, { auth: true });

// ---------------------------------------------- member details full ---
reg("GET", "/api/member/:personId", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "member_details_full");
  const p = await ctx.store.personById(ctx.params.personId);
  if (!p) return bad(404, "not_found");
  return json({ person: p });
}, { auth: true });

reg("POST", "/api/member/:personId", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "member_details_full");
  const body = await req.json().catch(() => ({}));
  const p = await ctx.store.updatePerson(ctx.params.personId, body, ctx.user.id);
  if (!p) return bad(404, "not_found");
  return json({ person: p });
}, { auth: true });

// Delete (soft — active=0). HK Leader only. Preserves history and
// audit trail — the person's daily_chant_log / attendance / sadhana
// entries are untouched; they just stop appearing in active lists.
reg("DELETE", "/api/member/:personId", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "feature_admin");
  const r = await ctx.store.deletePerson(ctx.params.personId, ctx.user.id);
  if (!r) return bad(404, "not_found");
  return json({ ok: true });
}, { auth: true });

// Quick per-row edits from any list view.
reg("POST", "/api/person/:personId/status", async (req, ctx) => {
  // NJY Coordinators may set status on people assigned to them (so the
  // roll-inline dropdown works during Janmashtami). Higher tiers may
  // set status on anyone. Manjari Servant Leader same as coordinator
  // scope (for Phase 3 onward).
  const higher = ["hk_leader","njy_leader","circle_servant","sector_servant","servant_leader"];
  const perRoll = ["njy_coordinator","manjari_servant_leader"];
  if (!higher.includes(ctx.user.role) && !perRoll.includes(ctx.user.role)) return bad(403, "forbidden");
  const body = await req.json().catch(() => ({}));
  const { status } = body;
  const valid = ["chanter","daily","njy1","njy2","njy3","manjari","bv_member","dropped"];
  if (!valid.includes(status)) return bad(400, "bad_status", { valid });
  // Roll-scoped roles can only touch their own assigned people.
  if (!higher.includes(ctx.user.role)) {
    const person = await ctx.store.personById(ctx.params.personId);
    if (!person) return bad(404, "not_found");
    if (person.assigned_to_user_id !== ctx.user.id) return bad(403, "not_your_roll");
  }
  const p = await ctx.store.updatePerson(ctx.params.personId, { status }, ctx.user.id);
  if (!p) return bad(404, "not_found");
  return json({ person: p });
}, { auth: true });

reg("POST", "/api/person/:personId/assign", async (req, ctx) => {
  const isMgr = ["hk_leader","njy_leader"].includes(ctx.user.role);
  if (!isMgr) return bad(403, "forbidden");
  const body = await req.json().catch(() => ({}));
  const { assigned_to_user_id } = body;
  if (assigned_to_user_id) {
    const target = await ctx.store.userById(assigned_to_user_id);
    if (!target) return bad(404, "target_user_not_found");
  }
  const p = await ctx.store.updatePerson(ctx.params.personId, { assigned_to_user_id }, ctx.user.id);
  if (!p) return bad(404, "not_found");
  return json({ person: p });
}, { auth: true });

// Just the caller's own points — for the header chip next to the
// coordinator name. Two numbers only, no full leaderboard.
reg("GET", "/api/me/points", async (req, ctx) => {
  if (ctx.user.role !== "njy_coordinator") {
    return json({ daily: 0, overall: 0, applicable: false });
  }
  const today = todayInTz(ctx.env?.APP_TZ);
  const [d, o] = await Promise.all([
    scoreDailyForCoord(ctx.store, ctx.user, today),
    scoreOverallForCoord(ctx.store, ctx.user),
  ]);
  return json({ daily: d.pts, overall: o.pts, applicable: true });
}, { auth: true });

// ------------------------------------------------------ leaderboards ---
reg("GET", "/api/leaderboard/daily", async (req, ctx) => {
  const today = todayInTz(ctx.env?.APP_TZ);
  const coords = await ctx.store.listUsersByRole("njy_coordinator");
  const rows = await Promise.all(coords.map(c => scoreDailyForCoord(ctx.store, c, today)));
  rows.sort((a, b) => b.pts - a.pts);
  return json({ date: today, rows });
}, { auth: true });

reg("GET", "/api/leaderboard/overall", async (req, ctx) => {
  const coords = await ctx.store.listUsersByRole("njy_coordinator");
  const rows = await Promise.all(coords.map(c => scoreOverallForCoord(ctx.store, c)));
  rows.sort((a, b) => b.pts - a.pts);
  return json({ scope: "P1+P2", rows });
}, { auth: true });

// ------------------------------------------------ Janmashtami entry ---
// Coords enter fresh chanters during Janmashtami booth-work — rapid
// single-row adds and paste-in-bulk both hit these two endpoints.
// Every insert gets the next unused sl_no from the caller's assigned
// range and lands under their roll.

// Normalize any user-typed mobile to a canonical +91XXXXXXXXXX format.
// Handles: 10-digit ("9999000001"), 12-digit with prefix ("919999000001"),
// hyphenated ("999-900-0001"), or already-canonical ("+919999000001").
// If the input doesn't look like an Indian mobile at all, we return the
// digits as-is with the '+' prefix so international entries still work.
export function normalizeMobile(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  // If the caller already provided a country-code prefix, keep it —
  // just strip formatting characters (spaces, dashes) from the digits.
  if (trimmed.startsWith("+")) return "+" + trimmed.slice(1).replace(/\D/g, "");
  // Bare digits — assume Indian mobile if 10 digits, otherwise treat
  // as-typed with a + prefix.
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return "+91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return "+" + digits;
  if (digits.length === 11 && digits.startsWith("0")) return "+91" + digits.slice(1);
  return "+" + digits;
}

async function assignAndCreate(store, coord, { name, mobile, pincode }) {
  if (!name || !mobile) return { error: "name_and_mobile_required" };
  const phone = normalizeMobile(mobile);
  const sl_no = await store.nextSlNoFor(coord.id);
  if (sl_no == null) return { error: "range_exhausted_or_missing" };
  const dup = await store.personByPhone(phone);
  if (dup) return { error: "duplicate_phone", phone };
  const p = await store.createPerson({
    legal_name: String(name).trim(),
    phone,
    pincode: pincode ? String(pincode).trim() : null,
    sl_no,
    assigned_to_user_id: coord.id,
    status: "chanter",
  });
  return { person: p };
}

reg("POST", "/api/janmashtami/entry", async (req, ctx) => {
  const body = await req.json().catch(() => ({}));
  const r = await assignAndCreate(ctx.store, ctx.user, body);
  if (r.error) return bad(r.error === "range_exhausted_or_missing" ? 409 : 400, r.error, r);
  return json({ person: r.person });
}, { auth: true });

reg("POST", "/api/janmashtami/bulk", async (req, ctx) => {
  const body = await req.json().catch(() => ({}));
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const created = [], errors = [];
  for (const [i, row] of rows.entries()) {
    const r = await assignAndCreate(ctx.store, ctx.user, row);
    if (r.error) errors.push({ index: i, ...r });
    else created.push(r.person);
  }
  return json({ created: created.length, errors });
}, { auth: true });

// Progress helper for the sticky top on the rapid-entry screen —
// counts how many people the caller has entered today, and returns the
// next tier bonus threshold if any.
reg("GET", "/api/me/janmashtami-progress", async (req, ctx) => {
  const roll = await ctx.store.peopleAssignedTo(ctx.user.id);
  const today = todayInTz(ctx.env?.APP_TZ);
  const enteredToday = roll.filter(p => (p.created_at || "").slice(0, 10) === today);
  const committedToday = enteredToday.filter(p => p.status === "daily");
  const entryTiers = [25, 50, 75, 100];
  const commitTiers = [15, 25, 50];
  const nextTier = (n, tiers) => tiers.find(t => t > n) || null;
  return json({
    today,
    entries_today: enteredToday.length,
    committed_today: committedToday.length,
    next_entry_tier: nextTier(enteredToday.length, entryTiers),
    next_commit_tier: nextTier(committedToday.length, commitTiers),
  });
}, { auth: true });

// ------------------------------------------------------ web push ---
reg("POST", "/api/webpush/subscribe", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "web_push");
  const body = await req.json().catch(() => ({}));
  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) return bad(400, "bad_subscription");
  const row = await ctx.store.addWebPushSub({
    user_id: ctx.user.id, endpoint,
    p256dh: keys.p256dh, auth: keys.auth,
  });
  return json({ subscription_id: row.id });
}, { auth: true });

reg("POST", "/api/webpush/unsubscribe", async (req, ctx) => {
  const body = await req.json().catch(() => ({}));
  if (!body.endpoint) return bad(400, "endpoint_required");
  await ctx.store.removeWebPushSub(body.endpoint);
  return json({ ok: true });
}, { auth: true });

// ------------------------------------------------ feature-gate admin ---
reg("POST", "/api/admin/feature-gate", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "feature_admin");
  const body = await req.json().catch(() => ({}));
  const { feature_key, allowed_roles } = body;
  if (!feature_key || !Array.isArray(allowed_roles)) return bad(400, "bad_body");
  for (const r of allowed_roles) if (!isValidRole(r)) return bad(400, "bad_role", { role: r });
  await ctx.store.setFeatureGate(feature_key, allowed_roles, ctx.user.id);
  const gates = await ctx.store.featureGates();
  return json({ gates });
}, { auth: true });

// ----------------------------------------------------- bulk import ---
reg("POST", "/api/import/preview", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "bulk_import");
  const body = await req.json().catch(() => ({}));
  const { rows } = body;
  if (!Array.isArray(rows)) return bad(400, "rows_required");
  // Preview: identify duplicates and errors WITHOUT writing.
  const errors = [], dupInBatch = [], dupInDb = [];
  const seen = new Set();
  for (const [i, r] of rows.entries()) {
    if (!r.phone) { errors.push({ index: i, reason: "phone_required" }); continue; }
    if (!r.legal_name) { errors.push({ index: i, reason: "name_required" }); continue; }
    const norm = String(r.phone).replace(/\D/g, "");
    if (seen.has(norm)) { dupInBatch.push({ index: i, phone: r.phone }); continue; }
    seen.add(norm);
    const dup = await ctx.store.personByPhone(r.phone);
    if (dup) dupInDb.push({ index: i, phone: r.phone });
  }
  return json({
    total: rows.length,
    would_create: rows.length - errors.length - dupInBatch.length - dupInDb.length,
    duplicates_in_batch: dupInBatch,
    duplicates_in_db: dupInDb,
    errors,
  });
}, { auth: true });

reg("POST", "/api/import/commit", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "bulk_import");
  const body = await req.json().catch(() => ({}));
  const { rows, assigned_to_user_id } = body;
  if (!Array.isArray(rows)) return bad(400, "rows_required");
  const prepared = rows.map(r => ({
    ...r,
    phone: normalizeMobile(r.phone || r.mobile || ""),
    assigned_to_user_id: assigned_to_user_id || r.assigned_to_user_id || null,
  }));
  const result = await ctx.store.bulkCreatePeople(prepared);
  return json({
    created: result.created.length,
    duplicates: result.duplicates,
    errors: result.errors,
  });
}, { auth: true });

// ------------------------------------------------------ WhatsApp deep-link ---
// UI hits this to get a canonical URL for opening WhatsApp on a person.
// Server also records the intent for audit.
reg("POST", "/api/whatsapp/url", async (req, ctx) => {
  await requireFeature(ctx.store, ctx.user.role, "whatsapp_deeplink");
  const body = await req.json().catch(() => ({}));
  const { person_id, template = "followup", text: overrideText } = body;
  const person = await ctx.store.personById(person_id);
  if (!person) return bad(404, "person_not_found");
  const text = overrideText || (WA_TEMPLATES[template] || WA_TEMPLATES.followup)(person.legal_name);
  const url = waDeepLink(person.phone, text);
  await ctx.store.recordNotification({
    kind: "wa-deeplink",
    target_person_id: person_id,
    target_user_id: ctx.user.id,
    payload: { template, text },
    status: "sent",
    sent_at: nowIso(),
  });
  return json({ url });
}, { auth: true });
