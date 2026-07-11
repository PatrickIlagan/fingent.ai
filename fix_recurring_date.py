with open("src/pages/Plans.tsx", "r") as f:
    content = f.read()

target = """                      {budgetType === 'specific' && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Start Date</label>
                            <input 
                              type="date" 
                              value={budgetDateRange}
                              onChange={(e) => setBudgetDateRange(e.target.value)}
                              className={`w-full px-5 py-4 rounded-xl text-base outline-none font-bold shadow-sm transition-all ${isAdvanced ? 'bg-slate-900 border-2 border-slate-700 focus:border-violet-500' : 'bg-slate-50 border-2 border-slate-200 focus:border-emerald-500'}`} 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">End Date</label>
                            <input 
                              type="date" 
                              value={budgetEndDate}
                              onChange={(e) => setBudgetEndDate(e.target.value)}
                              className={`w-full px-5 py-4 rounded-xl text-base outline-none font-bold shadow-sm transition-all ${isAdvanced ? 'bg-slate-900 border-2 border-slate-700 focus:border-violet-500' : 'bg-slate-50 border-2 border-slate-200 focus:border-emerald-500'}`} 
                            />
                          </div>
                        </div>
                      )}"""

new_code = """                      {budgetType === 'recurring' && (
                        <div className="animate-in slide-in-from-top-2 duration-300">
                           <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Recurring Date (Day of Month)</label>
                           <input 
                             type="number" 
                             min="1" max="31"
                             value={budgetDateRange}
                             onChange={(e) => setBudgetDateRange(e.target.value)}
                             className={`w-full px-5 py-4 rounded-xl text-base outline-none font-bold shadow-sm transition-all ${isAdvanced ? 'bg-slate-900 border-2 border-slate-700 focus:border-violet-500' : 'bg-slate-50 border-2 border-slate-200 focus:border-emerald-500'}`} 
                             placeholder="e.g. 15 for the 15th of every month"
                           />
                        </div>
                      )}
                      
                      {budgetType === 'specific' && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Start Date</label>
                            <input 
                              type="date" 
                              value={budgetDateRange}
                              onChange={(e) => setBudgetDateRange(e.target.value)}
                              className={`w-full px-5 py-4 rounded-xl text-base outline-none font-bold shadow-sm transition-all ${isAdvanced ? 'bg-slate-900 border-2 border-slate-700 focus:border-violet-500' : 'bg-slate-50 border-2 border-slate-200 focus:border-emerald-500'}`} 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">End Date</label>
                            <input 
                              type="date" 
                              value={budgetEndDate}
                              onChange={(e) => setBudgetEndDate(e.target.value)}
                              className={`w-full px-5 py-4 rounded-xl text-base outline-none font-bold shadow-sm transition-all ${isAdvanced ? 'bg-slate-900 border-2 border-slate-700 focus:border-violet-500' : 'bg-slate-50 border-2 border-slate-200 focus:border-emerald-500'}`} 
                            />
                          </div>
                        </div>
                      )}"""

if target in content:
    content = content.replace(target, new_code)
    with open("src/pages/Plans.tsx", "w") as f:
        f.write(content)
