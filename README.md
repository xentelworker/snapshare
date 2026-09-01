# SnapShare 1.0.2

## Upgrade from the first 1.0 release

This release fixes the host dashboard blank-screen issue by using full document navigation for host route changes, keeps PBKDF2 within the Cloudflare Workers limit, improves registration error reporting, and adds per-event feature switches.

If SnapShare is already deployed, preserve your existing `wrangler.toml` database ID and R2 binding. Replace the project files with this release, then run:

```powershell
.\UPGRADE-WINDOWS.ps1
```

That applies `0002_feature_toggles.sql`, runs the build/checks, and redeploys. Existing events and media are preserved. The new feature switches default to enabled for existing events.

Feature switches in **Event settings** now include Photo uploads, Video uploads, Shared gallery, Slideshow, Albums, Written guestbook, Video guestbook
- Audio guestbook recording/upload, RSVP, Likes/favourites/comments, and Guest downloads. Disabled submission features are enforced by the Worker API as well as hidden in the guest UI.

---


SnapShare is a private QR-code event gallery for weddings, parties, corporate events and celebrations. Guests do **not** need accounts: they scan a QR code, enter a display name, then upload photos/videos, interact with the gallery, leave guestbook messages and RSVP.

This release uses a Cloudflare-only backend:

- **Cloudflare Workers + Static Assets** — React app and API
- **Cloudflare D1** — users, events, galleries, comments, RSVP, moderation, rate limits
- **Cloudflare R2** — original media and image thumbnails
- **Cloudflare Turnstile** — optional but strongly recommended bot protection

There is no required paid SaaS dependency. Cloudflare free-tier quotas still apply; a busy/high-storage production service can eventually create Cloudflare usage charges.

## Release features

### Guest experience
- Private event URL and downloadable event QR
- No guest registration
- Mobile-first photo/video uploads, up to 20 files in one batch
- Configurable 5–100 MB per-file limit
- Browser-generated image thumbnails
- Optional browser-side image re-encode to strip EXIF/location metadata
- Public event gallery and album galleries
- Likes, favourites and comments
- Individual original-file downloads (host can disable)
- Written guestbook
- Direct camera/microphone video guestbook recording with `MediaRecorder`
- RSVP: attending/maybe/not attending, party size, optional email and notes
- Automatic slideshow with play/pause, next/previous, speed and fullscreen
- Guest abuse/media reporting
- Five gallery themes and four font styles

### Host experience
- Host registration/login
- Secure HttpOnly sessions
- Password recovery using a saved recovery code (no email provider required)
- Create/manage events
- Event and per-album QR PNG downloads
- Moderation: pending/approved/hidden/delete
- Albums with private/direct-link mode
- Drag-and-drop media-to-album organization plus album selector
- Guestbook and video guestbook management view
- RSVP table
- Abuse report inbox and resolve status
- Co-host invite links that expire after seven days
- Co-host permission model; owner-only event deletion/invite creation
- Full backup ZIP: originals + JSON metadata export
- Complete event deletion cleans R2 objects and relational data
- Custom welcome message, theme, font, accent colour and feature toggles

### Security / abuse controls
- PBKDF2-SHA256 host passwords (180,000 iterations + per-user salt)
- Secure, HttpOnly, SameSite=Lax session cookies
- Login/registration/recovery rate limiting
- Guest upload/RSVP/guestbook/comment/interaction/report rate limiting
- Rate-limit identifiers store a SHA-256 hash rather than the raw visitor IP
- Content-type and file-size checks
- Private unguessable event/album access keys
- Optional Turnstile on uploads, RSVP and guestbook submission
- Server-side Turnstile validation

## Requirements

- Node.js 20+
- A Cloudflare account
- Wrangler login access to that account

## 1. Install

```bash
npm install
npx wrangler login
```

## 2. Create D1

```bash
npx wrangler d1 create snapshare-db
```

Cloudflare prints a `database_id`. Open `wrangler.toml` and replace:

```toml
database_id = "REPLACE_WITH_D1_DATABASE_ID"
```

