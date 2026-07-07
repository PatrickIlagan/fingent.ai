const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');

content = content.replace(/ticker: d\.ticker,/g, "ticker: d.ticker,\n           history: d.history || [],");
fs.writeFileSync('src/pages/Investments.tsx', content);
