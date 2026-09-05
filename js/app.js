/**
 * VortexPay — web version of the console crypto trading trainer.
 * Real market data comes from Binance's public API,
 * buying/selling is entirely virtual.
 */

import { getKlines, getPrice, get24hr, ApiError } from "./api.js";
import { loadState, saveState, clearState } from "./storage.js";
import { Portfolio } from "./portfolio.js";
import { drawCandles } from "./chart.js";

const CONFIG = {
  defaultSymbol: "BTCUSDT",
  candleInterval: "5m",
  pollIntervalMs: 5 * 60 * 1000,
  candlesLimit: 100,
  initialBalance: 10000,
};

const state = {
  symbol: CONFIG.defaultSymbol,
  interval: CONFIG.candleInterval,
  candles: [],
  currentPrice: null,
  change24h: null,
  lastUpdate: null,
  portfolio: null,
  pollTimer: null,
};

const el = (id) => document.getElementById(id);

function baseAsset(symbol) {
  for (const quote of ["USDT", "BUSD", "USDC", "BTC", "ETH"]) {
    if (symbol.endsWith(quote) && symbol.length > quote.length) {
      return symbol.slice(0, -quote.length);
    }
  }
  return symbol;
}

function fmt(n, digits = 2) {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function setStatus(message, isError = false) {
  const bar = el("status-bar");
  bar.textContent = message;
  bar.classList.toggle("status-error", isError);
}

function init() {
  const saved = loadState();
  if (saved) {
    state.portfolio = Portfolio.fromJSON(saved.portfolio, CONFIG.initialBalance);
    state.symbol = saved.symbol || CONFIG.defaultSymbol;
    setStatus(`Loaded saved progress: ${state.symbol}, balance ${fmt(state.portfolio.balanceUsdt)} USDT`);
  } else {
    state.portfolio = new Portfolio(CONFIG.initialBalance);
    setStatus(`New training portfolio created. Starting balance ${fmt(CONFIG.initialBalance)} USDT`);
  }

  el("symbol-input").value = state.symbol;
  bindEvents();
  loadMarketData();
  state.pollTimer = setInterval(loadMarketData, CONFIG.pollIntervalMs);
  window.addEventListener("resize", renderChart);
}

async function loadMarketData() {
  try {
    const [candles, price, change] = await Promise.all([
      getKlines(state.symbol, state.interval, CONFIG.candlesLimit),
      getPrice(state.symbol),
      get24hr(state.symbol).catch(() => null),
    ]);
    state.candles = candles;
    state.currentPrice = price;
    state.change24h = change?.priceChangePercent ?? null;
    state.lastUpdate = new Date();
    renderAll();
    setStatus(`Updated ${state.lastUpdate.toLocaleTimeString("en-US")} · ${state.symbol}`);
  } catch (err) {
    setStatus(err instanceof ApiError ? err.message : "Failed to load data from Binance", true);
  }
}

function renderAll() {
  renderTicker();
  renderChart();
  renderPortfolio();
  renderHistory();
}

function renderTicker() {
  const tape = el("ticker-tape");
  if (state.currentPrice == null) {
    tape.textContent = "Loading quote…";
    return;
  }
  const change = state.change24h;
  const changeTxt = change != null ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%` : "—";
  const changeClass = (change ?? 0) >= 0 ? "up" : "down";
  const updated = state.lastUpdate ? state.lastUpdate.toLocaleTimeString("en-US") : "—";
  tape.innerHTML = `
    <span class="tape-symbol">${state.symbol}</span>
    <span class="tape-price">${fmt(state.currentPrice)} USDT</span>
    <span class="tape-change ${changeClass}">${changeTxt} 24h</span>
    <span class="tape-sep">·</span>
    <span>updated ${updated}</span>
  `;
}

function renderChart() {
  const canvas = el("chart-canvas");
  const symbolTrades = state.portfolio.trades.filter((t) => t.symbol === state.symbol);
  drawCandles(canvas, state.candles, symbolTrades, { currentPrice: state.currentPrice });
}

function renderPortfolio() {
  const prices = state.currentPrice != null ? { [state.symbol]: state.currentPrice } : {};

  el("balance-value").textContent = `${fmt(state.portfolio.balanceUsdt)} USDT`;

  const positionsBody = el("positions-body");
  positionsBody.innerHTML = "";
  const openPositions = Object.entries(state.portfolio.positions).filter(([, p]) => p.amount > 0);

  if (!openPositions.length) {
    positionsBody.innerHTML = '<tr><td colspan="5" class="empty-row">No open positions</td></tr>';
  } else {
    for (const [sym, pos] of openPositions) {
      const curPrice = prices[sym] ?? pos.avgPrice;
      const pnl = state.portfolio.unrealizedPnl(sym, curPrice);
      const costBasis = pos.avgPrice * pos.amount;
      const pnlPct = costBasis ? (pnl / costBasis) * 100 : 0;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${sym}</td>
        <td>${pos.amount.toFixed(6)} ${baseAsset(sym)}</td>
        <td>${fmt(pos.avgPrice)}</td>
        <td>${fmt(curPrice)}</td>
        <td class="${pnl >= 0 ? "pnl-up" : "pnl-down"}">${pnl >= 0 ? "+" : ""}${fmt(pnl)} (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%)</td>
      `;
      positionsBody.appendChild(row);
    }
  }

  const equity = state.portfolio.totalEquity(prices);
  const totalPnl = equity - CONFIG.initialBalance;
  const totalPnlPct = (totalPnl / CONFIG.initialBalance) * 100;

  el("equity-value").textContent = `${fmt(equity)} USDT`;
  const resultEl = el("result-value");
  resultEl.textContent = `${totalPnl >= 0 ? "+" : ""}${fmt(totalPnl)} USDT (${totalPnlPct >= 0 ? "+" : ""}${totalPnlPct.toFixed(2)}%)`;
  resultEl.className = `stat-value ${totalPnl >= 0 ? "pnl-up" : "pnl-down"}`;

  const posInSymbol = state.portfolio.positions[state.symbol]?.amount ?? 0;
  el("available-crypto").textContent = `${posInSymbol.toFixed(6)} ${baseAsset(state.symbol)}`;
  el("available-usdt").textContent = `${fmt(state.portfolio.balanceUsdt)} USDT`;
}

