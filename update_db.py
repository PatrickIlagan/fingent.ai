with open('server/db.ts', 'r') as f:
    content = f.read()

# Add new columns to accounts schema
old_schema = """    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance REAL NOT NULL,
      interest_rate_pa REAL,
      image_logo_name TEXT,
      color TEXT,
      purpose TEXT
    );"""

new_schema = """    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance REAL NOT NULL,
      interest_rate_pa REAL,
      image_logo_name TEXT,
      color TEXT,
      purpose TEXT,
      credit_limit REAL,
      statement_date INTEGER,
      due_date INTEGER
    );"""

if old_schema in content:
    content = content.replace(old_schema, new_schema)

# Also add ALTER TABLE commands to dynamically add columns if the table already exists
alter_tables = """  await db.exec(`ALTER TABLE accounts ADD COLUMN credit_limit REAL;`).catch(() => {});
  await db.exec(`ALTER TABLE accounts ADD COLUMN statement_date INTEGER;`).catch(() => {});
  await db.exec(`ALTER TABLE accounts ADD COLUMN due_date INTEGER;`).catch(() => {});
"""

content = content.replace(
    "await db.exec(`ALTER TABLE portfolios ADD COLUMN currency TEXT DEFAULT 'USD';`).catch(() => {});",
    "await db.exec(`ALTER TABLE portfolios ADD COLUMN currency TEXT DEFAULT 'USD';`).catch(() => {});\n" + alter_tables
)

with open('server/db.ts', 'w') as f:
    f.write(content)
