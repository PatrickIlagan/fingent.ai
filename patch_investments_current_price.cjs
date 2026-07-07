const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');

content = content.replace("ticker: d.ticker,", "ticker: d.ticker,\n           currentPrice: d.current_price,");

const oldDisplayPrice = "{(selectedHolding.shares && selectedHolding.shares > 0 ? selectedHolding.value / selectedHolding.shares : 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}";
const newDisplayPrice = "{(selectedHolding.currentPrice || (selectedHolding.shares && selectedHolding.shares > 0 ? selectedHolding.value / selectedHolding.shares : 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}";

content = content.replace(oldDisplayPrice, newDisplayPrice);

fs.writeFileSync('src/pages/Investments.tsx', content);
