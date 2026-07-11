with open("src/pages/Investments.tsx", "r") as f:
    content = f.read()

old_display = """            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">{selectedHolding.name}</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">{selectedHolding.type}</p>
            </div>"""

new_display = """            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">{selectedHolding.name}</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">{selectedHolding.type}{selectedHolding.platform ? ` • ${selectedHolding.platform}` : ''}</p>
            </div>"""

content = content.replace(old_display, new_display)

with open("src/pages/Investments.tsx", "w") as f:
    f.write(content)
