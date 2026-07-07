const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');

const txModalSearch = content.match(/{isTxModalOpen && \(\s*<div className="fixed inset-0 z-50 flex items-center justify-center[\s\S]*?Add Transaction\s*<\/button>\s*<\/div>\s*<\/div>\s*\)}/)[0];

// Remove it from the current position
content = content.replace(txModalSearch, '');

// Place it before the closing </div> of the selectedHolding block
const targetPos = `            {(!selectedHolding.history || selectedHolding.history.length === 0) && (
              <p className="text-sm text-slate-500">No transaction history found.</p>
            )}
          </div>
        </div>`;

const replacePos = targetPos + '\n      ' + txModalSearch;

content = content.replace(targetPos, replacePos);

fs.writeFileSync('src/pages/Investments.tsx', content);
