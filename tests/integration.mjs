// Integration harness — swaps a memory store over the real handlers,
// same technique as primitive/tests/integration.mjs.

import test from "node:test";
import assert from "node:assert/strict";
import { route } from "../lib/handlers.js";
import { memoryStore } from "../lib/store-memory.js";
import { hashPassword } from "../lib/auth.js";

const SECRET = "test-secret-for-integration-suite";

async function seed() {
  const s = memoryStore();
  // gates match schema/0001_init.sql defaults
  for (const [k, roles] of Object.entries({
    coordinator_roll:      ["njy_coordinator", "njy_leader", "hk_leader"],
    leader_dashboard:      ["njy_leader", "hk_leader"],
    hk_dashboard:          ["hk_leader"],
    bulk_import:           ["hk_leader"],
    feature_admin:         ["hk_leader"],
    whatsapp_deeplink:     ["njy_coordinator", "njy_leader", "hk_leader", "servant_leader"],
    sadhana_chart:         ["hk_leader"],
    group_planning_sheet:  ["hk_leader"],
    bv_structure_editor:   ["hk_leader"],
    action_timeline_duties:["hk_leader"],
    member_details_full:   ["hk_leader"],
    event_attendance:      ["njy_coordinator","njy_leader","hk_leader"],
    web_push:              ["njy_coordinator","njy_leader","hk_leader","servant_leader"],
  })) {
    await s.setFeatureGate(k, roles, "system");
  }
  const pw = await hashPassword("test-pass-123");
  const hk = await s.createUser({ username: "hk", password_hash: pw, display_name: "HK Leader", role: "hk_leader" });
  const leader = await s.createUser({ username: "leader1", password_hash: pw, display_name: "Leader 1", role: "njy_leader" });
  const coord = await s.createUser({ username: "coord1", password_hash: pw, display_name: "Coord 1", role: "njy_coordinator" });
  const ppl = [];
  for (let i = 1; i <= 5; i++) {
    ppl.push(await s.createPerson({
      legal_name: `Chanter ${i}`, phone: `+919999000${i}`,
      assigned_to_user_id: coord.id,
    }));
  }
  return { s, hk, leader, coord, ppl };
}

async function login(store, username, password) {
  const req = new Request("http://x/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const res = await route(req, { store, env: { SESSION_SECRET: SECRET } });
  const set = res.headers.get("set-cookie") || "";
  const cookie = set.split(";")[0];
  return { res, cookie };
}

function withCookie(url, cookie, init = {}) {
  return new Request(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      cookie,
      ...(init.headers || {}),
    },
  });
}

test("login: wrong password rejected with same error as unknown user", async () => {
  const { s } = await seed();
  const bad1 = await route(new Request("http://x/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "hk", password: "nope" }),
  }), { store: s, env: { SESSION_SECRET: SECRET } });
  const bad2 = await route(new Request("http://x/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "nobody", password: "test-pass-123" }),
  }), { store: s, env: { SESSION_SECRET: SECRET } });
  assert.equal(bad1.status, 401);
  assert.equal(bad2.status, 401);
  const b1 = await bad1.json(), b2 = await bad2.json();
  assert.equal(b1.error, b2.error);
});

test("login + /api/me round-trip", async () => {
  const { s } = await seed();
  const { res, cookie } = await login(s, "hk", "test-pass-123");
  assert.equal(res.status, 200);
  assert.ok(cookie);
  const me = await route(
    withCookie("http://x/api/me", cookie),
    { store: s, env: { SESSION_SECRET: SECRET } },
  );
  const body = await me.json();
  assert.equal(body.user.role, "hk_leader");
  assert.ok(body.gates);
});

test("coordinator sees only their assigned roll", async () => {
  const { s, coord } = await seed();
  const { cookie } = await login(s, "coord1", "test-pass-123");
  const res = await route(
    withCookie("http://x/api/roll", cookie),
    { store: s, env: { SESSION_SECRET: SECRET } },
  );
  const body = await res.json();
  assert.equal(body.roll.length, 5);
  assert.equal(body.tally.assigned, 5);
  assert.equal(body.tally.chanted_today, 0);
  for (const r of body.roll) assert.ok(r.wa_url.startsWith("https://wa.me/"));
});

test("coordinator cannot mark someone else's person", async () => {
  const { s, hk, coord } = await seed();
  const stranger = await s.createPerson({
    legal_name: "Other", phone: "+919888000001",
    assigned_to_user_id: hk.id,
  });
  const { cookie } = await login(s, "coord1", "test-pass-123");
  const res = await route(
    withCookie("http://x/api/roll/mark", cookie, {
      method: "POST",
      body: JSON.stringify({ person_id: stranger.id }),
    }),
    { store: s, env: { SESSION_SECRET: SECRET } },
  );
  assert.equal(res.status, 403);
});