with your actual ID.

## 3. Create R2

```bash
npx wrangler r2 bucket create snapshare-media
```

The project already expects the bucket name `snapshare-media`.

## 4. Apply the database migration

```bash
npm run db:migrate:remote
```

For a local D1 database instead:

```bash
npm run db:migrate:local
```

## 5. Configure Turnstile (recommended for final release)

In Cloudflare Dashboard, create a Turnstile widget for the hostname you will use.

Put the **site key** in `wrangler.toml`:

```toml
TURNSTILE_SITE_KEY = "YOUR_SITE_KEY"
```

Store the **secret key** as a Worker secret (never put it in source control):

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
```

Paste the Turnstile secret when prompted.

**Important:** set both keys together. If `TURNSTILE_SECRET_KEY` is configured but `TURNSTILE_SITE_KEY` is blank, protected guest forms will not be able to obtain a valid token.

If both are blank, SnapShare works without Turnstile and still uses its built-in D1 rate limits.

## 6. Production build check

```bash
npm run check
```

This checks Worker JavaScript syntax and runs the Vite production build.

## 7. Deploy

```bash
npm run deploy
```

Wrangler will return the Worker URL. Open it and create the first host account.

## 8. Add your custom domain

In Cloudflare Dashboard:

1. Workers & Pages → your `snapshare` Worker.
2. Settings / Domains & Routes.
3. Add a custom domain, for example `gallery.example.com`.
4. In `wrangler.toml`, change `APP_ORIGIN` to that HTTPS origin and redeploy.
5. Update the Turnstile widget hostname to allow that custom domain.

QR links are generated from the actual browser origin, so once you visit SnapShare using your custom domain, downloaded QR codes automatically use that domain.

## Local development

Copy the optional local secret template:

```bash
cp .dev.vars.example .dev.vars
```

Then build and run through Wrangler so D1/R2/Worker behavior is available:

```bash
npm run db:migrate:local
npm run cf:dev
```

Wrangler normally serves this at `http://localhost:8787`.

## Production test checklist

Before using the first real event, test all of these from a host computer and a separate phone:

1. Register a host and save the displayed recovery code.
2. Log out and back in.
3. Create an event and download its QR code.
4. Scan the QR on a phone using mobile data or Wi-Fi.
5. Upload several photos and one video in one batch.
6. Record a video guestbook message.
7. Add a written guestbook message and RSVP.
8. Like/favourite/comment on a gallery item.
9. Create an album, download its QR, and move media into it.
10. Enable moderation and verify new uploads remain pending.
11. Submit a report as a guest and resolve it as the host.
12. Create a second host account and test a co-host invite link.
13. Run slideshow fullscreen.
14. Download a full host backup ZIP and verify it contains originals plus `snapshare-export.json`.
15. Test password recovery using the saved recovery code.

## Backups

The host dashboard can create a browser ZIP containing every approved media object and `snapshare-export.json`. Cloudflare D1 also has platform-level database recovery/time-travel capabilities; this export is intended as a portable event-level backup.

## Media policy

SnapShare stores guest videos as uploaded. It does not perform server-side transcoding because that would add another paid/limited media-processing service. Modern browser-recorded video works best; large or uncommon camera codecs may not play in every browser even though the original remains downloadable.

Image thumbnail creation and optional metadata stripping happen in the guest browser before upload. If the browser cannot decode a particular image format, SnapShare uploads the original and skips that processing rather than rejecting the memory.

## Files

```text
snapshare/
├── index.html
├── package.json
├── wrangler.toml
├── migrations/
│   └── 0001_initial.sql
├── worker/
│   ├── index.js
│   └── schema.sql
└── src/
    ├── main.jsx
    └── styles.css
```

## Updating an existing starter database

This 1.0 package contains a fresh `0001_initial.sql` schema intended for the final deployment. If you already deployed the earlier starter schema with real data, do **not** apply this initial migration over that production database. Create a fresh final-release D1 database or write a dedicated incremental migration for that existing database.
