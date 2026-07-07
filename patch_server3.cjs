const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const postLogic = `
  app.post("/api/portfolios", async (req, res) => {
    try {
      const db = await getDb();
      let { type, name, invested, current_value, shares = null, avg_price = null, ticker = null } = req.body;
      
      if (ticker) {
        try {
           const quote = await yahooFinance.quote(ticker);
           if (quote && quote.regularMarketPrice) {
              const currentPrice = quote.regularMarketPrice;
              current_value = currentPrice * (shares || 0);
           }
        } catch(e) {
           console.error('Failed to fetch initial price for ticker', ticker);
        }
      }

      const result = await db.run(
        "INSERT INTO portfolios (type, name, invested, current_value, shares, avg_price, ticker) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [type, name, invested, current_value, shares, avg_price, ticker]
      );
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
`;

content = content.replace(/app\.post\("\/api\/portfolios", async \(req, res\) => \{[\s\S]*?\}\);/, postLogic.trim());
fs.writeFileSync('server.ts', content);
