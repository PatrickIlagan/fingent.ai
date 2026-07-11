import re

with open("server.ts", "r") as f:
    content = f.read()

target = """  app.post("/api/income_flows", async (req, res) => {
    try {
      const db = await getDb();
      const { name, amount, date } = req.body;
      const result = await db.run("INSERT INTO income_flows (name, amount, date) VALUES (?, ?, ?)", [name, amount, date]);
      
      // Also add to calendar_events
      await db.run("INSERT INTO calendar_events (name, type, amount, date, color, icon, provider, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [name, 'income', amount, date, 'emerald', 'ArrowDown', 'Manual', 'income_flow']);
      
      res.json({ id: result.lastInsertRowid });
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });"""

new_code = """  app.post("/api/income_flows", async (req, res) => {
    try {
      const db = await getDb();
      const { name, amount, date, is_recurring, budget_preset_id, account_id } = req.body;
      const result = await db.run("INSERT INTO income_flows (name, amount, date, is_recurring, budget_preset_id, account_id) VALUES (?, ?, ?, ?, ?, ?)", [name, amount, date, is_recurring ? 1 : 0, budget_preset_id, account_id]);
      
      // Also add to calendar_events
      await db.run("INSERT INTO calendar_events (name, type, amount, date, color, icon, provider, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [name, 'income', amount, date, 'emerald', 'ArrowDown', 'Manual', 'income_flow']);
      
      res.json({ id: result.lastInsertRowid });
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });"""

if target in content:
    content = content.replace(target, new_code)
    with open("server.ts", "w") as f:
        f.write(content)
    print("Replaced POST /api/income_flows")
else:
    print("Target not found")
