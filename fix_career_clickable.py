import re

with open("src/pages/Career.tsx", "r") as f:
    content = f.read()

target = """                     <div key={flow.id} className={`p-4 rounded-2xl border ${isAdvanced ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex justify-between items-start mb-2">
                           <div>"""

new_code = """                     <div key={flow.id} onClick={() => { setSelectedFlowId(flow.id); setIncomeViewMode('details'); }} className={`p-4 rounded-2xl border cursor-pointer hover:border-emerald-500 transition-colors ${isAdvanced ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex justify-between items-start mb-2">
                           <div>"""

if target in content:
    content = content.replace(target, new_code)
    with open("src/pages/Career.tsx", "w") as f:
        f.write(content)
    print("Fixed clickable")
else:
    print("Target not found")
