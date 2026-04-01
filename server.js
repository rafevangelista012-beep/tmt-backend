const express = require('express');
const ccxt = require('ccxt');

const app = express();
app.use(express.json());

const RISK_PERCENT = 0.02;
const TP_PERCENT = 0.03;
const SL_PERCENT = 0.01;

const binance = new ccxt.binance({ enableRateLimit: true });
const bybit = new ccxt.bybit({ enableRateLimit: true });
const okx = new ccxt.okx({ enableRateLimit: true });

const exchanges = [binance, bybit, okx];

app.get('/signal', async (req, res) => {

  const signal = {
    pair: "BTC/USDT",
    bias: "BULLISH"
  };

  let results = [];

  for (let exchange of exchanges) {
    try {
      const ticker = await exchange.fetchTicker(signal.pair);
      const price = ticker.last;

      const usdt = 10;
      const amount = (usdt * RISK_PERCENT) / price;

      const stopLoss = price * (1 - SL_PERCENT);
      const takeProfit = price * (1 + TP_PERCENT);

      results.push({
        exchange: exchange.id,
        price,
        SL: stopLoss,
        TP: takeProfit
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 BOT RUNNING on port " + PORT);
});
