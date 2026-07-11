import re

with open("server.ts", "r") as f:
    content = f.read()

api_code = """
  // Freelance Businesses
  app.get("/api/freelance_businesses", async (req, res) => {
    try {
      const db = await getDb();
      const businesses = await db.all('SELECT * FROM freelance_businesses ORDER BY id DESC');
      res.json(businesses);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/freelance_businesses", async (req, res) => {
    try {
      const db = await getDb();
      const { name, type, description } = req.body;
      const result = await db.run(
        'INSERT INTO freelance_businesses (name, type, description) VALUES (?, ?, ?)',
        [name, type, description]
      );
      res.json({ id: result.lastID });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/freelance_businesses/:id", async (req, res) => {
    try {
      const db = await getDb();
      await db.run('DELETE FROM freelance_businesses WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
"""

target = "// Freelancing Services"
if "app.get(\"/api/freelance_businesses\"" not in content:
    content = content.replace(target, api_code + "\n  " + target)

with open("server.ts", "w") as f:
    f.write(content)
