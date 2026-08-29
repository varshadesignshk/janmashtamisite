-- Split the umbrella `feature_admin` gate into per-sub-tab gates so
-- HK Leader can disable individual admin screens (e.g. lock Bulk
-- create users during the event to prevent accidental account changes)
-- without redeploying.
--
-- Default access for every new sub-gate: hk_leader only. HK Leader
-- also implicitly sees every gate via the can() helper, so this is
-- effectively "on for HK, off for everyone else until you widen it".

INSERT OR IGNORE INTO feature_gates (feature_key, allowed_roles, description, updated_at) VALUES
  ('admin_gates',            'hk_leader', 'Admin: Feature gates sub-tab',           datetime('now')),
  ('admin_users',            'hk_leader', 'Admin: Users sub-tab (manual add/edit)', datetime('now')),
  ('admin_users_bulk',       'hk_leader', 'Admin: Bulk create users sub-tab',       datetime('now')),
  ('admin_import_chanters',  'hk_leader', 'Admin: Bulk import chanters sub-tab',    datetime('now')),
  ('admin_events',           'hk_leader', 'Admin: Events sub-tab',                  datetime('now'));
