// Generate the SQL to seed the very first HK Leader account in a
// freshly-migrated D1 database. Run once after `wrangler d1 migrations
// apply DB --remote`.
//
// Usage:
//   node scripts/seed-prod.js "SomeStrong-Passphrase-2026"
// then paste the printed SQL into:
//   wrangler d1 execute DB --remote --command "…paste here…"
// or write to a file and:
//   wrangler d1 execute DB --remote --file=./seed.sql

import { hashPassword } from "../lib/auth.js";
import { randomUUID } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error("usage: node scripts/seed-prod.js <hk-leader-password>");
  process.exit(1);
}
if (password.length < 12) {
  console.error("please choose a passphrase of at least 12 characters.");
  process.exit(1);
}

const id = randomUUID();
const hash = await hashPassword(password);
const now = new Date().toISOString();

const sql = `INSERT INTO users
  (id, username, password_hash, display_name, role, active, created_at)
 VALUES
  ('${id}',
   'hk',
   '${hash}',
   'HK Leader',
   'hk_leader',
   1,
   '${now}');`;

console.log(sql);
console.error("\nNext:");
console.error("  wrangler d1 execute DB --remote --command \"…the SQL above…\"");
console.error("  Or save the SQL to seed.sql and run:");
console.error("  wrangler d1 execute DB --remote --file=./seed.sql");
