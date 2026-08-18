-- Phase-parameter fields per IT SKBT - NJY-BV Thoughts.md.
--
-- Adds:
--   - pincode column on people (used later to auto-group into NJY groups
--     of 40 daily chanters by geography)
--   - krishna_upasaka column on group_reports (missing shiksha level
--     from Phase 4 that wasn't in the original schema)
--   - bv_week column on groups (Phase 4 lifecycle counter: BV Week 1
--     through BV Week 64+)

ALTER TABLE people        ADD COLUMN pincode TEXT;
ALTER TABLE group_reports ADD COLUMN krishna_upasaka INTEGER;
ALTER TABLE groups        ADD COLUMN bv_week INTEGER;

CREATE INDEX IF NOT EXISTS people_pincode_idx ON people(pincode);
