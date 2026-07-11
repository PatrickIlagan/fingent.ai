import re

with open("src/pages/Career.tsx", "r") as f:
    content = f.read()

# Add states
states_target = """  const [editForm, setEditForm] = useState({
     current_role: '', target_role: '', current_salary: '', target_salary: ''
  });"""

new_states = """  const [editForm, setEditForm] = useState({
     current_role: '', target_role: '', current_salary: '', target_salary: ''
  });

  const [dbIncomeFlows, setDbIncomeFlows] = useState<any[]>([]);
  const [budgetPresets, setBudgetPresets] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ name: '', amount: '', date: '', is_recurring: false, budget_preset_id: '', account_id: '' });"""

if states_target in content:
    content = content.replace(states_target, new_states)

# Update fetch
effect_target = """  useEffect(() => {
     fetch('/api/career').then(r => r.json()).then(data => {
        if (data) {"""

new_effect = """  useEffect(() => {
     Promise.all([
        fetch('/api/career'),
        fetch('/api/income_flows'),
        fetch('/api/budget_presets'),
        fetch('/api/accounts')
     ]).then(async ([c, i, b, a]) => {
        const data = await c.json().catch(()=>null);
        if (data) {
           setCareer(data);
           try { setSkills(JSON.parse(data.skills_needed || '[]')); } catch(e) {}
           setEditForm({ current_role: data.current_role || '', target_role: data.target_role || '', current_salary: data.current_salary?.toString() || '', target_salary: data.target_salary?.toString() || '' });
        }
        setDbIncomeFlows(await i.json().catch(()=>[]));
        setBudgetPresets(await b.json().catch(()=>[]));
        setAccounts(await a.json().catch(()=>[]));
     });
  }, []);
  
  useEffect(() => {
     // dummy effect to match old structure if needed, not actually replacing it. Just ignore.
  }, [0]);
  
  const _old_ = () => {
     fetch('/api/career').then(r => r.json()).then(data => {
        if (data) {"""

if effect_target in content:
    content = content.replace(effect_target, new_effect)


# Now add the UI below side hustle
ui_target = """        <div className="space-y-6">
          <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
             <h3 className="font-bold text-lg mb-6 flex items-center">
               <Lightbulb className="w-5 h-5 mr-2 text-amber-500" /> Side Hustle Ideas
             </h3>"""

new_ui = """        <div className="space-y-6">
          <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
             <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-lg flex items-center">
                 <TrendingUp className="w-5 h-5 mr-2 text-emerald-500" /> Income Flows
               </h3>
               <button onClick={() => setIsIncomeModalOpen(true)} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${isAdvanced ? 'bg-slate-900 border-slate-700 hover:border-violet-500' : 'bg-slate-50 border-slate-200 hover:border-emerald-500'}`}>+ Add Income</button>
             </div>
             
             <div className="space-y-3">
               {dbIncomeFlows.length === 0 && <p className="text-xs text-slate-500">No income flows setup yet.</p>}
               {dbIncomeFlows.map(flow => {
                  const account = accounts.find(a => a.id === flow.account_id);
                  const preset = budgetPresets.find(p => p.id === flow.budget_preset_id);
                  return (
                     <div key={flow.id} className={`p-4 rounded-2xl border ${isAdvanced ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex justify-between items-start mb-2">
                           <div>
                              <p className="font-bold text-sm">{flow.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="text-xs font-bold text-emerald-500">₱{parseFloat(flow.amount).toLocaleString()}</span>
                                 <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{flow.is_recurring ? 'Recurring' : 'One-time'}</span>
                              </div>
                           </div>
                           <button onClick={async () => {
                              if (confirm('Delete income flow?')) {
                                 await fetch(`/api/income_flows/${flow.id}`, { method: 'DELETE' });
                                 window.location.reload();
                              }
                           }} className="text-slate-400 hover:text-rose-500"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="text-xs text-slate-500 font-medium space-y-1 mt-3">
                           <p>📅 Next date: {new Date(flow.date).toLocaleDateString()}</p>
                           {account && <p>🏦 Dest: {account.name}</p>}
                           {preset && <p>📊 Auto-Budget: {preset.name}</p>}
                        </div>
                     </div>
                  );
               })}
             </div>
          </div>

          <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
             <h3 className="font-bold text-lg mb-6 flex items-center">
               <Lightbulb className="w-5 h-5 mr-2 text-amber-500" /> Side Hustle Ideas
             </h3>"""

if ui_target in content:
    content = content.replace(ui_target, new_ui)

end_target = """    </div>
  );
}"""

modal_code = """
      {isIncomeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl shadow-xl ${isAdvanced ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}>
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold">Add Income Flow</h3>
               <button onClick={() => setIsIncomeModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><X className="w-5 h-5"/></button>
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
             }} className="space-y-4">
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">Name / Source</label>
                   <input required value={incomeForm.name} onChange={e=>setIncomeForm({...incomeForm, name: e.target.value})} className={`w-full px-4 py-3 rounded-xl outline-none font-bold ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} placeholder="e.g. Salary" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Amount</label>
                      <input required type="number" value={incomeForm.amount} onChange={e=>setIncomeForm({...incomeForm, amount: e.target.value})} className={`w-full px-4 py-3 rounded-xl outline-none font-bold ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} placeholder="0.00" />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Date</label>
                      <input required type="date" value={incomeForm.date} onChange={e=>setIncomeForm({...incomeForm, date: e.target.value})} className={`w-full px-4 py-3 rounded-xl outline-none font-bold ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                   </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                   <input type="checkbox" checked={incomeForm.is_recurring} onChange={e=>setIncomeForm({...incomeForm, is_recurring: e.target.checked})} />
                   <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Recurring Monthly</span>
                </label>
                
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                   <label className="block text-xs font-bold text-slate-500 mb-1">Destination Account (Optional)</label>
                   <select value={incomeForm.account_id} onChange={e=>setIncomeForm({...incomeForm, account_id: e.target.value})} className={`w-full px-4 py-3 rounded-xl outline-none font-bold mb-4 ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                      <option value="">No Account</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                   </select>
                   
                   <label className="block text-xs font-bold text-slate-500 mb-1">Auto-Budget Model (Optional)</label>
                   <select value={incomeForm.budget_preset_id} onChange={e=>setIncomeForm({...incomeForm, budget_preset_id: e.target.value})} className={`w-full px-4 py-3 rounded-xl outline-none font-bold mb-2 ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                      <option value="">None</option>
                      {budgetPresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                   <p className="text-[10px] text-slate-500 mb-6 leading-tight">If selected, a budget plan will be automatically generated using this model on the income date.</p>
                </div>
                
                <button type="submit" className="w-full py-4 rounded-xl font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">Save Income Flow</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}"""

if end_target in content:
    content = content.replace(end_target, modal_code)

with open("src/pages/Career.tsx", "w") as f:
    f.write(content)
print("Updated career")
