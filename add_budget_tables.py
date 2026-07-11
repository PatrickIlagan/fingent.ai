import sqlite3
import os

db_path = os.path.join(os.getcwd(), 'data', 'fingent.db')
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute('''
CREATE TABLE IF NOT EXISTS income_flows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL
)
''')

c.execute('''
CREATE TABLE IF NOT EXISTS budget_presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    allocations TEXT NOT NULL
)
''')

c.execute('''
CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    total_amount REAL NOT NULL,
    categories TEXT NOT NULL,
    month TEXT
)
''')

conn.commit()
conn.close()
print("Tables created.")
