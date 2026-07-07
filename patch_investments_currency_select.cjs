const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');

const assetNameHtml = `               <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Asset Name</label>
                  <input 
                    type="text" 
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                    className={\`w-full px-4 py-3 rounded-xl text-sm outline-none \${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}\`} 
                    placeholder="e.g. AAPL, Condominium" 
                  />
               </div>`;

const currencyHtml = `               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Asset Name</label>
                    <input 
                      type="text" 
                      value={newAsset.name}
                      onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                      className={\`w-full px-4 py-3 rounded-xl text-sm outline-none \${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}\`} 
                      placeholder="e.g. AAPL" 
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Currency</label>
                    <select 
                      value={newAsset.currency || 'USD'}
                      onChange={(e) => setNewAsset({ ...newAsset, currency: e.target.value })}
                      className={\`w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none \${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}\`}
                    >
                      <option value="USD">$ USD</option>
                      <option value="PHP">₱ PHP</option>
                      <option value="EUR">€ EUR</option>
                      <option value="GBP">£ GBP</option>
                    </select>
                 </div>
               </div>`;

content = content.replace(assetNameHtml, currencyHtml);
fs.writeFileSync('src/pages/Investments.tsx', content);
