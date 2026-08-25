-- Re-assign SL ranges to demo coordinators using the 10001-based
-- starting point. Safe to run multiple times — UPDATEs are idempotent.
-- If any coord already has entered people with sl_no = 10000 (from an
-- earlier 10000-based allocation), those rows will now sit outside
-- their new range but stay valid.

UPDATE users SET sl_range_start = 10001, sl_range_end = 10100 WHERE username = 'demo-coord1';
UPDATE users SET sl_range_start = 10101, sl_range_end = 10200 WHERE username = 'demo-coord2';
UPDATE users SET sl_range_start = 10201, sl_range_end = 10300 WHERE username = 'demo-coord3';
UPDATE users SET sl_range_start = 10301, sl_range_end = 10400 WHERE username = 'demo-coord4';
UPDATE users SET sl_range_start = 10401, sl_range_end = 10500 WHERE username = 'demo-coord5';
UPDATE users SET sl_range_start = 10501, sl_range_end = 10600 WHERE username = 'demo-coord6';
