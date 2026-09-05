/**
 * Virtual portfolio for the trainer: balance, positions, trade history.
 * No real money or exchange orders are ever involved.
 */

function makeTradeId() {
  return Math.random().toString(16).slice(2, 10);
}

export class Portfolio {
  constructor(initialBalance) {
    this.balanceUsdt = initialBalance;
    this.positions = {}; // symbol -> { amount, avgPrice }
    this.trades = [];    // { id, timestamp, symbol, side, amount, price, total }
  }

  buy(symbol, price, usdtAmount) {
    if (price <= 0) throw new Error("invalid price");
    if (usdtAmount <= 0) throw new Error("purchase amount must be greater than zero");
    if (usdtAmount > this.balanceUsdt + 1e-9) {
      throw new Error(`insufficient funds. Available: ${this.balanceUsdt.toFixed(2)} USDT`);
    }

    const cryptoAmount = usdtAmount / price;
    const pos = this.positions[symbol] || { amount: 0, avgPrice: 0 };
    const newAmount = pos.amount + cryptoAmount;
    pos.avgPrice = (pos.avgPrice * pos.amount + price * cryptoAmount) / newAmount;
    pos.amount = newAmount;
    this.positions[symbol] = pos;
    this.balanceUsdt -= usdtAmount;

    const trade = {
      id: makeTradeId(),
      timestamp: Date.now(),
      symbol,
      side: "BUY",
      amount: cryptoAmount,
      price,
      total: usdtAmount,
    };
    this.trades.push(trade);
    return trade;
  }

  sell(symbol, price, cryptoAmount) {
    if (price <= 0) throw new Error("invalid price");
    if (cryptoAmount <= 0) throw new Error("sell amount must be greater than zero");

    const pos = this.positions[symbol];
    const available = pos ? pos.amount : 0;
    if (cryptoAmount > available + 1e-12) {
      throw new Error(`not enough ${symbol} to sell. Available: ${available.toFixed(6)}`);
    }

    const usdtAmount = cryptoAmount * price;
    pos.amount -= cryptoAmount;
    if (pos.amount <= 1e-12) {
      pos.amount = 0;
      pos.avgPrice = 0;
    }
    this.balanceUsdt += usdtAmount;

    const trade = {
      id: makeTradeId(),
      timestamp: Date.now(),
      symbol,
      side: "SELL",
      amount: cryptoAmount,
      price,
      total: usdtAmount,
    };
    this.trades.push(trade);
    return trade;
  }

  unrealizedPnl(symbol, currentPrice) {
    const pos = this.positions[symbol];
    if (!pos || pos.amount === 0) return 0;
    return (currentPrice - pos.avgPrice) * pos.amount;
  }

  /** USDT balance + current market value of all open positions. */
  totalEquity(currentPrices) {
    let equity = this.balanceUsdt;
    for (const [sym, pos] of Object.entries(this.positions)) {
      if (pos.amount <= 0) continue;
      const price = currentPrices[sym] ?? pos.avgPrice;
      equity += pos.amount * price;
    }
    return equity;
  }

  toJSON() {
    return {
      balanceUsdt: this.balanceUsdt,
      positions: this.positions,
      trades: this.trades,
    };
  }

  static fromJSON(data, defaultBalance) {
    const portfolio = new Portfolio(data?.balanceUsdt ?? defaultBalance);
    portfolio.positions = data?.positions ?? {};
    portfolio.trades = data?.trades ?? [];
    return portfolio;
  }
}
