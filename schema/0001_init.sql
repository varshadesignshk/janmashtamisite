-- NJY app — initial schema.
--
-- Runs on Cloudflare D1 (SQLite). All ids are TEXT (uuid v4 or short
-- hash). Timestamps are ISO-8601 strings in the temple's timezone
-- (Asia/Kolkata) — see wrangler.toml APP_TZ. Booleans stored as
-- INTEGER 0/1. Soft-delete via active=0, never DELETE FROM.
--
-- The 14 tables cover all four phases of Plan 2. Screens for later
-- phases are gated by the feature_gates row, so tables are created
-- empty and fill as those phases roll out.

------------------------------------------------------------ people ---
-- The 30,000 chanters + eventual BV members. Phase 1 needs only
-- name, phone, status. All other columns are nullable and fill in
-- as members progress through Member Details (P4) and Sadhana (P3).
CREATE TABLE IF NOT EXISTS people (
  id                    TEXT PRIMARY KEY,
  legal_name            TEXT NOT NULL,
  gender                TEXT,                     -- M/F/O
  dob                   TEXT,                     -- YYYY-MM-DD
  age                   INTEGER,
  marital_status        TEXT,                     -- single/married
  num_children          INTEGER,
  spouse_name           TEXT,
  spouse_dob            TEXT,
  wedding_anniversary   TEXT,
  address               TEXT,
  phone                 TEXT NOT NULL,
  email                 TEXT,
  education             TEXT,
  occupation            TEXT,
  organization          TEXT,
  designation           TEXT,
  languages_known       TEXT,                     -- csv or json
  photo_url             TEXT,
  status                TEXT NOT NULL DEFAULT 'chanter',
                        -- chanter / qualified / daily / njy1 / njy2 /
                        -- njy3 / manjari / bv_member / dropped
  contact_state         INTEGER NOT NULL DEFAULT 0,
                        -- 0 uncontacted  1 followed_up
                        -- 2 responded    3 needs_visit
                        -- (per-person; carried over from primitive.
                        -- distinct from lifecycle status above.)
  last_marked_at        TEXT,
  last_marked_by        TEXT REFERENCES users(id),
  assigned_to_user_id   TEXT REFERENCES users(id),
                        -- fast lookup: which coordinator owns this
                        -- person's roll. Denormalised from
                        -- group_membership for the common query.
  notes                 TEXT,
  active                INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS people_phone_active
  ON people(phone) WHERE active = 1;
CREATE INDEX IF NOT EXISTS people_status_idx ON people(status);

-------------------------------------------------- person_stage_log ---
CREATE TABLE IF NOT EXISTS person_stage_log (
  id            TEXT PRIMARY KEY,
  person_id     TEXT NOT NULL REFERENCES people(id),
  from_status   TEXT,
  to_status     TEXT NOT NULL,
  changed_at    TEXT NOT NULL,
  changed_by    TEXT NOT NULL,                    -- user id
  reason        TEXT
);
CREATE INDEX IF NOT EXISTS person_stage_log_person_idx
  ON person_stage_log(person_id);

------------------------------------------------------------- users ---
-- ~330 rows total: HK Leader + 30 NJY leaders + 300 coordinators +
-- BV role holders (SL/SS/CS) once BV phase begins.
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  person_id     TEXT REFERENCES people(id),       -- nullable: HK Leader
                                                  -- may not be a "person"
  username      TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL,
                -- hk_leader | njy_leader | njy_coordinator |
                -- circle_servant | sector_servant | servant_leader |
                -- member
  phone         TEXT,
  email         TEXT,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL,
  last_login_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_active
  ON users(username) WHERE active = 1;
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

------------------------------------------------------------ groups ---
-- One row per group at any tier: NJY group, Manjari group, BV group.
-- parent_group_id lets us model BV sector → circle without a separate
-- table. For NJY groups, parent points at the NJY Leader's virtual
-- "leader-group" so a leader can query "groups I supervise".
CREATE TABLE IF NOT EXISTS groups (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  kind              TEXT NOT NULL,
                    -- njy_group | njy_leader_group | manjari | bv_group
                    -- | sector | circle
  parent_group_id   TEXT REFERENCES groups(id),
  circle_name       TEXT,                         -- denormalised
  sector_name       TEXT,                         -- denormalised
  leader_user_id    TEXT REFERENCES users(id),
  deputy_user_id    TEXT REFERENCES users(id),
  meeting_day       TEXT,                         -- Mon/Tue/...
  meeting_time      TEXT,                         -- HH:MM
  meeting_venue     TEXT,
  language          TEXT,
  start_date        TEXT,
  target_strength   INTEGER,
  active            INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS groups_kind_idx      ON groups(kind);
CREATE INDEX IF NOT EXISTS groups_parent_idx    ON groups(parent_group_id);
CREATE INDEX IF NOT EXISTS groups_leader_idx    ON groups(leader_user_id);

------------------------------------------------- group_membership ---
CREATE TABLE IF NOT EXISTS group_membership (
  id            TEXT PRIMARY KEY,
  person_id     TEXT NOT NULL REFERENCES people(id),
  group_id      TEXT NOT NULL REFERENCES groups(id),
  role          TEXT NOT NULL DEFAULT 'member',
                -- member | servant_leader | deputy | sector_servant |
                -- circle_servant | njy_coordinator | njy_leader
  joined_at     TEXT NOT NULL,
  left_at       TEXT,
  active        INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS group_membership_pair
  ON group_membership(person_id, group_id) WHERE active = 1;
CREATE INDEX IF NOT EXISTS group_membership_group_idx
  ON group_membership(group_id);
CREATE INDEX IF NOT EXISTS group_membership_person_idx
  ON group_membership(person_id);

--------------------------------------------------- daily_chant_log ---
-- One row per person per day once they commit to daily chanting.
CREATE TABLE IF NOT EXISTS daily_chant_log (
  id            TEXT PRIMARY KEY,
  person_id     TEXT NOT NULL REFERENCES people(id),
  entry_date    TEXT NOT NULL,                    -- YYYY-MM-DD
  chanted       INTEGER NOT NULL DEFAULT 1,
  rounds        INTEGER,
  source        TEXT NOT NULL DEFAULT 'coordinator',
                -- coordinator | self
  marked_by     TEXT REFERENCES users(id),
  marked_at     TEXT NOT NULL,
  notes         TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS daily_chant_unique
  ON daily_chant_log(person_id, entry_date);
CREATE INDEX IF NOT EXISTS daily_chant_date_idx
  ON daily_chant_log(entry_date);

------------------------------------------------------------ events ---
-- NJY yajnas (18 sessions across 3 months), BG sessions, BVGMs.
CREATE TABLE IF NOT EXISTS events (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL,
                -- njy1 | njy2 | njy3 | bg_session | bvgm |
                -- children_program | festival
  name          TEXT NOT NULL,
  event_date    TEXT NOT NULL,                    -- YYYY-MM-DD
  event_time    TEXT,                             -- HH:MM
  venue         TEXT,
  capacity      INTEGER,
  batch_number  INTEGER,                          -- 1..6 for NJYs
  group_id      TEXT REFERENCES groups(id),       -- for BVGMs
  notes         TEXT,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS events_date_idx ON events(event_date);
CREATE INDEX IF NOT EXISTS events_kind_idx ON events(kind);

-------------------------------------------------------- attendance ---
CREATE TABLE IF NOT EXISTS attendance (
  id            TEXT PRIMARY KEY,
  event_id      TEXT NOT NULL REFERENCES events(id),
  person_id     TEXT NOT NULL REFERENCES people(id),
  attended      INTEGER NOT NULL DEFAULT 1,
  marked_by     TEXT REFERENCES users(id),
  marked_at     TEXT NOT NULL,
  notes         TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS attendance_unique
  ON attendance(event_id, person_id);
CREATE INDEX IF NOT EXISTS attendance_person_idx
  ON attendance(person_id);

--------------------------------------------------- sadhana_entries ---
-- The 124-pt/day Sadhana Chart. Filled by BV members from P3 onward,
-- reviewed weekly by their SL.
CREATE TABLE IF NOT EXISTS sadhana_entries (
  id                TEXT PRIMARY KEY,
  person_id         TEXT NOT NULL REFERENCES people(id),
  entry_date        TEXT NOT NULL,                -- YYYY-MM-DD
  wake_up_time      TEXT,                         -- HH:MM
  wake_up_pts       INTEGER DEFAULT 0,
  mangala_arati_pts INTEGER DEFAULT 0,            -- 0 or 10
  rounds_before_7   INTEGER DEFAULT 0,
  rounds_7_8        INTEGER DEFAULT 0,
  rounds_8_10       INTEGER DEFAULT 0,
  rounds_after_10   INTEGER DEFAULT 0,
  chanting_pts      INTEGER DEFAULT 0,            -- computed on write
  reading_mins      INTEGER DEFAULT 0,
  reading_pts       INTEGER DEFAULT 0,
  hearing_mins      INTEGER DEFAULT 0,
  hearing_pts       INTEGER DEFAULT 0,
  seva_pts          INTEGER DEFAULT 0,            -- 0 or 10
  preaching_pts     INTEGER DEFAULT 0,            -- 0 or 10
  total_pts         INTEGER DEFAULT 0,            -- computed
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS sadhana_unique
  ON sadhana_entries(person_id, entry_date);

----------------------------------------------------- group_reports ---
-- The Group Planning Sheet, filed periodically by a Servant Leader.
CREATE TABLE IF NOT EXISTS group_reports (
  id                        TEXT PRIMARY KEY,
  group_id                  TEXT NOT NULL REFERENCES groups(id),
  reported_by               TEXT NOT NULL REFERENCES users(id),
  week_number               INTEGER,
  report_date               TEXT NOT NULL,
  period_start              TEXT,
  period_end                TEXT,
  -- A. Attendance
  avg_attendance            INTEGER,
  highest_attendance        INTEGER,
  irregular_members         INTEGER,
  children_program_avg      INTEGER,
  bvlc_avg                  INTEGER,
  -- B. Shiksha level
  brahmana_initiated        INTEGER,
  harinama_initiated        INTEGER,
  guru_ashraya              INTEGER,
  prabhupada_ashraya        INTEGER,
  krishna_sadhaka           INTEGER,
  krishna_sevaka            INTEGER,
  shraddhavan               INTEGER,
  potential_leaders         INTEGER,
  -- C. Preaching
  h2h_programs              INTEGER,
  nagara_sankirtans         INTEGER,
  outreach_programs         INTEGER,
  other_preaching           TEXT,
  -- D. Temple services
  temple_services_engaged   INTEGER,
  monthly_contributors      INTEGER,
  contribution_amount       INTEGER,
  life_members              INTEGER,
  service_details           TEXT,
  other_contribution        TEXT,
  created_at                TEXT NOT NULL,
  updated_at                TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS group_reports_group_idx
  ON group_reports(group_id, report_date DESC);

----------------------------------------------------------- duties ---
-- Recurring duties derived from BV Action Timeline. Generator inserts
-- rows ahead of due dates; UI ticks them done.
CREATE TABLE IF NOT EXISTS duties (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  kind          TEXT NOT NULL,
                -- call_member | prepare_bvgm | review_sadhana |
                -- review_homework | report_to_ss | meet_sl_weekly |
                -- visit_sl_monthly | convene_spm | organize_gls |
                -- mark_attendance | chant_hare_krsna | ...
  target_kind   TEXT,                             -- person | group | user
  target_id     TEXT,
  due_date      TEXT NOT NULL,                    -- YYYY-MM-DD
  done_at       TEXT,
  done_by       TEXT REFERENCES users(id),
  notes         TEXT,
  active        INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS duties_user_due
  ON duties(user_id, due_date) WHERE active = 1 AND done_at IS NULL;

---------------------------------------------------- feature_gates ---
-- RBAC feature registry. Handlers and UI read from here to decide
-- whether a screen or endpoint is visible/callable for a given role.
-- Seeded with sensible defaults; HK Leader can widen visibility as
-- phases roll out without a redeploy.
CREATE TABLE IF NOT EXISTS feature_gates (
  feature_key   TEXT PRIMARY KEY,
  allowed_roles TEXT NOT NULL,                    -- csv of role names
  description   TEXT,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT
);

INSERT OR IGNORE INTO feature_gates (feature_key, allowed_roles, description, updated_at) VALUES
  ('coordinator_roll',       'njy_coordinator,njy_leader,hk_leader',                     'Daily chanter roll and mark',        datetime('now')),
  ('leader_dashboard',       'njy_leader,hk_leader',                                     'NJY leader view of their coordinators', datetime('now')),
  ('hk_dashboard',           'hk_leader',                                                'HK-wide totals and admin',           datetime('now')),
  ('bulk_import',            'hk_leader',                                                'CSV import of chanters',             datetime('now')),
  ('feature_admin',          'hk_leader',                                                'Toggle feature-gate visibility',     datetime('now')),
  ('sadhana_chart',          'hk_leader',                                                'Daily 124-pt sadhana entry',         datetime('now')),
  ('group_planning_sheet',   'hk_leader',                                                'BV group periodic report',           datetime('now')),
  ('bv_structure_editor',    'hk_leader',                                                'Circles/sectors/BV group setup',     datetime('now')),
  ('action_timeline_duties', 'hk_leader',                                                'Auto-generated duty reminders',      datetime('now')),
  ('member_details_full',    'hk_leader',                                                'Full Member Details form',           datetime('now')),
  ('event_attendance',       'njy_coordinator,njy_leader,hk_leader',                     'NJY yajna attendance capture',       datetime('now')),
  ('whatsapp_deeplink',      'njy_coordinator,njy_leader,hk_leader,servant_leader',      'wa.me buttons on rows',              datetime('now')),
  ('web_push',               'njy_coordinator,njy_leader,hk_leader,servant_leader',      'PWA push notifications',             datetime('now'));

---------------------------------------------------- notifications ---
-- Outbox for the notification adapter. wa-deeplink rows are just
-- audit trail (the UI actually opens WhatsApp); web-push / wa-cloud
-- rows drive real sends.
CREATE TABLE IF NOT EXISTS notifications (
  id                TEXT PRIMARY KEY,
  kind              TEXT NOT NULL,                -- web-push | wa-deeplink | wa-cloud | sms
  target_user_id    TEXT REFERENCES users(id),
  target_person_id  TEXT REFERENCES people(id),
  payload           TEXT NOT NULL,                -- json
  scheduled_for     TEXT,
  sent_at           TEXT,
  status            TEXT NOT NULL DEFAULT 'pending',
                    -- pending | sent | failed | skipped
  error             TEXT,
  created_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS notifications_status_idx
  ON notifications(status, scheduled_for);

------------------------------------------ web_push_subscriptions ---
CREATE TABLE IF NOT EXISTS web_push_subscriptions (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  endpoint      TEXT NOT NULL,
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS web_push_endpoint_unique
  ON web_push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS web_push_user_idx
  ON web_push_subscriptions(user_id);

-------------------------------------------------------------- meta ---
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', '0001');
