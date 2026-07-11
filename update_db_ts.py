import sys

with open("server/db.ts", "r") as f:
    content = f.read()

target = """    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL,
      date TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      provider TEXT,
      source TEXT
    );"""

replacement = """    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL,
      date TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      provider TEXT,
      source TEXT
    );

    CREATE TABLE IF NOT EXISTS income_flows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budget_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      allocations TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      total_amount REAL NOT NULL,
      categories TEXT NOT NULL,
      month TEXT
    );"""

if target in content:
    content = content.replace(target, replacement)
    with open("server/db.ts", "w") as f:
        f.write(content)
    print("Replaced server/db.ts")
else:
    print("Target not found in db.ts")

