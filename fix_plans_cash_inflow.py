import re

with open("src/pages/Plans.tsx", "r") as f:
    content = f.read()

target = """                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Total Monthly Budget</label>
                        <div className="relative">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-2xl">₱</span>
                          <input """

new_code = """                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Total Monthly Budget</label>
                        
                        <div className="flex gap-2 mb-3">
                           <select onChange={(e) => {
                              if (e.target.value) {
                                 const flow = dbIncomeFlows.find(f => f.id.toString() === e.target.value);
                                 if (flow) {
                                    setTotalBudgetLimit(flow.amount.toString());
                                    if (flow.budget_preset_id) {
                                       // they could also apply the preset automatically but that's handled in step 2 usually
                                    }
                                 }
                              }
                           }} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${isAdvanced ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                              <option value="">Select an Income Flow...</option>
                              {dbIncomeFlows.map(flow => (
                                 <option key={flow.id} value={flow.id}>{flow.name} (₱{parseFloat(flow.amount).toLocaleString()})</option>
                              ))}
                           </select>
                        </div>
                        
                        <div className="relative">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-2xl">₱</span>
                          <input """

if target in content:
    content = content.replace(target, new_code)
    with open("src/pages/Plans.tsx", "w") as f:
        f.write(content)
    print("Added inflow selector")
else:
    print("Not found")

