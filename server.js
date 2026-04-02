const express = require('express');
const ccxt = require('ccxt');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// ===== SUPABASE =====
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ===== ADD USER =====
app.post('/add-user', async (req, res) => {
  const { email, apiKey, secret, password } = req.body;

  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        email,
        api_key: apiKey,
        secret,
        password,
        capital: 10,
        active: true,
        subscription_active: true
      }
    ]);

  if (error) return res.json({ error });

  res.json({ message: "User added" });
});

// ===== BOT LOOP =====
setInterval(async () => {
  const { data: users, error } = await supabase
  .from('users')
  .select('*')
  .eq('active', true);

if (error) {
  console.log("❌ USER FETCH ERROR:", error);
  return;
}

if (!users || users.length === 0) {
  console.log("⚠️ No users found");
  return;
}

    for (let user of users) {
  try {
    const now = new Date();

    // ❌ STOP if trial expired
    if (!user.is_paid && new Date(user.trial_end) < now) {
      console.log(`❌ Trial expired for ${user.email}`);
      continue;
    }

    const exchange = new ccxt.okx({
      apiKey: user.api_key,
      secret: user.secret,
      password: user.password,
      enableRateLimit: true
    });

      const symbol = 'BTC/USDT';

      const candles = await exchange.fetchOHLCV(symbol, '5m', undefined, 50);
      const ticker = await exchange.fetchTicker(symbol);
      const price = ticker.last;

      if (!candles || candles.length < 20) continue;

      const highs = candles.map(c => c[2]);
      const lows = candles.map(c => c[3]);
      const closes = candles.map(c => c[4]);

      // ===== TREND =====
      const lastHigh = highs[highs.length - 1];
      const prevHigh = highs[highs.length - 5];
      const lastLow = lows[lows.length - 1];
      const prevLow = lows[lows.length - 5];

      const bullishTrend = lastHigh > prevHigh && lastLow > prevLow;

      // ===== LIQUIDITY =====
      const recentLow = Math.min(...lows.slice(-10));
      const liquiditySweep = price > recentLow;

      // ===== SUPPORT =====
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

      // ===== FINAL STRATEGY =====
      const validTrade =
        bullishTrend &&
        liquiditySweep &&
        nearSupport &&
        rsi > 50;

      if (!validTrade) continue;

      // ===== SL / TP =====
      const stopLoss = support;
      const risk = price - stopLoss;
      if (risk <= 0) continue;

      const takeProfit = price + (risk * 2);

      // ===== POSITION =====
      const riskAmount = user.capital * 0.02;
      const amount = riskAmount / risk;

      if (amount <= 0 || !isFinite(amount)) continue;

      console.log(`🔥 TRADE ${user.email}`);
      console.log(`Entry: ${price}`);
      console.log(`SL: ${stopLoss}`);
      console.log(`TP: ${takeProfit}`);

      const order = await exchange.createMarketBuyOrder(symbol, amount);

// 💾 SAVE TRADE
await supabase.from('trades').insert([
  {
    email: user.email,
    symbol,
    entry: price,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    side: 'BUY',
    status: 'OPEN'
  }
]);

    } catch (err) {
      console.log(`❌ ERROR ${user.email}`, err.message);
    }
  }

}, 60000);

// ===== STATUS =====
app.get('/trades', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.log("❌ FETCH ERROR:", error);
      return res.status(500).json({ error });
    }

    res.json(data);
  } catch (err) {
    console.log("❌ SERVER ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send("TMT BOT RUNNING 🚀");
});

app.listen(3000, () => {
  console.log("Server running...");
});
