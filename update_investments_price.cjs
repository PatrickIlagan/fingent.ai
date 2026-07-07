const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');

content = content.replace(
  "{(selectedHolding.value / selectedHolding.shares)?.toLocaleString(undefined, { maximumFractionDigits: 2 })}",
  "{(selectedHolding.shares && selectedHolding.shares > 0 ? selectedHolding.value / selectedHolding.shares : 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}"
);

fs.writeFileSync('src/pages/Investments.tsx', content);
