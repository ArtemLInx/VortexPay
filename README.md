# VortexPay Web

Web version of the console crypto trading trainer. Static site — no
backend, no build step, plain HTML/CSS/JS (ES modules).

- Quotes and candles are real, fetched directly from Binance's public
  REST API (`https://api.binance.com/api/v3`), no key, no real orders.
- Buying/selling is entirely virtual.
- Progress (balance, positions, trade history) is stored in the
  browser's `localStorage` — on this device, between visits.
- The candlestick chart and trade markers are drawn on `<canvas>`,
  no third-party libraries.

## Structure

```
index.html
css/style.css
js/api.js         # Binance client (klines, ticker/price, ticker/24hr)
js/storage.js      # progress persistence via localStorage
js/portfolio.js     # virtual portfolio logic: buy/sell, PnL, equity
js/chart.js        # candlestick chart on canvas + trade markers
js/app.js         # app state, event handlers, polling
```

## Running locally

The files use ES modules (`<script type="module">`), so double-clicking
`index.html` (`file://`) won't work — the browser blocks module loading.
Use any local server, for example:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

or the "Live Server" extension in VS Code.

## Deploying to GitHub Pages

1. Create a GitHub repository and push the contents of this folder to it
   (`index.html` should sit at the repo root, or in a `docs/` folder).

   ```bash
   git init
   git add .
   git commit -m "VortexPay web"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo>.git
   git push -u origin main
   ```

2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Source: Deploy from a
   branch**, branch **main**, folder **/ (root)** (or **/docs** if the
   files live there).
4. Save — after a minute or two the site will be live at
   `https://<your-username>.github.io/<repo>/`.

Nothing else needs configuring: the site is static, and all requests to
Binance are made directly from the user's browser.

## A note on CORS

Binance's public endpoints (`/api/v3/klines`, `/api/v3/ticker/price`,
`/api/v3/ticker/24hr`) are generally reachable directly from the browser
from any domain. If you see a CORS error in the browser console after
deploying, it usually means a specific region or network provider is
blocking the request at the network level, not Binance itself. In that
case the simplest workaround is a small serverless proxy (e.g. a
Cloudflare Worker a few lines long) that forwards the request to Binance
and returns the same JSON with the right header; the site itself stays
static.

## Disclaimer

This is an educational trainer. It does not execute real trades, does
not store or use exchange API keys, and is not investment advice. Real
crypto trading carries a high risk of loss.
