-- Nuke everything the seed-demo script created. Safe to run anytime.
-- All demo rows are tagged by:
--   - chanter phone prefix +919999
--   - username prefix "demo-"
--   - group name prefix "Demo "
--   - event name prefix "[DEMO] "
--
-- Any NON-demo rows that reference a demo user (e.g. Padma is assigned
-- to demo-coord1) get their FK columns nulled first so the demo user
-- delete doesn't hit a foreign-key constraint.

-- Step 1 — null out any references from non-demo rows to demo users.
UPDATE people
   SET assigned_to_user_id = NULL
 WHERE assigned_to_user_id IN (SELECT id FROM users WHERE username LIKE 'demo-%');

UPDATE people
   SET last_marked_by = NULL
 WHERE last_marked_by IN (SELECT id FROM users WHERE username LIKE 'demo-%');

UPDATE daily_chant_log
   SET marked_by = NULL
 WHERE marked_by IN (SELECT id FROM users WHERE username LIKE 'demo-%');

UPDATE attendance
   SET marked_by = NULL
 WHERE marked_by IN (SELECT id FROM users WHERE username LIKE 'demo-%');

UPDATE groups
   SET leader_user_id = NULL
 WHERE leader_user_id IN (SELECT id FROM users WHERE username LIKE 'demo-%');

UPDATE groups
   SET deputy_user_id = NULL
 WHERE deputy_user_id IN (SELECT id FROM users WHERE username LIKE 'demo-%');

UPDATE duties
   SET done_by = NULL
 WHERE done_by IN (SELECT id FROM users WHERE username LIKE 'demo-%');

-- Step 2 — DELETE demo-tagged rows in child-first order.
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
