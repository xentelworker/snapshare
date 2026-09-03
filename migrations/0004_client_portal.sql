ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'host';
ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;

UPDATE users SET role='admin' WHERE id IN (SELECT DISTINCT owner_id FROM events);

CREATE TABLE IF NOT EXISTS client_event_access(
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  can_edit_branding INTEGER NOT NULL DEFAULT 1,
  can_manage_media INTEGER NOT NULL DEFAULT 1,
  can_manage_albums INTEGER NOT NULL DEFAULT 1,
  can_view_rsvp INTEGER NOT NULL DEFAULT 1,
  can_manage_guestbook INTEGER NOT NULL DEFAULT 1,
  can_download INTEGER NOT NULL DEFAULT 1,
  can_edit_features INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(event_id,user_id),
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_client_event_access_user ON client_event_access(user_id,event_id);
