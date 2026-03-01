const baseFeeRate = 0.012;
const instantFeeRate = 0.008;

const form = document.getElementById("purchase-form");
const summaryContent = document.getElementById("summary-content");
const pricesList = document.getElementById("prices");

const adminAuthForm = document.getElementById("admin-auth-form");
const adminPanel = document.getElementById("admin-panel");
const adminStatus = document.getElementById("admin-status");
const adminPriceForm = document.getElementById("admin-price-form");

let prices = {};
let adminToken = "";

function usd(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function renderPrices() {
  pricesList.innerHTML = Object.entries(prices)
    .map(([ticker, price]) => `<li>${ticker}: ${usd(price)}</li>`)
    .join("");
}

function buildSummary(quote, priceAlert) {
  summaryContent.innerHTML = `
    <div class="summary-line"><span>Coin</span><strong>${quote.coin}</strong></div>
    <div class="summary-line"><span>Market price</span><strong>${usd(quote.coinPrice)}</strong></div>
    <div class="summary-line"><span>Amount funded</span><strong>${usd(quote.amountFunded)}</strong></div>
    <div class="summary-line"><span>Base fee (1.2%)</span><strong>${usd(quote.baseFee)}</strong></div>
    <div class="summary-line"><span>Instant fee (${quote.instantFee > 0 ? "0.8%" : "0%"})</span><strong>${usd(quote.instantFee)}</strong></div>
    <div class="summary-line"><span>Net used to buy ${quote.coin}</span><strong>${usd(quote.netUsd)}</strong></div>
    <div class="summary-line total"><span>Estimated ${quote.coin}</span><strong>${quote.estimatedCoin.toFixed(6)} ${quote.coin}</strong></div>
    ${priceAlert ? '<p>Price alert enabled <span class="badge">-5%</span></p>' : '<p class="muted">No price alert configured.</p>'}
  `;
}

function buildClientFallbackQuote({ coin, usdAmount, instant }) {
  const coinPrice = prices[coin];
  const baseFee = usdAmount * baseFeeRate;
  const instantFee = instant ? usdAmount * instantFeeRate : 0;
  const netUsd = usdAmount - baseFee - instantFee;
  return {
    coin,
    coinPrice,
    amountFunded: usdAmount,
    baseFee,
    instantFee,
    netUsd,
    estimatedCoin: netUsd / coinPrice,
  };
}

async function fetchPrices() {
  const response = await fetch("/api/prices");
  if (!response.ok) {
    throw new Error("Unable to load prices from server.");
  }
  const data = await response.json();
  prices = data.prices;
  renderPrices();
}

async function requestQuote(payload) {
  const response = await fetch("/api/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Unable to calculate quote from server.");
  }

  return response.json();
}

async function adminRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": adminToken,
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Admin request failed (${response.status}).`);
  }

  return response.json();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const coin = formData.get("coin");
  const usdAmount = Number(formData.get("usdAmount"));
  const instant = Boolean(formData.get("instant"));
  const priceAlert = Boolean(formData.get("priceAlert"));

  if (!coin || Number.isNaN(usdAmount) || usdAmount < 10) {
    summaryContent.textContent = "Enter at least $10 and choose a coin.";
    return;
  }

  try {
    const quote = await requestQuote({ coin, usdAmount, instant });
    buildSummary(quote, priceAlert);
  } catch {
    if (!prices[coin]) {
      summaryContent.textContent = "Cannot calculate quote right now.";
      return;
    }
    const fallbackQuote = buildClientFallbackQuote({ coin, usdAmount, instant });
    buildSummary(fallbackQuote, priceAlert);
  }
});

adminAuthForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(adminAuthForm);
  adminToken = String(formData.get("adminToken") || "").trim();

  if (!adminToken) {
    adminStatus.textContent = "Enter a valid admin token.";
    return;
  }

  try {
    const status = await adminRequest("/api/admin/status", { method: "GET" });
    adminPanel.classList.remove("hidden");
    adminStatus.textContent = `${status.service} connected. Uptime: ${status.uptimeSeconds}s.`;
  } catch {
    adminPanel.classList.add("hidden");
    adminStatus.textContent = "Admin authentication failed. Verify your token.";
  }
});

adminPriceForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!adminToken) {
    adminStatus.textContent = "Authenticate first before changing prices.";
    return;
  }

  const formData = new FormData(adminPriceForm);
  const coin = String(formData.get("coin") || "").toUpperCase();
  const price = Number(formData.get("price"));

  if (!coin || Number.isNaN(price) || price <= 0) {
    adminStatus.textContent = "Enter a valid coin and positive price.";
    return;
  }

  try {
    const data = await adminRequest("/api/admin/prices", {
      method: "POST",
      body: JSON.stringify({ coin, price }),
    });
    prices = data.prices;
    renderPrices();
    adminStatus.textContent = `${coin} updated to ${usd(prices[coin])}.`;
  } catch {
    adminStatus.textContent = "Failed to update price. Check token and payload.";
  }
});

(async function init() {
  try {
    await fetchPrices();
  } catch {
    prices = {
      ETH: 3188.12,
      SOL: 142.74,
      ADA: 0.61,
      AVAX: 37.28,
      DOT: 7.54,
    };
    renderPrices();
  }

  buildSummary(buildClientFallbackQuote({ coin: "ETH", usdAmount: 100, instant: true }), false);
})();
