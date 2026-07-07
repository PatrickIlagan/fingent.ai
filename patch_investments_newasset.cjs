const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');

content = content.replace(
  "name: '', type: activeCategory === 'All' ? 'Stocks' : activeCategory, shares: '', avgPrice: '', currentValue: '', invested: '', ticker: ''",
  "name: '', type: activeCategory === 'All' ? 'Stocks' : activeCategory, shares: '', avgPrice: '', currentValue: '', invested: '', ticker: '', currency: 'USD'"
);
content = content.replace(
  "name: '', type: 'Stocks', shares: '', avgPrice: '', currentValue: '', invested: '', ticker: ''",
  "name: '', type: 'Stocks', shares: '', avgPrice: '', currentValue: '', invested: '', ticker: '', currency: 'USD'"
);

const oldBody = `ticker: isSharesBased ? newAsset.ticker || '' : null
          })
        });`;
const newBody = `ticker: isSharesBased ? newAsset.ticker || '' : null,
            currency: newAsset.currency
          })
        });`;

content = content.replace(oldBody, newBody);

fs.writeFileSync('src/pages/Investments.tsx', content);
