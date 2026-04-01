if (!user.active) continue;

try {

  const exchange = new ccxt.okx({
    apiKey: user.apiKey,
    secret: user.secret,
    password: user.password,
    enableRateLimit: true
  });

  const symbol = 'BTC/USDT';

  // ===== FETCH DATA =====
  const candles = await exchange.fetchOHLCV(symbol, '5m', undefined, 50);
  const ticker = await exchange.fetchTicker(symbol);
  const price = ticker.last;

  const highs = candles.map(c => c[2]);
  const lows = candles.map(c => c[3]);
  const closes = candles.map(c => c[4]);

  // ===== TREND =====
  const bullishTrend =
    highs[highs.length - 1] > highs[highs.length - 5] &&
    lows[lows.length - 1] > lows[lows.length - 5];

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

  // ===== STRATEGY =====
  const validTrade =
    bullishTrend &&
    nearSupport &&
    rsi > 50;

  if (!validTrade) {
    console.log(`⛔ NO TRADE for ${user.email}`);
    continue;
  }

  // ===== SL =====
  const stopLoss = support;
  const riskPerUnit = price - stopLoss;

  if (riskPerUnit <= 0) continue;

  // ===== TP =====
  const takeProfit = price + (riskPerUnit * RR);

  // ===== POSITION SIZE =====
  const riskAmount = user.capital * RISK_PERCENT;
  const amount = riskAmount / riskPerUnit;

  if (amount <= 0) continue;

  console.log(`🔥 SIGNAL (${user.email})`);
  console.log(`Entry: ${price}`);
  console.log(`SL: ${stopLoss}`);
  console.log(`TP: ${takeProfit}`);

  // ===== EXECUTE =====
  const order = await exchange.createMarketBuyOrder(symbol, amount);

  console.log(`✅ EXECUTED: ${order.id}`);

} catch (err) {
  console.log(`❌ ERROR (${user.email}):`, err.message);
}
