// Emit SQL that seeds demo data for Prabhuji's presentation.
// Every row is tagged: chanter phones start with "+919999", user
// usernames with "demo-", groups with "Demo ", events with "[DEMO] ".
// scripts/remove-demo.sql wipes all of it in a single transaction.
//
// Usage:
//   node scripts/seed-demo.js > demo.sql
//   npx wrangler d1 execute DB --remote --file=demo.sql
//   del demo.sql
//
// After the demo:
//   npx wrangler d1 execute DB --remote --file=scripts/remove-demo.sql

import { hashPassword } from "../lib/auth.js";
import { randomUUID } from "node:crypto";

const now = new Date().toISOString();
const today = now.slice(0, 10);

const DEMO_PASSWORD = "janmashtami26";
const pw = await hashPassword(DEMO_PASSWORD);

const out = (s) => process.stdout.write(s + "\n");

out(`-- ============================================================`);
out(`-- Demo seed data for Prabhuji's presentation.`);
out(`-- Login: any of the "demo-*" usernames · password: ${DEMO_PASSWORD}`);
out(`-- To remove everything: wrangler d1 execute DB --remote --file=scripts/remove-demo.sql`);
out(`-- ============================================================\n`);

const users = [];
function makeUser(username, display, role) {
  const id = randomUUID();
  users.push({ id, username, display, role });
  out(`INSERT INTO users (id, username, password_hash, display_name, role, active, created_at)
VALUES ('${id}', '${username}', '${pw}', '${display.replace(/'/g, "''")}', '${role}', 1, '${now}');`);
  return id;
}

const hkNote = out(`-- 3 NJY Leaders + 6 NJY Coordinators`);
const l1 = makeUser("demo-leader1",  "Bhakti Vinod Leader",   "njy_leader");
const l2 = makeUser("demo-leader2",  "Radha Charan Leader",   "njy_leader");
const l3 = makeUser("demo-leader3",  "Yamuna Devi Leader",    "njy_leader");
const c1 = makeUser("demo-coord1",   "Sri Coordinator",        "njy_coordinator");
const c2 = makeUser("demo-coord2",   "Anand Coordinator",      "njy_coordinator");
const c3 = makeUser("demo-coord3",   "Chaitanya Coordinator",  "njy_coordinator");
const c4 = makeUser("demo-coord4",   "Damodar Coordinator",    "njy_coordinator");
const c5 = makeUser("demo-coord5",   "Krishna Prem Coordinator","njy_coordinator");
const c6 = makeUser("demo-coord6",   "Radha Priya Coordinator","njy_coordinator");

// Distribute 90 chanters across the 6 coords (15 each) with a spread of
// contact_states and daily-chant marks so the dashboard looks alive.
const COORDS = [c1, c2, c3, c4, c5, c6];
const FIRST = ["Ravi","Priya","Anand","Bhakti","Chaitanya","Damodar","Ekadasi","Ganga","Hanuman","Isha","Jagannath","Krishna","Lila","Madhava","Nitya","Parvati","Radha","Sita","Tulasi","Uma","Vasu","Yashoda","Arjun","Balram","Devaki"];
const LAST  = ["Das","Devi Dasi","Prabhu","Mataji","Bhakta","Sadhaka"];

out(`\n-- ~90 demo chanters spread across coords, with pincodes`);
// Madurai pincodes (Thiruppalai area) — 625001..625012 spread realistically.
const PINCODES = ["625001","625002","625003","625004","625005","625006","625007","625009","625010","625014","625016","625017"];
let idx = 1;
const people = [];
for (let ci = 0; ci < COORDS.length; ci++) {
  const coordId = COORDS[ci];
  for (let k = 0; k < 15; k++) {
    const id = randomUUID();
    const name = `${FIRST[(ci * 15 + k) % FIRST.length]} ${LAST[k % LAST.length]}`;
    const phone = `+919999${String(idx).padStart(6, "0")}`;
    const contactState = (ci * 15 + k) % 4;
    // Roughly half are "daily" status so the one-month-daily metric
    // has a denominator to compare against.
    const status = ((ci * 15 + k) % 2 === 0) ? "daily" : "chanter";
    const pincode = PINCODES[(ci * 15 + k) % PINCODES.length];
    people.push({ id, coordId, contactState, status });
    out(`INSERT INTO people (id, legal_name, phone, pincode, status, contact_state, assigned_to_user_id, active, created_at, updated_at)
VALUES ('${id}', '${name.replace(/'/g,"''")}', '${phone}', '${pincode}', '${status}', ${contactState}, '${coordId}', 1, '${now}', '${now}');`);
    idx++;
  }
}

// About half chanted today — daily_chant_log entries for today.
out(`\n-- Some "chanted today" marks so the dashboard tally isn't all zeros`);
people.forEach((p, i) => {
  if (i % 2 === 0) {
    out(`INSERT INTO daily_chant_log (id, person_id, entry_date, chanted, source, marked_by, marked_at)
VALUES ('${randomUUID()}', '${p.id}', '${today}', 1, 'coordinator', '${p.coordId}', '${now}');`);
  }
});

