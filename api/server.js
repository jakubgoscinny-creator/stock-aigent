const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const CACHE_TTL_MS = 10 * 60 * 1000;
let cache = { ts: 0, data: null };

const SOURCES = [
  {
    name: "Stooq CSV (market data)",
    url: "https://stooq.pl/q/d/l/",
    note: "Daily OHLC quotes",
  },
  {
    name: "NBP API (USD/PLN)",
    url: "https://api.nbp.pl/",
    note: "Official FX reference rates",
  },
];

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

let fetchFn = global.fetch || null;
const getFetch = async () => {
  if (fetchFn) return fetchFn;
  const mod = await import("node-fetch");
  fetchFn = mod.default;
  return fetchFn;
};

const formatNumber = (value, digits = 2) =>
  value === null || value === undefined ? "--" : value.toFixed(digits);

const formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
};

const parseStooqCsv = (text) => {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase().split(",");
  const idx = {
    date: header.indexOf("date"),
    open: header.indexOf("open"),
    high: header.indexOf("high"),
    low: header.indexOf("low"),
    close: header.indexOf("close"),
    volume: header.indexOf("volume"),
  };
  if (idx.date === -1 || idx.close === -1) return [];
  return lines
    .slice(1)
    .map((line) => line.split(","))
    .filter((row) => row.length >= header.length)
    .map((row) => ({
      date: row[idx.date],
      open: toNumber(row[idx.open]),
      high: toNumber(row[idx.high]),
      low: toNumber(row[idx.low]),
      close: toNumber(row[idx.close]),
      volume: toNumber(row[idx.volume]),
    }))
    .filter((row) => row.date && row.close !== null);
};

const fetchStooq = async (symbol) => {
  const url = `https://stooq.pl/q/d/l/?s=${symbol}&i=d`;
  const fetcher = await getFetch();
  const response = await fetcher(url, { headers: { "User-Agent": "stock-aigent" } });
  if (!response.ok) throw new Error(`Stooq fetch failed: ${response.status}`);
  const text = await response.text();
  return parseStooqCsv(text);
};

const fetchUsdPln = async () => {
  const url = "https://api.nbp.pl/api/exchangerates/rates/A/USD/?format=json";
  const fetcher = await getFetch();
  const response = await fetcher(url, { headers: { "User-Agent": "stock-aigent" } });
  if (!response.ok) throw new Error(`NBP fetch failed: ${response.status}`);
  const data = await response.json();
  const rate = data?.rates?.[0]?.mid ?? null;
  const date = data?.rates?.[0]?.effectiveDate ?? null;
  return { rate, date };
};

const getLastTwo = (rows) => {
  if (!rows || rows.length < 2) return { latest: rows?.[0] || null, prev: null };
  return {
    latest: rows[rows.length - 1],
    prev: rows[rows.length - 2],
  };
};

const computeChangePct = (latest, prev) => {
  if (!latest || !prev || prev.close === 0 || prev.close === null) return null;
  return ((latest.close - prev.close) / prev.close) * 100;
};

const getNthFromEnd = (rows, n) => {
  if (!rows || rows.length < n) return null;
  return rows[rows.length - n];
};

const computeChangeFrom = (latest, base) => {
  if (!latest || !base || base.close === 0 || base.close === null) return null;
  return ((latest.close - base.close) / base.close) * 100;
};

const buildMovers = async (symbols) => {
  const results = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const rows = await fetchStooq(symbol);
        const { latest, prev } = getLastTwo(rows);
        const changePct = computeChangePct(latest, prev);
        return {
          symbol: symbol.toUpperCase(),
          close: latest?.close ?? null,
          changePct,
          date: latest?.date ?? null,
        };
      } catch (error) {
        return null;
      }
    })
  );
  return results.filter((row) => row && row.changePct !== null);
};

