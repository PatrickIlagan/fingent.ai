with open("src/pages/Home.tsx", "r") as f:
    content = f.read()

target = """  const mockBills = data.liabilities.filter(l => l.status !== 'Paid').map(l => ({
    id: l.id,
    name: l.name,
    amount: l.amount || l.remaining_amount || 0,
    date: l.date || new Date().toISOString(),
    paid: false
  }));"""

new_code = """  const mockBills = data.liabilities.filter(l => l.status !== 'Paid').map(l => ({
    id: l.id,
    name: l.name,
    amount: l.amount || l.remaining_amount || 0,
    date: l.date || new Date().toISOString(),
    paid: false
  }));

  // Append credit card statement balances as bills
  const cards = data.accounts.filter(a => a.type === 'Card' && a.statement_date && a.due_date);
  cards.forEach(card => {
     let stmtDay = card.statement_date.toString();
     if (stmtDay.includes('-')) stmtDay = stmtDay.split('-')[2];
     let dueDay = card.due_date.toString();
     if (dueDay.includes('-')) dueDay = dueDay.split('-')[2];

     const currentDate = new Date();
     const stmtDateObj = new Date(`${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${stmtDay.padStart(2, '0')}`);
     
     let txAfter = 0;
     const cardTxs = data.transactions.filter(t => t.account_id === card.id);
     cardTxs.forEach((tx: any) => {
        if (new Date(tx.date) > stmtDateObj) {
           txAfter += (tx.type === 'income' ? tx.amount : -tx.amount);
        }
     });
     
     const balanceAsOfStmt = card.balance - txAfter;
     const amountOwed = balanceAsOfStmt < 0 ? Math.abs(balanceAsOfStmt) : 0;
     
     if (amountOwed > 0) {
       mockBills.push({
         id: `card-stmt-${card.id}`,
         name: `${card.name} Statement`,
         amount: amountOwed,
         date: `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${dueDay.padStart(2, '0')}`,
         paid: false
       });
     }
  });

  // Sort bills by date closest to today
  mockBills.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());"""

if target in content:
    content = content.replace(target, new_code)
    with open("src/pages/Home.tsx", "w") as f:
        f.write(content)
else:
    print("target not found")
