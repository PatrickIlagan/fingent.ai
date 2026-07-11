import sys

with open("src/pages/Home.tsx", "r") as f:
    content = f.read()

target_vars = """  const monthlyIncome = data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses = data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const totalInvestments = data.portfolios.reduce((sum, p) => sum + (p.current_value || 0), 0);
  const totalNetWorth = totalCash + totalInvestments;
  const stocksValue = data.portfolios.filter(p => p.type === 'Stocks').reduce((sum, p) => sum + (p.current_value || 0), 0);
  const cryptoValue = data.portfolios.filter(p => p.type === 'Cryptos').reduce((sum, p) => sum + (p.current_value || 0), 0);"""

replacement_vars = """  const monthlyIncome = data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses = data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const totalInvestments = data.portfolios.reduce((sum, p) => sum + (p.current_value || 0), 0);
  const totalNetWorth = totalCash + totalInvestments;
  const stocksValue = data.portfolios.filter(p => p.type === 'Stocks').reduce((sum, p) => sum + (p.current_value || 0), 0);
  const cryptoValue = data.portfolios.filter(p => p.type === 'Cryptos').reduce((sum, p) => sum + (p.current_value || 0), 0);
  
  const estimatedIncomeTax = monthlyIncome * 12 * 0.12;
  const estimatedCapitalGains = totalInvestments * 0.05;
  const estimatedTaxLiability = estimatedIncomeTax + estimatedCapitalGains;
  const effectiveRate = ((estimatedTaxLiability) / ((monthlyIncome * 12) || 1)) * 100;"""

target_html = """              <div className="mb-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Estimated Liability</p>
                <p className="text-2xl font-bold">₱85,400</p>
                <p className="text-xs text-emerald-500 font-medium mt-1">Effective Rate: 12.4%</p>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1 text-slate-500 dark:text-slate-400"><FileText className="w-3 h-3" /><p className="text-xs">Income Tax</p></div>
                  <p className="font-bold text-sm">₱62,100</p>
                </div>
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1 text-slate-500 dark:text-slate-400"><Activity className="w-3 h-3" /><p className="text-xs">Capital Gains</p></div>
                  <p className="font-bold text-sm">₱23,300</p>
                </div>
              </div>"""

replacement_html = """              <div className="mb-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Estimated Liability</p>
                <p className="text-2xl font-bold">₱{estimatedTaxLiability.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-emerald-500 font-medium mt-1">Effective Rate: {effectiveRate.toFixed(1)}%</p>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1 text-slate-500 dark:text-slate-400"><FileText className="w-3 h-3" /><p className="text-xs">Income Tax</p></div>
                  <p className="font-bold text-sm">₱{estimatedIncomeTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1 text-slate-500 dark:text-slate-400"><Activity className="w-3 h-3" /><p className="text-xs">Capital Gains</p></div>
                  <p className="font-bold text-sm">₱{estimatedCapitalGains.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>"""

if target_vars in content and target_html in content:
    content = content.replace(target_vars, replacement_vars)
    content = content.replace(target_html, replacement_html)
    with open("src/pages/Home.tsx", "w") as f:
        f.write(content)
    print("Successfully replaced Tax Overview.")
else:
    print("Target not found.")

