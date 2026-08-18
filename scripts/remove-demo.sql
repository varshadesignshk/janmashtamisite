-- Nuke everything the seed-demo script created. Safe to run anytime.
-- All demo rows are tagged by:
--   - chanter phone prefix +919999
--   - username prefix "demo-"
--   - group name prefix "Demo "
--   - event name prefix "[DEMO] "
--
-- We DELETE in child-first order so foreign key references are freed.

DELETE FROM attendance
 WHERE person_id IN (SELECT id FROM people WHERE phone LIKE '+919999%')
    OR event_id  IN (SELECT id FROM events WHERE name LIKE '[DEMO]%');

DELETE FROM daily_chant_log
 WHERE person_id IN (SELECT id FROM people WHERE phone LIKE '+919999%');

DELETE FROM person_stage_log
 WHERE person_id IN (SELECT id FROM people WHERE phone LIKE '+919999%');

DELETE FROM group_membership
 WHERE person_id IN (SELECT id FROM people WHERE phone LIKE '+919999%')
    OR group_id  IN (SELECT id FROM groups WHERE name LIKE 'Demo %');

DELETE FROM duties
 WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'demo-%');

DELETE FROM notifications
 WHERE target_user_id  IN (SELECT id FROM users WHERE username LIKE 'demo-%')
    OR target_person_id IN (SELECT id FROM people WHERE phone LIKE '+919999%');

DELETE FROM people WHERE phone LIKE '+919999%';
DELETE FROM events WHERE name LIKE '[DEMO]%';
DELETE FROM groups WHERE name LIKE 'Demo %';
DELETE FROM users  WHERE username LIKE 'demo-%';
