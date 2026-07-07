const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "const { type, name, invested, current_value, shares = null, avg_price = null } = req.body;",
  "const { type, name, invested, current_value, shares = null, avg_price = null, ticker = null } = req.body;"
);

content = content.replace(
  "\"INSERT INTO portfolios (type, name, invested, current_value, shares, avg_price) VALUES (?, ?, ?, ?, ?, ?)\",",
  "\"INSERT INTO portfolios (type, name, invested, current_value, shares, avg_price, ticker) VALUES (?, ?, ?, ?, ?, ?, ?)\","
);

content = content.replace(
  "[type, name, invested, current_value, shares, avg_price]",
  "[type, name, invested, current_value, shares, avg_price, ticker]"
);

fs.writeFileSync('server.ts', content);
