import sys

with open("server.ts", "r") as f:
    content = f.read()

career_api = """  app.get("/api/career", async (req, res) => {
     try {
       const db = await getDb();
       let career = await db.get("SELECT * FROM career LIMIT 1");
       if (!career) {
          await db.run("INSERT INTO career (current_role, target_role, current_salary, target_salary, skills_needed) VALUES ('', '', 0, 0, '[]')");
          career = await db.get("SELECT * FROM career LIMIT 1");
       }
       res.json(career);
     } catch(error: any) {
       res.status(500).json({ error: error.message });
     }
  });

  app.put("/api/career", async (req, res) => {
     try {
       const db = await getDb();
       const { current_role, target_role, current_salary, target_salary, skills_needed } = req.body;
       const career = await db.get("SELECT id FROM career LIMIT 1");
       if (career) {
          await db.run(
            "UPDATE career SET current_role = ?, target_role = ?, current_salary = ?, target_salary = ?, skills_needed = ? WHERE id = ?",
            [current_role, target_role, current_salary, target_salary, JSON.stringify(skills_needed || []), career.id]
          );
       } else {
          await db.run(
            "INSERT INTO career (current_role, target_role, current_salary, target_salary, skills_needed) VALUES (?, ?, ?, ?, ?)",
            [current_role, target_role, current_salary, target_salary, JSON.stringify(skills_needed || [])]
          );
       }
       res.json({ success: true });
     } catch(error: any) {
       res.status(500).json({ error: error.message });
     }
  });"""

target = """  app.get("/api/career", async (req, res) => {
     try {
       const db = await getDb();
       const career = await db.get("SELECT * FROM career LIMIT 1");
       res.json(career);
     } catch(error: any) {
       res.status(500).json({ error: error.message });
     }
  });"""

if target in content:
    content = content.replace(target, career_api)
    with open("server.ts", "w") as f:
        f.write(content)
    print("Replaced API")
else:
    print("Target not found")
