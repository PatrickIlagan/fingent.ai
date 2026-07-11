import sys

with open("src/pages/Plans.tsx", "r") as f:
    content = f.read()

target = """  const [budgetPlans, setBudgetPlans] = useState(["""

new_fetch = """  const [dbBudgets, setDbBudgets] = useState<any[]>([]);
  const [dbIncomeFlows, setDbIncomeFlows] = useState<any[]>([]);
  const [dbPresets, setDbPresets] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      const [b, inc, p] = await Promise.all([
        fetch('/api/budgets').then(r => r.json()).catch(() => []),
        fetch('/api/income_flows').then(r => r.json()).catch(() => []),
        fetch('/api/budget_presets').then(r => r.json()).catch(() => [])
      ]);
      setDbBudgets(Array.isArray(b) ? b : []);
      setDbIncomeFlows(Array.isArray(inc) ? inc : []);
      setDbPresets(Array.isArray(p) ? p : []);
    }
    fetchData();
  }, [shouldRefresh]);

  const [budgetPlans, setBudgetPlans] = useState(["""

if target in content:
    content = content.replace(target, new_fetch)
    with open("src/pages/Plans.tsx", "w") as f:
        f.write(content)
    print("Replaced fetch")
else:
    print("Target not found")
