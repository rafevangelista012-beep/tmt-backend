const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("TMT AI Backend is LIVE 🚀");
});

app.get("/signal", (req, res) => {
  res.json({
    pair: "BTCUSDT",
    bias: "BULLISH",
    confidence: 70,
    reason: "RSI + MACD bullish confluence"
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
