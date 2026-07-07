const fs = require('fs');
let content = fs.readFileSync('server/db.ts', 'utf8');
content = content.replace('avg_price REAL\n    );', 'avg_price REAL,\n      ticker TEXT\n    );');
content = content.replace('await db.exec(`', 'await db.exec(`\n    -- Add ticker column if it does not exist\n    ALTER TABLE portfolios ADD COLUMN ticker TEXT;\n  `).catch(() => {});\n  await db.exec(`');
fs.writeFileSync('server/db.ts', content);
