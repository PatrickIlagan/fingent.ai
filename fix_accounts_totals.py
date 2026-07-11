with open("src/pages/Accounts.tsx", "r") as f:
    content = f.read()

target_calc = "const totalBalance = filteredAccounts.reduce((acc, curr) => acc + curr.balance, 0);"
new_calc = """const totalBalance = filteredAccounts.reduce((acc, curr) => acc + curr.balance, 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const totalIncome30d = filteredAccounts.reduce((acc, curr) => {
    return acc + (curr.transactions || []).filter((t: any) => t.type === 'income' && new Date(t.date) >= thirtyDaysAgo).reduce((s: number, t: any) => s + t.amount, 0);
  }, 0);

  const totalExpenses30d = filteredAccounts.reduce((acc, curr) => {
    return acc + (curr.transactions || []).filter((t: any) => t.type === 'expense' && new Date(t.date) >= thirtyDaysAgo).reduce((s: number, t: any) => s + t.amount, 0);
  }, 0);"""

content = content.replace(target_calc, new_calc)

target_display = """          {!category && (
            <div className="flex gap-4 sm:border-l sm:pl-6 border-slate-100 dark:border-slate-700">
               <div>
                 <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><ArrowDownRight size={14} className="text-emerald-500" /> Income (30d)</p>
                 <p className="text-xl font-bold">₱45,500</p>
               </div>
               <div>
                 <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><ArrowUpRight size={14} className="text-rose-500" /> Expenses (30d)</p>
                 <p className="text-xl font-bold">₱18,200</p>
               </div>
            </div>
          )}"""

new_display = """          {!category && (
            <div className="flex gap-4 sm:border-l sm:pl-6 border-slate-100 dark:border-slate-700">
               <div>
                 <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><ArrowDownRight size={14} className="text-emerald-500" /> Income (30d)</p>
                 <p className="text-xl font-bold">₱{totalIncome30d.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
               </div>
               <div>
                 <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><ArrowUpRight size={14} className="text-rose-500" /> Expenses (30d)</p>
                 <p className="text-xl font-bold">₱{totalExpenses30d.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
               </div>
            </div>
          )}"""

content = content.replace(target_display, new_display)

with open("src/pages/Accounts.tsx", "w") as f:
    f.write(content)
