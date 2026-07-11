import re

with open("server/db.ts", "r") as f:
    content = f.read()

content = content.replace("name TEXT NOT NULL,", "business_id INTEGER,\n      name TEXT NOT NULL,")
content = content.replace("service_id INTEGER,", "business_id INTEGER,\n      service_id INTEGER,")

with open("server/db.ts", "w") as f:
    f.write(content)
