import re

with open("src/pages/Plans.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "const allocs = JSON.parse(preset.allocations || '[]');",
    "let allocs = []; try { allocs = JSON.parse(preset.allocations || '[]'); } catch(e) {} if (!Array.isArray(allocs)) allocs = [];"
)

with open("src/pages/Plans.tsx", "w") as f:
    f.write(content)
