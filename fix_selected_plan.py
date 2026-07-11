import re

with open("src/pages/Plans.tsx", "r") as f:
    content = f.read()

target = "{selectedPlan ? ("

if target in content:
    content = content.replace(target, "{selectedPlan && (")
    with open("src/pages/Plans.tsx", "w") as f:
        f.write(content)
    print("Fixed selectedPlan")
else:
    print("Not found")
