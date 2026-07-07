import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { getDb } from "./server/db";
import { handleAgentChat } from "./server/agent";
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
function formatTicker(ticker: string, type: string) {
  if (!ticker) return ticker;
  let t = ticker.toUpperCase().trim();
  if (type === "Cryptos" && !t.includes("-")) {
    t = t + "-USD";
  }
  return t;
}


async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/accounts", async (req, res) => {
    try {
      const db = await getDb();
      const accounts = await db.all("SELECT * FROM accounts");
      res.json(accounts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/goals", async (req, res) => {
    try {
      const db = await getDb();
      const goals = await db.all("SELECT * FROM goals");
      res.json(goals.map((g: any) => ({
        ...g,
        sources: g.sources ? JSON.parse(g.sources) : [],
        transactions: g.transactions ? JSON.parse(g.transactions) : []
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/transactions", async (req, res) => {
    try {
      const db = await getDb();
      const tx = await db.all(`
        SELECT t.*, a.name as account_name 
        FROM transactions t 
        JOIN accounts a ON t.account_id = a.id 
        ORDER BY date DESC LIMIT 10
      `);
      res.json(tx);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/wealth", async (req, res) => {
     try {
       const db = await getDb();
       const accounts = await db.all("SELECT SUM(balance) as totalCash FROM accounts");
       const portfolios = await db.all("SELECT * FROM portfolios");
       res.json({ totalCash: accounts[0].totalCash || 0, portfolios });
     } catch(error: any) {
       res.status(500).json({ error: error.message });
     }
  });

  app.get("/api/career", async (req, res) => {
     try {
       const db = await getDb();
       const career = await db.get("SELECT * FROM career LIMIT 1");
       res.json(career);
     } catch(error: any) {
       res.status(500).json({ error: error.message });
     }
  });

  app.post("/api/accounts", async (req, res) => {
    try {
      const db = await getDb();
      const { name, type, balance, interest_rate_pa = 0, image_logo_name = 'bank', color = '', purpose = '' } = req.body;
      const result = await db.run(
        "INSERT INTO accounts (name, type, balance, interest_rate_pa, image_logo_name, color, purpose, credit_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [name, type, balance, interest_rate_pa, image_logo_name, color, purpose, req.body.credit_limit || null]
      );
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/goals", async (req, res) => {
    try {
      const db = await getDb();
      const { name, target, saved, date, color, icon, sources, transactions } = req.body;
      const result = await db.run(
        "INSERT INTO goals (name, target, saved, date, color, icon, sources, transactions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [name, target, saved, date, color, icon, JSON.stringify(sources || []), JSON.stringify(transactions || [])]
      );
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/goals/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { name, target, saved, date, color, icon, sources, transactions } = req.body;
      await db.run(
        "UPDATE goals SET name = ?, target = ?, saved = ?, date = ?, color = ?, icon = ?, sources = ?, transactions = ? WHERE id = ?",
        [name, target, saved, date, color, icon, JSON.stringify(sources || []), JSON.stringify(transactions || []), req.params.id]
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const db = await getDb();
      const { account_id, type, amount, category, description, date } = req.body;
      
      // Update account balance
      const account = await db.get("SELECT balance FROM accounts WHERE id = ?", [account_id]);
      if (account) {
        const newBalance = type === 'income' ? account.balance + Number(amount) : account.balance - Number(amount);
        await db.run("UPDATE accounts SET balance = ? WHERE id = ?", [newBalance, account_id]);
      }

      const result = await db.run(
        "INSERT INTO transactions (account_id, type, amount, category, description, date) VALUES (?, ?, ?, ?, ?, ?)",
        [account_id, type, amount, category, description, date]
      );
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      
      // We should theoretically reverse the balance change, but this is a simplified version
      const tx = await db.get("SELECT * FROM transactions WHERE id = ?", [id]);
      if (tx) {
        const account = await db.get("SELECT balance FROM accounts WHERE id = ?", [tx.account_id]);
        if (account) {
           const newBalance = tx.type === 'income' ? account.balance - tx.amount : account.balance + tx.amount;
           await db.run("UPDATE accounts SET balance = ? WHERE id = ?", [newBalance, tx.account_id]);
        }
        await db.run("DELETE FROM transactions WHERE id = ?", [id]);
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/accounts/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { name, type, balance, color, purpose, credit_limit } = req.body;
      
      const oldAccount = await db.get("SELECT balance FROM accounts WHERE id = ?", [id]);
      
      await db.run(
        "UPDATE accounts SET name = ?, type = ?, balance = ?, color = ?, purpose = ?, credit_limit = ? WHERE id = ?",
        [name, type, balance, color, purpose, credit_limit, id]
      );
      
      if (oldAccount && parseFloat(oldAccount.balance) !== parseFloat(balance)) {
        const diff = parseFloat(balance) - parseFloat(oldAccount.balance);
        const txType = diff > 0 ? 'income' : 'expense';
        await db.run(
          "INSERT INTO transactions (account_id, type, amount, category, description, date) VALUES (?, ?, ?, ?, ?, ?)",
          [id, txType, Math.abs(diff), 'Adjustment', 'Balance Adjustment', new Date().toISOString()]
        );
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/accounts/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      
      // Delete associated transactions first
      await db.run("DELETE FROM transactions WHERE account_id = ?", [id]);
      await db.run("DELETE FROM accounts WHERE id = ?", [id]);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

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

  
  app.post("/api/portfolios/sync", async (req, res) => {
    try {
      const db = await getDb();
      const portfolios = await db.all("SELECT * FROM portfolios WHERE ticker IS NOT NULL AND ticker != ''");
      
      let updated = 0;
      for (const p of portfolios) {
        try {
          const quote = await yahooFinance.quote(formatTicker(p.ticker, p.type)) as any;
          if (quote && quote.regularMarketPrice) {
            const currentPrice = quote.regularMarketPrice;
            const shares = p.shares || 0;
            const newValue = currentPrice * shares;
            const currency = quote.currency || 'USD';
            
            await db.run("UPDATE portfolios SET current_value = ?, current_price = ?, currency = ? WHERE id = ?", [newValue, currentPrice, currency, p.id]);
            updated++;
          }
        } catch(err) {
          console.error("Failed to fetch price for " + p.ticker, err);
        }
      }
      
      res.json({ success: true, updated });
    } catch(err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/calendar_events", async (req, res) => {
    try {
      const db = await getDb();
      const events = await db.all("SELECT * FROM calendar_events");
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/calendar_events", async (req, res) => {
    try {
      const db = await getDb();
      const { name, type, amount, date, color, icon, provider, source } = req.body;
      const result = await db.run(
        "INSERT INTO calendar_events (name, type, amount, date, color, icon, provider, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [name, type, amount, date, color, icon, provider, source]
      );
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/calendar_events/:id", async (req, res) => {
    try {
      const db = await getDb();
      await db.run("DELETE FROM calendar_events WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/portfolios", async (req, res) => {
    try {
      const db = await getDb();
      let { type, name, invested, current_value, shares = null, avg_price = null, ticker = null, currency = "USD" } = req.body;
      
      if (ticker) { ticker = formatTicker(ticker, type);
        try {
           const quote = await yahooFinance.quote(formatTicker(ticker, type)) as any;
           if (quote && quote.regularMarketPrice) {
              const currentPrice = quote.regularMarketPrice;
              current_value = currentPrice * (shares || 0);
           }
        } catch(e) {
           console.error('Failed to fetch initial price for ticker', ticker);
        }
      }

      const result = await db.run(
        "INSERT INTO portfolios (type, name, invested, current_value, shares, avg_price, ticker, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [type, name, invested, current_value, shares, avg_price, ticker, currency]
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
               const quote = await yahooFinance.quote(formatTicker(p.ticker, p.type)) as any;
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

  app.put("/api/portfolios/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { current_value } = req.body;
      await db.run("UPDATE portfolios SET current_value = ? WHERE id = ?", [current_value, id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/portfolios/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      await db.run("DELETE FROM portfolios WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/liabilities", async (req, res) => {
    try {
      const db = await getDb();
      const liabilities = await db.all("SELECT * FROM liabilities");
      res.json(liabilities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/liabilities", async (req, res) => {
    try {
      const db = await getDb();
      const { name, type, amount, date, provider, status, card_name, total_amount, remaining_amount, total_months, current_month, merchant, paid_using, is_recurring } = req.body;
      const result = await db.run(
        "INSERT INTO liabilities (name, type, amount, date, provider, status, card_name, total_amount, remaining_amount, total_months, current_month, merchant, paid_using, is_recurring) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [name, type, amount, date, provider, status, card_name, total_amount, remaining_amount, total_months, current_month, merchant, paid_using, is_recurring]
      );
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/liabilities/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      await db.run("DELETE FROM liabilities WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/liabilities/:id/pay", async (req, res) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      await db.run("UPDATE liabilities SET status = 'Paid' WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat", handleAgentChat);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
