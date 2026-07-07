const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');

// The `gain` text in the list:
content = content.replace(/\{getSymbol\(selectedHolding\?\.currency\)\}\{gain\.toLocaleString\(\)\} \(\{gainPercent\.toFixed\(2\)\}\%\)/g, '{getSymbol(inv.currency)}{gain.toLocaleString()} ({gainPercent.toFixed(2)}%)');

fs.writeFileSync('src/pages/Investments.tsx', content);
