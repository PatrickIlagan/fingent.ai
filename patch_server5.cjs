const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace("const quote = await yahooFinance.quote(p.ticker);", "const quote = await yahooFinance.quote(p.ticker) as any;");
content = content.replace("const quote = await yahooFinance.quote(ticker);", "const quote = await yahooFinance.quote(ticker) as any;");

fs.writeFileSync('server.ts', content);
