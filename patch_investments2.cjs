const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');
content = content.replace("avgPrice: d.avg_price,", "avgPrice: d.avg_price,\n           ticker: d.ticker,");
content = content.replace("<div>\n                        <p className=\"font-bold\">{inv.name}</p>", "<div>\n                        <p className=\"font-bold\">\n                           {inv.name} {inv.ticker && <span className=\"text-xs ml-2 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500\">{inv.ticker}</span>}\n                        </p>");
fs.writeFileSync('src/pages/Investments.tsx', content);
