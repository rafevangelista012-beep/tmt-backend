const express = require('express');
const ccxt = require('ccxt');

const app = express();
app.use(express.json());

// ===== SETTINGS =====
const RISK_PERCENT = 0.02;
const RR_RATIO = 2;

// ===== OKX =====
const okx = new ccxt.okx({
  enableRateLimit: true,
  // lagyan mo later pag live na:
  // apiKey: process.env.OKX_API_KEY,
  // secret: process.env.OKX_SECRET,
  // password: process.env.OKX_PASSWORD,
});

// ===== ROOT =====
app.get('/', (req, res) => {
  res.send("🤖 TMT SMART BOT LIVE 🚀");
});

// ===== TRADE =====
app.get('/trade', async (req, res) => {
  try {
    const symbol = 'BTC/USDT';

    // ===== PRICE =====
    const ticker = await okx.fetchTicker(symbol);
    const price = ticker.last;

    // ===== CANDLES =====
    const candles = await okx.fetchOHLCV(symbol, '5m', undefined, 50);

    const closes = candles.map(c => c[4]);
    const lows = candles.map(c => c[3]);

    // ===== EMA FUNCTION =====
    function ema(data, period) {
      let k = 2 / (period + 1);
      let emaVal = data[0];

      for (let i = 1; i < data.length; i++) {
        emaVal = data[i] * k + emaVal * (1 - k);
      }
      return emaVal;
    }

    // ===== EMA =====
    const ema50 = ema(closes, 50);
    const ema200 = ema(closes, 200);

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

    // ===== STRATEGY =====
    let buySignal = false;

    if (price > ema200 && price > ema50 && rsi > 50) {
      buySignal = true;
    }

    if (!buySignal) {
      return res.json({
        status: "NO TRADE",
        price,
        ema50,
        ema200,
        rsi
      });
    }

    // ===== SMART SL =====
    const swingLow = Math.min(...lows);
    const stopLoss = swingLow;

    const riskPerUnit = price - stopLoss;

    if (riskPerUnit <= 0) {
      return res.json({
        status: "SKIP",
        reason: "Invalid SL"
      });
    }

    // ===== TP =====
    const takeProfit = price + (riskPerUnit * RR_RATIO);

    // ===== POSITION SIZE =====
    const capital = 10;
    const riskAmount = capital * RISK_PERCENT;
    const amount = riskAmount / riskPerUnit;

    // ===== RESULT =====
    res.json({
      status: "BUY SIGNAL",
      exchange: "okx",
      entry: price,
      SL: stopLoss,
      TP: takeProfit,
      amount,
      rsi,
      ema50,
      ema200
    });

    // ===== AUTO TRADE (ENABLE LATER) =====
    /*
    await okx.createMarketBuyOrder(symbol, amount);
    */

  } catch (err) {
    res.json({ error: err.message });
  }
});

// ===== PORT =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 BOT RUNNING on port " + PORT);
});
