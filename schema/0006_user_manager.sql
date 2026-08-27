-- Coordinator → NJY-Leader relationship. Each NJY Coordinator can
-- have one NJY Leader as their manager. Leaders don't have managers
-- (they answer to HK).

ALTER TABLE users ADD COLUMN manager_user_id TEXT REFERENCES users(id);
CREATE INDEX IF NOT EXISTS users_manager_idx ON users(manager_user_id);
