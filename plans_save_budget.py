import sys

with open("src/pages/Plans.tsx", "r") as f:
    content = f.read()

target = """  const handleAddBudget = () => {
    const allocatedItems = allocations.map(a => ({
      id: Date.now() + a.id,
      name: a.name,
      limit: parseFloat(a.amount) || 0,
      color: a.color,
      spent: 0,
      transactions: [],
      categories: a.categories.map((c: any) => ({
        id: c.id || Date.now() + Math.random(),
        name: c.name,
        limit: c.limit,
        spent: c.spent || 0,
        color: c.color || a.color,
        transactions: []
      }))
    })).filter(b => b.limit > 0);
    
    const newBudgetPlan = {
      id: Date.now(),
      name: budgetPlanName,
      type: budgetType,
      isGrouped: isGroupedBudget,
      startDate: budgetDateRange,
      endDate: budgetEndDate,
      totalLimit: parseFloat(totalBudgetLimit) || 0,
      groups: isGroupedBudget ? allocatedItems : [{
        id: Date.now() + 999,
        name: 'Categories',
        limit: parseFloat(totalBudgetLimit) || 0,
        color: 'slate',
        categories: allocatedItems
      }]
    };
    
    setBudgetPlans([...budgetPlans, newBudgetPlan]);
    setIsBudgetBuilderOpen(false);
    setBudgetStep(1);
    setTotalBudgetLimit('');
    setBudgetPlanName('');
  };"""

new_fn = """  const handleAddBudget = async () => {
    const allocatedItems = allocations.map(a => ({
      id: Date.now() + a.id,
      name: a.name,
      limit: parseFloat(a.amount) || 0,
      color: a.color,
      spent: 0,
      transactions: [],
      categories: a.categories.map((c: any) => ({
        id: c.id || Date.now() + Math.random(),
        name: c.name,
        limit: c.limit,
        spent: c.spent || 0,
        color: c.color || a.color,
        transactions: []
      }))
    })).filter(b => b.limit > 0);
    
    const newBudgetPlan = {
      id: Date.now(),
      name: budgetPlanName,
      type: budgetType,
      isGrouped: isGroupedBudget,
      startDate: budgetDateRange,
      endDate: budgetEndDate,
      totalLimit: parseFloat(totalBudgetLimit) || 0,
      groups: isGroupedBudget ? allocatedItems : [{
        id: Date.now() + 999,
        name: 'Categories',
        limit: parseFloat(totalBudgetLimit) || 0,
        color: 'slate',
        categories: allocatedItems
      }]
    };
    
    await fetch('/api/budgets', {
       method: 'POST', headers: {'Content-Type': 'application/json'},
       body: JSON.stringify({
          name: budgetPlanName,
          total_amount: newBudgetPlan.totalLimit,
          categories: newBudgetPlan,
          month: newBudgetPlan.startDate || new Date().toISOString()
       })
    });

    setBudgetPlans([...budgetPlans, newBudgetPlan]);
    setIsBudgetBuilderOpen(false);
    setBudgetStep(1);
    setTotalBudgetLimit('');
    setBudgetPlanName('');
    window.location.reload();
  };"""

if target in content:
    content = content.replace(target, new_fn)
    with open("src/pages/Plans.tsx", "w") as f:
        f.write(content)
    print("Replaced handleAddBudget")
else:
    print("Target not found")
