with open('src/pages/Calendar.tsx', 'r') as f:
    content = f.read()

old_fetch = """  const fetchEvents = async () => {
    try {
      const [liabilitiesRes, accountsRes, calendarEventsRes] = await Promise.all([
        fetch('/api/liabilities'),
        fetch('/api/accounts'),
        fetch('/api/calendar_events')
      ]);
      const [liabilities, accounts, calendarEvents] = await Promise.all([
        liabilitiesRes.json().catch(() => []),
        accountsRes.json().catch(() => []),
        calendarEventsRes.json().catch(() => [])
      ]);

      const formattedEvents: any[] = [];
      
      (Array.isArray(liabilities) ? liabilities : []).forEach((d: any) => {
         let dateStr = '2026-07-15';
         if (d.date && d.date.includes('th')) {
            const day = d.date.split('th')[0];
            dateStr = `2026-07-${day.padStart(2, '0')}`;
         }
         formattedEvents.push({
           id: `l-${d.id}`,
           date: dateStr,
           type: 'bill',
           name: d.name,
           amount: d.amount,
           icon: d.type === 'Bills' ? Zap : d.type === 'Debts' ? Wallet : Droplet,
           color: d.type === 'Bills' ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/20' : 'text-rose-500 bg-rose-50 dark:bg-rose-500/20',
           provider: d.provider || d.merchant || 'Unknown'
         });
      });"""

new_fetch = """  const fetchEvents = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      
      const [liabilitiesRes, accountsRes, calendarEventsRes, incomeFlowsRes] = await Promise.all([
        fetch('/api/liabilities'),
        fetch('/api/accounts'),
        fetch('/api/calendar_events'),
        fetch('/api/income_flows')
      ]);
      const [liabilities, accounts, calendarEvents, incomeFlows] = await Promise.all([
        liabilitiesRes.json().catch(() => []),
        accountsRes.json().catch(() => []),
        calendarEventsRes.json().catch(() => []),
        incomeFlowsRes.json().catch(() => [])
      ]);

      const formattedEvents: any[] = [];
      
      (Array.isArray(liabilities) ? liabilities : []).forEach((d: any) => {
         let dayStr = '15';
         if (d.date && d.date.includes('th')) dayStr = d.date.split('th')[0];
         else if (d.date && d.date.includes('st')) dayStr = d.date.split('st')[0];
         else if (d.date && d.date.includes('nd')) dayStr = d.date.split('nd')[0];
         else if (d.date && d.date.includes('rd')) dayStr = d.date.split('rd')[0];
         else if (!isNaN(parseInt(d.date))) dayStr = d.date;
         
         const dateStr = `${year}-${month}-${dayStr.padStart(2, '0')}`;
         formattedEvents.push({
           id: `l-${d.id}`,
           date: dateStr,
           type: 'bill',
           name: d.name,
           amount: d.amount,
           icon: d.type === 'Bills' ? Zap : d.type === 'Debts' ? Wallet : Droplet,
           color: d.type === 'Bills' ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/20' : 'text-rose-500 bg-rose-50 dark:bg-rose-500/20',
           provider: d.provider || d.merchant || 'Unknown'
         });
      });
      
      (Array.isArray(incomeFlows) ? incomeFlows : []).forEach((flow: any) => {
         if (flow.is_recurring) {
            const dateStr = `${year}-${month}-${flow.date.toString().padStart(2, '0')}`;
            formattedEvents.push({
              id: `inc-${flow.id}`,
              date: dateStr,
              type: 'inflow',
              name: flow.name,
              amount: flow.amount,
              icon: ArrowDownToLine,
              color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/20',
              provider: 'Income Flow'
            });
         }
      });"""

content = content.replace(old_fetch, new_fetch)

old_acc_loop = """      (Array.isArray(accounts) ? accounts : []).forEach((acc: any) => {
        if (acc.transactions) {
          try {
            const txs = typeof acc.transactions === 'string' ? JSON.parse(acc.transactions) : acc.transactions;
            txs.forEach((tx: any) => {
               formattedEvents.push({
                 id: `t-${tx.id}`,
                 date: tx.date.split('T')[0],
                 type: tx.type === 'income' ? 'inflow' : 'transaction',
                 name: tx.title || tx.description || 'Transaction',
                 amount: tx.amount,
                 icon: tx.type === 'income' ? ArrowDownRight : ArrowUpRight,
                 color: tx.type === 'income' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/20' : 'text-slate-500 bg-slate-50 dark:bg-slate-500/20',
                 source: acc.name
               });
            });
          } catch(e) {}
        }
      });"""

new_acc_loop = """      (Array.isArray(accounts) ? accounts : []).forEach((acc: any) => {
        if (acc.transactions) {
          try {
            const txs = typeof acc.transactions === 'string' ? JSON.parse(acc.transactions) : acc.transactions;
            txs.forEach((tx: any) => {
               formattedEvents.push({
                 id: `t-${tx.id}`,
                 date: tx.date.split('T')[0],
                 type: tx.type === 'income' ? 'inflow' : 'transaction',
                 name: tx.title || tx.description || 'Transaction',
                 amount: tx.amount,
                 icon: tx.type === 'income' ? ArrowDownRight : ArrowUpRight,
                 color: tx.type === 'income' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/20' : 'text-slate-500 bg-slate-50 dark:bg-slate-500/20',
                 source: acc.name
               });
            });
          } catch(e) {}
        }
        
        if (acc.type === 'Card' && acc.statement_date) {
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
        }
      });"""

content = content.replace(old_acc_loop, new_acc_loop)

old_effect = """  useEffect(() => {
    fetchEvents();
  }, []);"""

new_effect = """  useEffect(() => {
    fetchEvents();
  }, [currentDate]);"""

content = content.replace(old_effect, new_effect)

with open('src/pages/Calendar.tsx', 'w') as f:
    f.write(content)
