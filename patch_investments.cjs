const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');
content = content.replace("name: '', type: 'Stocks', shares: '', avgPrice: '', currentValue: '', invested: ''", "name: '', type: 'Stocks', shares: '', avgPrice: '', currentValue: '', invested: '', ticker: ''");
content = content.replace("avg_price: isSharesBased ? parseFloat(newAsset.avgPrice) || 0 : null,", "avg_price: isSharesBased ? parseFloat(newAsset.avgPrice) || 0 : null,\n            ticker: isSharesBased ? newAsset.ticker || '' : null");
content = content.replace("setNewAsset({ name: '', type: 'Stocks', shares: '', avgPrice: '', currentValue: '', invested: '' });", "setNewAsset({ name: '', type: 'Stocks', shares: '', avgPrice: '', currentValue: '', invested: '', ticker: '' });");
content = content.replace(
`               <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Asset Name</label>`,
`               {(newAsset.type === 'Stocks' || newAsset.type === 'Cryptos') && (
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Ticker Symbol (Optional, for auto-tracking)</label>
                    <input 
                      type="text" 
                      value={newAsset.ticker}
                      onChange={(e) => setNewAsset({ ...newAsset, ticker: e.target.value.toUpperCase() })}
                      className={\`w-full px-4 py-3 rounded-xl text-sm outline-none \${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}\`} 
                      placeholder="e.g. AAPL, BTC-USD" 
                    />
                 </div>
               )}
               <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Asset Name</label>`
);
fs.writeFileSync('src/pages/Investments.tsx', content);
