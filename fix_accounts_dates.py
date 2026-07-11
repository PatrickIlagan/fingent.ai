with open("src/pages/Accounts.tsx", "r") as f:
    content = f.read()

old_date_inputs = """                   <div className="grid grid-cols-2 gap-4">
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
                   </div>"""

new_date_inputs = """                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Statement Date</label>
                        <input 
                          type="date"
                          value={newAccount.statement_date}
                          onChange={(e) => setNewAccount(prev => ({ ...prev, statement_date: e.target.value }))}
                          className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Due Date</label>
                        <input 
                          type="date"
                          value={newAccount.due_date}
                          onChange={(e) => setNewAccount(prev => ({ ...prev, due_date: e.target.value }))}
                          className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                        />
                      </div>
                   </div>"""

if old_date_inputs in content:
    content = content.replace(old_date_inputs, new_date_inputs)
    with open("src/pages/Accounts.tsx", "w") as f:
        f.write(content)
