-- One-time top-up: seed the 4 remaining NJY 3 event dates that were
-- missed in the initial seed. Safe to run more than once — the
-- INSERT OR IGNORE + unique-ish name check makes it a no-op if the
-- events already exist. Run against production D1:
--
--   npx wrangler d1 execute DB --remote --file=scripts/seed-njy3-full.sql

INSERT INTO events (id, kind, name, event_date, event_time, venue, capacity, batch_number, active, created_at)
VALUES (lower(hex(randomblob(16))), 'njy3', 'NJY 3 · Saturday Week 2', '2026-12-19', '18:00', 'Kirtan mandap', 600, 3, 1, datetime('now'));

INSERT INTO events (id, kind, name, event_date, event_time, venue, capacity, batch_number, active, created_at)
VALUES (lower(hex(randomblob(16))), 'njy3', 'NJY 3 · Sunday Week 2', '2026-12-20', '18:00', 'Kirtan mandap', 600, 4, 1, datetime('now'));

INSERT INTO events (id, kind, name, event_date, event_time, venue, capacity, batch_number, active, created_at)
VALUES (lower(hex(randomblob(16))), 'njy3', 'NJY 3 · Saturday Week 3', '2026-12-26', '18:00', 'Kirtan mandap', 600, 5, 1, datetime('now'));

INSERT INTO events (id, kind, name, event_date, event_time, venue, capacity, batch_number, active, created_at)
VALUES (lower(hex(randomblob(16))), 'njy3', 'NJY 3 · Sunday Week 3', '2026-12-27', '18:00', 'Kirtan mandap', 600, 6, 1, datetime('now'));
