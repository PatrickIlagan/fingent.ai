const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldSync = `            const currentPrice = quote.regularMarketPrice;
            const shares = p.shares || 0;
            const newValue = currentPrice * shares;
            
            await db.run("UPDATE portfolios SET current_value = ? WHERE id = ?", [newValue, p.id]);`;

const newSync = `            const currentPrice = quote.regularMarketPrice;
            const shares = p.shares || 0;
            const newValue = currentPrice * shares;
            
            await db.run("UPDATE portfolios SET current_value = ?, current_price = ? WHERE id = ?", [newValue, currentPrice, p.id]);`;

content = content.replace(oldSync, newSync);

fs.writeFileSync('server.ts', content);
