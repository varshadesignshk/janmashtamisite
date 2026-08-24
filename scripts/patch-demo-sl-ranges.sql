-- One-time patch: assign SL ranges to existing demo coordinators
-- so their Janmashtami rapid-entry actually works. Safe to run more
-- than once — UPDATEs are idempotent.

UPDATE users SET sl_range_start = 10000, sl_range_end = 10099 WHERE username = 'demo-coord1';
UPDATE users SET sl_range_start = 10100, sl_range_end = 10199 WHERE username = 'demo-coord2';
UPDATE users SET sl_range_start = 10200, sl_range_end = 10299 WHERE username = 'demo-coord3';
UPDATE users SET sl_range_start = 10300, sl_range_end = 10399 WHERE username = 'demo-coord4';
UPDATE users SET sl_range_start = 10400, sl_range_end = 10499 WHERE username = 'demo-coord5';
UPDATE users SET sl_range_start = 10500, sl_range_end = 10599 WHERE username = 'demo-coord6';
