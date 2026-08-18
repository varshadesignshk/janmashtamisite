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
import { nowIso, todayInTz } from "./ids.js";

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
  const rows = await Promise.all(people.map(async (p) => {
    const chant = await ctx.store.chantOnDate(p.id, today);
    return {
      id: p.id,
      name: p.legal_name,
      phone: p.phone,
      status: p.status,
      contact_state: p.contact_state || 0,
      notes: p.notes || "",
      last_marked_at: p.last_marked_at,
      chanted_today: !!(chant && chant.chanted),
      wa_url: waDeepLink(p.phone, WA_TEMPLATES.followup(p.legal_name)),
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
  const next = Number.isInteger(contact_state)
    ? ((contact_state % 4) + 4) % 4
    : (((person.contact_state || 0) + 1) % 4);
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
  const total = await ctx.store.peopleCount();
  const leaders = await ctx.store.listUsersByRole("njy_leader");
  const coordinators = await ctx.store.listUsersByRole("njy_coordinator");
  const today = todayInTz(ctx.env?.APP_TZ);
  // aggregate chanted-today across all coordinators (bounded for perf)
  let chanted = 0;
  for (const c of coordinators) {
    const roll = await ctx.store.peopleAssignedTo(c.id);
    for (const p of roll) {
      const ch = await ctx.store.chantOnDate(p.id, today);
      if (ch && ch.chanted) chanted++;
    }
  }
  return json({
    total_people: total,
    njy_leaders: leaders.length,
    njy_coordinators: coordinators.length,
    chanted_today: chanted,
    today,
  });
}, { auth: true });

// Drill-down: view another user's roll (leader/HK only).
reg("GET", "/api/user/:userId/roll", async (req, ctx) => {
  const isHk = ctx.user.role === "hk_leader";
  const isLeader = ctx.user.role === "njy_leader";
  if (!isHk && !isLeader) return bad(403, "forbidden");
  const target = await ctx.store.userById(ctx.params.userId);
  if (!target) return bad(404, "user_not_found");
  const people = await ctx.store.peopleAssignedTo(target.id);
  const today = todayInTz(ctx.env?.APP_TZ);
  const rows = await Promise.all(people.map(async (p) => {
    const chant = await ctx.store.chantOnDate(p.id, today);
    return {
      id: p.id, name: p.legal_name, phone: p.phone,
      status: p.status, contact_state: p.contact_state || 0,
      notes: p.notes || "",
      chanted_today: !!(chant && chant.chanted),
      wa_url: waDeepLink(p.phone, WA_TEMPLATES.followup(p.legal_name)),
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
  const u = await ctx.store.updateUser(ctx.params.userId, patch);
  if (!u) return bad(404, "not_found");
  return json({ user: { ...u, password_hash: undefined } });
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
  const isMgr = ["hk_leader","njy_leader","circle_servant","sector_servant"].includes(ctx.user.role);
  if (!isMgr) return bad(403, "forbidden");
  const body = await req.json().catch(() => ({}));
  const { status } = body;
  const valid = ["chanter","qualified","daily","njy1","njy2","njy3","manjari","bv_member","dropped"];
  if (!valid.includes(status)) return bad(400, "bad_status", { valid });
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
    phone: String(r.phone || "").trim(),
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
