const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');

content = content.replace(/Total Invested \(\$\)/g, 'Total Invested ({getSymbol(selectedHolding?.currency)})');
content = content.replace(/Price per Share \(\$\)/g, 'Price per Share ({getSymbol(selectedHolding?.currency)})');
content = content.replace(/Total Amount \(\$\)/g, 'Total Amount ({getSymbol(selectedHolding?.currency)})');
content = content.replace(/Current Value \(\$\)/g, 'Current Value ({getSymbol(newAsset.currency)})');
content = content.replace(/\{getSymbol\(selectedHolding\?\.currency\)\}\{gain\.toLocaleString\(\)\}/g, '{getSymbol(inv.currency)}{gain.toLocaleString()}');

fs.writeFileSync('src/pages/Investments.tsx', content);
