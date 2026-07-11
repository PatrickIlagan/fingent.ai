import sys

with open("src/pages/Home.tsx", "r") as f:
    content = f.read()

target = """             <div className="flex gap-3">
               <div className={`flex-1 md:flex-none px-4 py-3 rounded-2xl ${isAdvanced ? 'bg-slate-700/50' : 'bg-white/20 backdrop-blur-md'}`}>
                 <p className={`text-[10px] uppercase tracking-wider mb-1 ${isAdvanced ? 'text-slate-400' : 'text-emerald-50'}`}>Monthly Income</p>
                 <p className="font-bold text-base">₱30,000</p>
               </div>
               <div className={`flex-1 md:flex-none px-4 py-3 rounded-2xl ${isAdvanced ? 'bg-slate-700/50' : 'bg-white/20 backdrop-blur-md'}`}>
                 <p className={`text-[10px] uppercase tracking-wider mb-1 ${isAdvanced ? 'text-slate-400' : 'text-emerald-50'}`}>Monthly Expenses</p>
                 <p className="font-bold text-base">₱1,350</p>
               </div>
             </div>"""

replacement = """             <div className="flex gap-3">
               <div className={`flex-1 md:flex-none px-4 py-3 rounded-2xl ${isAdvanced ? 'bg-slate-700/50' : 'bg-white/20 backdrop-blur-md'}`}>
                 <p className={`text-[10px] uppercase tracking-wider mb-1 ${isAdvanced ? 'text-slate-400' : 'text-emerald-50'}`}>Monthly Income</p>
                 <p className="font-bold text-base">₱{monthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
               </div>
               <div className={`flex-1 md:flex-none px-4 py-3 rounded-2xl ${isAdvanced ? 'bg-slate-700/50' : 'bg-white/20 backdrop-blur-md'}`}>
                 <p className={`text-[10px] uppercase tracking-wider mb-1 ${isAdvanced ? 'text-slate-400' : 'text-emerald-50'}`}>Monthly Expenses</p>
                 <p className="font-bold text-base">₱{monthlyExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
               </div>
             </div>"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/pages/Home.tsx", "w") as f:
        f.write(content)
    print("Successfully replaced.")
else:
    print("Target not found.")

