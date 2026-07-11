import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { Sparkles, ArrowDown, ArrowUp, Calendar, Receipt, ChevronRight, ChevronDown, TrendingUp, Bitcoin, FileText, Activity, Wallet } from 'lucide-react';
import { format } from 'date-fns';

export function Home({ onNavigate, toggleChat }: { onNavigate?: (tab: string) => void, toggleChat?: () => void }) {
  const { shouldRefresh, themeMode } = useStore();
  const isAdvanced = themeMode === 'advanced';
  const [data, setData] = useState<{ accounts: any[], transactions: any[], wealth: any, liabilities: any[], goals: any[], portfolios: any[], budgets: any[] } | null>(null);
  const [chartTab, setChartTab] = useState<'Cash Flow' | 'Expenses' | 'Income' | 'Credits' | 'Dues'>('Cash Flow');
  const [balanceType, setBalanceType] = useState<'Total Balance' | 'Digital Wallets' | 'Cash on Hand' | 'Bank Accounts'>('Total Balance');
  const [isBalanceDropdownOpen, setIsBalanceDropdownOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const [accRes, txRes, wealthRes, liabRes, goalsRes, portRes, budgetRes] = await Promise.all([
        fetch('/api/accounts').then(r => r.json()).catch(() => []),
        fetch('/api/transactions').then(r => r.json()).catch(() => []),
        fetch('/api/wealth').then(r => r.json()).catch(() => ({})),
        fetch('/api/liabilities').then(r => r.json()).catch(() => []),
        fetch('/api/goals').then(r => r.json()).catch(() => []),
        fetch('/api/portfolios').then(r => r.json()).catch(() => []),
        fetch('/api/budgets').then(r => r.json()).catch(() => [])
      ]);
      setData({ 
        accounts: Array.isArray(accRes) ? accRes : [], 
        transactions: Array.isArray(txRes) ? txRes : [], 
        wealth: wealthRes || {},
        liabilities: Array.isArray(liabRes) ? liabRes : [],
        goals: Array.isArray(goalsRes) ? goalsRes : [],
        portfolios: Array.isArray(portRes) ? portRes : [],
        budgets: Array.isArray(budgetRes) ? budgetRes : []
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

  const colors = ['#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#14B8A6'];
  const budgetSummaries = data.budgets.flatMap((record) => {
    try {
      const plan = JSON.parse(record.categories);
      const groups = Array.isArray(plan.groups) ? plan.groups : [];
      return groups.flatMap((group: any, groupIndex: number) => {
        const categories = Array.isArray(group.categories) ? group.categories : [];
        if (categories.length > 0) {
          return categories.map((category: any, categoryIndex: number) => ({
            id: category.id ?? `${record.id}-${groupIndex}-${categoryIndex}`,
            name: category.name || group.name || 'Untitled category',
            spent: Number(category.spent || 0),
            limit: Number(category.limit || 0),
            color: category.color || group.color || colors[(groupIndex + categoryIndex) % colors.length]
          }));
        }
        return [{
          id: group.id ?? `${record.id}-${groupIndex}`,
          name: group.name || record.name || 'Untitled budget',
          spent: Number(group.spent || 0),
          limit: Number(group.limit || 0),
          color: group.color || colors[groupIndex % colors.length]
        }];
      });
    } catch {
      return [];
    }
  }).filter((budget) => budget.limit > 0);

  const totalBudgetSpent = budgetSummaries.reduce((sum, budget) => sum + budget.spent, 0);
  const totalBudgetLimit = budgetSummaries.reduce((sum, budget) => sum + budget.limit, 0);
  const budgetPercent = totalBudgetLimit > 0 ? Math.round((totalBudgetSpent / totalBudgetLimit) * 100) : 0;

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

  const upcomingBills = data.liabilities.filter(l => l.status !== 'Paid').map(l => ({
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
       upcomingBills.push({
         id: `card-stmt-${card.id}`,
         name: `${card.name} Statement`,
         amount: amountOwed,
         date: `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${dueDay.padStart(2, '0')}`,
         paid: false
       });
     }
  });

  // Sort bills by date closest to today
  upcomingBills.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const goalSummaries = data.goals.map(g => ({
    id: g.id,
    name: g.name,
    target: g.target || 0,
    current: g.saved || 0,
    color: g.color || 'emerald'
  }));

  const monthlyIncome = data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses = data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const totalInvestments = data.portfolios.reduce((sum, p) => sum + (p.current_value || 0), 0);
  const totalNetWorth = totalCash + totalInvestments;
  const stocksValue = data.portfolios.filter(p => p.type === 'Stocks').reduce((sum, p) => sum + (p.current_value || 0), 0);
  const cryptoValue = data.portfolios.filter(p => p.type === 'Cryptos').reduce((sum, p) => sum + (p.current_value || 0), 0);
  
  const estimatedIncomeTax = monthlyIncome * 12 * 0.12;
  const estimatedCapitalGains = totalInvestments * 0.05;
  const estimatedTaxLiability = estimatedIncomeTax + estimatedCapitalGains;
  const effectiveRate = ((estimatedTaxLiability) / ((monthlyIncome * 12) || 1)) * 100;
  
  let healthScore = 50;
  if (totalCash > 5000) healthScore += 10;
  if (totalInvestments > 10000) healthScore += 15;
  if (monthlyIncome > monthlyExpenses && monthlyIncome > 0) healthScore += 15;
  if (data.liabilities.filter(l => l.status !== 'Paid').length === 0) healthScore += 10;
  const healthLetter = healthScore >= 90 ? 'A+' : healthScore >= 80 ? 'A' : healthScore >= 70 ? 'B' : healthScore >= 60 ? 'C' : 'D';
  const healthLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 70 ? 'Good' : 'Fair';


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      
      {/* LEFT COLUMN (Main Content) */}
      <div className="lg:col-span-2 xl:col-span-3 space-y-6">
        
        {/* Hero Balance */}
        <div className={`rounded-3xl p-6 md:p-8 shadow-lg border flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-r from-emerald-500 to-teal-400 border-emerald-400 text-white'}`}>
          <div className="relative z-10 flex-1">
            <div className="relative inline-block mb-1">
              <button 
                onClick={() => setIsBalanceDropdownOpen(!isBalanceDropdownOpen)}
                className={`flex items-center gap-1 text-sm font-medium transition-colors ${isAdvanced ? 'text-slate-400 hover:text-slate-200' : 'text-emerald-50 hover:text-white'}`}
              >
                {balanceType} <ChevronDown className="w-4 h-4" />
              </button>
              {isBalanceDropdownOpen && (
                <div className={`absolute top-full left-0 mt-2 w-48 rounded-xl shadow-xl border overflow-hidden z-50 ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                  {(['Total Balance', 'Digital Wallets', 'Cash on Hand', 'Bank Accounts'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => { setBalanceType(type); setIsBalanceDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors ${isAdvanced ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'} ${type === balanceType ? (isAdvanced ? 'font-bold bg-slate-700/50' : 'font-bold bg-slate-50') : ''}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight truncate">₱{totalCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h1>
          </div>
          
          <div className="relative z-10 flex flex-col gap-3 w-full md:w-auto">
             <div className="flex gap-3">
               <div className={`flex-1 md:flex-none px-4 py-3 rounded-2xl ${isAdvanced ? 'bg-slate-700/50' : 'bg-white/20 backdrop-blur-md'}`}>
                 <p className={`text-[10px] uppercase tracking-wider mb-1 ${isAdvanced ? 'text-slate-400' : 'text-emerald-50'}`}>Monthly Income</p>
                 <p className="font-bold text-base">₱{monthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
               </div>
               <div className={`flex-1 md:flex-none px-4 py-3 rounded-2xl ${isAdvanced ? 'bg-slate-700/50' : 'bg-white/20 backdrop-blur-md'}`}>
                 <p className={`text-[10px] uppercase tracking-wider mb-1 ${isAdvanced ? 'text-slate-400' : 'text-emerald-50'}`}>Monthly Expenses</p>
                 <p className="font-bold text-base">₱{monthlyExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
               </div>
             </div>
             <div className="flex gap-2">
                <button onClick={() => onNavigate?.('accounts')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-transform hover:scale-105 ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-900/20' : 'bg-white/95 backdrop-blur-sm text-emerald-700 hover:bg-white shadow-sm'}`}>
                  <ArrowDown className="w-4 h-4" /> Income
                </button>
                <button onClick={() => onNavigate?.('accounts')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-transform hover:scale-105 ${isAdvanced ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-emerald-700/40 backdrop-blur-sm hover:bg-emerald-700/60 text-white border border-emerald-400/30'}`}>
                  <ArrowUp className="w-4 h-4" /> Expense
                </button>
             </div>
          </div>

          {/* Decorative Background Elements */}
          {!isAdvanced && (
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 translate-x-1/3 -translate-y-1/3"></div>
              <div className="absolute bottom-0 right-32 w-48 h-48 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 translate-y-1/3"></div>
            </div>
          )}
        </div>

        {/* Financial Goals Overview */}
        <div onClick={() => onNavigate?.('plans-goals')} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-bold text-lg">Financial Goals</h3>
             <span className="text-sm text-emerald-500 dark:text-violet-400 font-medium">View All</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {goalSummaries.length === 0 ? (
               <p className="py-4 text-sm text-slate-500">Create a goal to track progress here.</p>
             ) : goalSummaries.map(goal => {
               const progress = Math.round((goal.current / goal.target) * 100);
               return (
                 <div key={goal.id} className="w-full">
                   <div className="flex justify-between text-sm mb-2">
                     <span className="font-medium text-slate-800 dark:text-slate-200">{goal.name}</span>
                     <span className="text-slate-500 dark:text-slate-400 font-bold">{progress}%</span>
                   </div>
                   <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                     <div 
                       className={`h-full rounded-full transition-all ${goal.color === 'emerald' ? (isAdvanced ? 'bg-emerald-500' : 'bg-emerald-400') : (isAdvanced ? 'bg-violet-500' : 'bg-teal-500')}`} 
                       style={{ width: `${progress}%` }} 
                     />
                   </div>
                   <p className="text-xs text-slate-500 dark:text-slate-400 text-right">
                     ₱{goal.current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ₱{goal.target.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                   </p>
                 </div>
               );
             })}
          </div>
        </div>

        {/* Cash Flow Line Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h3 className="font-bold text-lg mb-3 sm:mb-0 cursor-pointer hover:underline" onClick={() => onNavigate?.('accounts')}>Cash Flow</h3>
            <div className={`flex flex-wrap gap-1 p-1 rounded-full ${isAdvanced ? 'bg-slate-700' : 'bg-slate-100'}`}>
              {['Cash Flow', 'Expenses', 'Income', 'Credits', 'Dues'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setChartTab(tab as any)}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all ${chartTab === tab ? (isAdvanced ? 'bg-violet-600 text-white shadow-md' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isAdvanced ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isAdvanced ? '#94a3b8' : '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: isAdvanced ? '#94a3b8' : '#64748b', fontSize: 12 }} dx={-10} tickFormatter={(value) => `₱${value}`} />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: isAdvanced ? '#1e293b' : '#ffffff', 
                    border: isAdvanced ? '1px solid #334155' : '1px solid #e2e8f0',
                    borderRadius: '16px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                  }} 
                />
                {(chartTab === 'Cash Flow' || chartTab === 'Income') && (
                  <Line type="monotone" dataKey="Income" stroke={isAdvanced ? '#8B5CF6' : '#10B981'} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                )}
                {(chartTab === 'Cash Flow' || chartTab === 'Expenses') && (
                  <Line type="monotone" dataKey="Expenses" stroke={isAdvanced ? '#f43f5e' : '#f43f5e'} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                )}
                {(chartTab === 'Cash Flow' || chartTab === 'Credits') && (
                  <Line type="monotone" dataKey="Credits" stroke={isAdvanced ? '#38bdf8' : '#0ea5e9'} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                )}
                {(chartTab === 'Cash Flow' || chartTab === 'Dues') && (
                  <Line type="monotone" dataKey="Dues" stroke={isAdvanced ? '#fbbf24' : '#f59e0b'} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lower Main Content - 2 Column Grid */}
        <div className="grid xl:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Wealth Portfolio Summary */}
            <div onClick={() => onNavigate?.('investments')} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Wealth Portfolio</h3>
                <button onClick={() => onNavigate?.('investments')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="mb-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Net Worth</p>
                <p className="text-2xl font-bold">₱{totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-emerald-500 font-medium mt-1">Updated via Portfolios</p>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-3 text-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" onClick={() => onNavigate?.('investments-stocks')}>
                  <div className="flex items-center justify-center gap-1 mb-1 text-slate-500 dark:text-slate-400"><TrendingUp className="w-3 h-3" /><p className="text-xs">Stocks</p></div>
                  <p className="font-bold text-sm">₱{(stocksValue/1000).toFixed(1)}k</p>
                </div>
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-3 text-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" onClick={() => onNavigate?.('investments-cryptos')}>
                  <div className="flex items-center justify-center gap-1 mb-1 text-slate-500 dark:text-slate-400"><Bitcoin className="w-3 h-3" /><p className="text-xs">Crypto</p></div>
                  <p className="font-bold text-sm">₱{(cryptoValue/1000).toFixed(1)}k</p>
                </div>
              </div>
            </div>

            {/* Accounts Grid */}
            <div>
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="font-bold text-lg">Your Accounts</h3>
                <button onClick={() => onNavigate?.('accounts')} className="text-sm font-medium text-emerald-500 dark:text-violet-400 hover:underline">View All</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {data.accounts.map(acc => (
                  <div key={acc.id} onClick={() => onNavigate?.('accounts')} className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 transition-transform hover:-translate-y-1 hover:shadow-md cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-700/50 mb-4 flex items-center justify-center font-bold text-slate-400 border border-slate-100 dark:border-slate-700 shadow-sm">
                      <Wallet className="w-6 h-6 text-emerald-500 opacity-80" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{acc.name}</p>
                    <p className="text-xl font-bold tracking-tight mt-1">₱{acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Tax Overview */}
            <div onClick={() => onNavigate?.('taxes')} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Tax Overview</h3>
                <span className="text-[10px] font-bold px-2 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg">Est. 2026</span>
              </div>
              <div className="mb-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Estimated Liability</p>
                <p className="text-2xl font-bold">₱{estimatedTaxLiability.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-emerald-500 font-medium mt-1">Effective Rate: {effectiveRate.toFixed(1)}%</p>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1 text-slate-500 dark:text-slate-400"><FileText className="w-3 h-3" /><p className="text-xs">Income Tax</p></div>
                  <p className="font-bold text-sm">₱{estimatedIncomeTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1 text-slate-500 dark:text-slate-400"><Activity className="w-3 h-3" /><p className="text-xs">Capital Gains</p></div>
                  <p className="font-bold text-sm">₱{estimatedCapitalGains.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div>
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="font-bold text-lg">Recent Transactions</h3>
                <button onClick={() => onNavigate?.('accounts')} className="text-sm font-medium text-emerald-500 dark:text-violet-400 hover:underline">See All</button>
              </div>
              <div onClick={() => onNavigate?.('accounts')} className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                {data.transactions.slice(0, 5).map((tx, idx) => (
                  <div key={tx.id} className={`p-4 px-6 flex items-center justify-between ${idx !== 4 && idx !== data.transactions.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''} hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors`}>
                    <div className="flex items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-500 dark:bg-emerald-500/20' : 'bg-rose-100 text-rose-500 dark:bg-rose-500/20'}`}>
                        {tx.type === 'income' ? <ArrowDown className="w-5 h-5" /> : <ArrowUp className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-medium capitalize text-base">{tx.description || tx.category}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tx.account_name} • {format(new Date(tx.date), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    <span className={`font-bold text-lg ${tx.type === 'income' ? 'text-emerald-500' : ''}`}>
                      {tx.type === 'income' ? '+' : '-'}₱{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN (Side Panel) */}
      <div className="lg:col-span-1 xl:col-span-1 space-y-6">
        
        {/* Morning Briefing */}
        <div onClick={() => toggleChat?.()} className={`bg-gradient-to-br ${isAdvanced ? 'from-slate-800 to-slate-800/80 border-slate-700' : 'from-emerald-50 to-teal-50/50 border-emerald-100'} rounded-3xl p-6 shadow-sm border cursor-pointer hover:shadow-md transition-shadow`}>
          <h3 className={`text-sm font-bold mb-3 flex items-center ${isAdvanced ? 'text-violet-400' : 'text-emerald-600'}`}>
            <Sparkles className="w-4 h-4 mr-2" />
            FinGent Insights
          </h3>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
            {upcomingBills.length > 0
              ? `You have ${upcomingBills.length} unpaid bill${upcomingBills.length === 1 ? '' : 's'} to review. Keep recording income and expenses to make the dashboard more useful.`
              : 'Add accounts, transactions, and plans to build a complete financial picture.'}
          </p>
          <div className={`p-4 rounded-2xl flex items-center justify-between ${isAdvanced ? 'bg-slate-900/50' : 'bg-white/60'}`}>
             <div>
                <p className="text-xs font-bold text-slate-500 mb-1">Financial Health Score</p>
                <div className="flex items-center gap-2">
                   <p className="text-2xl font-black text-emerald-500">{healthScore}<span className="text-sm text-slate-400">/100</span></p>
                   <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">{healthLabel}</span>
                </div>
             </div>
             <div className="w-12 h-12 rounded-full border-4 border-emerald-500 flex items-center justify-center font-bold text-slate-400">
                {healthLetter}
             </div>
          </div>
        </div>

        {/* Top Priorities */}
        <div onClick={() => onNavigate?.('liabilities')} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow">
          <h3 className="font-bold text-lg mb-4">Top Priorities</h3>
          <div className="space-y-3">
             <div className={`p-3 rounded-2xl border ${isAdvanced ? 'bg-slate-700/30 border-slate-700' : 'bg-rose-50 border-rose-100'} flex gap-3`}>
                <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAdvanced ? 'bg-rose-500/20 text-rose-400' : 'bg-white text-rose-500 shadow-sm'}`}>
                   <Receipt className="w-4 h-4" />
                </div>
                <div>
                   <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Review Unpaid Bills</p>
                   <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{upcomingBills.length} bills pending payment</p>
                </div>
             </div>
             <div className={`p-3 rounded-2xl border ${isAdvanced ? 'bg-slate-700/30 border-slate-700' : 'bg-amber-50 border-amber-100'} flex gap-3`}>
                <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAdvanced ? 'bg-amber-500/20 text-amber-400' : 'bg-white text-amber-500 shadow-sm'}`}>
                   <Sparkles className="w-4 h-4" />
                </div>
                <div>
                   <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Update Goals</p>
                   <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">You have {goalSummaries.length} active financial goals.</p>
                </div>
             </div>
          </div>
        </div>

        {/* Upcoming Bills */}
        <div onClick={() => onNavigate?.('liabilities')} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-lg">Upcoming Bills</h3>
            <button onClick={() => onNavigate?.('liabilities-bills')} className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              <Calendar className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <div className="space-y-4">
            {upcomingBills.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">No unpaid bills recorded.</p>
            ) : upcomingBills.map(bill => (
              <div key={bill.id} onClick={() => onNavigate?.('liabilities-bills')} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-600 cursor-pointer">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${isAdvanced ? 'bg-slate-700 text-slate-300' : 'bg-rose-50 text-rose-500'}`}>
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{bill.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Due {format(new Date(bill.date), 'MMM d')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Budget */}
        <div onClick={() => onNavigate?.('plans-budget')} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg">Monthly Budget</h3>
            <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500">
              {budgetPercent}% Spent
            </span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={budgetData} innerRadius="75%" outerRadius="100%" dataKey="value" stroke="none" cornerRadius={4}>
                    {budgetData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold">₱{(totalBudgetSpent / 1000).toFixed(1)}k</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Spent</span>
              </div>
            </div>
            
            <div className="w-full space-y-4 border-t border-slate-100 dark:border-slate-700 pt-6 mt-6">
              {budgetSummaries.length === 0 ? (
                <p className="text-center text-sm text-slate-500">Create a budget plan to see category progress here.</p>
              ) : budgetSummaries.map(budget => (
                <div key={budget.id} className="w-full">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{budget.name}</span>
                    <span className="font-medium text-slate-900 dark:text-white">₱{budget.spent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-slate-400 text-xs font-normal">/ ₱{budget.limit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all" 
                      style={{ 
                        width: `${Math.min((budget.spent / budget.limit) * 100, 100)}%`,
                        backgroundColor: budget.color
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

