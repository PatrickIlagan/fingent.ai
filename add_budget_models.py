import re

with open("src/pages/Plans.tsx", "r") as f:
    content = f.read()

target = """                </div>
            ) : (
              <div className={`rounded-3xl shadow-sm border p-6 sm:p-8"""

new_code = """                </div>
            )}
            
            {!selectedPlan && (
              <div className="space-y-6 mt-12 pt-12 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">Budget Models</h3>
                  <button onClick={() => setIsBudgetBuilderOpen(true)} className="text-sm font-bold text-slate-500 hover:text-emerald-500 transition-colors">+ New Model</button>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                   {dbPresets.length === 0 && <p className="text-sm text-slate-500 col-span-full">No budget models created yet. Save a budget plan as a preset to create one.</p>}
                   {dbPresets.map(preset => {
                      const allocs = JSON.parse(preset.allocations || '[]');
                      return (
                         <div key={preset.id} className={`p-5 rounded-2xl border ${isAdvanced ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex justify-between items-start mb-4">
                               <h4 className="font-bold">{preset.name}</h4>
                               <button onClick={async () => {
                                  if (confirm('Delete this budget model?')) {
                                     await fetch(`/api/budget_presets/${preset.id}`, { method: 'DELETE' });
                                     window.location.reload();
                                  }
                               }} className="text-slate-400 hover:text-rose-500"><X className="w-4 h-4"/></button>
                            </div>
                            <div className="space-y-2">
                               {allocs.map((a: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between text-xs">
                                     <span className="font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                        <div className={`w-2 h-2 rounded-full ${a.color === 'emerald' ? 'bg-emerald-500' : a.color === 'blue' ? 'bg-blue-500' : a.color === 'violet' ? 'bg-violet-500' : a.color === 'amber' ? 'bg-amber-500' : a.color === 'rose' ? 'bg-rose-500' : 'bg-fuchsia-500'}`} />
                                        {a.name}
                                     </span>
                                     <span className="font-bold text-slate-700 dark:text-slate-300">{a.percentage}%</span>
                                  </div>
                               ))}
                            </div>
                         </div>
                      );
                   })}
                </div>
              </div>
            )}
            
            {selectedPlan ? (
              <div className={`rounded-3xl shadow-sm border p-6 sm:p-8"""

if target in content:
    content = content.replace(target, new_code)
    with open("src/pages/Plans.tsx", "w") as f:
        f.write(content)
    print("Added Budget Models section")
else:
    print("Target not found")
