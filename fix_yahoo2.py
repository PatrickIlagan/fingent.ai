import re

with open("server.ts", "r") as f:
    content = f.read()

target = """import { YahooFinance } from 'yahoo-finance2';
const yahooFinance = new YahooFinance();"""
replacement = """import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();"""

content = content.replace(target, replacement)

with open("server.ts", "w") as f:
    f.write(content)
