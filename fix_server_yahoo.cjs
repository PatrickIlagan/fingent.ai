const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "import yahooFinance from 'yahoo-finance2';",
  "import YahooFinance from 'yahoo-finance2';\nconst yahooFinance = new YahooFinance();"
);

fs.writeFileSync('server.ts', content);
