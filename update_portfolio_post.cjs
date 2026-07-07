const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const postLogic = `
  app.post("/api/portfolios", async (req, res) => {
    try {
      const db = await getDb();
      let { type, name, invested, current_value, shares = null, avg_price = null, ticker = null } = req.body;
      
      if (ticker) {
        try {
           const quote = await yahooFinance.quote(ticker) as any;
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
      
      const newId = result.lastInsertRowid;
      
      if (shares && shares > 0 && avg_price && avg_price > 0) {
         await db.run(
           "INSERT INTO portfolio_transactions (portfolio_id, type, shares, price, date) VALUES (?, ?, ?, ?, ?)",
           [newId, 'Buy', shares, avg_price, new Date().toISOString().split('T')[0]]
         );
      }
      
      res.json({ id: newId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
`;

content = content.replace(/app\.post\("\/api\/portfolios", async \(req, res\) => \{[\s\S]*?\}\);/, postLogic.trim());
fs.writeFileSync('server.ts', content);
