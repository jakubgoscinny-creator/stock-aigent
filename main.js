const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll("[data-market-panel]");

const setActiveMarket = (market) => {
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.market === market);
  });
  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.marketPanel === market);
  });
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveMarket(tab.dataset.market);
  });
});

const revealItems = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

revealItems.forEach((item) => observer.observe(item));

setActiveMarket("us");

const apiBase = window.STOCK_AIGENT_API || "http://localhost:4000";

const setText = (id, value) => {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
};

const formatNumber = (value, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return Number(value).toFixed(digits);
};

const formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  const num = Number(value);
  const sign = num >= 0 ? "+" : "";
  return `${sign}${num.toFixed(2)}%`;
};

const updateBrief = async () => {
  try {
    const response = await fetch(`${apiBase}/api/brief?market=US`);
    if (!response.ok) return;
    const data = await response.json();
    if (data.updatedAt) setText("brief-updated", data.updatedAt);
    if (data.title) setText("brief-title", data.title);
    if (data.summary) setText("brief-summary", data.summary);

    if (data.metrics) {
      const us = data.metrics.us || {};
      const pl = data.metrics.pl || {};
      const fx = data.metrics.fx || {};
      setText("metric-us-close", formatNumber(us.close));
      setText("metric-us-change", formatPercent(us.changePct));
      setText("metric-pl-close", formatNumber(pl.close));
      setText("metric-pl-change", formatPercent(pl.changePct));
      setText("metric-fx-rate", formatNumber(fx.rate, 4));
      setText("metric-fx-date", fx.date || "--");
    }
  } catch (error) {
    // Silent fail for offline/static use.
  }
};

const updateSources = async () => {
  try {
    const response = await fetch(`${apiBase}/api/sources`);
    if (!response.ok) return;
    const data = await response.json();
    const list = document.getElementById("sources-list");
    if (!list || !data.sources) return;
    list.innerHTML = "";
    data.sources.forEach((source) => {
      const item = document.createElement("li");
      item.textContent = `${source.name} - ${source.note}`;
      list.appendChild(item);
    });
  } catch (error) {
    // Silent fail for offline/static use.
  }
};

const updateDossier = async () => {
  try {
    const response = await fetch(`${apiBase}/api/stocks/spy.us`);
    if (!response.ok) return;
    const data = await response.json();
    setText("dossier-title", `Example: ${data.ticker || "SPY.US"}`);
    if (data.thesis) setText("dossier-thesis", data.thesis);
    setText("dossier-signal", data.signal || "--");
    setText("dossier-confidence", data.confidence ?? "--");
    setText("dossier-horizon", data.horizon || "--");
    setText("dossier-risk", data.riskFlag || "--");
    setText("dossier-close", formatNumber(data.close));
    setText("dossier-change", formatPercent(data.changePct));
    setText("dossier-volume", data.volume ? data.volume.toLocaleString() : "--");
  } catch (error) {
    // Silent fail for offline/static use.
  }
};

updateBrief();
updateSources();
updateDossier();
