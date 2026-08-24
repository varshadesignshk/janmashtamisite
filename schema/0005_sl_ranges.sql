-- Per-coordinator serial-number ranges for Janmashtami rapid entry.
--
-- 300 coordinators × 100 sl numbers each:
--   Coord 1  → 10000..10099
--   Coord 2  → 10100..10199
--   …
--   Coord 300 → 39900..39999
--
-- Each Janmashtami entry gets the next unused sl_no from its coord's
-- range. Regular (non-Janmashtami) chanters keep sl_no NULL.

ALTER TABLE users  ADD COLUMN sl_range_start INTEGER;
ALTER TABLE users  ADD COLUMN sl_range_end   INTEGER;
ALTER TABLE people ADD COLUMN sl_no          INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS people_sl_no_unique
  ON people(sl_no) WHERE sl_no IS NOT NULL;
