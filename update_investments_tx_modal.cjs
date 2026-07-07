const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');

const txModalSearch = `               {(selectedHolding?.type === 'Stocks' || selectedHolding?.type === 'Cryptos') ? (
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Shares / Amount</label>
                      <input 
                        type="number" 
                        value={newTx.amount}
                        onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                        className={\`w-full px-4 py-3 rounded-xl text-sm outline-none \${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}\`} 
                        placeholder="0" 
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Price per Share (₱)</label>
                      <input 
                        type="number" 
                        value={newTx.price}
                        onChange={(e) => setNewTx({ ...newTx, price: e.target.value })}
                        className={\`w-full px-4 py-3 rounded-xl text-sm outline-none \${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}\`} 
                        placeholder="0" 
                      />
                   </div>
                 </div>`;

const txModalReplace = `               {(selectedHolding?.type === 'Stocks' || selectedHolding?.type === 'Cryptos') ? (
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Total Invested (₱)</label>
                      <input 
                        type="number" 
                        value={newTx.totalAmount}
                        onChange={(e) => setNewTx({ ...newTx, totalAmount: e.target.value })}
                        className={\`w-full px-4 py-3 rounded-xl text-sm outline-none \${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}\`} 
                        placeholder="0" 
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Price per Share (₱)</label>
                      <input 
                        type="number" 
                        value={newTx.price}
                        onChange={(e) => setNewTx({ ...newTx, price: e.target.value })}
                        className={\`w-full px-4 py-3 rounded-xl text-sm outline-none \${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}\`} 
                        placeholder="0" 
                      />
                   </div>
                   <div className="col-span-2 text-xs text-slate-500 mt-[-8px]">
                      Calculated Shares: {newTx.totalAmount && newTx.price ? (parseFloat(newTx.totalAmount) / parseFloat(newTx.price)).toFixed(4) : 0}
                   </div>
                 </div>`;

content = content.replace(txModalSearch, txModalReplace);
fs.writeFileSync('src/pages/Investments.tsx', content);
