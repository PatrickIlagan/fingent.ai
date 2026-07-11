with open("src/pages/Accounts.tsx", "r") as f:
    content = f.read()

target = """                credit_limit: selectedAccount.credit_limit ? selectedAccount.credit_limit.toString() : '',
                interest_rate_pa: selectedAccount.interest_rate_pa ? (selectedAccount.interest_rate_pa * 100).toString() : ''"""

new_code = """                credit_limit: selectedAccount.credit_limit ? selectedAccount.credit_limit.toString() : '',
                interest_rate_pa: selectedAccount.interest_rate_pa ? (selectedAccount.interest_rate_pa * 100).toString() : '',
                statement_date: selectedAccount.statement_date ? selectedAccount.statement_date.toString() : '',
                due_date: selectedAccount.due_date ? selectedAccount.due_date.toString() : ''"""

if target in content:
    content = content.replace(target, new_code)
    with open("src/pages/Accounts.tsx", "w") as f:
        f.write(content)
