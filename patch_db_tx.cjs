const fs = require('fs');
let content = fs.readFileSync('server/db.ts', 'utf8');
content = content.replace('await db.exec(`', 'await db.exec(`\n    CREATE TABLE IF NOT EXISTS portfolio_transactions (\n      id INTEGER PRIMARY KEY AUTOINCREMENT,\n      portfolio_id INTEGER,\n      type TEXT NOT NULL,\n      shares REAL NOT NULL,\n      price REAL NOT NULL,\n      date TEXT NOT NULL,\n      FOREIGN KEY(portfolio_id) REFERENCES portfolios(id)\n    );\n  `);\n  await db.exec(`');
fs.writeFileSync('server/db.ts', content);
