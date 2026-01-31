const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/brief", (req, res) => {
  const market = req.query.market || "US";
  res.json({
    market,
    updatedAt: "Updated 18:00 CET",
    title: "Rates stable, earnings dispersion rising",
    summary:
      "Large caps remain resilient; Warsaw cyclicals show selective softness. Signals favor quality cash-flow names.",
  });
});

app.get("/api/signals", (req, res) => {
  res.json({
    market: req.query.market || "US",
    horizon: req.query.horizon || "1w",
    signals: [
      { name: "Momentum", value: 0.42 },
      { name: "Risk", value: -0.31 },
      { name: "Macro Drift", value: "Stable" },
    ],
  });
});

app.get("/api/stocks/:ticker", (req, res) => {
  res.json({
    ticker: req.params.ticker.toUpperCase(),
    signal: "Positive",
    confidence: 0.71,
    horizon: "12 weeks",
    riskFlag: "Low",
    thesis:
      "Defensive cash-flow with pricing power. Valuation sits below long-term median.",
  });
});

app.get("/api/portfolio/summary", (req, res) => {
  res.json({
    allocation: {
      quality: 42,
      defensives: 28,
      cyclicals: 20,
      cash: 10,
    },
    scenarios: {
      base: 0.7,
      bull: 0.85,
      bear: 0.4,
    },
  });
});

app.post("/api/alerts", (req, res) => {
  res.status(201).json({
    status: "created",
    rule: req.body || {},
  });
});

app.get("/api/reports/weekly", (req, res) => {
  res.json({
    period: "This week",
    highlights: [
      "Macro stability with selective sector dispersion.",
      "Warsaw exporters benefit from FX calm.",
      "Quality cash-flow remains favored.",
    ],
  });
});

app.listen(PORT, () => {
  console.log(`Stock AIgent API running on http://localhost:${PORT}`);
});