const getMarketData = async () => {
  const now = Date.now();
  if (cache.data && now - cache.ts < CACHE_TTL_MS) return cache.data;

  const usSymbols = ["spy.us", "aapl.us", "msft.us", "nvda.us", "amzn.us", "tsla.us"];
  const plSymbols = ["wig20", "pkn.pl", "pko.pl", "kghm.pl", "pzu.pl", "peo.pl"];

  const [usRows, plRows, fx, usMovers, plMovers] = await Promise.all([
    fetchStooq("spy.us"),
    fetchStooq("wig20"),
    fetchUsdPln(),
    buildMovers(usSymbols),
    buildMovers(plSymbols),
  ]);

  const us = getLastTwo(usRows);
  const pl = getLastTwo(plRows);
  const usChange = computeChangePct(us.latest, us.prev);
  const plChange = computeChangePct(pl.latest, pl.prev);
  const usWeekBase = getNthFromEnd(usRows, 6);
  const plWeekBase = getNthFromEnd(plRows, 6);
  const usWeekChange = computeChangeFrom(us.latest, usWeekBase);
  const plWeekChange = computeChangeFrom(pl.latest, plWeekBase);

  const topMovers = {
    us: usMovers
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 3),
    pl: plMovers
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 3),
  };

  const data = {
    updatedAt: us.latest?.date || pl.latest?.date || "--",
    metrics: {
      us: {
        symbol: "SPY.US",
        close: us.latest?.close ?? null,
        changePct: usChange,
        weekChangePct: usWeekChange,
        volume: us.latest?.volume ?? null,
        date: us.latest?.date ?? null,
      },
      pl: {
        symbol: "WIG20",
        close: pl.latest?.close ?? null,
        changePct: plChange,
        weekChangePct: plWeekChange,
        volume: pl.latest?.volume ?? null,
        date: pl.latest?.date ?? null,
      },
      fx: {
        pair: "USD/PLN",
        rate: fx.rate,
        date: fx.date,
      },
    },
    topMovers,
    sources: SOURCES,
  };

  cache = { ts: now, data };
  return data;
};

app.get("/api/sources", (req, res) => {
  res.json({ sources: SOURCES });
});

app.get("/api/brief", async (req, res) => {
  try {
    const data = await getMarketData();
    const us = data.metrics.us;
    const pl = data.metrics.pl;
    const fx = data.metrics.fx;
    const summary =
      `SPY.US closed ${formatNumber(us.close)} (${formatPercent(us.changePct)} 1D, ${formatPercent(us.weekChangePct)} 1W). ` +
      `WIG20 closed ${formatNumber(pl.close)} (${formatPercent(pl.changePct)} 1D, ${formatPercent(pl.weekChangePct)} 1W). ` +
      `USD/PLN ${formatNumber(fx.rate, 4)} (NBP).`;

    res.json({
      market: req.query.market || "US",
      updatedAt: data.updatedAt,
      title: "Selective strength, quality still leads",
      summary,
      metrics: data.metrics,
      topMovers: data.topMovers,
      sources: data.sources,
    });
  } catch (error) {
    res.status(503).json({
      error: "Data sources temporarily unavailable",
    });
  }
});

app.get("/api/signals", async (req, res) => {
  try {
    const data = await getMarketData();
    const us = data.metrics.us;
    const pl = data.metrics.pl;
    const momentum = ((us.changePct ?? 0) + (pl.changePct ?? 0)) / 2;
    const risk = Math.abs(momentum) * -0.5;

    res.json({
      market: req.query.market || "US",
      horizon: req.query.horizon || "1w",
      signals: [
        { name: "Momentum", value: Number(momentum.toFixed(2)) },
        { name: "Risk", value: Number(risk.toFixed(2)) },
        { name: "Macro Drift", value: "Stable" },
      ],
    });
  } catch (error) {
    res.status(503).json({ error: "Signals unavailable" });
  }
});

app.get("/api/stocks/:ticker", async (req, res) => {
  const symbol = req.params.ticker.toLowerCase();
  try {
    const rows = await fetchStooq(symbol);
    const { latest, prev } = getLastTwo(rows);
    const changePct = computeChangePct(latest, prev);
    const confidence = Math.min(0.85, Math.max(0.55, (Math.abs(changePct ?? 0) / 5) + 0.55));
    const riskFlag = Math.abs(changePct ?? 0) >= 1.5 ? "Moderate" : "Low";
    res.json({
      ticker: symbol.toUpperCase(),
      signal: changePct >= 0 ? "Positive" : "Negative",
      confidence: Number(confidence.toFixed(2)),
      horizon: "12 weeks",
      riskFlag,
      thesis:
        "Price behavior anchored to daily close with full-source traceability.",
      close: latest?.close ?? null,
      changePct,
      volume: latest?.volume ?? null,
      date: latest?.date ?? null,
    });
  } catch (error) {
    res.status(503).json({ error: "Ticker data unavailable" });
  }
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
