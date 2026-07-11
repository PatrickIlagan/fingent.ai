import sys

with open("src/pages/Plans.tsx", "r") as f:
    content = f.read()

target = """                    <p className="text-sm font-medium text-slate-500 mb-6">We've suggested a 50/30/20 split based on ₱{parseFloat(totalBudgetLimit).toLocaleString()}. Adjust to your liking.</p>
                    
                    <div className="space-y-4 mb-6">"""

new_html = """                    <p className="text-sm font-medium text-slate-500 mb-4">We've suggested a 50/30/20 split based on ₱{parseFloat(totalBudgetLimit).toLocaleString()}. Adjust to your liking.</p>
                    
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
                       {dbPresets.map(preset => (
                          <button 
                             key={preset.id}
                             onClick={() => {
                                const allocs = JSON.parse(preset.allocations || '[]');
                                const total = parseFloat(totalBudgetLimit) || 0;
                                const newAllocations = allocs.map((a: any, i: number) => ({
                                   id: Date.now() + i,
                                   name: a.name,
                                   percentage: a.percentage,
                                   amount: (total * (a.percentage / 100)).toString(),
                                   color: a.color || 'emerald',
                                   categories: a.categories || []
                                }));
                                setAllocations(newAllocations);
                             }}
                             className={`px-4 py-2 whitespace-nowrap rounded-xl text-xs font-bold border transition-all ${isAdvanced ? 'bg-slate-900 border-slate-700 hover:border-violet-500' : 'bg-white border-slate-200 hover:border-emerald-500'}`}
                          >
                             Apply {preset.name}
                          </button>
                       ))}
                       <button 
                          onClick={async () => {
                             const name = prompt("Enter a name for this preset:");
                             if (!name) return;
                             const toSave = allocations.map(a => ({
                                name: a.name, percentage: a.percentage, color: a.color, categories: a.categories
                             }));
                             await fetch('/api/budget_presets', {
                                method: 'POST', headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({name, allocations: toSave})
                             });
                             window.location.reload();
                          }}
                          className={`px-4 py-2 whitespace-nowrap rounded-xl text-xs font-bold border border-dashed transition-all ${isAdvanced ? 'bg-slate-900 border-slate-700 hover:border-violet-500' : 'bg-slate-50 border-slate-300 hover:border-emerald-500'}`}
                       >
                          + Save Current as Preset
                       </button>
                    </div>
                    
                    <div className="space-y-4 mb-6">"""

if target in content:
    content = content.replace(target, new_html)
    with open("src/pages/Plans.tsx", "w") as f:
        f.write(content)
    print("Replaced Presets section")
else:
    print("Target not found")