test("mark cycles 0→1→2→3→0", async () => {
  const { s, ppl } = await seed();
  const { cookie } = await login(s, "coord1", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const cycle = [];
  for (let i = 0; i < 5; i++) {
    const r = await route(
      withCookie("http://x/api/roll/mark", cookie, {
        method: "POST",
        body: JSON.stringify({ person_id: ppl[0].id }),
      }),
      ctx,
    );
    cycle.push((await r.json()).contact_state);
  }
  assert.deepEqual(cycle, [1, 2, 3, 0, 1]);
});

test("chant marking updates tally", async () => {
  const { s, ppl } = await seed();
  const { cookie } = await login(s, "coord1", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  await route(withCookie("http://x/api/roll/chant", cookie, {
    method: "POST",
    body: JSON.stringify({ person_id: ppl[0].id, chanted: true, rounds: 16 }),
  }), ctx);
  const roll = await route(withCookie("http://x/api/roll", cookie), ctx);
  const body = await roll.json();
  assert.equal(body.tally.chanted_today, 1);
});

test("feature-gate promotion widens access without redeploy", async () => {
  const { s } = await seed();
  // servant_leader has no gate for coordinator_roll initially.
  const pw = await hashPassword("test-pass-123");
  const sl = await s.createUser({ username: "sl1", password_hash: pw, display_name: "SL 1", role: "servant_leader" });
  const { cookie: slCookie } = await login(s, "sl1", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  // 403 first.
  const before = await route(withCookie("http://x/api/roll", slCookie), ctx);
  assert.equal(before.status, 403);
  // HK Leader promotes.
  const { cookie: hkCookie } = await login(s, "hk", "test-pass-123");
  const promote = await route(
    withCookie("http://x/api/admin/feature-gate", hkCookie, {
      method: "POST",
      body: JSON.stringify({
        feature_key: "coordinator_roll",
        allowed_roles: ["njy_coordinator", "njy_leader", "hk_leader", "servant_leader"],
      }),
    }),
    ctx,
  );
  assert.equal(promote.status, 200);
  // now servant_leader can call it.
  const after = await route(withCookie("http://x/api/roll", slCookie), ctx);
  assert.equal(after.status, 200);
});

test("bulk import preview then commit", async () => {
  const { s } = await seed();
  const { cookie } = await login(s, "hk", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const rows = [
    { legal_name: "A", phone: "+91-777-0000-001" },
    { legal_name: "B", phone: "+91-777-0000-002" },
    { legal_name: "C", phone: "+91-777-0000-001" },        // dup in batch
    { phone: "+91-777-0000-003" },                          // no name
    { legal_name: "D", phone: "+9199990001" },              // exists (seed)
  ];
  const prev = await route(withCookie("http://x/api/import/preview", cookie, {
    method: "POST", body: JSON.stringify({ rows }),
  }), ctx);
  const p = await prev.json();
  assert.equal(p.would_create, 2);
  assert.equal(p.errors.length, 1);
  assert.equal(p.duplicates_in_batch.length, 1);
  assert.equal(p.duplicates_in_db.length, 1);
  const commit = await route(withCookie("http://x/api/import/commit", cookie, {
    method: "POST", body: JSON.stringify({ rows }),
  }), ctx);
  const c = await commit.json();
  assert.equal(c.created, 2);
});

test("leader can list coordinators; coord cannot", async () => {
  const { s } = await seed();
  const { cookie: coord } = await login(s, "coord1", "test-pass-123");
  const { cookie: hk } = await login(s, "hk", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const bad = await route(withCookie("http://x/api/leader/coordinators", coord), ctx);
  assert.equal(bad.status, 403);
  const ok = await route(withCookie("http://x/api/leader/coordinators", hk), ctx);
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.ok(Array.isArray(body.coordinators));
});

test("HK can drill into a coordinator's roll", async () => {
  const { s, coord } = await seed();
  const { cookie } = await login(s, "hk", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const res = await route(
    withCookie(`http://x/api/user/${coord.id}/roll`, cookie),
    ctx,
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.target.name, "Coord 1");
  assert.equal(body.roll.length, 5);
});

test("coordinator cannot drill into another user's roll", async () => {
  const { s, hk } = await seed();
  const { cookie } = await login(s, "coord1", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const res = await route(
    withCookie(`http://x/api/user/${hk.id}/roll`, cookie),
    ctx,
  );
  assert.equal(res.status, 403);
});

test("HK creates a new user; duplicate username rejected", async () => {
  const { s } = await seed();
  const { cookie } = await login(s, "hk", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const ok = await route(withCookie("http://x/api/admin/users", cookie, {
    method: "POST", body: JSON.stringify({
      username: "sl-new", password: "temp-pass", display_name: "SL New", role: "servant_leader",
    }),
  }), ctx);
  assert.equal(ok.status, 200);
  const again = await route(withCookie("http://x/api/admin/users", cookie, {
    method: "POST", body: JSON.stringify({
      username: "sl-new", password: "temp-pass", display_name: "Dup", role: "servant_leader",
    }),
  }), ctx);
  assert.equal(again.status, 409);
});

test("events: attendance search + mark", async () => {
  const { s, ppl } = await seed();
  const { cookie } = await login(s, "hk", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const c = await route(withCookie("http://x/api/events", cookie, {
    method: "POST", body: JSON.stringify({
      kind: "njy1", name: "NJY 1 Sat", event_date: "2026-09-05", capacity: 1000,
    }),
  }), ctx);
  const ev = (await c.json()).event;
  // search for "Chanter" — should find all 5 seeded people
  const sr = await route(withCookie(`http://x/api/people/search?q=Chanter`, cookie), ctx);
  const { people } = await sr.json();
  assert.equal(people.length, 5);
  // mark one attended
  const mk = await route(withCookie(`http://x/api/events/${ev.id}/attendance`, cookie, {
    method: "POST", body: JSON.stringify({ person_id: ppl[0].id, attended: true }),
  }), ctx);
  assert.equal(mk.status, 200);
  // event details show them as attended
  const det = await route(withCookie(`http://x/api/events/${ev.id}`, cookie), ctx);
  const body = await det.json();
  assert.equal(body.attended_count, 1);
  assert.ok(body.attended_ids.includes(ppl[0].id));
});

test("events: create + list", async () => {
  const { s } = await seed();
  const { cookie } = await login(s, "hk", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const c = await route(withCookie("http://x/api/events", cookie, {
    method: "POST", body: JSON.stringify({
      kind: "njy1", name: "NJY 1 Saturday A", event_date: "2026-09-05", venue: "Temple hall",
    }),
  }), ctx);
  assert.equal(c.status, 200);
  const l = await route(withCookie("http://x/api/events", cookie), ctx);
  const body = await l.json();
  assert.equal(body.events.length, 1);
  assert.equal(body.events[0].kind, "njy1");
});

test("sadhana: computed chanting_pts and total_pts", async () => {
  const { s, ppl } = await seed();
  const { cookie } = await login(s, "hk", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const res = await route(withCookie("http://x/api/sadhana", cookie, {
    method: "POST", body: JSON.stringify({
      person_id: ppl[0].id, entry_date: "2026-08-17",
      wake_up_pts: 10, mangala_arati_pts: 10,
      rounds_before_7: 8, rounds_7_8: 4, rounds_8_10: 2, rounds_after_10: 0,
      reading_pts: 10, hearing_pts: 8, seva_pts: 10, preaching_pts: 0,
    }),
  }), ctx);
  const body = await res.json();
  // chanting_pts = 8*4 + 4*3 + 2*2 + 0*1 = 32+12+4 = 48
  assert.equal(body.entry.chanting_pts, 48);
  // total = 10 + 10 + 48 + 10 + 8 + 10 + 0 = 96
  assert.equal(body.entry.total_pts, 96);
});

test("group report: create and list", async () => {
  const { s } = await seed();
  const { cookie } = await login(s, "hk", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const g = await s.createGroup({ name: "BV-1", kind: "bv_group" });
  const c = await route(withCookie("http://x/api/group-reports", cookie, {
    method: "POST", body: JSON.stringify({
      group_id: g.id, report_date: "2026-08-17", week_number: 1,
      avg_attendance: 22, potential_leaders: 3,
    }),
  }), ctx);
  assert.equal(c.status, 200);
  const l = await route(withCookie(`http://x/api/group-reports?group_id=${g.id}`, cookie), ctx);
  const body = await l.json();
  assert.equal(body.reports.length, 1);
  assert.equal(body.reports[0].potential_leaders, 3);
});

test("duties: list is scoped to user; mark done works", async () => {
  const { s, coord, hk } = await seed();
  await s.createDuty({ user_id: coord.id, kind: "call_member", due_date: "2026-08-18" });
  await s.createDuty({ user_id: hk.id,    kind: "meet_sl_weekly", due_date: "2026-08-18" });
  const { cookie } = await login(s, "coord1", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const l = await route(withCookie("http://x/api/duties", cookie), ctx);
  const body = await l.json();
  assert.equal(body.duties.length, 1);
  assert.equal(body.duties[0].kind, "call_member");
  const dutyId = body.duties[0].id;
  await route(withCookie(`http://x/api/duties/${dutyId}/done`, cookie, { method: "POST" }), ctx);
  const after = await route(withCookie("http://x/api/duties", cookie), ctx);
  const b2 = await after.json();
  assert.equal(b2.duties.length, 0);
});

test("BV structure endpoint returns circles/sectors/bv_groups", async () => {
  const { s } = await seed();
  await s.createGroup({ name: "Krsna", kind: "circle" });
  await s.createGroup({ name: "Subala", kind: "sector" });
  await s.createGroup({ name: "BV Alpha", kind: "bv_group" });
  const { cookie } = await login(s, "hk", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const res = await route(withCookie("http://x/api/bv/structure", cookie), ctx);
  const body = await res.json();
  assert.equal(body.circles.length, 1);
  assert.equal(body.sectors.length, 1);
  assert.equal(body.bv_groups.length, 1);
});

test("member details: HK can load and patch", async () => {
  const { s, ppl } = await seed();
  const { cookie } = await login(s, "hk", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  await route(withCookie(`http://x/api/member/${ppl[0].id}`, cookie, {
    method: "POST", body: JSON.stringify({ email: "ravi@example.org", occupation: "Teacher" }),
  }), ctx);
  const get = await route(withCookie(`http://x/api/member/${ppl[0].id}`, cookie), ctx);
  const body = await get.json();
  assert.equal(body.person.email, "ravi@example.org");
  assert.equal(body.person.occupation, "Teacher");
});

test("web push: subscribe + unsubscribe", async () => {
  const { s } = await seed();
  const { cookie } = await login(s, "coord1", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const sub = await route(withCookie("http://x/api/webpush/subscribe", cookie, {
    method: "POST", body: JSON.stringify({
      endpoint: "https://push.example/x", keys: { p256dh: "aa", auth: "bb" },
    }),
  }), ctx);
  assert.equal(sub.status, 200);
  const unsub = await route(withCookie("http://x/api/webpush/unsubscribe", cookie, {
    method: "POST", body: JSON.stringify({ endpoint: "https://push.example/x" }),
  }), ctx);
  assert.equal(unsub.status, 200);
});

test("reassign moves a person to another user's roll", async () => {
  const { s, coord, ppl } = await seed();
  const pw = await hashPassword("test-pass-123");
  const sl = await s.createUser({ username: "sl-x", password_hash: pw, display_name: "SL X", role: "servant_leader" });
  const { cookie } = await login(s, "hk", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const r = await route(withCookie(`http://x/api/person/${ppl[0].id}/assign`, cookie, {
    method: "POST", body: JSON.stringify({ assigned_to_user_id: sl.id }),
  }), ctx);
  assert.equal(r.status, 200);
  const check = await s.personById(ppl[0].id);
  assert.equal(check.assigned_to_user_id, sl.id);
});

test("lifecycle status change is audited in person_stage_log", async () => {
  const { s, ppl } = await seed();
  const { cookie } = await login(s, "hk", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const r = await route(withCookie(`http://x/api/person/${ppl[0].id}/status`, cookie, {
    method: "POST", body: JSON.stringify({ status: "daily" }),
  }), ctx);
  assert.equal(r.status, 200);
  const p = await s.personById(ppl[0].id);
  assert.equal(p.status, "daily");
  const log = s._tables.person_stage_log.find(x => x.person_id === ppl[0].id);
  assert.equal(log.to_status, "daily");
  assert.equal(log.from_status, "chanter");
});

test("bad status is rejected", async () => {
  const { s, ppl } = await seed();
  const { cookie } = await login(s, "hk", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const r = await route(withCookie(`http://x/api/person/${ppl[0].id}/status`, cookie, {
    method: "POST", body: JSON.stringify({ status: "not-a-real-status" }),
  }), ctx);
  assert.equal(r.status, 400);
});

test("soft-delete hides person from active lists but preserves record", async () => {
  const { s, ppl } = await seed();
  const { cookie } = await login(s, "hk", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const r = await route(withCookie(`http://x/api/member/${ppl[0].id}`, cookie, {
    method: "DELETE",
  }), ctx);
  assert.equal(r.status, 200);
  const p = await s.personById(ppl[0].id);
  assert.equal(p, null);       // hidden from active reads
  // But the row is still in the table (active=0).
  const raw = s._tables.people.find(x => x.id === ppl[0].id);
  assert.equal(raw.active, 0);
});

test("edit user: role change persists; password rehash works", async () => {
  const { s, coord } = await seed();
  const { cookie } = await login(s, "hk", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const r = await route(withCookie(`http://x/api/admin/users/${coord.id}`, cookie, {
    method: "POST", body: JSON.stringify({ role: "servant_leader", password: "new-pass-42" }),
  }), ctx);
  assert.equal(r.status, 200);
  const u = await s.userByUsername("coord1");
  assert.equal(u.role, "servant_leader");
  // Try to log in with new password
  const login2 = await route(new Request("http://x/api/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "coord1", password: "new-pass-42" }),
  }), ctx);
  assert.equal(login2.status, 200);
});

test("delete group: soft-deletes group and ends memberships", async () => {
  const { s, ppl } = await seed();
  const g = await s.createGroup({ name: "Temp BV", kind: "bv_group" });
  await s.addMembership({ person_id: ppl[0].id, group_id: g.id });
  const { cookie } = await login(s, "hk", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const r = await route(withCookie(`http://x/api/bv/group/${g.id}`, cookie, {
    method: "DELETE",
  }), ctx);
  assert.equal(r.status, 200);
  const check = await s.groupById(g.id);
  assert.equal(check, null);
  const mems = s._tables.group_membership.filter(m => m.group_id === g.id);
  assert.ok(mems.every(m => !m.active));
});

test("event CRUD: update + delete", async () => {
  const { s } = await seed();
  const { cookie } = await login(s, "hk", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const c = await route(withCookie("http://x/api/events", cookie, {
    method: "POST", body: JSON.stringify({ kind: "njy1", name: "old", event_date: "2026-09-01" }),
  }), ctx);
  const ev = (await c.json()).event;
  const upd = await route(withCookie(`http://x/api/events/${ev.id}`, cookie, {
    method: "POST", body: JSON.stringify({ name: "renamed", venue: "hall B" }),
  }), ctx);
  assert.equal(upd.status, 200);
  const evUpd = (await upd.json()).event;
  assert.equal(evUpd.name, "renamed");
  assert.equal(evUpd.venue, "hall B");
  const del = await route(withCookie(`http://x/api/events/${ev.id}`, cookie, { method: "DELETE" }), ctx);
  assert.equal(del.status, 200);
  const list = await route(withCookie("http://x/api/events", cookie), ctx);
  const body = await list.json();
  assert.equal(body.events.find(e => e.id === ev.id), undefined);
});

test("group report CRUD: update + delete", async () => {
  const { s } = await seed();
  const { cookie } = await login(s, "hk", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const g = await s.createGroup({ name: "BV-Z", kind: "bv_group" });
  const c = await route(withCookie("http://x/api/group-reports", cookie, {
    method: "POST", body: JSON.stringify({ group_id: g.id, report_date: "2026-09-01", avg_attendance: 10 }),
  }), ctx);
  const rep = (await c.json()).report;
  const upd = await route(withCookie(`http://x/api/group-reports/${rep.id}`, cookie, {
    method: "POST", body: JSON.stringify({ avg_attendance: 15 }),
  }), ctx);
  assert.equal(upd.status, 200);
  const del = await route(withCookie(`http://x/api/group-reports/${rep.id}`, cookie, { method: "DELETE" }), ctx);
  assert.equal(del.status, 200);
});

test("sadhana entry delete removes row", async () => {
  const { s, ppl } = await seed();
  const { cookie } = await login(s, "hk", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const c = await route(withCookie("http://x/api/sadhana", cookie, {
    method: "POST", body: JSON.stringify({
      person_id: ppl[0].id, entry_date: "2026-09-01",
      rounds_before_7: 4,
    }),
  }), ctx);
  const entry = (await c.json()).entry;
  const del = await route(withCookie(`http://x/api/sadhana/${entry.id}`, cookie, { method: "DELETE" }), ctx);
  assert.equal(del.status, 200);
  assert.equal(s._tables.sadhana_entries.length, 0);
});

test("whatsapp url endpoint returns wa.me link and records audit", async () => {
  const { s, ppl } = await seed();
  const { cookie } = await login(s, "coord1", "test-pass-123");
  const ctx = { store: s, env: { SESSION_SECRET: SECRET } };
  const res = await route(withCookie("http://x/api/whatsapp/url", cookie, {
    method: "POST", body: JSON.stringify({ person_id: ppl[0].id, template: "yajna_invite" }),
  }), ctx);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.url.startsWith("https://wa.me/"));
  const notif = s._tables.notifications.find(n => n.kind === "wa-deeplink");
  assert.ok(notif);
});
