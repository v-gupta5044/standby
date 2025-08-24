# StandBy — YT Music (v3)

Fixes & upgrades:
- **Collapsible search bar** (icon when inactive; expands on click/focus; Close button)
- **No overlap**: header has its own row and the card has top padding (`pt-[86px]`)
- **Robust album art**: multiple thumbnail fallbacks (`maxresdefault` → `sddefault` → …) + `referrerPolicy="no-referrer"`
- **More spread-out layout**: larger tray bounds and grid ratios; more padding
- Everything else from v2 (Immersive mode, mini queue, SVG controls, glassy look)

## Run
`python3 -m http.server 5500` → open `http://localhost:5500/` (or `py -m http.server 5500` on Windows).

## Search
Deploy `backend/` (Flask + ytmusicapi) and set `BACKEND_URL` at top of **app.jsx**.
