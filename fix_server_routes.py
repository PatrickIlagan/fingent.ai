with open("server.ts", "r") as f:
    content = f.read()

# We know the appended routes start from app.get("/api/businesses", async (req, res) => {
appended_part = content[content.find('  app.get("/api/businesses", async (req, res) => {'):]
# Remove it from the end
content = content.replace(appended_part, "")

# Find where to insert it: right before the catch-all
insertion_point = content.find("if (process.env.NODE_ENV !== \"production\") {")
if insertion_point == -1:
    insertion_point = content.find("app.get('*',")

if insertion_point != -1:
    content = content[:insertion_point] + appended_part + "\n" + content[insertion_point:]

with open("server.ts", "w") as f:
    f.write(content)
