with open("src/pages/Accounts.tsx", "r") as f:
    content = f.read()

target = """              {newAccount.type === 'Card' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Credit Limit</label>
                  <input 
                    type="number"
                    value={newAccount.credit_limit}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, credit_limit: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                    placeholder="e.g. 50000"
                  />
                </div>
              )}"""

new_code = """              {newAccount.type === 'Card' && (
                <div className="space-y-4">
                   <div>
                     <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Credit Limit</label>
                     <input 
                       type="number"
                       value={newAccount.credit_limit}
                       onChange={(e) => setNewAccount(prev => ({ ...prev, credit_limit: e.target.value }))}
                       className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                       placeholder="e.g. 50000"
                     />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Statement Date</label>
                        <input 
                          type="number"
                          min="1"
                          max="31"
                          value={newAccount.statement_date}
                          onChange={(e) => setNewAccount(prev => ({ ...prev, statement_date: e.target.value }))}
                          className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                          placeholder="Day of month (e.g. 15)"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Due Date</label>
                        <input 
                          type="number"
                          min="1"
                          max="31"
                          value={newAccount.due_date}
                          onChange={(e) => setNewAccount(prev => ({ ...prev, due_date: e.target.value }))}
                          className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                          placeholder="Day of month (e.g. 5)"
                        />
                      </div>
                   </div>
                </div>
              )}
              
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Interest Rate (PA %)</label>
                <input 
                  type="number"
                  step="0.01"
                  value={newAccount.interest_rate_pa}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, interest_rate_pa: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                  placeholder="e.g. 4.5 for 4.5% PA"
                />
              </div>"""

if target in content:
    content = content.replace(target, new_code)
    
old_reset = "setNewAccount({ name: '', type: 'Bank', balance: '', color: '', purpose: '', credit_limit: '' });"
new_reset = "setNewAccount({ name: '', type: 'Bank', balance: '', color: '', purpose: '', credit_limit: '', interest_rate_pa: '', statement_date: '', due_date: '' });"

content = content.replace(old_reset, new_reset)

with open("src/pages/Accounts.tsx", "w") as f:
    f.write(content)
