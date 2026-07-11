import sys

with open("src/pages/Plans.tsx", "r") as f:
    content = f.read()

target = """      {(showAll || isBudget) && (
        <div className="space-y-8">
          <div className="flex justify-between items-end">
            <h3 className="font-bold text-lg flex items-center">
              <PieChart className="w-5 h-5 mr-2" /> Budget Plans
            </h3>"""

new_html = """      {(showAll || isBudget) && (
        <div className="space-y-8">
          
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg flex items-center">
                   <TrendingUp className="w-5 h-5 mr-2" /> Income Flows & Inflows
                </h3>
             </div>
             
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {dbIncomeFlows.map(flow => (
                   <div key={flow.id} className="p-4 rounded-2xl border bg-slate-50 border-slate-100 dark:bg-slate-900/50 dark:border-slate-700 flex justify-between items-center">
                      <div>
                         <p className="font-bold text-sm">{flow.name}</p>
                         <p className="text-xs text-slate-500 mt-1">{new Date(flow.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                         <p className="font-black text-emerald-500">₱{parseFloat(flow.amount).toLocaleString()}</p>
                         <button 
                            onClick={() => {
                               setTotalBudgetLimit(flow.amount.toString());
                               setIsBudgetBuilderOpen(true);
                            }}
                            className="text-xs font-bold text-emerald-600 hover:underline mt-1 block"
                         >
                            Apply to Budget
                         </button>
                      </div>
                   </div>
                ))}
             </div>
             
             <form 
                onSubmit={async (e) => {
                   e.preventDefault();
                   const form = e.target as HTMLFormElement;
                   const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                   const amount = parseFloat((form.elements.namedItem('amount') as HTMLInputElement).value);
                   const date = (form.elements.namedItem('date') as HTMLInputElement).value;
                   if (name && amount && date) {
                      await fetch('/api/income_flows', {
                         method: 'POST', headers: {'Content-Type': 'application/json'},
                         body: JSON.stringify({name, amount, date})
                      });
                      window.location.reload();
                   }
                }}
                className="flex flex-wrap gap-2 items-center p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30"
             >
                <input name="name" required placeholder="Income source (e.g. Salary)" className="px-3 py-2 rounded-xl text-sm border dark:bg-slate-900 dark:border-slate-700" />
                <input name="amount" required type="number" placeholder="Amount (₱)" className="w-32 px-3 py-2 rounded-xl text-sm border dark:bg-slate-900 dark:border-slate-700" />
                <input name="date" required type="date" className="px-3 py-2 rounded-xl text-sm border dark:bg-slate-900 dark:border-slate-700" />
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold">Add Inflow</button>
             </form>
          </div>

          <div className="flex justify-between items-end">
            <h3 className="font-bold text-lg flex items-center">
              <PieChart className="w-5 h-5 mr-2" /> Budget Plans
            </h3>"""

if target in content:
    content = content.replace(target, new_html)
    with open("src/pages/Plans.tsx", "w") as f:
        f.write(content)
    print("Replaced Income Flows section")
else:
    print("Target not found")
