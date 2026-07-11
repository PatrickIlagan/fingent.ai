import re

with open("server.ts", "r") as f:
    content = f.read()

target = """      const result = await db.run("INSERT INTO income_flows (name, amount, date, is_recurring, budget_preset_id, account_id) VALUES (?, ?, ?, ?, ?, ?)", [name, amount, date, is_recurring ? 1 : 0, budget_preset_id, account_id]);
      
      // Also add to calendar_events
      await db.run("INSERT INTO calendar_events (name, type, amount, date, color, icon, provider, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [name, 'income', amount, date, 'emerald', 'ArrowDown', 'Manual', 'income_flow']);"""

new_code = """      const result = await db.run("INSERT INTO income_flows (name, amount, date, is_recurring, budget_preset_id, account_id) VALUES (?, ?, ?, ?, ?, ?)", [name, amount, date, is_recurring ? 1 : 0, budget_preset_id, account_id]);
      
      // Also add to calendar_events
      await db.run("INSERT INTO calendar_events (name, type, amount, date, color, icon, provider, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [name, 'income', amount, date, 'emerald', 'ArrowDown', 'Manual', 'income_flow']);
      
      if (budget_preset_id) {
         const preset = await db.get("SELECT * FROM budget_presets WHERE id = ?", [budget_preset_id]);
         if (preset) {
            const allocs = JSON.parse(preset.allocations || '[]');
            const categories = allocs.map((a: any, i: number) => ({
               id: Date.now() + i,
               name: a.name,
               limit: amount * (a.percentage / 100),
               spent: 0,
               color: a.color || 'emerald',
               categories: a.categories || [],
               transactions: []
            }));
            
            const budgetData = {
               id: Date.now(),
               name: `Auto Budget: ${name} (${preset.name})`,
               type: is_recurring ? 'recurring' : 'specific',
               isGrouped: true,
               startDate: date,
               endDate: date,
               totalLimit: amount,
               groups: categories
            };
            
            await db.run("INSERT INTO budgets (name, total_amount, categories, month) VALUES (?, ?, ?, ?)", [budgetData.name, amount, JSON.stringify(budgetData), date]);
         }
      }
      """

if target in content:
    content = content.replace(target, new_code)
    with open("server.ts", "w") as f:
        f.write(content)
    print("Updated server auto budget")
else:
    print("Target not found")
