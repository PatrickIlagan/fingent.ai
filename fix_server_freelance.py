import re

with open("server.ts", "r") as f:
    content = f.read()

put_route = """
  app.put("/api/freelance_businesses/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { name, type, description } = req.body;
      await db.run('UPDATE freelance_businesses SET name = ?, type = ?, description = ? WHERE id = ?', [name, type, description, req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
"""

target = "  app.delete(\"/api/freelance_businesses/:id\","
if "app.put(\"/api/freelance_businesses/:id" not in content:
    content = content.replace(target, put_route + "\n" + target)

with open("server.ts", "w") as f:
    f.write(content)
