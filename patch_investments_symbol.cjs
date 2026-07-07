const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');

const mappingHtml = `currentPrice: d.current_price,
           history: d.history || [],`;
const mappingHtmlNew = `currentPrice: d.current_price,
           currency: d.currency || 'USD',
           history: d.history || [],`;

content = content.replace(mappingHtml, mappingHtmlNew);

const getSymbolHtml = `const Investments = () => {`;
const getSymbolHtmlNew = `const getSymbol = (currency?: string) => {
  if (currency === 'USD') return '$';
  if (currency === 'PHP') return '₱';
  if (currency === 'EUR') return '€';
  if (currency === 'GBP') return '£';
  return '$';
};

const Investments = () => {`;

content = content.replace(getSymbolHtml, getSymbolHtmlNew);

fs.writeFileSync('src/pages/Investments.tsx', content);
