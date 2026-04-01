const express = require('express');
const ccxt = require('ccxt');

const app = express();
app.use(express.json());

// SETTINGS
const RISK_PERCENT = 0.02;
const RR_RATIO = 2;

// OKX
const okx = new ccxt.okx({
  enableRateLimit: true,
});

// ROOT
app.get('/', (req, res) => {
  res.send("🔥 SMC SMART BOT LIVE 🚀");
});

// TRADE
app.get('/trade', async (req, res) => {
  try {
    const symbol = 'BTC/USDT';

    // ===== PRICE =====
    const ticker = await okx.fetchTicker(symbol);
    const price = ticker.last;

    // ===== CANDLES =====
    const candles = await okx.fetchOHLCV(symbol, '5m', undefined, 50);

    const highs = candles.map(c => c[2]);
    const lows = candles.map(c => c[3]);
    const closes = candles.map(c => c[4]);

    // ===== STRUCTURE =====
    const lastHigh = highs[highs.length - 1];
    const prevHigh = highs[highs.length - 5];

    const lastLow = lows[lows.length - 1];
    const prevLow = lows[lows.length - 5];

    const bullishTrend = lastHigh > prevHigh && lastLow > prevLow;

    // ===== LIQUIDITY SWEEP =====
    const sweepLow = Math.min(...lows.slice(-10));
    const liquiditySweep = price > sweepLow;

    // ===== SUPPORT ZONE =====
    const support = Math.min(...lows.slice(-20));
    const nearSupport = price <= support * 1.01;

    // ===== RSI =====
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < closes.length; i++) {
      let diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }

    const rs = gains / (losses || 1);
    const rsi = 100 - (100 / (1 + rs));

    // ===== FINAL CONFLUENCE =====
    let buySignal = false;

    if (
      bullishTrend &&
      liquiditySweep &&
      nearSupport &&
      rsi > 50
    ) {
      buySignal = true;
    }

    if (!buySignal) {
      return res.json({
        status: "NO TRADE",
        reason: "No confluence",
        bullishTrend,
        liquiditySweep,
        nearSupport,
        rsi
      });
    }

    // ===== SMART SL =====
    const stopLoss = support;

    const riskPerUnit = price - stopLoss;

    if (riskPerUnit <= 0) {
      return res.json({ status: "SKIP", reason: "Invalid SL" });
    }

    // ===== TP (LIQUIDITY / RR) =====
    const takeProfit = price + (riskPerUnit * RR_RATIO);

    // ===== POSITION SIZE =====
    const capital = 10;
    const riskAmount = capital * RISK_PERCENT;
    const amount = riskAmount / riskPerUnit;

    // ===== RESULT =====
    res.json({
      status: "BUY SIGNAL 🔥",
      entry: price,
      SL: stopLoss,
      TP: takeProfit,
      amount,
      rsi,
      bullishTrend,
      liquiditySweep,
      nearSupport
    });

    // ===== AUTO TRADE (ENABLE LATER) =====
    /*
    await okx.createMarketBuyOrder(symbol, amount);
    */

  } catch (err) {
    res.json({ error: err.message });
  }
});

// PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 SMC BOT RUNNING on port " + PORT);
});
