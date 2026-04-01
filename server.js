const express = require('express');
const ccxt = require('ccxt');

const app = express();
app.use(express.json());

// ===== SETTINGS =====
const RISK_PERCENT = 0.02; // 2%
const TP_PERCENT = 0.03;   // 3%
const SL_PERCENT = 0.01;   // 1%

// ===== EXCHANGES =====
const binance = new ccxt.binance({ enableRateLimit: true });
const bybit = new ccxt.bybit({ enableRateLimit: true });
const okx = new ccxt.okx({ enableRateLimit: true });

const exchanges = [binance, bybit, okx];

// ===== ROOT =====
app.get('/', (req, res) => {
  res.send("TMT AI Backend is LIVE 🚀");
});

// ===== SIGNAL =====
app.get('/signal', async (req, res) => {
  let results = [];

  for (let exchange of exchanges) {
    try {
      const ticker = await exchange.fetchTicker('BTC/USDT');
      const price = ticker.last;

      const usdt = 10; // sample capital
      const amount = (usdt * RISK_PERCENT) / price;

      const stopLoss = price * (1 - SL_PERCENT);
      const takeProfit = price * (1 + TP_PERCENT);

      results.push({
        exchange: exchange.id,
        price: price,
        SL: stopLoss,
        TP: takeProfit,
        amount: amount
      });

    } catch (err) {
      results.push({
        exchange: exchange.id,
        error: err.message
      });
    }
  }

  res.json(results);
});

// ===== PORT (IMPORTANT FOR RENDER) =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 BOT RUNNING on port " + PORT);
});
