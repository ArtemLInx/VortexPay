/**
 * Лёгкий клиент к публичному REST API Binance.
 * Используются только открытые эндпоинты (без ключа, без реальных ордеров) —
 * приложение исключительно читает рыночные данные для тренажёра.
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
    throw new ApiError(`Сеть недоступна: ${err.message}`);
  }

  if (!response.ok) {
    let body = null;
    try { body = await response.json(); } catch { /* ignore */ }
    throw new ApiError(body?.msg ? `Binance: ${body.msg}` : `Ошибка запроса (${response.status})`);
  }
  return response.json();
}

/** Возвращает список свечей (OHLCV) по паре. */
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

/** Возвращает последнюю цену по паре. */
export async function getPrice(symbol) {
  const data = await request("/ticker/price", { symbol });
  if (!data.price) throw new ApiError(`Пара ${symbol} не найдена`);
  return parseFloat(data.price);
}

/** Возвращает изменение цены за 24 часа (для строки-тикера). */
export async function get24hr(symbol) {
  const data = await request("/ticker/24hr", { symbol });
  return {
    priceChangePercent: parseFloat(data.priceChangePercent),
    highPrice: parseFloat(data.highPrice),
    lowPrice: parseFloat(data.lowPrice),
  };
}
