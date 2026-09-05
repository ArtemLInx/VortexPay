/**
 * Lightweight client for Binance's public REST API.
 * Only open, read-only endpoints are used (no key, no real orders) —
 * the app only reads market data for the trainer.
 */

export const API_BASE = "https://api.binance.com/api/v3";

export class ApiError extends Error {}

async function request(path, params = {}) {
  const url = new URL(API_BASE + path);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  let response;
  try {
    response = await fetch(url.toString());
  } catch (err) {
    throw new ApiError(`Network unavailable: ${err.message}`);
  }

  if (!response.ok) {
    let body = null;
    try { body = await response.json(); } catch { /* ignore */ }
    throw new ApiError(body?.msg ? `Binance: ${body.msg}` : `Request failed (${response.status})`);
  }
  return response.json();
}

/** Returns a list of candles (OHLCV) for a pair. */
export async function getKlines(symbol, interval, limit = 100) {
  const raw = await request("/klines", { symbol, interval, limit });
  return raw.map((item) => ({
    openTime: item[0],
    open: parseFloat(item[1]),
    high: parseFloat(item[2]),
    low: parseFloat(item[3]),
    close: parseFloat(item[4]),
    volume: parseFloat(item[5]),
    closeTime: item[6],
  }));
}

/** Returns the latest price for a pair. */
export async function getPrice(symbol) {
  const data = await request("/ticker/price", { symbol });
  if (!data.price) throw new ApiError(`Pair ${symbol} not found`);
  return parseFloat(data.price);
}

/** Returns the 24h price change (for the ticker line). */
export async function get24hr(symbol) {
  const data = await request("/ticker/24hr", { symbol });
  return {
    priceChangePercent: parseFloat(data.priceChangePercent),
    highPrice: parseFloat(data.highPrice),
    lowPrice: parseFloat(data.lowPrice),
  };
}
