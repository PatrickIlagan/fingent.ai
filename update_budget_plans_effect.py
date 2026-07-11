import re

with open("src/pages/Plans.tsx", "r") as f:
    content = f.read()

target = """      setDbBudgets(Array.isArray(b) ? b : []);
      setDbIncomeFlows(Array.isArray(inc) ? inc : []);
      setDbPresets(Array.isArray(p) ? p : []);
    }"""

new_code = """      setDbBudgets(Array.isArray(b) ? b : []);
      setDbIncomeFlows(Array.isArray(inc) ? inc : []);
      setDbPresets(Array.isArray(p) ? p : []);
      if (Array.isArray(b) && b.length > 0) {
         setBudgetPlans(prev => {
            const newPlans = b.map(dbB => {
               try {
                  const data = JSON.parse(dbB.categories);
                  return { ...data, id: dbB.id };
               } catch(e) { return null; }
            }).filter(Boolean);
            
            const existingIds = prev.map(p => p.id);
            const toAdd = newPlans.filter(np => !existingIds.includes(np.id));
            return [...toAdd, ...prev];
         });
      }
    }"""

if target in content:
    content = content.replace(target, new_code)
    with open("src/pages/Plans.tsx", "w") as f:
        f.write(content)
    print("Replaced effect")
else:
    print("Target not found")

