const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');

// Replace specific \$ with {getSymbol(selectedHolding?.currency)}
content = content.replace(/\$\{selectedHolding\.value\.toLocaleString\(\)\}/g, '{getSymbol(selectedHolding?.currency)}{selectedHolding.value.toLocaleString()}');
content = content.replace(/\$\{invested\?\.toLocaleString\(\)\}/g, '{getSymbol(selectedHolding?.currency)}{invested?.toLocaleString()}');
content = content.replace(/\$\{gain\.toLocaleString\(\)\}/g, '{getSymbol(selectedHolding?.currency)}{gain.toLocaleString()}');
content = content.replace(/\$\{selectedHolding\.avgPrice\?\.toLocaleString\(\)\}/g, '{getSymbol(selectedHolding?.currency)}{selectedHolding.avgPrice?.toLocaleString()}');
content = content.replace(/\$\{\(selectedHolding\.currentPrice \|\| \(selectedHolding\.shares/g, '{getSymbol(selectedHolding?.currency)}{(selectedHolding.currentPrice || (selectedHolding.shares');

// history mapping
content = content.replace(/@ \$\{hist\.price\.toLocaleString\(\)\}/g, '@ {getSymbol(selectedHolding?.currency)}{hist.price.toLocaleString()}');
content = content.replace(/\$\{\(hist\.amount \* hist\.price\)\.toLocaleString\(\)\}/g, '{getSymbol(selectedHolding?.currency)}{(hist.amount * hist.price).toLocaleString()}');

// mapping inside the list
content = content.replace(/Avg: \$\{inv\.avgPrice\.toLocaleString\(\)\}/g, 'Avg: {getSymbol(inv.currency)}{inv.avgPrice.toLocaleString()}');
content = content.replace(/Mkt: \$\{\(inv\.value \/ inv\.shares\)/g, 'Mkt: {getSymbol(inv.currency)}{(inv.value / inv.shares)');
content = content.replace(/>\$\{inv\.value\.toLocaleString\(\)}/g, '>{getSymbol(inv.currency)}{inv.value.toLocaleString()}');
content = content.replace(/>\{\s*gain >= 0 \? '\+' : ''\s*\}\$\{gain\.toLocaleString\(\)\}/g, '>{gain >= 0 ? "+" : ""}{getSymbol(inv.currency)}{gain.toLocaleString()}');

fs.writeFileSync('src/pages/Investments.tsx', content);
