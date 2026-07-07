const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');

const getSymbolHtmlNew = `const getSymbol = (currency?: string) => {
  if (currency === 'USD') return '$';
  if (currency === 'PHP') return '₱';
  if (currency === 'EUR') return '€';
  if (currency === 'GBP') return '£';
  return '$';
};`;

const getSymbolHtmlFix = `const getSymbol = (currency?: string) => {
  if (currency === 'USD') return '$';
  if (currency === 'PHP') return '₱';
  if (currency === 'EUR') return '€';
  if (currency === 'GBP') return '£';
  return '₱';
};`;

content = content.replace(getSymbolHtmlNew, getSymbolHtmlFix);

fs.writeFileSync('src/pages/Investments.tsx', content);
