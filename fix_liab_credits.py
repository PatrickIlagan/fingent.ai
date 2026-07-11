with open("src/pages/Liabilities.tsx", "r") as f:
    content = f.read()

target = """  useEffect(() => {
    fetch('/api/liabilities')
      .then(res => res.json())
      .then(data => {
         const dataList = Array.isArray(data) ? data : [];
         const mapped = dataList.map((d: any) => ({
            ...d,
            icon: d.type === 'Installments' ? Home : d.type === 'Credits' ? CreditCard : d.type === 'Quick Expenses' ? ShoppingBag : d.type === 'Debts' ? Landmark : Zap,
            color: d.type === 'Installments' ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/20' : d.type === 'Credits' ? 'text-rose-500 bg-rose-50 dark:bg-rose-500/20' : d.type === 'Quick Expenses' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/20' : d.type === 'Debts' ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/20' : 'text-amber-500 bg-amber-50 dark:bg-amber-500/20',
            cardName: d.card_name,
            totalAmount: d.total_amount,
            remainingAmount: d.remaining_amount,
            totalMonths: d.total_months,
            currentMonth: d.current_month,
            paidUsing: d.paid_using,
            isRecurring: d.is_recurring
         }));
         setLiabilitiesData(mapped);
      })
      .catch(console.error);
  }, [shouldRefresh]);"""

new_code = """  useEffect(() => {
    Promise.all([
      fetch('/api/liabilities').then(res => res.json()).catch(() => []),
      fetch('/api/accounts').then(res => res.json()).catch(() => []),
      fetch('/api/transactions').then(res => res.json()).catch(() => [])
    ]).then(([liabData, accData, txData]) => {
         const dataList = Array.isArray(liabData) ? liabData : [];
         let mapped = dataList.map((d: any) => ({
            ...d,
            icon: d.type === 'Installments' ? Home : d.type === 'Credits' ? CreditCard : d.type === 'Quick Expenses' ? ShoppingBag : d.type === 'Debts' ? Landmark : Zap,
            color: d.type === 'Installments' ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/20' : d.type === 'Credits' ? 'text-rose-500 bg-rose-50 dark:bg-rose-500/20' : d.type === 'Quick Expenses' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/20' : d.type === 'Debts' ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/20' : 'text-amber-500 bg-amber-50 dark:bg-amber-500/20',
            cardName: d.card_name,
            totalAmount: d.total_amount,
            remainingAmount: d.remaining_amount,
            totalMonths: d.total_months,
            currentMonth: d.current_month,
            paidUsing: d.paid_using,
            isRecurring: d.is_recurring
         }));

         // Append credit card statement balances as Credits
         if (Array.isArray(accData)) {
            const txList = Array.isArray(txData) ? txData : [];
            const cards = accData.filter(a => a.type === 'Card' && a.statement_date && a.due_date);
            cards.forEach(card => {
               let stmtDay = card.statement_date.toString();
               if (stmtDay.includes('-')) stmtDay = stmtDay.split('-')[2];
               let dueDay = card.due_date.toString();
               if (dueDay.includes('-')) dueDay = dueDay.split('-')[2];

               const currentDate = new Date();
               const stmtDateObj = new Date(`${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${stmtDay.padStart(2, '0')}`);
               
               let txAfter = 0;
               const cardTxs = txList.filter(t => t.account_id === card.id);
               cardTxs.forEach((tx: any) => {
                  if (new Date(tx.date) > stmtDateObj) {
                     txAfter += (tx.type === 'income' ? tx.amount : -tx.amount);
                  }
               });
               
               const balanceAsOfStmt = card.balance - txAfter;
               const amountOwed = balanceAsOfStmt < 0 ? Math.abs(balanceAsOfStmt) : 0;
               
               if (amountOwed > 0) {
                 mapped.push({
                   id: `card-stmt-${card.id}`,
                   title: `${card.name} Statement Balance`,
                   amount: amountOwed,
                   date: `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${dueDay.padStart(2, '0')}`,
                   type: 'Credits',
                   notes: `Statement Date: ${card.statement_date}`,
                   icon: CreditCard,
                   color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/20',
                   cardName: card.name,
                   provider: card.name,
                   isCardStatement: true
                 });
               }
            });
         }

         setLiabilitiesData(mapped);
    });
  }, [shouldRefresh]);"""

if target in content:
    content = content.replace(target, new_code)
    with open("src/pages/Liabilities.tsx", "w") as f:
        f.write(content)
else:
    print("target not found")
