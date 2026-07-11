import re

with open("server.ts", "r") as f:
    content = f.read()

target = "import yahooFinance from 'yahoo-finance2';"
replacement = """import { YahooFinance } from 'yahoo-finance2';
const yahooFinance = new YahooFinance();"""

if target in content:
    content = content.replace(target, replacement)
else:
    print("Target not found")

with open("server.ts", "w") as f:
    f.write(content)
