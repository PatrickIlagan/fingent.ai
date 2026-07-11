import sys

with open("src/pages/Home.tsx", "r") as f:
    content = f.read()

target_vars = """  const estimatedIncomeTax = monthlyIncome * 12 * 0.12;
  const estimatedCapitalGains = totalInvestments * 0.05;
  const estimatedTaxLiability = estimatedIncomeTax + estimatedCapitalGains;
  const effectiveRate = ((estimatedTaxLiability) / ((monthlyIncome * 12) || 1)) * 100;"""

replacement_vars = """  const estimatedIncomeTax = monthlyIncome * 12 * 0.12;
  const estimatedCapitalGains = totalInvestments * 0.05;
  const estimatedTaxLiability = estimatedIncomeTax + estimatedCapitalGains;
  const effectiveRate = ((estimatedTaxLiability) / ((monthlyIncome * 12) || 1)) * 100;
  
  let healthScore = 50;
  if (totalCash > 5000) healthScore += 10;
  if (totalInvestments > 10000) healthScore += 15;
  if (monthlyIncome > monthlyExpenses && monthlyIncome > 0) healthScore += 15;
  if (data.liabilities.filter(l => l.status !== 'Paid').length === 0) healthScore += 10;
  const healthLetter = healthScore >= 90 ? 'A+' : healthScore >= 80 ? 'A' : healthScore >= 70 ? 'B' : healthScore >= 60 ? 'C' : 'D';
  const healthLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 70 ? 'Good' : 'Fair';
"""

target_html = """             <div>
                <p className="text-xs font-bold text-slate-500 mb-1">Financial Health Score</p>
                <div className="flex items-center gap-2">
                   <p className="text-2xl font-black text-emerald-500">84<span className="text-sm text-slate-400">/100</span></p>
                   <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Excellent</span>
                </div>
             </div>
             <div className="w-12 h-12 rounded-full border-4 border-emerald-500 flex items-center justify-center font-bold text-slate-400">
                A
             </div>"""

replacement_html = """             <div>
                <p className="text-xs font-bold text-slate-500 mb-1">Financial Health Score</p>
                <div className="flex items-center gap-2">
                   <p className="text-2xl font-black text-emerald-500">{healthScore}<span className="text-sm text-slate-400">/100</span></p>
                   <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">{healthLabel}</span>
                </div>
             </div>
             <div className="w-12 h-12 rounded-full border-4 border-emerald-500 flex items-center justify-center font-bold text-slate-400">
                {healthLetter}
             </div>"""

if target_vars in content and target_html in content:
    content = content.replace(target_vars, replacement_vars)
    content = content.replace(target_html, replacement_html)
    with open("src/pages/Home.tsx", "w") as f:
        f.write(content)
    print("Successfully replaced Financial Health Score.")
else:
    print("Target not found.")

