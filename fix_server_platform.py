with open("server.ts", "r") as f:
    content = f.read()

old_post = """      let { type, name, invested, current_value, shares = null, avg_price = null, ticker = null, currency = "USD" } = req.body;
      
      if (ticker) { ticker = formatTicker(ticker, type);
        try {
           const quote = await yahooFinance.quote(formatTicker(ticker, type)) as any;
           if (quote && quote.regularMarketPrice) {
              const currentPrice = quote.regularMarketPrice;
              if (shares === null && current_value > 0) {
                 shares = current_value / currentPrice;
                 avg_price = shares > 0 ? invested / shares : null;
              } else {
                 current_value = currentPrice * (shares || 0);
              }
           }
        } catch(e) {
           console.error('Failed to fetch initial price for ticker', ticker);
        }
      }

      const result = await db.run(
        "INSERT INTO portfolios (type, name, invested, current_value, shares, avg_price, ticker, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [type, name, invested, current_value, shares, avg_price, ticker, currency]
      );"""

new_post = """      let { type, name, invested, current_value, shares = null, avg_price = null, ticker = null, currency = "USD", platform = null } = req.body;
      
      if (ticker) { ticker = formatTicker(ticker, type);
        try {
           const quote = await yahooFinance.quote(formatTicker(ticker, type)) as any;
           if (quote && quote.regularMarketPrice) {
              const currentPrice = quote.regularMarketPrice;
              if (shares === null && current_value > 0) {
                 shares = current_value / currentPrice;
                 avg_price = shares > 0 ? invested / shares : null;
              } else {
                 current_value = currentPrice * (shares || 0);
              }
           }
        } catch(e) {
           console.error('Failed to fetch initial price for ticker', ticker);
        }
      }

      const result = await db.run(
        "INSERT INTO portfolios (type, name, invested, current_value, shares, avg_price, ticker, currency, platform) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [type, name, invested, current_value, shares, avg_price, ticker, currency, platform]
      );"""

content = content.replace(old_post, new_post)

old_put = """      const { type, name, invested, current_value, shares, avg_price, ticker, currency } = req.body;
      await db.run(
        "UPDATE portfolios SET type = ?, name = ?, invested = ?, current_value = ?, shares = ?, avg_price = ?, ticker = ?, currency = ? WHERE id = ?",
        [type, name, invested, current_value, shares || null, avg_price || null, ticker || null, currency || "USD", req.params.id]
      );"""

new_put = """      const { type, name, invested, current_value, shares, avg_price, ticker, currency, platform } = req.body;
      await db.run(
        "UPDATE portfolios SET type = ?, name = ?, invested = ?, current_value = ?, shares = ?, avg_price = ?, ticker = ?, currency = ?, platform = ? WHERE id = ?",
        [type, name, invested, current_value, shares || null, avg_price || null, ticker || null, currency || "USD", platform || null, req.params.id]
      );"""

content = content.replace(old_put, new_put)

with open("server.ts", "w") as f:
    f.write(content)
