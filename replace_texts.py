import sys

with open("src/pages/Home.tsx", "r") as f:
    content = f.read()

content = content.replace("You have 3 upcoming bills", "You have {mockBills.length} upcoming bills")
content = content.replace("Pay Rent by Tomorrow", "Review Unpaid Bills")
content = content.replace("₱15,000 due to BPI Checking", "{mockBills.length} bills pending payment")
content = content.replace("Review Streaming Subscriptions", "Update Goals")
content = content.replace("You have 3 inactive services costing ₱1,200/mo.", "You have {mockGoals.length} active financial goals.")

with open("src/pages/Home.tsx", "w") as f:
    f.write(content)

print("Text replaced.")
