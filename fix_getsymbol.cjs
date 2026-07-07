const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');

const getSymbolFn = `const getSymbol = (currency?: string) => {
  if (currency === 'USD') return '$';
  if (currency === 'PHP') return '₱';
  if (currency === 'EUR') return '€';
  if (currency === 'GBP') return '£';
  return '₱';
};

`;

content = content.replace('export function Investments', getSymbolFn + 'export function Investments');

fs.writeFileSync('src/pages/Investments.tsx', content);
