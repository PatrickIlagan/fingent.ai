with open("src/pages/Calendar.tsx", "r") as f:
    content = f.read()

old_stmt = """        if (acc.type === 'Card' && acc.statement_date) {
            formattedEvents.push({
              id: `stmt-${acc.id}`,
              date: `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${acc.statement_date.toString().padStart(2, '0')}`,
              type: 'note',
              name: `${acc.name} Statement Date`,
              amount: 0,
              icon: CalendarIcon,
              color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/20',
              provider: 'Credit Card'
            });
        }
        if (acc.type === 'Card' && acc.due_date) {
            formattedEvents.push({
              id: `due-${acc.id}`,
              date: `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${acc.due_date.toString().padStart(2, '0')}`,
              type: 'bill',
              name: `${acc.name} Due Date`,
              amount: 0,
              icon: Wallet,
              color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/20',
              provider: 'Credit Card'
            });
        }"""

new_stmt = """        if (acc.type === 'Card' && acc.statement_date) {
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

if old_stmt in content:
    content = content.replace(old_stmt, new_stmt)
    with open("src/pages/Calendar.tsx", "w") as f:
        f.write(content)
