with open("src/pages/Calendar.tsx", "r") as f:
    content = f.read()

target = """        if (acc.type === 'Card' && acc.statement_date) {
            let stmtDay = acc.statement_date.toString();
            if (stmtDay.includes('-')) stmtDay = stmtDay.split('-')[2];
            formattedEvents.push({
              id: `stmt-${acc.id}`,
              date: `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${stmtDay.padStart(2, '0')}`,
              type: 'note',
              name: `${acc.name} Statement Date`,
              amount: 0,
              icon: CalendarIcon,
              color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/20',
              provider: 'Credit Card'
            });
        }
        if (acc.type === 'Card' && acc.due_date) {
            let dueDay = acc.due_date.toString();
            if (dueDay.includes('-')) dueDay = dueDay.split('-')[2];
            formattedEvents.push({
              id: `due-${acc.id}`,
              date: `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${dueDay.padStart(2, '0')}`,
              type: 'bill',
              name: `${acc.name} Due Date`,
              amount: 0,
              icon: Wallet,
              color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/20',
              provider: 'Credit Card'
            });
        }"""

new_code = """        if (acc.type === 'Card' && acc.statement_date && acc.due_date) {
            let stmtDay = acc.statement_date.toString();
            if (stmtDay.includes('-')) stmtDay = stmtDay.split('-')[2];
            
            let dueDay = acc.due_date.toString();
            if (dueDay.includes('-')) dueDay = dueDay.split('-')[2];

            // Calculate statement balance: transactions up to the next statement date
            let stmtDateString = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${stmtDay.padStart(2, '0')}`;
            const stmtDateObj = new Date(stmtDateString);
            
            let txAfter = 0;
            (acc.transactions || []).forEach((tx: any) => {
               if (new Date(tx.date) > stmtDateObj) {
                  txAfter += (tx.type === 'income' ? tx.amount : -tx.amount);
               }
            });
            
            const balanceAsOfStmt = acc.balance - txAfter;
            const amountOwed = balanceAsOfStmt < 0 ? Math.abs(balanceAsOfStmt) : 0;

            formattedEvents.push({
              id: `stmt-${acc.id}`,
              date: stmtDateString,
              type: 'note',
              name: `${acc.name} Statement`,
              amount: 0,
              icon: CalendarIcon,
              color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/20',
              provider: 'Credit Card'
            });

            // Due date is usually next month after statement, but for display let's put it on the calendar's current month due date or next month depending.
            // Actually, we can just log it on the `dueDay` of the current view month.
            let dueDateString = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${dueDay.padStart(2, '0')}`;

            // If due day is less than statement day, the due date for THIS statement is NEXT month.
            // But we just place the event on the calendar's due date for visibility.
            
            formattedEvents.push({
              id: `due-${acc.id}`,
              date: dueDateString,
              type: 'bill',
              name: `${acc.name} Due`,
              amount: amountOwed,
              icon: Wallet,
              color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/20',
              provider: 'Credit Card'
            });
        } else {
           if (acc.type === 'Card' && acc.statement_date) {
               let stmtDay = acc.statement_date.toString();
               if (stmtDay.includes('-')) stmtDay = stmtDay.split('-')[2];
               formattedEvents.push({
                 id: `stmt-${acc.id}`,
                 date: `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${stmtDay.padStart(2, '0')}`,
                 type: 'note',
                 name: `${acc.name} Statement`,
                 amount: 0,
                 icon: CalendarIcon,
                 color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/20',
                 provider: 'Credit Card'
               });
           }
           if (acc.type === 'Card' && acc.due_date) {
               let dueDay = acc.due_date.toString();
               if (dueDay.includes('-')) dueDay = dueDay.split('-')[2];
               formattedEvents.push({
                 id: `due-${acc.id}`,
                 date: `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${dueDay.padStart(2, '0')}`,
                 type: 'bill',
                 name: `${acc.name} Due`,
                 amount: 0,
                 icon: Wallet,
                 color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/20',
                 provider: 'Credit Card'
               });
           }
        }"""

if target in content:
    content = content.replace(target, new_code)
    with open("src/pages/Calendar.tsx", "w") as f:
        f.write(content)
else:
    print("target not found")