function renderHistory() {
  const list = el("history-list");
  list.innerHTML = "";
  const trades = [...state.portfolio.trades].reverse().slice(0, 30);

  if (!trades.length) {
    list.innerHTML = '<div class="empty-row">No trades yet</div>';
    return;
  }

  for (const t of trades) {
    const row = document.createElement("div");
    row.className = `history-row ${t.side === "BUY" ? "side-buy" : "side-sell"}`;
    const time = new Date(t.timestamp).toLocaleString("en-US");
    const sideLabel = t.side === "BUY" ? "Buy" : "Sell";
    row.innerHTML = `
      <span class="hist-time">${time}</span>
      <span class="hist-symbol">${t.symbol}</span>
      <span class="hist-side">${sideLabel}</span>
      <span class="hist-amount">${t.amount.toFixed(6)}</span>
      <span class="hist-price">${fmt(t.price)}</span>
      <span class="hist-total">${fmt(t.total)}</span>
    `;
    list.appendChild(row);
  }
}

function persist() {
  saveState({ symbol: state.symbol, portfolio: state.portfolio.toJSON() });
}

function bindEvents() {
  el("interval-buttons").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-interval]");
    if (!btn) return;
    state.interval = btn.dataset.interval;
    document.querySelectorAll("#interval-buttons button").forEach((b) => b.classList.toggle("active", b === btn));
    loadMarketData();
  });

  el("symbol-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const raw = el("symbol-input").value.trim().toUpperCase();
    if (!raw || raw === state.symbol) return;
    setStatus(`Checking pair ${raw}…`);
    try {
      await getPrice(raw);
    } catch {
      setStatus(`Pair ${raw} not found on Binance`, true);
      return;
    }
    state.symbol = raw;
    persist();
    loadMarketData();
  });

  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach((b) => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === `tab-${btn.dataset.tab}`));
      if (btn.dataset.tab === "portfolio") renderChart();
    });
  });

  el("buy-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.currentPrice == null) { setStatus("Price not loaded yet", true); return; }
    const amount = parseFloat(el("buy-amount").value.replace(",", "."));
    try {
      const trade = state.portfolio.buy(state.symbol, state.currentPrice, amount);
      setStatus(`Bought ${trade.amount.toFixed(6)} ${baseAsset(state.symbol)} at ${fmt(trade.price)} USDT`);
      el("buy-amount").value = "";
      persist();
      renderAll();
    } catch (err) {
      setStatus(err.message, true);
    }
  });

  el("sell-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.currentPrice == null) { setStatus("Price not loaded yet", true); return; }
    const amount = parseFloat(el("sell-amount").value.replace(",", "."));
    try {
      const trade = state.portfolio.sell(state.symbol, state.currentPrice, amount);
      setStatus(`Sold ${trade.amount.toFixed(6)} ${baseAsset(state.symbol)} at ${fmt(trade.price)} USDT`);
      el("sell-amount").value = "";
      persist();
      renderAll();
    } catch (err) {
      setStatus(err.message, true);
    }
  });

  document.querySelectorAll('.pct-btn[data-target="buy"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const pct = parseFloat(btn.dataset.pct);
      el("buy-amount").value = (state.portfolio.balanceUsdt * pct).toFixed(2);
    });
  });

  document.querySelectorAll('.pct-btn[data-target="sell"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const pct = parseFloat(btn.dataset.pct);
      const avail = state.portfolio.positions[state.symbol]?.amount ?? 0;
      el("sell-amount").value = (avail * pct).toFixed(6);
    });
  });

  el("save-button").addEventListener("click", () => {
    persist();
    setStatus("Progress saved");
  });

  el("reset-button").addEventListener("click", () => {
    if (!confirm("Reset progress and start over? This cannot be undone.")) return;
    clearState();
    state.portfolio = new Portfolio(CONFIG.initialBalance);
    persist();
    renderAll();
    setStatus("Progress reset. New training portfolio created.");
  });
}

document.addEventListener("DOMContentLoaded", init);
