const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');

content = content.replace(
  "{gain >= 0 ? '+' : ''}{getSymbol(inv.currency)}{gain.toLocaleString()}",
  "{gain >= 0 ? '+' : ''}{getSymbol(selectedHolding?.currency)}{gain.toLocaleString()}"
);

fs.writeFileSync('src/pages/Investments.tsx', content);