// Backdated chant history — makes the "one-month daily chanter" metric
// non-zero. About 60% of the daily-status chanters get 28-30 chant days
// in the last 30 days (they qualify as one-month-daily, threshold=25).
// The other 40% get fewer days so they don't qualify.
out(`\n-- 30-day chant history so one-month-daily count > 0`);
const dailyOnly = people.filter(p => p.status === "daily");
dailyOnly.forEach((p, i) => {
  const qualifies = i % 5 !== 0;   // 4 of 5 → qualifies (30 days), 1 of 5 → doesn't (only 10 days)
  const daysBack = qualifies ? 30 : 10;
  for (let d = 1; d < daysBack; d++) {
    const day = new Date(today + "T00:00:00Z");
    day.setUTCDate(day.getUTCDate() - d);
    const iso = day.toISOString().slice(0, 10);
    out(`INSERT INTO daily_chant_log (id, person_id, entry_date, chanted, source, marked_by, marked_at)
VALUES ('${randomUUID()}', '${p.id}', '${iso}', 1, 'coordinator', '${p.coordId}', '${now}');`);
  }
});

// Real Plan-2 NJY event calendar per IT SKBT - NJY-BV Thoughts.md.
out(`\n-- NJY events per Plan 2 calendar (Oct-Dec 2026)`);
const events = [
  { kind: "njy1", name: "[DEMO] NJY 1 · Saturday", date: "2026-10-03", venue: "Temple hall",     cap: 1000, batch: 1 },
  { kind: "njy1", name: "[DEMO] NJY 1 · Sunday",   date: "2026-10-04", venue: "Temple hall",     cap: 1000, batch: 2 },
  { kind: "njy2", name: "[DEMO] NJY 2 · Saturday", date: "2026-10-31", venue: "Prasadam hall",   cap: 800,  batch: 1 },
  { kind: "njy2", name: "[DEMO] NJY 2 · Sunday",   date: "2026-11-01", venue: "Prasadam hall",   cap: 800,  batch: 2 },
  { kind: "njy3", name: "[DEMO] NJY 3 · Saturday", date: "2026-12-12", venue: "Kirtan mandap",   cap: 600,  batch: 1 },
  { kind: "njy3", name: "[DEMO] NJY 3 · Sunday",   date: "2026-12-13", venue: "Kirtan mandap",   cap: 600,  batch: 2 },
  { kind: "children_program", name: "[DEMO] Sunday School (past)", date: "2026-08-10", venue: "Temple hall", cap: 100, batch: null },
];
const eventIds = [];
for (const ev of events) {
  const id = randomUUID();
  eventIds.push({ id, ...ev });
  out(`INSERT INTO events (id, kind, name, event_date, event_time, venue, capacity, batch_number, active, created_at)
VALUES ('${id}', '${ev.kind}', '${ev.name}', '${ev.date}', ${ev.date < "2026-09-01" ? "'18:00'" : "'18:00'"}, '${ev.venue}', ${ev.cap}, ${ev.batch == null ? "NULL" : ev.batch}, 1, '${now}');`);
}

// Mark ~15 chanters as having attended the past Sunday School so the
// attendance count on that event isn't zero for the demo.
out(`\n-- Attendance for the "past" Sunday School event so the number shows up`);
const pastEvent = eventIds.find(e => e.date < "2026-09-01");
people.slice(0, 15).forEach((p) => {
  out(`INSERT INTO attendance (id, event_id, person_id, attended, marked_by, marked_at)
VALUES ('${randomUUID()}', '${pastEvent.id}', '${p.id}', 1, '${p.coordId}', '${now}');`);
});

// A pair of illustrative BV structure rows so the BV tab has something
// to look at when Prabhuji navigates there.
out(`\n-- BV structure sample rows (2 circles, 1 sector, 1 BV group)`);
const gKrsna    = randomUUID();
const gBalarama = randomUUID();
const gSubala   = randomUUID();
const gBvAlpha  = randomUUID();
out(`INSERT INTO groups (id, name, kind, active, created_at, updated_at)
VALUES ('${gKrsna}', 'Demo Krsna Circle', 'circle', 1, '${now}', '${now}');`);
out(`INSERT INTO groups (id, name, kind, active, created_at, updated_at)
VALUES ('${gBalarama}', 'Demo Balarama Circle', 'circle', 1, '${now}', '${now}');`);
out(`INSERT INTO groups (id, name, kind, parent_group_id, circle_name, active, created_at, updated_at)
VALUES ('${gSubala}', 'Demo Subala Sector', 'sector', '${gKrsna}', 'Krsna', 1, '${now}', '${now}');`);
out(`INSERT INTO groups (id, name, kind, parent_group_id, circle_name, sector_name, meeting_day, meeting_time, meeting_venue, target_strength, active, created_at, updated_at)
VALUES ('${gBvAlpha}', 'Demo BV Alpha', 'bv_group', '${gSubala}', 'Krsna', 'Subala', 'Sun', '18:00', 'Room 101', 25, 1, '${now}', '${now}');`);

// A few pending duties on demo-coord1 so the Duties tab has content.
out(`\n-- Duties for demo-coord1 so the Duties tab has content`);
for (const [kind, notes] of [
  ["call_members_weekly", "15 chanters to call before Sunday"],
  ["prepare_bvgm",        "Prep material for weekly meeting"],
  ["report_to_ss",        "Weekly report to Sector Servant"],
]) {
  out(`INSERT INTO duties (id, user_id, kind, due_date, active)
VALUES ('${randomUUID()}', '${c1}', '${kind}', '${today}', 1);`);
}

out(`\n-- Demo seed complete.`);
