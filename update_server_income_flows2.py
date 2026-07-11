import re

with open("server.ts", "r") as f:
    content = f.read()

pattern = re.compile(r'app\.post\("/api/income_flows", async \(req, res\) => \{.*?const \{ name, amount, date \} = req\.body;.*?const result = await db\.run\("INSERT INTO income_flows \(name, amount, date\) VALUES \(\?, \?, \?\)", \[name, amount, date\]\);', re.DOTALL)

def replacer(match):
    m = match.group(0)
    m = m.replace('const { name, amount, date } = req.body;', 'const { name, amount, date, is_recurring, budget_preset_id, account_id } = req.body;')
    m = m.replace('await db.run("INSERT INTO income_flows (name, amount, date) VALUES (?, ?, ?)", [name, amount, date]);', 'await db.run("INSERT INTO income_flows (name, amount, date, is_recurring, budget_preset_id, account_id) VALUES (?, ?, ?, ?, ?, ?)", [name, amount, date, is_recurring ? 1 : 0, budget_preset_id, account_id]);')
    return m

if pattern.search(content):
    content = pattern.sub(replacer, content)
    with open("server.ts", "w") as f:
        f.write(content)
    print("Replaced POST /api/income_flows")
else:
    print("Target not found")
