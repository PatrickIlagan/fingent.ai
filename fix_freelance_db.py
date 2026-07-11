import re

with open("server/db.ts", "r") as f:
    content = f.read()

target = "CREATE TABLE IF NOT EXISTS freelancing_services"
replacement = """CREATE TABLE IF NOT EXISTS freelance_businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS freelancing_services"""

if "freelance_businesses" not in content:
    content = content.replace(target, replacement)
    # Add profile_id to freelancing_services
    # Wait, we can't easily alter table, so we'll just check if column exists on startup.
    # We will do it in server.ts instead.
    
with open("server/db.ts", "w") as f:
    f.write(content)
