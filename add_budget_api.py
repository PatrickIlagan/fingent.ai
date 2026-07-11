import sys

with open("server.ts", "r") as f:
    content = f.read()

target = """  app.post("/api/chat", handleAgentChat);"""

new_apis = """  app.get("/api/income_flows", async (req, res) => {
    try {
      const db = await getDb();
      const rows = await db.all("SELECT * FROM income_flows");
      res.json(rows);
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });
  app.post("/api/income_flows", async (req, res) => {
    try {
      const db = await getDb();
      const { name, amount, date } = req.body;
      const result = await db.run("INSERT INTO income_flows (name, amount, date) VALUES (?, ?, ?)", [name, amount, date]);
      
      // Also add to calendar_events
      await db.run("INSERT INTO calendar_events (name, type, amount, date, color, icon, provider, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [name, 'income', amount, date, 'emerald', 'ArrowDown', 'Manual', 'income_flow']);
      
      res.json({ id: result.lastInsertRowid });
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });
  app.delete("/api/income_flows/:id", async (req, res) => {
    try {
      const db = await getDb();
      await db.run("DELETE FROM income_flows WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });

  app.get("/api/budget_presets", async (req, res) => {
    try {
      const db = await getDb();
      const rows = await db.all("SELECT * FROM budget_presets");
      res.json(rows);
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });
  app.post("/api/budget_presets", async (req, res) => {
    try {
      const db = await getDb();
      const { name, allocations } = req.body;
      const result = await db.run("INSERT INTO budget_presets (name, allocations) VALUES (?, ?)", [name, JSON.stringify(allocations)]);
      res.json({ id: result.lastInsertRowid });
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });
  app.delete("/api/budget_presets/:id", async (req, res) => {
    try {
      const db = await getDb();
      await db.run("DELETE FROM budget_presets WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });

  app.get("/api/budgets", async (req, res) => {
    try {
      const db = await getDb();
      const rows = await db.all("SELECT * FROM budgets");
      res.json(rows);
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });
  app.post("/api/budgets", async (req, res) => {
    try {
      const db = await getDb();
      const { name, total_amount, categories, month } = req.body;
      const result = await db.run("INSERT INTO budgets (name, total_amount, categories, month) VALUES (?, ?, ?, ?)", [name, total_amount, JSON.stringify(categories), month]);
      res.json({ id: result.lastInsertRowid });
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });
  app.delete("/api/budgets/:id", async (req, res) => {
    try {
      const db = await getDb();
      await db.run("DELETE FROM budgets WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });

  app.post("/api/chat", handleAgentChat);"""

if target in content:
    content = content.replace(target, new_apis)
    with open("server.ts", "w") as f:
        f.write(content)
    print("Replaced API")
else:
    print("Target not found")
