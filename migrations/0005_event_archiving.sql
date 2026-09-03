ALTER TABLE events ADD COLUMN auto_archive INTEGER NOT NULL DEFAULT 1;
ALTER TABLE events ADD COLUMN archived_at TEXT;

UPDATE events
SET archived_at = datetime('now')
WHERE auto_archive = 1
  AND archived_at IS NULL
  AND event_date IS NOT NULL
  AND datetime(event_date, '+30 day') <= datetime('now');

CREATE INDEX IF NOT EXISTS idx_events_archived ON events(archived_at, auto_archive, event_date);
