/**
 * Отрисовка свечного графика на canvas по данным Binance
 * и отметок сделок пользователя. Без внешних зависимостей.
 */

export function drawCandles(canvas, candles, trades = [], options = {}) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const W = rect.width;
  const H = rect.height;
  ctx.clearRect(0, 0, W, H);

  if (!candles.length) {
    ctx.fillStyle = "rgba(26,26,26,0.4)";
    ctx.font = '13px "IBM Plex Mono", monospace';
    ctx.fillText("Нет данных для построения графика", 16, 24);
    return;
  }

  const padding = { top: 16, right: 66, bottom: 24, left: 8 };
  const plotW = W - padding.left - padding.right;
  const plotH = H - padding.top - padding.bottom;

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  let maxP = Math.max(...highs);
  let minP = Math.min(...lows);
  const priceRange = maxP - minP || maxP * 0.01 || 1;
  const pad = priceRange * 0.08;
  maxP += pad;
  minP -= pad;

  const n = candles.length;
  const slot = plotW / n;
  const bodyW = Math.max(slot * 0.55, 1);

  const xForIndex = (i) => padding.left + slot * i + slot / 2;
  const yForPrice = (p) => padding.top + (1 - (p - minP) / (maxP - minP)) * plotH;

  // сетка и подписи цены
  ctx.font = '11px "IBM Plex Mono", monospace';
  const gridLines = 5;
  for (let g = 0; g <= gridLines; g++) {
    const price = minP + ((maxP - minP) * g) / gridLines;
    const y = yForPrice(price);
    ctx.strokeStyle = "rgba(26,26,26,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(W - padding.right, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(26,26,26,0.5)";
    ctx.fillText(price.toFixed(2), W - padding.right + 6, y + 4);
  }

  // свечи
  candles.forEach((c, i) => {
    const x = xForIndex(i);
    const bullish = c.close >= c.open;
    const color = bullish ? "#3f7d5c" : "#a8453b";

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, yForPrice(c.high));
    ctx.lineTo(x, yForPrice(c.low));
    ctx.stroke();

    const yOpen = yForPrice(c.open);
    const yClose = yForPrice(c.close);
    const top = Math.min(yOpen, yClose);
    const h = Math.max(Math.abs(yClose - yOpen), 1);
    ctx.fillStyle = color;
    ctx.fillRect(x - bodyW / 2, top, bodyW, h);
  });

  // отметки сделок пользователя
  trades.forEach((t) => {
    let nearest = 0;
    let best = Infinity;
    candles.forEach((c, i) => {
      const d = Math.abs(c.openTime - t.timestamp);
      if (d < best) { best = d; nearest = i; }
    });
    const x = xForIndex(nearest);
    const y = yForPrice(t.price);
    const isBuy = t.side === "BUY";
    ctx.strokeStyle = isBuy ? "#3f7d5c" : "#a8453b";
    ctx.fillStyle = "#ffffff";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    if (isBuy) {
      ctx.moveTo(x, y + 8);
      ctx.lineTo(x - 5, y + 17);
      ctx.lineTo(x + 5, y + 17);
    } else {
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x - 5, y - 17);
      ctx.lineTo(x + 5, y - 17);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // линия текущей цены
  if (options.currentPrice != null) {
    const y = yForPrice(options.currentPrice);
    ctx.strokeStyle = "rgba(26,26,26,0.4)";
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(W - padding.right, y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(W - padding.right, y - 8, padding.right - 4, 16);
    ctx.fillStyle = "#ffffff";
    ctx.font = 'bold 11px "IBM Plex Mono", monospace';
    ctx.fillText(options.currentPrice.toFixed(2), W - padding.right + 4, y + 4);
  }

  // подписи времени по оси X
  ctx.font = '11px "IBM Plex Mono", monospace';
  ctx.fillStyle = "rgba(26,26,26,0.5)";
  const labelCount = Math.min(6, n);
  for (let k = 0; k < labelCount; k++) {
    const idx = Math.floor((k * (n - 1)) / Math.max(labelCount - 1, 1));
    const c = candles[idx];
    const d = new Date(c.openTime);
    const label = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ` +
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    ctx.fillText(label, xForIndex(idx) - 24, H - 6);
  }
}
