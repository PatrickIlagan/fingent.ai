with open("src/pages/Plans.tsx", "r") as f:
    content = f.read()

# Add state
old_state = "const [isBudgetBuilderOpen, setIsBudgetBuilderOpen] = useState(false);"
new_state = """const [isBudgetBuilderOpen, setIsBudgetBuilderOpen] = useState(false);
  const [isModelBuilderOpen, setIsModelBuilderOpen] = useState(false);
  const [modelName, setModelName] = useState('');
  const [modelAllocations, setModelAllocations] = useState<any[]>([]);"""

content = content.replace(old_state, new_state)

# Replace the onClick handler for "+ New Model"
old_button = """<button onClick={() => setIsBudgetBuilderOpen(true)} className="text-sm font-bold text-slate-500 hover:text-emerald-500 transition-colors">+ New Model</button>"""
new_button = """<button onClick={() => { setIsModelBuilderOpen(true); setModelName(''); setModelAllocations([{ id: Date.now(), name: 'Housing', percentage: 30, color: 'emerald', categories: [] }]); }} className="text-sm font-bold text-emerald-500 hover:text-emerald-600 transition-colors bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg">+ New Model</button>"""

content = content.replace(old_button, new_button)

# Add the new modal at the bottom of the component
new_modal = """
      {/* Budget Model Builder Modal */}
      {isModelBuilderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto" onClick={() => setIsModelBuilderOpen(false)}>
          <div 
            className={`w-full max-w-2xl my-auto rounded-3xl shadow-xl flex flex-col p-6 sm:p-8 ${isAdvanced ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-white border border-slate-100'}`}
            onClick={e => e.stopPropagation()}
          >
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Create Budget Model</h3>
                <button onClick={() => setIsModelBuilderOpen(false)} className={`p-2 rounded-full ${isAdvanced ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                  <X size={20} />
                </button>
             </div>
             
             <div className="space-y-6">
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Model Name</label>
                   <input 
                     type="text" 
                     value={modelName}
                     onChange={(e) => setModelName(e.target.value)}
                     className={`w-full px-5 py-4 rounded-xl text-base outline-none font-bold shadow-sm transition-all ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`} 
                     placeholder="e.g. 50/30/20 Rule"
                   />
                </div>
                
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Allocations (Must equal 100%)</label>
                   
                   <div className="space-y-4">
                      {modelAllocations.map((alloc, idx) => (
                        <div key={alloc.id} className={`p-4 rounded-2xl border ${isAdvanced ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                           <div className="flex items-center gap-3">
                              <input 
                                type="text"
                                value={alloc.name}
                                onChange={e => {
                                   const newAlloc = [...modelAllocations];
                                   newAlloc[idx].name = e.target.value;
                                   setModelAllocations(newAlloc);
                                }}
                                className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold outline-none ${isAdvanced ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}
                                placeholder="Category Name"
                              />
                              <input 
                                type="number"
                                value={alloc.percentage}
                                onChange={e => {
                                   const newAlloc = [...modelAllocations];
                                   newAlloc[idx].percentage = parseFloat(e.target.value) || 0;
                                   setModelAllocations(newAlloc);
                                }}
                                className={`w-24 px-4 py-3 rounded-xl text-sm font-bold outline-none ${isAdvanced ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}
                                placeholder="%"
                              />
                              <span className="text-slate-400 font-bold">%</span>
                              <button onClick={() => setModelAllocations(modelAllocations.filter((_, i) => i !== idx))} className="text-rose-500 p-2"><X size={18} /></button>
                           </div>
                        </div>
                      ))}
                   </div>
                   
                   <div className="mt-4 flex justify-between items-center">
                      <button onClick={() => setModelAllocations([...modelAllocations, { id: Date.now(), name: 'New Category', percentage: 0, color: 'blue', categories: [] }])} className="text-sm font-bold text-emerald-500 hover:text-emerald-600 transition-colors flex items-center gap-1">
                         <Plus size={16} /> Add Category
                      </button>
                      <span className={`text-sm font-bold ${modelAllocations.reduce((s, a) => s + a.percentage, 0) === 100 ? 'text-emerald-500' : 'text-rose-500'}`}>
                         Total: {modelAllocations.reduce((s, a) => s + a.percentage, 0)}%
                      </span>
                   </div>
                </div>
                
                <button 
                  onClick={async () => {
                     if (!modelName || modelAllocations.reduce((s, a) => s + a.percentage, 0) !== 100) return;
                     await fetch('/api/budget_presets', {
                        method: 'POST', headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({name: modelName, allocations: modelAllocations.map(a => ({ name: a.name, percentage: a.percentage, color: a.color, categories: a.categories }))})
                     });
                     window.location.reload();
                  }}
                  disabled={!modelName || modelAllocations.reduce((s, a) => s + a.percentage, 0) !== 100}
                  className={`w-full py-4 rounded-xl font-bold mt-4 disabled:opacity-50 transition-colors ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                >
                   Save Budget Model
                </button>
             </div>
          </div>
        </div>
      )}
"""

content = content.replace("{/* Bottom Drawer Component for Details (Mobile & Desktop) */}", new_modal + "\n      {/* Bottom Drawer Component for Details (Mobile & Desktop) */}")

with open("src/pages/Plans.tsx", "w") as f:
    f.write(content)
