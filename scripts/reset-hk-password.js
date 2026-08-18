// Reset (or create) the HK Leader account with a fresh password.
// Works whether or not an 'hk' row already exists — deletes then inserts.
//
// Usage:
//   node scripts/reset-hk-password.js <the-passphrase> > reset.sql
//   npx wrangler d1 execute DB --remote --file=reset.sql
//   del reset.sql

import { hashPassword } from "../lib/auth.js";
import { randomUUID } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("usage: node scripts/reset-hk-password.js <passphrase>  (min 12 chars)");
  process.exit(1);
}

const id = randomUUID();
const hash = await hashPassword(password);
const now = new Date().toISOString();

// Two statements: wipe any existing hk row, then insert a fresh one
// with the given passphrase's hash.
console.log(`DELETE FROM users WHERE username = 'hk';`);
console.log(`INSERT INTO users
  (id, username, password_hash, display_name, role, active, created_at)
 VALUES
  ('${id}',
   'hk',
   '${hash}',
   'HK Leader',
   'hk_leader',
   1,
   '${now}');`);
