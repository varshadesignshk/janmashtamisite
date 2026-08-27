// Point computations for the two leaderboards. All numbers derive from
// existing tables (people, daily_chant_log, attendance, events) so no
// new schema is needed. See §6 of memory/post-demo-features.md for the
// full rule matrix.
//
// Scope: NJY Coordinators only. Higher-tier users don't compete.

import { todayInTz, daysBetween } from "./ids.js";

const JANMASHTAMI_DATE = "2026-08-25";
const PHASE1_START = "2026-08-18";

// Compute the daily-board points earned by one coord on `dateIso`.
export async function scoreDailyForCoord(store, coord, dateIso) {
  const roll = await store.peopleAssignedTo(coord.id);
  let pts = 0;
  const bd = [];

  // +10 per chanter marked chanted today
  let chantedCount = 0;
  for (const p of roll) {
    const c = await store.chantOnDate(p.id, dateIso);
    if (c && c.chanted) chantedCount++;
  }
  if (chantedCount) { pts += chantedCount * 10; bd.push({ k: "chanted", n: chantedCount, pts: chantedCount * 10 }); }

  // +5 per follow-up whose last_marked_at is today (approximates the
  // count of people the coord touched today; each person once)
  const followUps = roll.filter(p => (p.last_marked_at || "").slice(0, 10) === dateIso).length;
  if (followUps) { pts += followUps * 5; bd.push({ k: "follow_up", n: followUps, pts: followUps * 5 }); }

  // +50 per NJY event attendance today (marked_at is today)
  const events = await store.listEvents();
  const rollIds = new Set(roll.map(p => p.id));
  let njyAttendedToday = 0;
  for (const ev of events) {
    if (ev.event_date !== dateIso) continue;
    if (!/^njy/.test(ev.kind)) continue;
    const att = await store.attendanceForEvent(ev.id);
    njyAttendedToday += att.filter(a => a.attended && rollIds.has(a.person_id)).length;
  }
  if (njyAttendedToday) { pts += njyAttendedToday * 50; bd.push({ k: "njy_attend", n: njyAttendedToday, pts: njyAttendedToday * 50 }); }

  // Perfect-day bonus: all daily-status chanters in the roll marked
  // chanted today. Only fires if there are daily chanters at all.
  const dailyOnes = roll.filter(p => p.status === "daily");
  if (dailyOnes.length) {
    let allChanted = true;
    for (const p of dailyOnes) {
      const c = await store.chantOnDate(p.id, dateIso);
      if (!c || !c.chanted) { allChanted = false; break; }
    }
    if (allChanted) { pts += 50; bd.push({ k: "perfect_day", n: 1, pts: 50 }); }
  }

  return { user_id: coord.id, name: coord.display_name, pts, breakdown: bd };
}

// Compute the overall (P1+P2) points for one coord. Sums up chant days,
// follow-ups, attendance, plus Janmashtami-day entry/commit bonuses,
// plus the three milestone bonuses.
export async function scoreOverallForCoord(store, coord) {
  const roll = await store.peopleAssignedTo(coord.id);
  const today = todayInTz();
  let pts = 0;
  const bd = [];

  // Single aggregate query for the whole coord's roll — was N*M loop
  // before and timing out Workers on real data.
  const totalChantDays = await store.countChantDaysForCoord(coord.id, PHASE1_START, today);
  if (totalChantDays) { pts += totalChantDays * 10; bd.push({ k: "chant_days", n: totalChantDays, pts: totalChantDays * 10 }); }

  // Follow-up approximation — one point-per-person-touched using
  // last_marked_at snapshotting (undercounts but stable). Kept simple.
  const touched = roll.filter(p => p.last_marked_at && p.last_marked_at.slice(0, 10) >= PHASE1_START).length;
  if (touched) { pts += touched * 5; bd.push({ k: "follow_ups", n: touched, pts: touched * 5 }); }

  // Attendance across all NJY events in the roll
  const events = await store.listEvents();
  const rollIds = new Set(roll.map(p => p.id));
  let njyAttends = 0;
  const attendedNjy1 = new Set(), attendedNjy2 = new Set(), attendedNjy3 = new Set();
  for (const ev of events) {
    if (!/^njy/.test(ev.kind)) continue;
    const att = await store.attendanceForEvent(ev.id);
    for (const a of att) {
      if (!a.attended || !rollIds.has(a.person_id)) continue;
      njyAttends++;
      if (ev.kind === "njy1") attendedNjy1.add(a.person_id);
      if (ev.kind === "njy2") attendedNjy2.add(a.person_id);
      if (ev.kind === "njy3") attendedNjy3.add(a.person_id);
    }
  }
  if (njyAttends) { pts += njyAttends * 50; bd.push({ k: "njy_attends", n: njyAttends, pts: njyAttends * 50 }); }

  // +100 per person who attended all three NJYs (streak bonus)
  const triple = [...attendedNjy1].filter(id => attendedNjy2.has(id) && attendedNjy3.has(id)).length;
  if (triple) { pts += triple * 100; bd.push({ k: "njy_triple", n: triple, pts: triple * 100 }); }

  // Janmashtami-day entry points
  const jm = roll.filter(p => (p.created_at || "").slice(0, 10) === JANMASHTAMI_DATE);
  if (jm.length) {
    pts += jm.length * 5;
    bd.push({ k: "jm_entries", n: jm.length, pts: jm.length * 5 });
    for (const t of [25, 50, 75, 100]) {
      if (jm.length >= t) { pts += t; bd.push({ k: `jm_entry_tier_${t}`, n: 1, pts: t }); }
    }
  }
  // Janmashtami daily-commitment points — anyone entered that day with
  // status=daily counts. Retro-changes to status don't retro-earn.
  const jmCommit = jm.filter(p => p.status === "daily");
  if (jmCommit.length) {
    pts += jmCommit.length * 10;
    bd.push({ k: "jm_daily_commits", n: jmCommit.length, pts: jmCommit.length * 10 });
    for (const [t, bonus] of [[15, 30], [25, 50], [50, 100]]) {
      if (jmCommit.length >= t) { pts += bonus; bd.push({ k: `jm_commit_tier_${t}`, n: 1, pts: bonus }); }
    }
  }

  // Milestone: 35/50 one-month-daily. Uses store.oneMonthDailyCountFor.
  const monthly = await store.oneMonthDailyCountFor(coord.id, today);
  if (monthly.one_month_daily >= 35) {
    pts += 200; bd.push({ k: "milestone_35_one_month", n: 1, pts: 200 });
  }
  // Milestone: 16/50 NJY 2 attendees
  if (attendedNjy2.size >= 16) {
    pts += 200; bd.push({ k: "milestone_16_njy2", n: 1, pts: 200 });
  }
  // Milestone: 12/50 NJY 3 attendees
  if (attendedNjy3.size >= 12) {
    pts += 400; bd.push({ k: "milestone_12_njy3", n: 1, pts: 400 });
  }

  return { user_id: coord.id, name: coord.display_name, pts, breakdown: bd };
}
