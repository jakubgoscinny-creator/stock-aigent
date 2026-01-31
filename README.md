# Stock AIgent - Luxury MVP

This is a static luxury MVP landing/UI for Stock AIgent.

## Run locally
Open `index.html` directly in a browser.

Optional: run a simple server

```bash
cd "/home/Jakub/programs/Stock AIgent"
python3 -m http.server 8080
```
Then visit http://localhost:8080

## API stubs (optional)
See `api/README.md` for a minimal Express server with stub data.

## Quick deploy (manual)
- Netlify: drag the folder to Netlify Deploys.
- Vercel: import as a static project and set the root to this folder.

## Netlify + Render (recommended for live API)
1) Deploy API on Render using `api/render.yaml` (or manual Node service).
2) Copy the Render URL and set it in `config.js` (e.g. https://your-api.onrender.com).
3) Deploy this folder to Netlify (drag & drop or Git connect).
