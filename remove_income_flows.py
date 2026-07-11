import re

with open("src/pages/Plans.tsx", "r") as f:
    content = f.read()

pattern = re.compile(r'<div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">.*?<h3 className="font-bold text-lg flex items-center">.*?<TrendingUp className="w-5 h-5 mr-2" /> Income Flows & Inflows.*?</h3>.*?</div>\s*</div>\s*</div>', re.DOTALL)

if pattern.search(content):
    content = pattern.sub('', content)
    with open("src/pages/Plans.tsx", "w") as f:
        f.write(content)
    print("Removed Income Flows section")
else:
    print("Target not found")
