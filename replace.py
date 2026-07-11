import sys

with open("src/pages/Home.tsx", "r") as f:
    content = f.read()

target = """  const [data, setData] = useState<{ accounts: any[], transactions: any[], wealth: any } | null>(null);
  const [chartTab, setChartTab] = useState<'Cash Flow' | 'Expenses' | 'Income' | 'Credits' | 'Dues'>('Cash Flow');
  const [balanceType, setBalanceType] = useState<'Total Balance' | 'Digital Wallets' | 'Cash on Hand' | 'Bank Accounts'>('Total Balance');
  const [isBalanceDropdownOpen, setIsBalanceDropdownOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const [accRes, txRes, wealthRes] = await Promise.all([
        fetch('/api/accounts').then(r => r.json()).catch(() => []),
        fetch('/api/transactions').then(r => r.json()).catch(() => []),
        fetch('/api/wealth').then(r => r.json()).catch(() => ({}))
      ]);
      setData({ 
        accounts: Array.isArray(accRes) ? accRes : [], 
        transactions: Array.isArray(txRes) ? txRes : [], 
        wealth: wealthRes || {} 
      });
    }
    fetchData();
  }, [shouldRefresh]);

  if (!data) return <div className="animate-pulse space-y-4">
    <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
    <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
    <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
  </div>;

  const totalCash = Array.isArray(data.accounts) ? data.accounts.reduce((sum, a) => sum + (a.balance || 0), 0) : 0;

  const mockBudgets = [
    { id: 1, name: 'Food & Dining', spent: 4500, limit: 10000, color: '#10B981' },
    { id: 2, name: 'Transportation', spent: 1500, limit: 4000, color: '#8B5CF6' },
    { id: 3, name: 'Entertainment', spent: 2000, limit: 5000, color: '#F59E0B' }
  ];

  const totalBudgetSpent = mockBudgets.reduce((sum, b) => sum + b.spent, 0);
  const totalBudgetLimit = mockBudgets.reduce((sum, b) => sum + b.limit, 0);

  const budgetData = [
    { name: 'Spent', value: totalBudgetSpent, color: '#10B981' },
    { name: 'Remaining', value: Math.max(0, totalBudgetLimit - totalBudgetSpent), color: isAdvanced ? '#334155' : '#e2e8f0' }
  ];

  const cashFlowData = [
    { name: 'Mon', Income: 0, Expenses: 120, Credits: 0, Dues: 50 },
    { name: 'Tue', Income: 0, Expenses: 300, Credits: 150, Dues: 0 },
    { name: 'Wed', Income: 3000, Expenses: 50, Credits: 0, Dues: 200 },
    { name: 'Thu', Income: 0, Expenses: 800, Credits: 0, Dues: 100 },
    { name: 'Fri', Income: 0, Expenses: 400, Credits: 500, Dues: 0 },
    { name: 'Sat', Income: 0, Expenses: 600, Credits: 0, Dues: 300 },
    { name: 'Sun', Income: 0, Expenses: 200, Credits: 100, Dues: 0 },
  ];

  const mockBills = [
    { id: 1, name: 'Rent', amount: 15000, date: '2026-07-08', paid: false },
    { id: 2, name: 'Netflix', amount: 500, date: '2026-07-12', paid: false },
    { id: 3, name: 'Electricity', amount: 2500, date: '2026-07-15', paid: false }
  ];

  const mockGoals = [
    { id: 1, name: 'Emergency Fund', target: 100000, current: 45000, color: 'emerald' },
    { id: 2, name: 'Japan Trip', target: 80000, current: 15000, color: 'violet' }
  ];

  return ("""

