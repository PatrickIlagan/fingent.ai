import re

with open("src/pages/Career.tsx", "r") as f:
    content = f.read()

target = """  return (
    <div className="space-y-6 pb-10">"""

new_code = """  const renderIncomeBuilder = () => (
    <div className="max-w-3xl mx-auto space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-8">
         <button onClick={() => setIncomeViewMode('list')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><ChevronRight className="w-5 h-5 rotate-180" /></button>
         <div>
            <h2 className="text-2xl font-black">Add Income Flow</h2>
            <p className="text-slate-500 font-medium">Create a new source of income and optionally automate its budgeting.</p>
         </div>
      </div>
      
      <form onSubmit={async (e) => {
         e.preventDefault();
         await fetch('/api/income_flows', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
               name: incomeForm.name,
               amount: parseFloat(incomeForm.amount) || 0,
               date: incomeForm.date,
               is_recurring: incomeForm.is_recurring,
               budget_preset_id: parseInt(incomeForm.budget_preset_id) || null,
               account_id: parseInt(incomeForm.account_id) || null
            })
         });
         window.location.reload();
      }} className={`rounded-3xl p-8 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} space-y-8`}>
         
         <div className="space-y-6">
            <div>
               <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Income Source Name</label>
               <input required value={incomeForm.name} onChange={e=>setIncomeForm({...incomeForm, name: e.target.value})} className={`w-full px-5 py-4 rounded-xl outline-none font-bold text-lg ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} placeholder="e.g. Salary, Freelance Project" />
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Amount</label>
                  <div className="relative">
                     <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400">₱</span>
                     <input required type="number" value={incomeForm.amount} onChange={e=>setIncomeForm({...incomeForm, amount: e.target.value})} className={`w-full pl-10 pr-5 py-4 rounded-xl outline-none font-bold text-lg ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} placeholder="0.00" />
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Date</label>
                  <input required type="date" value={incomeForm.date} onChange={e=>setIncomeForm({...incomeForm, date: e.target.value})} className={`w-full px-5 py-4 rounded-xl outline-none font-bold text-lg ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
               </div>
            </div>
            
            <label className={`flex items-center justify-between p-5 rounded-2xl cursor-pointer border-2 transition-all ${incomeForm.is_recurring ? (isAdvanced ? 'border-emerald-500 bg-emerald-500/10' : 'border-emerald-500 bg-emerald-50') : (isAdvanced ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50')}`}>
               <div>
                  <p className="font-bold">Recurring Monthly</p>
                  <p className="text-xs text-slate-500 font-medium">This income repeats on this date every month</p>
               </div>
               <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 ${incomeForm.is_recurring ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 bg-transparent'}`}>
                  {incomeForm.is_recurring && <Check className="w-4 h-4" />}
               </div>
               <input type="checkbox" className="hidden" checked={incomeForm.is_recurring} onChange={e=>setIncomeForm({...incomeForm, is_recurring: e.target.checked})} />
            </label>
         </div>
         
         <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-lg">Automations (Optional)</h3>
            
            <div>
               <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Deposit To Account</label>
               <select value={incomeForm.account_id} onChange={e=>setIncomeForm({...incomeForm, account_id: e.target.value})} className={`w-full px-5 py-4 rounded-xl outline-none font-bold ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                  <option value="">Do not auto-deposit</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
               </select>
               <p className="text-xs text-slate-500 mt-2">Automatically update the balance of this account when the income arrives.</p>
            </div>
            
            <div>
               <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Auto-Budget Model</label>
               <select value={incomeForm.budget_preset_id} onChange={e=>setIncomeForm({...incomeForm, budget_preset_id: e.target.value})} className={`w-full px-5 py-4 rounded-xl outline-none font-bold ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                  <option value="">No Auto-Budgeting</option>
                  {budgetPresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
               </select>
               <p className="text-xs text-slate-500 mt-2">Automatically generate a new Budget Plan using this model when the income arrives.</p>
            </div>
         </div>
         
         <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <button type="submit" className={`w-full py-5 rounded-2xl font-black text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all ${isAdvanced ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40' : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20'}`}>
               Save Income Flow
            </button>
         </div>
      </form>
    </div>
  );

  const renderIncomeDetails = () => {
      const flow = dbIncomeFlows.find(f => f.id === selectedFlowId);
      if (!flow) return null;
      
      const account = accounts.find(a => a.id === flow.account_id);
      const preset = budgetPresets.find(p => p.id === flow.budget_preset_id);
      
      return (
         <div className="max-w-3xl mx-auto space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex items-center gap-4 mb-8">
              <button onClick={() => { setIncomeViewMode('list'); setSelectedFlowId(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><ChevronRight className="w-5 h-5 rotate-180" /></button>
              <div>
                 <h2 className="text-2xl font-black">Income Details</h2>
                 <p className="text-slate-500 font-medium">Manage this income flow</p>
              </div>
           </div>
           
           <div className={`rounded-3xl p-8 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} space-y-8`}>
              <div className="flex justify-between items-start">
                 <div>
                    <h3 className="text-3xl font-black mb-2">{flow.name}</h3>
                    <div className="flex items-center gap-3">
                       <span className="text-xl font-bold text-emerald-500">₱{parseFloat(flow.amount).toLocaleString()}</span>
                       <span className={`px-3 py-1 rounded-lg text-xs font-bold ${flow.is_recurring ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                          {flow.is_recurring ? 'Recurring Monthly' : 'One-time'}
                       </span>
                    </div>
                 </div>
                 
                 <button onClick={async () => {
                     if (confirm('Delete income flow?')) {
                        await fetch(`/api/income_flows/${flow.id}`, { method: 'DELETE' });
                        window.location.reload();
                     }
                  }} className="p-3 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 transition-colors">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                 <div className={`p-5 rounded-2xl ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Next Date</p>
                    <p className="font-bold text-lg">{new Date(flow.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                 </div>
                 
                 <div className={`p-5 rounded-2xl ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                    <p className="font-bold text-lg text-emerald-500 flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> Active</p>
                 </div>
              </div>
              
              <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-700">
                 <h4 className="font-bold">Automations</h4>
                 
                 <div className={`p-5 rounded-2xl border ${isAdvanced ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Destination Account</p>
                    {account ? (
                       <p className="font-bold flex items-center gap-2">🏦 {account.name}</p>
                    ) : (
                       <p className="text-sm font-medium text-slate-400 italic">No account selected</p>
                    )}
                 </div>
                 
                 <div className={`p-5 rounded-2xl border ${isAdvanced ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Auto-Budget Model</p>
                    {preset ? (
                       <div>
                          <p className="font-bold flex items-center gap-2 mb-3">📊 {preset.name}</p>
                          <div className="space-y-2">
                             {JSON.parse(preset.allocations || '[]').map((a: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-sm">
                                   <span className="flex items-center gap-2 font-medium">
                                      <div className={`w-2 h-2 rounded-full ${a.color === 'emerald' ? 'bg-emerald-500' : a.color === 'blue' ? 'bg-blue-500' : a.color === 'violet' ? 'bg-violet-500' : a.color === 'amber' ? 'bg-amber-500' : a.color === 'rose' ? 'bg-rose-500' : 'bg-fuchsia-500'}`}/>
                                      {a.name}
                                   </span>
                                   <span className="font-bold">{a.percentage}% (₱{(parseFloat(flow.amount) * (a.percentage / 100)).toLocaleString()})</span>
                                </div>
                             ))}
                          </div>
                       </div>
                    ) : (
                       <p className="text-sm font-medium text-slate-400 italic">No auto-budgeting configured</p>
                    )}
                 </div>
              </div>
           </div>
         </div>
      );
  }

  if (incomeViewMode === 'add') return renderIncomeBuilder();
  if (incomeViewMode === 'details') return renderIncomeDetails();

  return (
    <div className="space-y-6 pb-10">"""

if target in content:
    content = content.replace(target, new_code)
    
    # We also need to remove the modal code
    # Find {isIncomeModalOpen && (
    # down to )} at the very bottom
    modal_start = "      {isIncomeModalOpen && ("
    if modal_start in content:
        content = content[:content.find(modal_start)] + "    </div>\n  );\n}"

    with open("src/pages/Career.tsx", "w") as f:
        f.write(content)
    print("Replaced with view modes")

