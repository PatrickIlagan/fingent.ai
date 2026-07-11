with open("src/pages/Investments.tsx", "r") as f:
    content = f.read()

old_display = """                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-bold text-base">{inv.name}</p>
                      {inv.shares && inv.value ? (
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold ${gain >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                           <span className="opacity-70 font-medium">Avg: {getSymbol(inv.currency)}{inv.avgPrice.toLocaleString()}</span>"""

new_display = """                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-bold text-base">{inv.name} {inv.platform && <span className="text-xs font-normal text-slate-400 ml-1">({inv.platform})</span>}</p>
                      {inv.shares && inv.value ? (
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold ${gain >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                           <span className="opacity-70 font-medium">Avg: {getSymbol(inv.currency)}{inv.avgPrice.toLocaleString()}</span>"""

if old_display in content:
    content = content.replace(old_display, new_display)
    with open("src/pages/Investments.tsx", "w") as f:
        f.write(content)
else:
    print("Not found")
