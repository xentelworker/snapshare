ALTER TABLE events ADD COLUMN slideshow_overlay_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN slideshow_overlay_layout TEXT NOT NULL DEFAULT 'top';
ALTER TABLE events ADD COLUMN slideshow_overlay_title TEXT DEFAULT 'Share the Memories';
ALTER TABLE events ADD COLUMN slideshow_overlay_subtitle TEXT DEFAULT 'Scan the QR code to share your photos';
ALTER TABLE events ADD COLUMN slideshow_banner_color TEXT DEFAULT '#0b2d6b';
ALTER TABLE events ADD COLUMN slideshow_banner_opacity REAL NOT NULL DEFAULT 0.86;
ALTER TABLE events ADD COLUMN custom_logo_key TEXT;
