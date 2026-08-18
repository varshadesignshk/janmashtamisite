// Local preview — run the real app on a memory store, no Cloudflare
// setup required. `node scripts/preview.js` → http://localhost:8787
//
// Matches primitive/scripts/preview.js: the point is to render the UI
// against sample data using the same handlers that ship to production.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { route } from "../lib/handlers.js";
import { memoryStore } from "../lib/store-memory.js";
import { hashPassword } from "../lib/auth.js";
import { registerBuiltins } from "../lib/notify.js";

const HERE = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC = resolve(HERE, "public");
const PORT = Number(process.env.PORT || 8787);
const SESSION_SECRET = process.env.SESSION_SECRET || "preview-secret";

registerBuiltins();

async function seed() {
  const s = memoryStore();
  for (const [k, roles] of Object.entries({
    coordinator_roll:      ["njy_coordinator", "njy_leader", "hk_leader"],
    leader_dashboard:      ["njy_leader", "hk_leader"],
    hk_dashboard:          ["hk_leader"],
    bulk_import:           ["hk_leader"],
    feature_admin:         ["hk_leader"],
    whatsapp_deeplink:     ["njy_coordinator","njy_leader","hk_leader"],
    sadhana_chart:         ["hk_leader"],
    group_planning_sheet:  ["hk_leader"],
    bv_structure_editor:   ["hk_leader"],
    action_timeline_duties:["hk_leader"],
    member_details_full:   ["hk_leader"],
    event_attendance:      ["njy_coordinator","njy_leader","hk_leader"],
    web_push:              ["njy_coordinator","njy_leader","hk_leader","servant_leader"],
  })) await s.setFeatureGate(k, roles, "system");

  const pw = await hashPassword("janmashtami25");
  const hk = await s.createUser({ username: "hk", password_hash: pw, display_name: "HK Leader", role: "hk_leader" });
  const leader = await s.createUser({ username: "leader1", password_hash: pw, display_name: "NJY Leader One", role: "njy_leader" });
  const coord = await s.createUser({ username: "coord1", password_hash: pw, display_name: "Sri Coordinator", role: "njy_coordinator" });
  const coord2 = await s.createUser({ username: "coord2", password_hash: pw, display_name: "Anand Coordinator", role: "njy_coordinator" });

  const NAMES = ["Ravi","Priya","Anand","Bhakti","Chaitanya","Damodar","Ekadasi","Ganga","Hanuman","Isha","Jagannath","Krishna","Lila","Madhava","Nitya","Parvati","Radha","Sita","Tulasi","Uma"];
  const people = [];
  for (let i = 0; i < NAMES.length; i++) {
    people.push(await s.createPerson({
      legal_name: NAMES[i],
      phone: `+9199990000${String(i + 1).padStart(2, "0")}`,
      assigned_to_user_id: (i < 12 ? coord.id : coord2.id),
    }));
  }

  // A couple of BV structure entries so the BV tab isn't empty.
  const CIRCLES = ["Krsna","Balarama","Gauranga","Nityananda","Nrsimha","Laksmi"];
  for (const c of CIRCLES) await s.createGroup({ name: `${c} Circle`, kind: "circle" });
  await s.createGroup({ name: "Subala Sector", kind: "sector", circle_name: "Krsna" });
  await s.createGroup({ name: "BV Alpha", kind: "bv_group", circle_name: "Krsna", sector_name: "Subala", meeting_day: "Sun", meeting_time: "18:00", target_strength: 25 });

  // A couple of events (2026 Janmashtami-adjacent samples).
  await s.createEvent({ kind: "njy1", name: "NJY 1 · Saturday", event_date: "2026-09-05", venue: "Temple hall", capacity: 1000, batch_number: 1 });
  await s.createEvent({ kind: "njy1", name: "NJY 1 · Sunday",   event_date: "2026-09-06", venue: "Temple hall", capacity: 1000, batch_number: 2 });
  await s.createEvent({ kind: "bg_session", name: "First BG session", event_date: "2026-09-05" });

  // Duties: one for the leader, one for coord.
  await s.createDuty({ user_id: leader.id, kind: "meet_sl_weekly",     due_date: "2026-08-24", notes: "Meet Sri Coordinator" });
  await s.createDuty({ user_id: coord.id,  kind: "call_members_weekly", due_date: "2026-08-24", notes: "12 members due this week" });

  return s;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".ico":  "image/x-icon",
  ".png":  "image/png",
  ".svg":  "image/svg+xml",
};

async function serveStatic(pathname) {
  let p = pathname === "/" ? "/index.html" : pathname;
  const abs = resolve(join(PUBLIC, p));
  if (!abs.startsWith(PUBLIC)) return new Response("nope", { status: 400 });
  try {
    const st = await stat(abs);
    if (!st.isFile()) throw 0;
    const buf = await readFile(abs);
    return new Response(buf, {
      status: 200,
      headers: { "content-type": MIME[extname(abs)] || "application/octet-stream" },
    });
  } catch {
    // SPA fallback: unknown non-api routes serve index.html.
    if (!pathname.startsWith("/api/")) {
      const buf = await readFile(join(PUBLIC, "index.html"));
      return new Response(buf, { status: 200, headers: { "content-type": MIME[".html"] } });
    }
    return new Response("not found", { status: 404 });
  }
}

const store = await seed();

const server = createServer(async (req, res) => {
  const url = "http://" + req.headers.host + req.url;
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  const body = Buffer.concat(chunks);
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: body.length ? body : undefined,
    duplex: "half",
  });
  let response;
  if (new URL(url).pathname.startsWith("/api/")) {
    response = await route(request, {
      store, env: { SESSION_SECRET, APP_TZ: "Asia/Kolkata" },
    });
  } else {
    response = await serveStatic(new URL(url).pathname);
  }
  res.statusCode = response.status;
  for (const [k, v] of response.headers) {
    // Preview server uses http:// not https:// — strip Secure from the
    // cookie so localhost actually stores the session.
    if (k.toLowerCase() === "set-cookie") res.setHeader(k, String(v).replace(/;\s*Secure/i, ""));
    else res.setHeader(k, v);
  }
  const buf = Buffer.from(await response.arrayBuffer());
  res.end(buf);
});

function listenOn(port, tries = 5) {
  server.once("error", (err) => {
    if (err.code === "EADDRINUSE" && tries > 0) {
      console.log(`port ${port} in use, trying ${port + 1}...`);
      listenOn(port + 1, tries - 1);
    } else {
      console.error(err);
      process.exit(1);
    }
  });
  server.listen(port, () => {
    console.log(`\nNJY preview at http://localhost:${port}`);
    console.log(`  hk       / janmashtami25   (HK Leader — sees everything)`);
    console.log(`  leader1  / janmashtami25   (NJY Leader — team + drill-in)`);
    console.log(`  coord1   / janmashtami25   (NJY Coordinator — 12 chanters)`);
    console.log(`  coord2   / janmashtami25   (NJY Coordinator — 8 chanters)\n`);
  });
}
listenOn(PORT);
