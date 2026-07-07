const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const getPortfolios = `
  app.get("/api/portfolios", async (req, res) => {
    try {
      const db = await getDb();
      const portfolios = await db.all("SELECT * FROM portfolios");
      const transactions = await db.all("SELECT * FROM portfolio_transactions ORDER BY date DESC");
      
      const enrichedPortfolios = portfolios.map((p: any) => ({
        ...p,
        history: transactions.filter((t: any) => t.portfolio_id === p.id).map((t: any) => ({
           id: t.id,
           date: t.date,
           type: t.type,
           amount: t.shares,
           price: t.price
        }))
      }));
      res.json(enrichedPortfolios);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
`;

content = content.replace(/app\.get\("\/api\/portfolios", async \(req, res\) => \{[\s\S]*?\}\);/, getPortfolios.trim());
fs.writeFileSync('server.ts', content);
