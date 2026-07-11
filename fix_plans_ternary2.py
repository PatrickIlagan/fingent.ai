import re

with open("src/pages/Plans.tsx", "r") as f:
    content = f.read()

target = """            {(showAll || isBudget) && (
        <div className="space-y-8">
          {budgetPlans.length === 0 ? ("""

new_code = """            {(showAll || isBudget) && (
        <div className="space-y-8">
          {!selectedPlan ? (
             <div className="space-y-8">
                {budgetPlans.length === 0 ? ("""

if target in content:
    content = content.replace(target, new_code)
    
    # We also need to close the `</div>` for this ternary part.
    # Where does `{!selectedPlan ? (` end?
    # Actually, let's just rewrite the layout properly.
    
    with open("src/pages/Plans.tsx", "w") as f:
        f.write(content)
    print("Fixed ternary")
else:
    print("Not found")