replacement = """  const [data, setData] = useState<{ accounts: any[], transactions: any[], wealth: any, liabilities: any[], goals: any[], portfolios: any[] } | null>(null);
  const [chartTab, setChartTab] = useState<'Cash Flow' | 'Expenses' | 'Income' | 'Credits' | 'Dues'>('Cash Flow');
  const [balanceType, setBalanceType] = useState<'Total Balance' | 'Digital Wallets' | 'Cash on Hand' | 'Bank Accounts'>('Total Balance');
  const [isBalanceDropdownOpen, setIsBalanceDropdownOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const [accRes, txRes, wealthRes, liabRes, goalsRes, portRes] = await Promise.all([
        fetch('/api/accounts').then(r => r.json()).catch(() => []),
        fetch('/api/transactions').then(r => r.json()).catch(() => []),
        fetch('/api/wealth').then(r => r.json()).catch(() => ({})),
        fetch('/api/liabilities').then(r => r.json()).catch(() => []),
        fetch('/api/goals').then(r => r.json()).catch(() => []),
        fetch('/api/portfolios').then(r => r.json()).catch(() => [])
      ]);
      setData({ 
        accounts: Array.isArray(accRes) ? accRes : [], 
        transactions: Array.isArray(txRes) ? txRes : [], 
        wealth: wealthRes || {},
        liabilities: Array.isArray(liabRes) ? liabRes : [],
        goals: Array.isArray(goalsRes) ? goalsRes : [],
        portfolios: Array.isArray(portRes) ? portRes : []
      });
    }
    fetchData();
  }, [shouldRefresh]);

  if (!data) return <div className="animate-pulse space-y-4">
    <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
    <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
    <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
  </div>;

  let totalCash = 0;
  if (balanceType === 'Total Balance') {
    totalCash = data.accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  } else if (balanceType === 'Digital Wallets') {
    totalCash = data.accounts.filter(a => a.type === 'wallet').reduce((sum, a) => sum + (a.balance || 0), 0);
  } else if (balanceType === 'Bank Accounts') {
    totalCash = data.accounts.filter(a => a.type === 'bank').reduce((sum, a) => sum + (a.balance || 0), 0);
  } else if (balanceType === 'Cash on Hand') {
    totalCash = data.accounts.filter(a => a.type === 'cash').reduce((sum, a) => sum + (a.balance || 0), 0);
  }

  const expensesByCategory: Record<string, number> = {};
  data.transactions.forEach(tx => {
    if (tx.type === 'expense') {
      expensesByCategory[tx.category || 'Other'] = (expensesByCategory[tx.category || 'Other'] || 0) + tx.amount;
    }
  });
  
  const colors = ['#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#14B8A6'];
  const mockBudgets = Object.entries(expensesByCategory).map(([name, spent], i) => ({
    id: i,
    name,
    spent,
    limit: Math.max(spent * 1.2, 5000),
    color: colors[i % colors.length]
  }));
  if (mockBudgets.length === 0) {
    mockBudgets.push({ id: 0, name: 'General', spent: 0, limit: 10000, color: '#10B981' });
  }

  const totalBudgetSpent = mockBudgets.reduce((sum, b) => sum + b.spent, 0);
  const totalBudgetLimit = mockBudgets.reduce((sum, b) => sum + b.limit, 0);

  const budgetData = [
    { name: 'Spent', value: totalBudgetSpent, color: '#10B981' },
    { name: 'Remaining', value: Math.max(0, totalBudgetLimit - totalBudgetSpent), color: isAdvanced ? '#334155' : '#e2e8f0' }
  ];

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const cashFlowByDay: Record<string, any> = {};
  days.forEach(d => cashFlowByDay[d] = { name: d, Income: 0, Expenses: 0, Credits: 0, Dues: 0 });
  
  data.transactions.forEach(tx => {
    if (tx.date) {
      const d = new Date(tx.date);
      if (!isNaN(d.getTime())) {
         const dayName = days[d.getDay()];
         if (tx.type === 'income') cashFlowByDay[dayName].Income += tx.amount;
         if (tx.type === 'expense') cashFlowByDay[dayName].Expenses += tx.amount;
      }
    }
  });
  const cashFlowData = days.map(d => cashFlowByDay[d]);

  const mockBills = data.liabilities.filter(l => l.status !== 'Paid').map(l => ({
    id: l.id,
    name: l.name,
    amount: l.amount || l.remaining_amount || 0,
    date: l.date || new Date().toISOString(),
    paid: false
  }));

  const mockGoals = data.goals.map(g => ({
    id: g.id,
    name: g.name,
    target: g.target || 0,
    current: g.saved || 0,
    color: g.color || 'emerald'
  }));

  const monthlyIncome = data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses = data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return ("""

if target in content:
    content = content.replace(target, replacement)
    with open("src/pages/Home.tsx", "w") as f:
        f.write(content)
    print("Successfully replaced.")
else:
    print("Target not found.")

