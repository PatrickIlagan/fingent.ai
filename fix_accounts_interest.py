with open("src/pages/Accounts.tsx", "r") as f:
    content = f.read()

# 1. Remove the Investments option
old_select = """                    <option value="Bank">Bank</option>
                    <option value="Digital">Digital Wallet</option>
                    <option value="Card">Credit Card</option>
                    <option value="Cash">Cash on Hand</option>
                    <option value="Investments">Investments</option>"""

new_select = """                    <option value="Bank">Bank</option>
                    <option value="Digital">Digital Wallet</option>
                    <option value="Card">Credit Card</option>
                    <option value="Cash">Cash on Hand</option>"""

content = content.replace(old_select, new_select)

# 2. Add condition to Interest Rate field
old_interest = """              <div>
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

new_interest = """              {(newAccount.type === 'Bank' || newAccount.type === 'Digital') && (
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
                </div>
              )}"""

if old_interest in content:
    content = content.replace(old_interest, new_interest)

with open("src/pages/Accounts.tsx", "w") as f:
    f.write(content)
