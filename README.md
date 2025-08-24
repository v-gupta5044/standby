# StandBy — YT Music (v5)
- **Working search on GitHub Pages** using a **static fallback** (`songs.json`) — no backend required.
- If you deploy the optional Flask + `ytmusicapi` backend, set `BACKEND_URL` in `app.jsx` and you’ll get live search.
- **Forward scrubbing fixed** (click or drag anywhere on the progress bar).
- **Album covers improved** via robust thumbnail resolver with `referrerPolicy="no-referrer"`.

## Host on GitHub Pages
Upload `index.html`, `app.jsx`, and `songs.json` to your repo and enable Pages. Done.

## Optional backend (not required for fallback search)
Use the `backend/` folder from earlier zips to deploy your own API, then set `BACKEND_URL` in `app.jsx`.
