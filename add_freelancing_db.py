import re

with open("server/db.ts", "r") as f:
    content = f.read()

new_tables = """
    CREATE TABLE IF NOT EXISTS freelancing_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      client TEXT,
      rate REAL,
      status TEXT DEFAULT 'Active',
      progress INTEGER,
      value REAL,
      deadline TEXT,
      next_milestone TEXT,
      hours_logged REAL,
      hours_total REAL,
      cap INTEGER,
      renew_date TEXT
    );
    CREATE TABLE IF NOT EXISTS freelancing_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER,
      invoice_number TEXT NOT NULL,
      amount REAL NOT NULL,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT DEFAULT 'Draft',
      client_name TEXT,
      client_email TEXT,
      client_address TEXT,
      items TEXT,
      notes TEXT,
      FOREIGN KEY(service_id) REFERENCES freelancing_services(id)
    );
    CREATE TABLE IF NOT EXISTS freelancing_time_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER,
      date TEXT NOT NULL,
      seconds INTEGER NOT NULL,
      description TEXT,
      FOREIGN KEY(service_id) REFERENCES freelancing_services(id)
    );
"""

# Insert before "CREATE TABLE IF NOT EXISTS budgets"
content = content.replace("CREATE TABLE IF NOT EXISTS budgets", new_tables + "    CREATE TABLE IF NOT EXISTS budgets")

with open("server/db.ts", "w") as f:
    f.write(content)
