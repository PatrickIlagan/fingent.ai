const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const route = `
  app.post("/api/portfolios/:id/transactions", async (req, res) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { type, shares, price, date } = req.body;
      
      await db.run(
        "INSERT INTO portfolio_transactions (portfolio_id, type, shares, price, date) VALUES (?, ?, ?, ?, ?)",
        [id, type, shares, price, date]
      );
      
      const p = await db.get("SELECT * FROM portfolios WHERE id = ?", [id]);
      if (p) {
         let newShares = p.shares || 0;
         let newInvested = p.invested || 0;
         let newAvgPrice = p.avg_price || 0;
         
         if (type === 'Buy') {
            const cost = shares * price;
            newInvested += cost;
            newShares += shares;
            newAvgPrice = newShares > 0 ? newInvested / newShares : 0;
         } else if (type === 'Sell') {
            const costBasis = shares * newAvgPrice;
            newInvested -= costBasis;
            newShares -= shares;
            if (newShares <= 0) {
              newShares = 0;
              newInvested = 0;
              newAvgPrice = 0;
            }
         }
         
         let currentValue = p.current_value;
         if (p.ticker) {
            try {
               const quote = await yahooFinance.quote(p.ticker) as any;
               if (quote && quote.regularMarketPrice) {
                  currentValue = quote.regularMarketPrice * newShares;
               }
            } catch(e) {}
         } else if (type === 'Buy' || type === 'Sell') {
            currentValue = newShares * newAvgPrice;
         }
         
         await db.run(
           "UPDATE portfolios SET shares = ?, invested = ?, avg_price = ?, current_value = ? WHERE id = ?",
           [newShares, newInvested, newAvgPrice, currentValue, id]
         );
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
`;

content = content.replace('app.put("/api/portfolios/:id"', route + '\n  app.put("/api/portfolios/:id"');
fs.writeFileSync('server.ts', content);
