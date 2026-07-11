with open("src/pages/Accounts.tsx", "r") as f:
    content = f.read()

old_state = "const [newAccount, setNewAccount] = useState({ name: '', type: 'Bank', balance: '', color: '', purpose: '', credit_limit: '', interest_rate_pa: '' });"
new_state = "const [newAccount, setNewAccount] = useState({ name: '', type: 'Bank', balance: '', color: '', purpose: '', credit_limit: '', interest_rate_pa: '', statement_date: '', due_date: '' });"

content = content.replace(old_state, new_state)

old_put_req = """        await fetch('/api/accounts/' + editingAccount.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newAccount.name,
            type: newAccount.type,
            balance: parseFloat(newAccount.balance),
            color: newAccount.color,
            purpose: newAccount.purpose,
            credit_limit: newAccount.credit_limit || null
          })
        });"""

new_put_req = """        await fetch('/api/accounts/' + editingAccount.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newAccount.name,
            type: newAccount.type,
            balance: parseFloat(newAccount.balance),
            interest_rate_pa: newAccount.interest_rate_pa ? parseFloat(newAccount.interest_rate_pa) / 100 : 0,
            color: newAccount.color,
            purpose: newAccount.purpose,
            credit_limit: newAccount.credit_limit || null,
            statement_date: newAccount.statement_date || null,
            due_date: newAccount.due_date || null
          })
        });"""

content = content.replace(old_put_req, new_put_req)

old_post_req = """        await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newAccount.name,
            type: newAccount.type,
            balance: parseFloat(newAccount.balance),
            interest_rate_pa: newAccount.interest_rate_pa ? parseFloat(newAccount.interest_rate_pa) / 100 : 0,
            image_logo_name: 'bank',
            color: newAccount.color,
            purpose: newAccount.purpose,
            credit_limit: newAccount.credit_limit || null
          })
        });"""

new_post_req = """        await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newAccount.name,
            type: newAccount.type,
            balance: parseFloat(newAccount.balance),
            interest_rate_pa: newAccount.interest_rate_pa ? parseFloat(newAccount.interest_rate_pa) / 100 : 0,
            image_logo_name: 'bank',
            color: newAccount.color,
            purpose: newAccount.purpose,
            credit_limit: newAccount.credit_limit || null,
            statement_date: newAccount.statement_date || null,
            due_date: newAccount.due_date || null
          })
        });"""

content = content.replace(old_post_req, new_post_req)

old_reset = "setNewAccount({ name: '', type: 'Bank', balance: '', color: '', purpose: '', credit_limit: '', interest_rate_pa: '' });"
new_reset = "setNewAccount({ name: '', type: 'Bank', balance: '', color: '', purpose: '', credit_limit: '', interest_rate_pa: '', statement_date: '', due_date: '' });"

content = content.replace(old_reset, new_reset)

with open("src/pages/Accounts.tsx", "w") as f:
    f.write(content)
