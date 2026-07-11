with open("src/pages/Accounts.tsx", "r") as f:
    content = f.read()

target = """              {acc.credit_limit && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500">Credit Limit</span>
                    <span className="font-medium">
                      ₱{acc.credit_limit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-rose-500 ml-1 font-bold">({((Math.abs(acc.balance) / acc.credit_limit) * 100).toFixed(0)}% used)</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(Math.abs(acc.balance) / acc.credit_limit) * 100}%` }} />
                  </div>
                </div>
              )}"""

new_code = """              {acc.type === 'Card' && (acc.statement_date || acc.due_date) && (() => {
                 let stmtDay = acc.statement_date ? acc.statement_date.toString() : '';
                 if (stmtDay.includes('-')) stmtDay = stmtDay.split('-')[2];
                 
                 let txAfter = 0;
                 if (stmtDay) {
                    const currentDate = new Date();
                    const stmtDateObj = new Date(`${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${stmtDay.padStart(2, '0')}`);
                    (acc.transactions || []).forEach((tx: any) => {
                       if (new Date(tx.date) > stmtDateObj) {
                          txAfter += (tx.type === 'income' ? tx.amount : -tx.amount);
                       }
                    });
                 }
                 const balanceAsOfStmt = acc.balance - txAfter;
                 const amountOwed = balanceAsOfStmt < 0 ? Math.abs(balanceAsOfStmt) : 0;
                 
                 return (
                   <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-xs">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-500 font-medium">Statement Balance</span>
                        <span className="font-bold text-rose-500">₱{amountOwed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                     </div>
                     {acc.due_date && (
                        <div className="flex justify-between items-center">
                           <span className="text-slate-500">Due Date</span>
                           <span className="font-medium">{acc.due_date}</span>
                        </div>
                     )}
                     {acc.statement_date && (
                        <div className="flex justify-between items-center mt-1">
                           <span className="text-slate-500">Next Statement</span>
                           <span className="font-medium">{acc.statement_date}</span>
                        </div>
                     )}
                   </div>
                 );
              })()}
              {acc.credit_limit && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500">Credit Limit</span>
                    <span className="font-medium">
                      ₱{acc.credit_limit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-rose-500 ml-1 font-bold">({((Math.abs(acc.balance) / acc.credit_limit) * 100).toFixed(0)}% used)</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(Math.abs(acc.balance) / acc.credit_limit) * 100}%` }} />
                  </div>
                </div>
              )}"""

if target in content:
    content = content.replace(target, new_code)
    with open("src/pages/Accounts.tsx", "w") as f:
        f.write(content)
else:
    print("target not found")
