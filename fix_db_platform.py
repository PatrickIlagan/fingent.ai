with open("server/db.ts", "r") as f:
    content = f.read()

alter_platform = "  await db.exec(`ALTER TABLE portfolios ADD COLUMN platform TEXT;`).catch(() => {});\n"

content = content.replace("  await db.exec(`ALTER TABLE portfolios ADD COLUMN currency TEXT DEFAULT 'USD';`).catch(() => {});\n", "  await db.exec(`ALTER TABLE portfolios ADD COLUMN currency TEXT DEFAULT 'USD';`).catch(() => {});\n" + alter_platform)

with open("server/db.ts", "w") as f:
    f.write(content)
