const prices = {
  ETH: 3188.12,
  SOL: 142.74,
  ADA: 0.61,
  AVAX: 37.28,
  DOT: 7.54,
};

const baseFeeRate = 0.012;
const instantFeeRate = 0.008;

const form = document.getElementById("purchase-form");
const summaryContent = document.getElementById("summary-content");
const pricesList = document.getElementById("prices");

function usd(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function renderPrices() {
  pricesList.innerHTML = Object.entries(prices)
    .map(([ticker, price]) => `<li>${ticker}: ${usd(price)}</li>`)
    .join("");
}

function buildSummary({ coin, usdAmount, instant, priceAlert }) {
  const coinPrice = prices[coin];
  const baseFee = usdAmount * baseFeeRate;
  const instantFee = instant ? usdAmount * instantFeeRate : 0;
  const totalFees = baseFee + instantFee;
  const netUsd = usdAmount - totalFees;
  const estimatedCoin = netUsd / coinPrice;

  summaryContent.innerHTML = `
    <div class="summary-line"><span>Coin</span><strong>${coin}</strong></div>
    <div class="summary-line"><span>Market price</span><strong>${usd(coinPrice)}</strong></div>
    <div class="summary-line"><span>Amount funded</span><strong>${usd(usdAmount)}</strong></div>
    <div class="summary-line"><span>Base fee (1.2%)</span><strong>${usd(baseFee)}</strong></div>
    <div class="summary-line"><span>Instant fee (${instant ? "0.8%" : "0%"})</span><strong>${usd(instantFee)}</strong></div>
    <div class="summary-line"><span>Net used to buy ${coin}</span><strong>${usd(netUsd)}</strong></div>
    <div class="summary-line total"><span>Estimated ${coin}</span><strong>${estimatedCoin.toFixed(6)} ${coin}</strong></div>
    ${priceAlert ? '<p>Price alert enabled <span class="badge">-5%</span></p>' : '<p class="muted">No price alert configured.</p>'}
  `;
}

form.addEventListener("submit", (event) => {
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

  buildSummary({ coin, usdAmount, instant, priceAlert });
});

renderPrices();
buildSummary({ coin: "ETH", usdAmount: 100, instant: true, priceAlert: false });
