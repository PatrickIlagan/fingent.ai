import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { Sparkles, ArrowDown, ArrowUp, Calendar, Receipt, ChevronRight, ChevronDown, TrendingUp, Bitcoin, FileText, Activity, Wallet } from 'lucide-react';
import { format } from 'date-fns';

export function Home({ onNavigate, toggleChat }: { onNavigate?: (tab: string) => void, toggleChat?: () => void }) {
  const { shouldRefresh, themeMode } = useStore();
  const isAdvanced = themeMode === 'advanced';
  const [data, setData] = useState<{ accounts: any[], transactions: any[], wealth: any } | null>(null);
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
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthlyTransactions = data.transactions.filter((transaction) => new Date(transaction.date) >= currentMonthStart);
  const monthlyIncome = monthlyTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const monthlyExpenses = monthlyTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const balanceByType = {
    'Total Balance': totalCash,
    'Digital Wallets': data.accounts.filter((account) => account.type === 'wallet').reduce((sum, account) => sum + Number(account.balance || 0), 0),
    'Cash on Hand': data.accounts.filter((account) => account.type === 'cash').reduce((sum, account) => sum + Number(account.balance || 0), 0),
    'Bank Accounts': data.accounts.filter((account) => account.type === 'bank').reduce((sum, account) => sum + Number(account.balance || 0), 0),
  };
  const displayedBalance = balanceByType[balanceType];

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
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight truncate">₱{displayedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h1>
          </div>
          
          <div className="relative z-10 flex flex-col gap-3 w-full md:w-auto">
             <div className="flex gap-3">
               <div className={`flex-1 md:flex-none px-4 py-3 rounded-2xl ${isAdvanced ? 'bg-slate-700/50' : 'bg-white/20 backdrop-blur-md'}`}>
                 <p className={`text-[10px] uppercase tracking-wider mb-1 ${isAdvanced ? 'text-slate-400' : 'text-emerald-50'}`}>Monthly Income</p>
                 <p className="font-bold text-base">₱{monthlyIncome.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
               </div>
               <div className={`flex-1 md:flex-none px-4 py-3 rounded-2xl ${isAdvanced ? 'bg-slate-700/50' : 'bg-white/20 backdrop-blur-md'}`}>
                 <p className={`text-[10px] uppercase tracking-wider mb-1 ${isAdvanced ? 'text-slate-400' : 'text-emerald-50'}`}>Monthly Expenses</p>
                 <p className="font-bold text-base">₱{monthlyExpenses.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
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
             {mockGoals.map(goal => {
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
                <p className="text-2xl font-bold">₱{(totalCash + 1250000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-emerald-500 font-medium mt-1">+2.4% this week</p>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-3 text-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" onClick={() => onNavigate?.('investments-stocks')}>
                  <div className="flex items-center justify-center gap-1 mb-1 text-slate-500 dark:text-slate-400"><TrendingUp className="w-3 h-3" /><p className="text-xs">Stocks</p></div>
                  <p className="font-bold text-sm">₱850k</p>
                </div>
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-3 text-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" onClick={() => onNavigate?.('investments-cryptos')}>
                  <div className="flex items-center justify-center gap-1 mb-1 text-slate-500 dark:text-slate-400"><Bitcoin className="w-3 h-3" /><p className="text-xs">Crypto</p></div>
                  <p className="font-bold text-sm">₱400k</p>
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
                <p className="text-2xl font-bold">₱85,400</p>
                <p className="text-xs text-emerald-500 font-medium mt-1">Effective Rate: 12.4%</p>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1 text-slate-500 dark:text-slate-400"><FileText className="w-3 h-3" /><p className="text-xs">Income Tax</p></div>
                  <p className="font-bold text-sm">₱62,100</p>
                </div>
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1 text-slate-500 dark:text-slate-400"><Activity className="w-3 h-3" /><p className="text-xs">Capital Gains</p></div>
                  <p className="font-bold text-sm">₱23,300</p>
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
            Good morning! You're on track with your budget this week. You have 3 upcoming bills due in the next 14 days. Don't forget to log your latest side hustle revenue.
          </p>
          <div className={`p-4 rounded-2xl flex items-center justify-between ${isAdvanced ? 'bg-slate-900/50' : 'bg-white/60'}`}>
             <div>
                <p className="text-xs font-bold text-slate-500 mb-1">Financial Health Score</p>
                <div className="flex items-center gap-2">
                   <p className="text-2xl font-black text-emerald-500">84<span className="text-sm text-slate-400">/100</span></p>
                   <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Excellent</span>
                </div>
             </div>
             <div className="w-12 h-12 rounded-full border-4 border-emerald-500 flex items-center justify-center font-bold text-slate-400">
                A
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
                   <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Pay Rent by Tomorrow</p>
                   <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">₱15,000 due to BPI Checking</p>
                </div>
             </div>
             <div className={`p-3 rounded-2xl border ${isAdvanced ? 'bg-slate-700/30 border-slate-700' : 'bg-amber-50 border-amber-100'} flex gap-3`}>
                <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAdvanced ? 'bg-amber-500/20 text-amber-400' : 'bg-white text-amber-500 shadow-sm'}`}>
                   <Sparkles className="w-4 h-4" />
                </div>
                <div>
                   <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Review Streaming Subscriptions</p>
                   <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">You have 3 inactive services costing ₱1,200/mo.</p>
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
            {mockBills.map(bill => (
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
              {Math.round((totalBudgetSpent / totalBudgetLimit) * 100)}% Spent
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
              {mockBudgets.map(budget => (
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

