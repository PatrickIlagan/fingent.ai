import re

with open("src/pages/Career.tsx", "r") as f:
    content = f.read()

target = """                             {JSON.parse(preset.allocations || '[]').map((a: any, i: number) => ("""
new_code = """                             {(() => { try { return JSON.parse(preset.allocations || '[]'); } catch(e) { return []; } })().map((a: any, i: number) => ("""

if target in content:
    content = content.replace(target, new_code)
    with open("src/pages/Career.tsx", "w") as f:
        f.write(content)
    print("Fixed career map")
else:
    print("Target not found")
