import re

with open("server.ts", "r") as f:
    content = f.read()

apis = """
  // Freelancing Services
  app.get("/api/freelancing/services", async (req, res) => {
    try {
      const db = await getDb();
      const services = await db.all("SELECT * FROM freelancing_services");
      res.json(services);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/freelancing/services", async (req, res) => {
    try {
      const db = await getDb();
      const s = req.body;
      const result = await db.run(
        `INSERT INTO freelancing_services (name, type, client, rate, status, progress, value, deadline, next_milestone, hours_logged, hours_total, cap, renew_date) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.name, s.type, s.client, s.rate||0, s.status||'Active', s.progress||0, s.value||0, s.deadline||'', s.next_milestone||'', s.hours_logged||0, s.hours_total||0, s.cap||0, s.renew_date||'']
      );
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/freelancing/services/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const s = req.body;
      await db.run(
        `UPDATE freelancing_services SET 
          name = ?, type = ?, client = ?, rate = ?, status = ?, progress = ?, value = ?, deadline = ?, next_milestone = ?, hours_logged = ?, hours_total = ?, cap = ?, renew_date = ?
         WHERE id = ?`,
        [s.name, s.type, s.client, s.rate||0, s.status||'Active', s.progress||0, s.value||0, s.deadline||'', s.next_milestone||'', s.hours_logged||0, s.hours_total||0, s.cap||0, s.renew_date||'', id]
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/freelancing/services/:id", async (req, res) => {
    try {
      const db = await getDb();
      await db.run("DELETE FROM freelancing_services WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Freelancing Invoices
  app.get("/api/freelancing/invoices", async (req, res) => {
    try {
      const db = await getDb();
      const invoices = await db.all("SELECT * FROM freelancing_invoices");
      res.json(invoices);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/freelancing/invoices", async (req, res) => {
    try {
      const db = await getDb();
      const i = req.body;
      const result = await db.run(
        `INSERT INTO freelancing_invoices (service_id, invoice_number, amount, issue_date, due_date, status, client_name, client_email, client_address, items, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [i.service_id, i.invoice_number, i.amount, i.issue_date, i.due_date, i.status||'Draft', i.client_name, i.client_email, i.client_address, JSON.stringify(i.items||[]), i.notes]
      );
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Freelancing Time Logs
  app.get("/api/freelancing/time_logs", async (req, res) => {
    try {
      const db = await getDb();
      const logs = await db.all("SELECT * FROM freelancing_time_logs");
      res.json(logs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/freelancing/time_logs", async (req, res) => {
    try {
      const db = await getDb();
      const l = req.body;
      const result = await db.run(
        `INSERT INTO freelancing_time_logs (service_id, date, seconds, description) VALUES (?, ?, ?, ?)`,
        [l.service_id, l.date, l.seconds, l.description]
      );
      if (l.service_id) {
        const h = l.seconds / 3600;
        await db.run(`UPDATE freelancing_services SET hours_logged = hours_logged + ? WHERE id = ?`, [h, l.service_id]);
      }
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

"""

# Insert APIs before `if (process.env.NODE_ENV !== "production") {`
target = 'if (process.env.NODE_ENV !== "production") {'
content = content.replace(target, apis + '\n  ' + target)

with open("server.ts", "w") as f:
    f.write(content)
