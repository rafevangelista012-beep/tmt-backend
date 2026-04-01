if (!user.active) continue;

try {

  const exchange = new ccxt.okx({
    apiKey: user.apiKey,
    secret: user.secret,
    password: user.password,
    enableRateLimit: true
  });

  const symbol = 'BTC/USDT';

  // ===== GET DATA =====
  const candles = await exchange.fetchOHLCV(symbol, '5m', undefined, 50);
  const ticker = await exchange.fetchTicker(symbol);
  const price = ticker.last;

  const highs = candles.map(c => c[2]);
  const lows = candles.map(c => c[3]);
  const closes = candles.map(c => c[4]);

  // ===== STRUCTURE (TREND) =====
  const lastHigh = highs[highs.length - 1];
  const prevHigh = highs[highs.length - 5];

  const lastLow = lows[lows.length - 1];
  const prevLow = lows[lows.length - 5];

  const bullishTrend = lastHigh > prevHigh && lastLow > prevLow;

  // ===== LIQUIDITY SWEEP =====
  const recentLow = Math.min(...lows.slice(-10));
  const liquiditySweep = price > recentLow;

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
  const validTrade =
    bullishTrend &&
    liquiditySweep &&
    nearSupport &&
    rsi > 50;

  if (!validTrade) {
    console.log(`⛔ NO TRADE (${user.email})`);
    continue;
  }

  // ===== SMART SL =====
  const stopLoss = support;
  const riskPerUnit = price - stopLoss;

  if (riskPerUnit <= 0) continue;

  // ===== SMART TP =====
  const takeProfit = price + (riskPerUnit * 2);

  // ===== POSITION SIZE =====
  const riskAmount = user.capital * 0.02;
  const amount = riskAmount / riskPerUnit;

  if (amount <= 0) continue;

  // ===== LOG =====
  console.log(`🔥 TRADE (${user.email})`);
  console.log(`Entry: ${price}`);
  console.log(`SL: ${stopLoss}`);
  console.log(`TP: ${takeProfit}`);
  console.log(`RSI: ${rsi}`);

  // ===== EXECUTE =====
  const order = await exchange.createMarketBuyOrder(symbol, amount);

  console.log(`✅ EXECUTED: ${order.id}`);

} catch (err) {
  console.log(`❌ ERROR (${user.email}):`, err.message);
}
