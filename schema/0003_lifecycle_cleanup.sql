-- Phase-1 build 2026-08-24 — retire the 'qualified' lifecycle stage.
--
-- New enum: chanter → daily → njy1 → njy2 → njy3 → manjari → bv_member → dropped.
-- Existing rows with the retired value fall back to 'chanter'.

UPDATE people SET status = 'chanter' WHERE status = 'qualified';
