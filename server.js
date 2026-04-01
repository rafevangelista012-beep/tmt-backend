const express = require('express');
const ccxt = require('ccxt');

const app = express();
app.use(express.json());

// SETTINGS
const RISK_PERCENT = 0.02;
const TP_PERCENT = 0.03;
const SL_PERCENT = 0.01;

// OKX ONLY
const okx = new ccxt.okx({ enableRateLimit: true });

// ROOT (IMPORTANT)
app.get('/', (req, res) => {
  res.send("TMT AI Backend is LIVE 🚀");
});

// SIGNAL
app.get('/signal', async (req, res) => {
  try {
    const ticker = await okx.fetchTicker('BTC/USDT');
    const price = ticker.last;

    const usdt = 10;
    const amount = (usdt * RISK_PERCENT) / price;

    const stopLoss = price * (1 - SL_PERCENT);
    const takeProfit = price * (1 + TP_PERCENT);

    res.json({
      exchange: "okx",
      price,
      SL: stopLoss,
      TP: takeProfit,
      amount
    });

  } catch (err) {
    res.json({ error: err.message });
  }
});

// PORT FIX (CRITICAL)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
