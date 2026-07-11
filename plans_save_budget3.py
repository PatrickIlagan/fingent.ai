import re

with open("src/pages/Plans.tsx", "r") as f:
    content = f.read()

pattern = re.compile(r'const handleAddBudget = \(\) => \{.*?setTotalBudgetLimit\(\'\'\);\s+\};', re.DOTALL)

def replacer(match):
    m = match.group(0)
    m = m.replace('const handleAddBudget = () => {', 'const handleAddBudget = async () => {')
    insert_str = """
    await fetch('/api/budgets', {
       method: 'POST', headers: {'Content-Type': 'application/json'},
       body: JSON.stringify({
          name: budgetPlanName,
          total_amount: newBudgetPlan.totalLimit,
          categories: newBudgetPlan,
          month: newBudgetPlan.startDate || new Date().toISOString()
       })
    });
    """
    m = m.replace('setBudgetPlans([...budgetPlans, newBudgetPlan]);', insert_str + '\n    setBudgetPlans([...budgetPlans, newBudgetPlan]);')
    m = m.replace("setTotalBudgetLimit('');", "setTotalBudgetLimit('');\n    window.location.reload();")
    return m

if pattern.search(content):
    content = pattern.sub(replacer, content)
    with open("src/pages/Plans.tsx", "w") as f:
        f.write(content)
    print("Replaced handleAddBudget")
else:
    print("Target not found")
