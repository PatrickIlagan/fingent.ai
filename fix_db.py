with open("server/db.ts", "r") as f:
    content = f.read()

new_tables = """    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'Active',
      target REAL
    );
    CREATE TABLE IF NOT EXISTS business_deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      title TEXT NOT NULL,
      stage TEXT NOT NULL,
      value REAL NOT NULL,
      probability INTEGER,
      closing TEXT,
      contact TEXT,
      notes TEXT,
      FOREIGN KEY(business_id) REFERENCES businesses(id)
    );
    CREATE TABLE IF NOT EXISTS business_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT,
      value REAL,
      extra_info TEXT,
      FOREIGN KEY(business_id) REFERENCES businesses(id)
    );
    CREATE TABLE IF NOT EXISTS business_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      status TEXT,
      category TEXT,
      FOREIGN KEY(business_id) REFERENCES businesses(id)
    );"""

content = content.replace("CREATE TABLE IF NOT EXISTS budgets (", new_tables + "\n    CREATE TABLE IF NOT EXISTS budgets (")

with open("server/db.ts", "w") as f:
    f.write(content)
