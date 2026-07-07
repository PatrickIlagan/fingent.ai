const fs = require('fs');
let content = fs.readFileSync('server/db.ts', 'utf8');
content = content.replace(
  "ALTER TABLE portfolios ADD COLUMN current_price REAL;\n  `).catch(() => {});",
  "ALTER TABLE portfolios ADD COLUMN current_price REAL;\n  `).catch(() => {});\n  await db.exec(`\n    ALTER TABLE portfolios ADD COLUMN currency TEXT DEFAULT 'USD';\n  `).catch(() => {});"
);
fs.writeFileSync('server/db.ts', content);
