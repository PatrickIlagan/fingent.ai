import sys

with open("src/pages/Home.tsx", "r") as f:
    content = f.read()

target1 = """  const monthlyIncome = data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses = data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);"""

replacement1 = """  const monthlyIncome = data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses = data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const totalInvestments = data.portfolios.reduce((sum, p) => sum + (p.current_value || 0), 0);
  const totalNetWorth = totalCash + totalInvestments;
  const stocksValue = data.portfolios.filter(p => p.type === 'Stocks').reduce((sum, p) => sum + (p.current_value || 0), 0);
  const cryptoValue = data.portfolios.filter(p => p.type === 'Cryptos').reduce((sum, p) => sum + (p.current_value || 0), 0);"""

target2 = """              <div className="mb-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Net Worth</p>
                <p className="text-2xl font-bold">₱{(totalCash + 1250000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-emerald-500 font-medium mt-1">+2.4% this week</p>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-3 text-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" onClick={() => onNavigate?.('investments-stocks')}>
                  <div className="flex items-center justify-center gap-1 mb-1 text-slate-500 dark:text-slate-400"><TrendingUp className="w-3 h-3" /><p className="text-xs">Stocks</p></div>
                  <p className="font-bold text-sm">₱850k</p>
                </div>
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-3 text-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" onClick={() => onNavigate?.('investments-cryptos')}>
                  <div className="flex items-center justify-center gap-1 mb-1 text-slate-500 dark:text-slate-400"><Bitcoin className="w-3 h-3" /><p className="text-xs">Crypto</p></div>
                  <p className="font-bold text-sm">₱400k</p>
                </div>
              </div>"""

replacement2 = """              <div className="mb-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Net Worth</p>
                <p className="text-2xl font-bold">₱{totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-emerald-500 font-medium mt-1">Updated via Portfolios</p>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-3 text-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" onClick={() => onNavigate?.('investments-stocks')}>
                  <div className="flex items-center justify-center gap-1 mb-1 text-slate-500 dark:text-slate-400"><TrendingUp className="w-3 h-3" /><p className="text-xs">Stocks</p></div>
                  <p className="font-bold text-sm">₱{(stocksValue/1000).toFixed(1)}k</p>
                </div>
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-3 text-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" onClick={() => onNavigate?.('investments-cryptos')}>
                  <div className="flex items-center justify-center gap-1 mb-1 text-slate-500 dark:text-slate-400"><Bitcoin className="w-3 h-3" /><p className="text-xs">Crypto</p></div>
                  <p className="font-bold text-sm">₱{(cryptoValue/1000).toFixed(1)}k</p>
                </div>
              </div>"""

if target1 in content and target2 in content:
    content = content.replace(target1, replacement1)
    content = content.replace(target2, replacement2)
    with open("src/pages/Home.tsx", "w") as f:
        f.write(content)
    print("Successfully replaced.")
else:
    print("Target not found.")

