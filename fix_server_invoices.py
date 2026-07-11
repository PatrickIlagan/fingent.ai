import re

with open("server.ts", "r") as f:
    content = f.read()

put_route = """
  app.put("/api/freelancing/invoices/:id", async (req, res) => {
    try {
      const db = await getDb();
      const i = req.body;
      await db.run('UPDATE freelancing_invoices SET status = ? WHERE id = ?', [i.status, req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  app.delete("/api/freelancing/invoices/:id", async (req, res) => {
    try {
      const db = await getDb();
      await db.run('DELETE FROM freelancing_invoices WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
"""

target = "  // Freelancing Time Logs"
if "app.put(\"/api/freelancing/invoices/:id" not in content:
    content = content.replace(target, put_route + "\n" + target)

with open("server.ts", "w") as f:
    f.write(content)
