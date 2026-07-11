import re

with open("src/pages/Plans.tsx", "r") as f:
    content = f.read()

target = """      {(showAll || isBudget) && (
        <div className="space-y-8">
          
          
                      
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">"""

new_code = """      {(showAll || isBudget) && (
        <div className="space-y-8">
          {budgetPlans.length === 0 ? (
             <div className="text-center py-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
               <p className="text-slate-500 mb-4">No budget plans yet.</p>
               <button onClick={() => setIsBudgetBuilderOpen(true)} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-900 text-white hover:bg-slate-800">Create one</button>
             </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {budgetPlans.map(plan => {
                 const totalSpent = plan.isGrouped 
                    ? plan.groups.reduce((sum: number, g: any) => sum + (g.spent || 0), 0)
                    : plan.groups[0]?.categories.reduce((sum: number, c: any) => sum + (c.spent || 0), 0) || 0;
                 const planProgress = (totalSpent / plan.totalLimit) * 100;
                 const planIsWarning = planProgress > 85;
                 const planIsOver = planProgress >= 100;

                 return (
                    <div key={plan.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-emerald-500/50 cursor-pointer transition-all" onClick={() => setSelectedPlan(plan)}>
                      <div className="flex justify-between items-start mb-6">
                         <div>
                            <h3 className="font-bold text-lg">{plan.name}</h3>
                            <p className="text-xs font-bold text-slate-500 mt-1">
                               {plan.type === 'recurring' ? 'Recurring Monthly' : `${new Date(plan.startDate).toLocaleDateString()} - ${new Date(plan.endDate).toLocaleDateString()}`}
                            </p>
                         </div>
                         <div className="text-right">
                            <p className="font-black text-xl">₱{plan.totalLimit.toLocaleString()}</p>
                            <p className="text-xs font-bold text-slate-500 mt-1">{totalSpent > 0 ? `₱${totalSpent.toLocaleString()} spent` : 'No spending yet'}</p>
                         </div>
                      </div>
                      
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">"""

if target in content:
    content = content.replace(target, new_code)
    with open("src/pages/Plans.tsx", "w") as f:
        f.write(content)
    print("Fixed plans")
else:
    print("Target not found")
