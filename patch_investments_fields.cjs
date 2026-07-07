const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');

const fieldsToWrap = `               {(newAsset.type === 'Stocks' || newAsset.type === 'Cryptos') ? (
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Shares / Amount</label>
                      <input 
                        type="number" 
                        value={newAsset.shares}
                        onChange={(e) => setNewAsset({ ...newAsset, shares: e.target.value })}
                        className={\`w-full px-4 py-3 rounded-xl text-sm outline-none \${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}\`} 
                        placeholder="0" 
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Average Price (₱)</label>
                      <input 
                        type="number" 
                        value={newAsset.avgPrice}
                        onChange={(e) => setNewAsset({ ...newAsset, avgPrice: e.target.value })}
                        className={\`w-full px-4 py-3 rounded-xl text-sm outline-none \${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}\`} 
                        placeholder="0" 
                      />
                   </div>
                 </div>
               ) : (
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Total Invested (₱)</label>
                    <input 
                      type="number" 
                      value={newAsset.invested}
                      onChange={(e) => setNewAsset({ ...newAsset, invested: e.target.value })}
                      className={\`w-full px-4 py-3 rounded-xl text-sm outline-none \${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}\`} 
                      placeholder="0" 
                    />
                 </div>
               )}

               <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Current Value (₱)</label>
                  <input 
                    type="number" 
                    value={newAsset.currentValue}
                    onChange={(e) => setNewAsset({ ...newAsset, currentValue: e.target.value })}
                    className={\`w-full px-4 py-3 rounded-xl text-sm outline-none \${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}\`} 
                    placeholder="0" 
                  />
               </div>`;

const newFields = `               {editingId && (
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Current Value (₱) - Update manually for non-tracked assets</label>
                    <input 
                      type="number" 
                      value={newAsset.currentValue}
                      onChange={(e) => setNewAsset({ ...newAsset, currentValue: e.target.value })}
                      className={\`w-full px-4 py-3 rounded-xl text-sm outline-none \${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}\`} 
                      placeholder="0" 
                    />
                 </div>
               )}`;

content = content.replace(fieldsToWrap, newFields);
fs.writeFileSync('src/pages/Investments.tsx', content);
