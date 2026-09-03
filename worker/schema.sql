PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  recovery_hash TEXT NOT NULL,
  recovery_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'host',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS events(
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  event_date TEXT,
  access_key TEXT UNIQUE NOT NULL,
  welcome_message TEXT DEFAULT 'Welcome! Share your favorite moments with us.',
  primary_color TEXT DEFAULT '#111827',
  theme TEXT DEFAULT 'classic',
  font_family TEXT DEFAULT 'system',
  moderation_enabled INTEGER DEFAULT 0,
  allow_downloads INTEGER DEFAULT 1,
  allow_comments INTEGER DEFAULT 1,
  allow_rsvp INTEGER DEFAULT 1,
  allow_photo_uploads INTEGER DEFAULT 1,
  allow_video_uploads INTEGER DEFAULT 1,
  allow_written_guestbook INTEGER DEFAULT 1,
  allow_video_guestbook INTEGER DEFAULT 1,
  allow_audio_guestbook INTEGER DEFAULT 1,
  allow_gallery INTEGER DEFAULT 1,
  allow_slideshow INTEGER DEFAULT 1,
  allow_albums INTEGER DEFAULT 1,
  strip_image_metadata INTEGER DEFAULT 1,
  max_upload_mb INTEGER DEFAULT 50,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS albums(
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  name TEXT NOT NULL,
  access_key TEXT UNIQUE NOT NULL,
  is_private INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS media(
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  album_id TEXT,
  guest_name TEXT NOT NULL,
  filename TEXT NOT NULL,
  object_key TEXT UNIQUE NOT NULL,
  thumbnail_key TEXT,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',
  is_guestbook INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY(album_id) REFERENCES albums(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS guestbook(
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS likes(
  id TEXT PRIMARY KEY,
  media_id TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(media_id,guest_name),
  FOREIGN KEY(media_id) REFERENCES media(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS favorites(
  id TEXT PRIMARY KEY,
  media_id TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(media_id,guest_name),
  FOREIGN KEY(media_id) REFERENCES media(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS comments(
  id TEXT PRIMARY KEY,
  media_id TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(media_id) REFERENCES media(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS rsvps(
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  party_size INTEGER DEFAULT 1,
  email TEXT DEFAULT '',
  note TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id,name),
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
);
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
CREATE TABLE IF NOT EXISTS cohosts(
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'editor',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(event_id,user_id),
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS cohost_invites(
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'editor',
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS reports(
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  media_id TEXT,
  guest_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY(media_id) REFERENCES media(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS rate_limits(
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id,expires_at);
CREATE INDEX IF NOT EXISTS idx_media_event ON media(event_id,created_at);
CREATE INDEX IF NOT EXISTS idx_media_album ON media(album_id,created_at);
CREATE INDEX IF NOT EXISTS idx_album_event ON albums(event_id,sort_order,created_at);
CREATE INDEX IF NOT EXISTS idx_guestbook_event ON guestbook(event_id,created_at);
CREATE INDEX IF NOT EXISTS idx_comments_media ON comments(media_id,created_at);
CREATE INDEX IF NOT EXISTS idx_reports_event ON reports(event_id,status,created_at);
CREATE INDEX IF NOT EXISTS idx_client_event_access_user ON client_event_access(user_id,event_id);
