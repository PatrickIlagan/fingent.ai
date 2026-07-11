import re

with open("src/pages/Plans.tsx", "r") as f:
    content = f.read()

target = """                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">Budget Models</h3>
                </div>"""

new_code = """                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">Budget Models</h3>
                  <button onClick={() => setIsBudgetBuilderOpen(true)} className="text-sm font-bold text-slate-500 hover:text-emerald-500 transition-colors">+ New Model</button>
                </div>"""

if target in content:
    content = content.replace(target, new_code)
    with open("src/pages/Plans.tsx", "w") as f:
        f.write(content)
    print("Added New Model button")
else:
    print("Target not found")
