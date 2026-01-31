# Stock AIgent API (MVP stubs)

## Run

```bash
cd "/home/Jakub/programs/Stock AIgent/api"
npm install
npm run dev
```

The API runs on http://localhost:4000

## Endpoints
- GET /api/brief?market=US|PL
- GET /api/signals?market=US|PL&horizon=1w
- GET /api/stocks/{ticker}
- GET /api/portfolio/summary
- POST /api/alerts
- GET /api/reports/weekly

## Render deploy
Use `render.yaml` from the repo root (set root to `api` if deploying manually).
