with open("server.ts", "r") as f:
    content = f.read()

target = """  app.get("/api/business_deals", async (req, res) => {
    try {
      const db = await getDb();
      const deals = await db.all("SELECT d.*, b.name as venture FROM business_deals d LEFT JOIN businesses b ON d.business_id = b.id");
      res.json(deals);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });"""

new_code = """  app.get("/api/business_deals", async (req, res) => {
    try {
      const db = await getDb();
      // Fetch leads and proposals from business_items as deals
      const items = await db.all("SELECT i.*, b.name as venture FROM business_items i LEFT JOIN businesses b ON i.business_id = b.id WHERE i.type IN ('lead', 'proposal')");
      const deals = items.map((i:any) => ({
        id: i.id,
        title: i.name,
        venture: i.venture,
        stage: i.status,
        value: i.value,
        probability: i.type === 'proposal' ? 80 : 30, // rough estimate based on type
        closing: 'TBD',
        contact: 'N/A',
        notes: ''
      }));
      res.json(deals);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });"""

content = content.replace(target, new_code)
with open("server.ts", "w") as f:
    f.write(content)
