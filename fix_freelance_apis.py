import re

with open("server.ts", "r") as f:
    content = f.read()

# Update GET services
get_services_old = """  app.get("/api/freelancing/services", async (req, res) => {
    try {
      const db = await getDb();
      const services = await db.all('SELECT * FROM freelancing_services ORDER BY id DESC');
      res.json(services);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });"""
get_services_new = """  app.get("/api/freelancing/services", async (req, res) => {
    try {
      const db = await getDb();
      const businessId = req.query.business_id;
      let services = [];
      if (businessId) {
        services = await db.all('SELECT * FROM freelancing_services WHERE business_id = ? ORDER BY id DESC', [businessId]);
      } else {
        services = await db.all('SELECT * FROM freelancing_services ORDER BY id DESC');
      }
      res.json(services);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });"""
content = content.replace(get_services_old, get_services_new)

# Update POST services
post_services_old = """  app.post("/api/freelancing/services", async (req, res) => {
    try {
      const db = await getDb();
      const { name, type, client, rate, value, deadline, next_milestone, hours_total, cap, renew_date } = req.body;
      const result = await db.run(
        'INSERT INTO freelancing_services (name, type, client, rate, value, deadline, next_milestone, hours_total, cap, renew_date, hours_logged, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)',
        [name, type, client, rate, value, deadline, next_milestone, hours_total, cap, renew_date]
      );
      res.json({ id: result.lastID });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });"""
post_services_new = """  app.post("/api/freelancing/services", async (req, res) => {
    try {
      const db = await getDb();
      const { business_id, name, type, client, rate, value, deadline, next_milestone, hours_total, cap, renew_date } = req.body;
      const result = await db.run(
        'INSERT INTO freelancing_services (business_id, name, type, client, rate, value, deadline, next_milestone, hours_total, cap, renew_date, hours_logged, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)',
        [business_id || 1, name, type, client, rate, value, deadline, next_milestone, hours_total, cap, renew_date]
      );
      res.json({ id: result.lastID });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });"""
content = content.replace(post_services_old, post_services_new)

# Update GET invoices
get_invoices_old = """  app.get("/api/freelancing/invoices", async (req, res) => {
    try {
      const db = await getDb();
      const invoices = await db.all('SELECT * FROM freelancing_invoices ORDER BY issue_date DESC');
      res.json(invoices);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });"""
get_invoices_new = """  app.get("/api/freelancing/invoices", async (req, res) => {
    try {
      const db = await getDb();
      const businessId = req.query.business_id;
      let invoices = [];
      if (businessId) {
        invoices = await db.all('SELECT * FROM freelancing_invoices WHERE business_id = ? ORDER BY issue_date DESC', [businessId]);
      } else {
        invoices = await db.all('SELECT * FROM freelancing_invoices ORDER BY issue_date DESC');
      }
      res.json(invoices);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });"""
content = content.replace(get_invoices_old, get_invoices_new)

# Update POST invoices
post_invoices_old = """  app.post("/api/freelancing/invoices", async (req, res) => {
    try {
      const db = await getDb();
      const { service_id, invoice_number, amount, issue_date, due_date, status, client_name } = req.body;
      const result = await db.run(
        'INSERT INTO freelancing_invoices (service_id, invoice_number, amount, issue_date, due_date, status, client_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [service_id, invoice_number, amount, issue_date, due_date, status || 'Draft', client_name]
      );
      res.json({ id: result.lastID });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });"""
post_invoices_new = """  app.post("/api/freelancing/invoices", async (req, res) => {
    try {
      const db = await getDb();
      const { business_id, service_id, invoice_number, amount, issue_date, due_date, status, client_name } = req.body;
      const result = await db.run(
        'INSERT INTO freelancing_invoices (business_id, service_id, invoice_number, amount, issue_date, due_date, status, client_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [business_id || 1, service_id, invoice_number, amount, issue_date, due_date, status || 'Draft', client_name]
      );
      res.json({ id: result.lastID });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });"""
content = content.replace(post_invoices_old, post_invoices_new)

# Update GET time logs
get_time_old = """  app.get("/api/freelancing/time_logs", async (req, res) => {
    try {
      const db = await getDb();
      const logs = await db.all('SELECT * FROM freelancing_time_logs ORDER BY date DESC');
      res.json(logs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });"""
get_time_new = """  app.get("/api/freelancing/time_logs", async (req, res) => {
    try {
      const db = await getDb();
      const businessId = req.query.business_id;
      let logs = [];
      if (businessId) {
        logs = await db.all('SELECT * FROM freelancing_time_logs WHERE business_id = ? ORDER BY date DESC', [businessId]);
      } else {
        logs = await db.all('SELECT * FROM freelancing_time_logs ORDER BY date DESC');
      }
      res.json(logs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });"""
content = content.replace(get_time_old, get_time_new)

# Update POST time logs
post_time_old = """  app.post("/api/freelancing/time_logs", async (req, res) => {
    try {
      const db = await getDb();
      const { service_id, date, seconds, description } = req.body;
      const result = await db.run(
        'INSERT INTO freelancing_time_logs (service_id, date, seconds, description) VALUES (?, ?, ?, ?)',
        [service_id, date, seconds, description]
      );
      // update total logged
      if (service_id) {
         await db.run('UPDATE freelancing_services SET hours_logged = hours_logged + ? WHERE id = ?', [seconds / 3600, service_id]);
      }
      res.json({ id: result.lastID });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });"""
post_time_new = """  app.post("/api/freelancing/time_logs", async (req, res) => {
    try {
      const db = await getDb();
      const { business_id, service_id, date, seconds, description } = req.body;
      const result = await db.run(
        'INSERT INTO freelancing_time_logs (business_id, service_id, date, seconds, description) VALUES (?, ?, ?, ?, ?)',
        [business_id || 1, service_id, date, seconds, description]
      );
      // update total logged
      if (service_id) {
         await db.run('UPDATE freelancing_services SET hours_logged = hours_logged + ? WHERE id = ?', [seconds / 3600, service_id]);
      }
      res.json({ id: result.lastID });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });"""
content = content.replace(post_time_old, post_time_new)

with open("server.ts", "w") as f:
    f.write(content)
