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

const updateBrief = async () => {
  try {
    const response = await fetch(`${apiBase}/api/brief?market=US`);
    if (!response.ok) return;
    const data = await response.json();
    const updated = document.getElementById("brief-updated");
    const title = document.getElementById("brief-title");
    const summary = document.getElementById("brief-summary");
    if (updated && data.updatedAt) updated.textContent = data.updatedAt;
    if (title && data.title) title.textContent = data.title;
    if (summary && data.summary) summary.textContent = data.summary;
  } catch (error) {
    // Silent fail for offline/static use.
  }
};

updateBrief();
