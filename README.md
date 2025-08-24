# StandBy — YT Music (v2)

New in v2:
- **Immersive mode** toggle (full‑bleed, no rounded card) vs Card mode
- **Search drawer** powered by optional `ytmusicapi` backend
- **Mini queue** to jump to any track
- Fully responsive, Windows‑friendly (SVG icons), glassy look

## Local run
- macOS/Linux: `python3 -m http.server 5500` → `http://localhost:5500/`
- Windows: `py -m http.server 5500`

## Configure backend search
Deploy the `backend/` folder (Flask + ytmusicapi) and set `BACKEND_URL` at the top of **app.jsx**.
- `/api/search?q=<query>` returns `[ { id, title, artists } ]`
- `/api/playlist/<playlistId>` returns playlist items in same shape

