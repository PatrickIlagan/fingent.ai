import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Target, PieChart, Plus, Plane, Laptop, ShieldAlert, Calendar as CalendarIcon, Home, Car, AlertCircle, CheckCircle2, TrendingUp, X } from 'lucide-react';

export function Plans({ category, onNavigate }: { category?: string, onNavigate?: (tab: string) => void }) {
  const { themeMode, shouldRefresh, triggerRefresh } = useStore();
  const isAdvanced = themeMode === 'advanced';

  const isGoals = category === 'goals';
  const isBudget = category === 'budget';
  const showAll = !category;

  const [dbBudgets, setDbBudgets] = useState<any[]>([]);
  const [dbIncomeFlows, setDbIncomeFlows] = useState<any[]>([]);
  const [dbPresets, setDbPresets] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      const [b, inc, p] = await Promise.all([
        fetch('/api/budgets').then(r => r.json()).catch(() => []),
        fetch('/api/income_flows').then(r => r.json()).catch(() => []),
        fetch('/api/budget_presets').then(r => r.json()).catch(() => [])
      ]);
      setDbBudgets(Array.isArray(b) ? b : []);
      setDbIncomeFlows(Array.isArray(inc) ? inc : []);
      setDbPresets(Array.isArray(p) ? p : []);
      if (Array.isArray(b) && b.length > 0) {
         setBudgetPlans(() => {
            const newPlans = b.map(dbB => {
               try {
                  const data = JSON.parse(dbB.categories);
                  return { ...data, id: dbB.id };
               } catch(e) { return null; }
            }).filter(Boolean);
            
            return newPlans;
         });
      }
    }
    fetchData();
  }, [shouldRefresh]);

  const [budgetPlans, setBudgetPlans] = useState<any[]>([]);

  const [goals, setGoals] = useState<any[]>([]);

  const fetchGoals = () => {
    fetch('/api/goals')
      .then(res => res.json())
      .then(data => setGoals(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchGoals();
  }, [shouldRefresh]);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', target: '', date: '', color: 'emerald', icon: 'Target' });

  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [fundAccount, setFundAccount] = useState('Cash');

  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/accounts')
      .then(res => res.json())
      .then(data => {
        const _d = Array.isArray(data) ? data : [];
        setAccounts(_d);
        if (_d.length > 0) {
          setFundAccount(data[0].name);
        }
      })
      .catch(err => console.error("Failed to fetch accounts:", err));
  }, [shouldRefresh]);

  const [isBudgetBuilderOpen, setIsBudgetBuilderOpen] = useState(false);
  const [isModelBuilderOpen, setIsModelBuilderOpen] = useState(false);
  const [modelName, setModelName] = useState('');
  const [modelAllocations, setModelAllocations] = useState<any[]>([]);
  const [budgetStep, setBudgetStep] = useState(1);
  const [totalBudgetLimit, setTotalBudgetLimit] = useState('');
  const [budgetType, setBudgetType] = useState<'recurring' | 'specific'>('recurring');
  const [isGroupedBudget, setIsGroupedBudget] = useState(true);
  const [budgetPlanName, setBudgetPlanName] = useState('');
  const [budgetDateRange, setBudgetDateRange] = useState('');
  const [budgetEndDate, setBudgetEndDate] = useState('');

  const [allocations, setAllocations] = useState([
    { id: 1, name: 'Needs', amount: '', percentage: 50, color: 'emerald', categories: [] as any[] },
    { id: 2, name: 'Wants', amount: '', percentage: 30, color: 'blue', categories: [] as any[] },
    { id: 3, name: 'Savings', amount: '', percentage: 20, color: 'violet', categories: [] as any[] }
  ]);

  const [selectedGoal, setSelectedGoal] = useState<any | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<any | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Plane': return <Plane className="w-5 h-5" />;
      case 'Laptop': return <Laptop className="w-5 h-5" />;
      case 'ShieldAlert': return <ShieldAlert className="w-5 h-5" />;
      case 'Car': return <Car className="w-5 h-5" />;
      case 'Home': return <Home className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  const getMonthsBetween = (d1: Date, d2: Date) => {
    let months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    return months <= 0 ? 1 : months;
  };

  const getDaysBetween = (d1: Date, d2: Date) => {
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays <= 0 ? 1 : diffDays;
  };

  const [savingViewMode, setSavingViewMode] = useState<'monthly' | 'daily'>('monthly');

  const handleAddGoal = async () => {
    if (!newGoal.name || !newGoal.target || !newGoal.date) return;
    const newGoalItem = {
      name: newGoal.name,
      target: parseFloat(newGoal.target) || 0,
      saved: 0,
      date: newGoal.date,
      color: newGoal.color,
      icon: newGoal.icon,
      sources: [],
      transactions: []
    };
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGoalItem)
      });
      const data = await res.json();
      const updatedGoal = { ...newGoalItem, id: data.id };
      setGoals([...goals, updatedGoal]);
      setIsGoalModalOpen(false);
      setSelectedGoal(updatedGoal);
      setNewGoal({ name: '', target: '', date: '', color: 'emerald', icon: 'Target' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFunds = async () => {
    if (!selectedGoal || !fundAmount) return;
    const amount = parseFloat(fundAmount);
    if (amount <= 0) return;

    const selectedAcc = accounts.find(a => a.name === fundAccount);
    if (selectedAcc) {
      try {
        await fetch(`/api/accounts/${selectedAcc.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...selectedAcc, balance: selectedAcc.balance - amount })
        });
        setAccounts(accounts.map(a => a.id === selectedAcc.id ? { ...a, balance: a.balance - amount } : a));
      } catch (err) {
        console.error("Failed to update account balance:", err);
      }
    }

    const newTransaction = {
      id: Date.now(),
      amount,
      date: new Date().toISOString().split('T')[0],
      account: fundAccount,
      type: 'deposit'
    };

    const updatedGoal = {
      ...selectedGoal,
      saved: selectedGoal.saved + amount,
      transactions: [newTransaction, ...(selectedGoal.transactions || [])],
      sources: [...(selectedGoal.sources || [])]
    };

    const existingSourceIndex = updatedGoal.sources.findIndex((s: any) => s.name === fundAccount);
    if (existingSourceIndex >= 0) {
      updatedGoal.sources[existingSourceIndex].amount += amount;
    } else {
      updatedGoal.sources.push({ name: fundAccount, amount });
    }

    try {
      await fetch(`/api/goals/${selectedGoal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedGoal)
      });
      setGoals(goals.map(g => g.id === selectedGoal.id ? updatedGoal : g));
      setSelectedGoal(updatedGoal);
      setIsAddFundsOpen(false);
      setFundAmount('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddBudget = async () => {
    const allocatedItems = allocations.map(a => ({
      id: Date.now() + a.id,
      name: a.name,
      limit: parseFloat(a.amount) || 0,
      color: a.color,
      spent: 0,
      transactions: [],
      categories: a.categories.map((c: any) => ({
        id: c.id || Date.now() + Math.random(),
        name: c.name,
        limit: c.limit,
        spent: c.spent || 0,
        color: c.color || a.color,
        transactions: []
      }))
    })).filter(b => b.limit > 0);
    
    const newBudgetPlan = {
      id: Date.now(),
      name: budgetPlanName,
      type: budgetType,
      isGrouped: isGroupedBudget,
      startDate: budgetDateRange,
      endDate: budgetEndDate,
      totalLimit: parseFloat(totalBudgetLimit) || 0,
      groups: isGroupedBudget ? allocatedItems : [{
        id: Date.now() + 999,
        name: 'Categories',
        limit: parseFloat(totalBudgetLimit) || 0,
        color: 'slate',
        categories: allocatedItems
      }]
    };
    
    
    const response = await fetch('/api/budgets', {
       method: 'POST', headers: {'Content-Type': 'application/json'},
       body: JSON.stringify({
          name: budgetPlanName,
          total_amount: newBudgetPlan.totalLimit,
          categories: newBudgetPlan,
          month: newBudgetPlan.startDate || new Date().toISOString()
       })
    });
    if (!response.ok) return;
    const saved = await response.json();
    setBudgetPlans((plans) => [...plans, { ...newBudgetPlan, id: saved.id }]);
    setIsBudgetBuilderOpen(false);
    setBudgetStep(1);
    setTotalBudgetLimit('');
    setBudgetPlanName('');
    setBudgetDateRange('');
    setBudgetEndDate('');
    setBudgetType('recurring');
    setIsGroupedBudget(true);
    triggerRefresh();
  };

  const handleNextStep = () => {
    const limit = parseFloat(totalBudgetLimit) || 0;
    setAllocations([
      { id: 1, name: 'Needs', amount: (limit * 0.5).toString(), percentage: 50, color: 'emerald' },
      { id: 2, name: 'Wants', amount: (limit * 0.3).toString(), percentage: 30, color: 'blue' },
      { id: 3, name: 'Savings', amount: (limit * 0.2).toString(), percentage: 20, color: 'violet' }
    ]);
    setBudgetStep(2);
  };

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - now.getDate());

  if (selectedGoal) {
    const progress = Math.min((selectedGoal.saved / selectedGoal.target) * 100, 100);
    const targetDate = new Date(selectedGoal.date);
    const monthsLeft = getMonthsBetween(now, targetDate);
    const daysLeft = getDaysBetween(now, targetDate);
    const amountLeft = Math.max(0, selectedGoal.target - selectedGoal.saved);
    const monthlyNeeded = amountLeft / monthsLeft;
    const dailyNeeded = amountLeft / daysLeft;
    const isCompleted = progress >= 100;

    return (
      <div className="space-y-6 pb-10">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => setSelectedGoal(null)}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <Plane className="w-4 h-4 rotate-[-135deg]" /> Back to Goals
          </button>
          
          {!isCompleted && (
            <div className={`flex rounded-xl p-1 text-sm font-bold ${isAdvanced ? 'bg-slate-900' : 'bg-slate-100'}`}>
              <button 
                onClick={() => setSavingViewMode('monthly')}
                className={`px-4 py-1.5 rounded-lg transition-colors ${savingViewMode === 'monthly' ? (isAdvanced ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-500'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setSavingViewMode('daily')}
                className={`px-4 py-1.5 rounded-lg transition-colors ${savingViewMode === 'daily' ? (isAdvanced ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-500'}`}
              >
                Daily
              </button>
            </div>
          )}
        </div>

        <div className={`rounded-3xl p-6 sm:p-8 shadow-sm border flex flex-col md:flex-row md:items-center justify-between gap-6 ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-6">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-lg shrink-0 ${isCompleted ? 'bg-emerald-500' : isAdvanced ? 'bg-violet-600 shadow-violet-900/30' : 'bg-slate-900 shadow-slate-200'}`}>
              {getIcon(selectedGoal.icon)}
            </div>
            <div>
              <h2 className="text-3xl font-black">{selectedGoal.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm font-medium text-slate-500">
                <span className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4" /> Target: {targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} ({daysLeft} days left)</span>
                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg">{progress.toFixed(1)}% Complete</span>
              </div>
            </div>
          </div>
          <div className="text-left md:text-right">
            <p className="text-sm font-medium text-slate-500 mb-1">Total Saved</p>
            <p className={`text-4xl font-black ${isCompleted ? 'text-emerald-500' : ''}`}>₱{selectedGoal.saved.toLocaleString()}</p>
            <p className="text-sm font-medium text-slate-500 mt-1">Goal: ₱{selectedGoal.target.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <h3 className="font-bold text-lg mb-6 flex items-center">
                <PieChart className="w-5 h-5 mr-2" /> Fund Sources
              </h3>
              
              <div className="space-y-4">
                {selectedGoal.sources?.map((source: any, idx: number) => (
                  <div key={idx} className={`p-4 rounded-2xl flex justify-between items-center ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                    <span className="font-bold">{source.name}</span>
                    <span className="font-bold text-lg">₱{source.amount.toLocaleString()}</span>
                  </div>
                ))}
                {!selectedGoal.sources || selectedGoal.sources.length === 0 && (
                  <p className="text-center text-slate-500 py-4 text-sm">No sources added yet. Add funds from your accounts.</p>
                )}
              </div>
              
              <button 
                onClick={() => setIsAddFundsOpen(true)}
                className={`w-full mt-6 py-3 rounded-xl font-bold text-sm border-2 border-dashed transition-colors ${isAdvanced ? 'border-slate-700 hover:border-violet-500 text-slate-400 hover:text-violet-400' : 'border-slate-200 hover:border-emerald-500 text-slate-500 hover:text-emerald-600'}`}
              >
                + Add Funds
              </button>
            </div>

            <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <h3 className="font-bold text-lg mb-6">Transaction History</h3>
              <div className="space-y-4">
                {selectedGoal.transactions && selectedGoal.transactions.length > 0 ? (
                  selectedGoal.transactions.map((tx: any) => (
                    <div key={tx.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-sm">Added Funds</p>
                        <p className="text-xs font-medium text-slate-500">{new Date(tx.date).toLocaleDateString()} • {tx.account}</p>
                      </div>
                      <div className="font-black text-emerald-500">
                        +₱{tx.amount.toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-bold text-slate-500 text-center py-4">No transactions yet.</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <h3 className="font-bold text-lg mb-4">Goal Progress</h3>
              
              <div className="h-4 w-full bg-slate-100 dark:bg-slate-700 rounded-full mb-6 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : isAdvanced ? 'bg-violet-500' : 'bg-slate-900'}`} 
                  style={{ width: `${progress}%` }} 
                />
              </div>
              
              {!isCompleted ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-slate-500">Remaining Amount</span>
                    <span className="font-bold">₱{amountLeft.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-slate-500">Time Left</span>
                    <span className="font-bold">{savingViewMode === 'monthly' ? `${monthsLeft} months` : `${daysLeft} days`}</span>
                  </div>
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="font-bold text-violet-500">Required {savingViewMode === 'monthly' ? 'Monthly' : 'Daily'}</span>
                      <span className="font-bold text-lg">₱{(savingViewMode === 'monthly' ? monthlyNeeded : dailyNeeded).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2 font-bold text-sm border border-emerald-100 dark:border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5" /> Goal Achieved!
                </div>
              )}
            </div>
          </div>
        </div>

        {isAddFundsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAddFundsOpen(false)}>
            <div 
              className={`w-full max-w-sm rounded-3xl shadow-xl flex flex-col p-6 ${isAdvanced ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-white border border-slate-100'}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Add Funds to {selectedGoal?.name}</h3>
                <button onClick={() => setIsAddFundsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
              </div>
              
              <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Amount ($)</label>
                    <input 
                      type="number" 
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none font-medium ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-slate-400'}`} 
                      placeholder="0" 
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">From Account</label>
                    <select 
                      value={fundAccount}
                      onChange={(e) => setFundAccount(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none font-medium appearance-none ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500 text-white' : 'bg-slate-50 border border-slate-200 focus:border-slate-400 text-slate-900'}`}
                    >
                      {accounts.length > 0 ? accounts.map(acc => (
                        <option key={acc.id} value={acc.name}>{acc.name}</option>
                      )) : (
                        <option value="Cash">Cash</option>
                      )}
                    </select>
                 </div>
              </div>

              <button 
                onClick={handleAddFunds}
                className={`w-full mt-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-900/20' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'}`}
              >
                Add Funds
              </button>
            </div>
          </div>
        )}

      </div>
    );
  }

  if (selectedBudget) {
    const progress = (selectedBudget.spent / selectedBudget.limit) * 100;
    const isOver = progress > 100;
    const isWarning = progress > 85 && !isOver;
    const budgetLeft = Math.max(0, selectedBudget.limit - selectedBudget.spent);
    const dailyBudgetLeft = budgetLeft / daysLeft;

    return (
      <div className="space-y-6 pb-10">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => setSelectedBudget(null)}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <PieChart className="w-4 h-4 rotate-[-135deg]" /> Back to Budgets
          </button>
        </div>

        <div className={`rounded-3xl p-6 sm:p-8 shadow-sm border flex flex-col md:flex-row md:items-center justify-between gap-6 ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-6">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-lg shrink-0 ${isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : isAdvanced ? 'bg-violet-600 shadow-violet-900/30' : 'bg-emerald-500 shadow-emerald-200'}`}>
              <PieChart className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-3xl font-black">{selectedBudget.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm font-medium text-slate-500">
                <span className={`px-2.5 py-1 rounded-lg ${isOver ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' : isWarning ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-700'}`}>
                  {progress.toFixed(0)}% Used
                </span>
                <span className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4" /> {daysLeft} days left</span>
              </div>
            </div>
          </div>
          <div className="text-left md:text-right">
            <p className="text-sm font-medium text-slate-500 mb-1">Total Spent</p>
            <p className={`text-4xl font-black ${isOver ? 'text-rose-500' : ''}`}>₱{selectedBudget.spent.toLocaleString()}</p>
            <p className="text-sm font-medium text-slate-500 mt-1">Limit: ₱{selectedBudget.limit.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <h3 className="font-bold text-lg mb-6 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" /> Recent Expenses
              </h3>
              
              <div className="space-y-4">
                {selectedBudget.transactions?.map((tx: any, idx: number) => (
                  <div key={idx} className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                    <div>
                      <p className="font-bold">{tx.name}</p>
                      <p className="text-xs text-slate-500 font-medium mt-1">{new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • {tx.account}</p>
                    </div>
                    <span className="font-bold text-lg">₱{tx.amount.toLocaleString()}</span>
                  </div>
                ))}
                {(!selectedBudget.transactions || selectedBudget.transactions.length === 0) && (
                  <p className="text-center text-slate-500 py-4 text-sm">No expenses logged yet.</p>
                )}
              </div>
              
              <button className={`w-full mt-6 py-3 rounded-xl font-bold text-sm border-2 border-dashed transition-colors ${isAdvanced ? 'border-slate-700 hover:border-violet-500 text-slate-400 hover:text-violet-400' : 'border-slate-200 hover:border-slate-400 text-slate-500 hover:text-slate-800'}`}>
                + Log Expense
              </button>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <h3 className="font-bold text-lg mb-4">Budget Status</h3>
              
              <div className="h-4 w-full bg-slate-100 dark:bg-slate-700 rounded-full mb-6 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : (isAdvanced ? 'bg-violet-500' : 'bg-emerald-500')}`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-500">Remaining Budget</span>
                  <span className={`font-bold ${isOver ? 'text-rose-500' : ''}`}>₱{budgetLeft.toLocaleString()}</span>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="font-bold text-slate-500">Suggested Daily</span>
                    <span className={`font-bold text-lg ${dailyBudgetLeft < 100 && dailyBudgetLeft > 0 ? 'text-rose-500' : dailyBudgetLeft === 0 ? 'text-slate-500' : 'text-emerald-500 dark:text-emerald-400'}`}>
                      ₱{dailyBudgetLeft.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-400 mt-1">Based on {daysLeft} days left in month</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isBudgetBuilderOpen) {
    const totalAllocated = allocations.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    const unallocated = (parseFloat(totalBudgetLimit) || 0) - totalAllocated;
    
    // Calculate pie chart data based on allocations
    const pieData = allocations.map(a => {
       const amount = parseFloat(a.amount) || 0;
       return {
         name: a.name,
         value: amount,
         percentage: totalAllocated > 0 ? (amount / totalAllocated) * 100 : 0,
         color: a.color === 'emerald' ? '#10b981' : 
                a.color === 'blue' ? '#3b82f6' : 
                a.color === 'violet' ? '#8b5cf6' : 
                a.color === 'amber' ? '#f59e0b' : 
                a.color === 'rose' ? '#f43f5e' : '#ec4899'
       };
    }).filter(d => d.value > 0);
    
    // We add unallocated as a grey segment if positive
    if (unallocated > 0) {
      pieData.push({
        name: 'Unallocated',
        value: unallocated,
        percentage: (unallocated / (parseFloat(totalBudgetLimit) || 1)) * 100,
        color: isAdvanced ? '#334155' : '#e2e8f0'
      });
    }

    return (
      <div className="space-y-6 pb-10">
        <div className="flex justify-between items-center mb-2">
          <button 
            onClick={() => { setIsBudgetBuilderOpen(false); setBudgetStep(1); }}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <PieChart className="w-4 h-4 rotate-[-135deg]" /> Back to Plans
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column: Form & Adjustments */}
          <div className="space-y-6">
            <div className={`rounded-3xl p-6 sm:p-8 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              {budgetStep === 1 ? (
                 <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-3xl font-black mb-2">Create Budget Plan</h2>
                    <p className="text-sm font-medium text-slate-500 mb-8">Set up a new monthly budget plan to track your spending.</p>
                    
                    <div className="space-y-6 mb-10">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Plan Name</label>
                        <input 
                          type="text" 
                          value={budgetPlanName}
                          onChange={(e) => setBudgetPlanName(e.target.value)}
                          className={`w-full px-5 py-4 rounded-xl text-lg outline-none font-bold shadow-sm transition-all ${isAdvanced ? 'bg-slate-900 border-2 border-slate-700 focus:border-violet-500' : 'bg-slate-50 border-2 border-slate-200 focus:border-emerald-500'}`} 
                          placeholder="e.g. July Budget, Vacation Fund" 
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Budget Duration</label>
                        <div className="flex gap-4">
                          <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl cursor-pointer border-2 transition-all font-bold ${budgetType === 'recurring' ? (isAdvanced ? 'border-violet-500 bg-violet-500/10 text-violet-400' : 'border-emerald-500 bg-emerald-50 text-emerald-600') : (isAdvanced ? 'border-slate-700 bg-slate-900 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500')}`}>
                            <input 
                              type="radio" 
                              name="budgetType" 
                              value="recurring" 
                              checked={budgetType === 'recurring'} 
                              onChange={(e) => setBudgetType('recurring')}
                              className="hidden" 
                            />
                            Recurring Monthly
                          </label>
                          <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl cursor-pointer border-2 transition-all font-bold ${budgetType === 'specific' ? (isAdvanced ? 'border-violet-500 bg-violet-500/10 text-violet-400' : 'border-emerald-500 bg-emerald-50 text-emerald-600') : (isAdvanced ? 'border-slate-700 bg-slate-900 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500')}`}>
                            <input 
                              type="radio" 
                              name="budgetType" 
                              value="specific" 
                              checked={budgetType === 'specific'} 
                              onChange={(e) => setBudgetType('specific')}
                              className="hidden" 
                            />
                            Specific Period
                          </label>
                        </div>
                      </div>

                      {budgetType === 'recurring' && (
                        <div className="animate-in slide-in-from-top-2 duration-300">
                           <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Recurring Date (Day of Month)</label>
                           <input 
                             type="number" 
                             min="1" max="31"
                             value={budgetDateRange}
                             onChange={(e) => setBudgetDateRange(e.target.value)}
                             className={`w-full px-5 py-4 rounded-xl text-base outline-none font-bold shadow-sm transition-all ${isAdvanced ? 'bg-slate-900 border-2 border-slate-700 focus:border-violet-500' : 'bg-slate-50 border-2 border-slate-200 focus:border-emerald-500'}`} 
                             placeholder="e.g. 15 for the 15th of every month"
                           />
                        </div>
                      )}
                      
                      {budgetType === 'specific' && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Start Date</label>
                            <input 
                              type="date" 
                              value={budgetDateRange}
                              onChange={(e) => setBudgetDateRange(e.target.value)}
                              className={`w-full px-5 py-4 rounded-xl text-base outline-none font-bold shadow-sm transition-all ${isAdvanced ? 'bg-slate-900 border-2 border-slate-700 focus:border-violet-500' : 'bg-slate-50 border-2 border-slate-200 focus:border-emerald-500'}`} 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">End Date</label>
                            <input 
                              type="date" 
                              value={budgetEndDate}
                              onChange={(e) => setBudgetEndDate(e.target.value)}
                              className={`w-full px-5 py-4 rounded-xl text-base outline-none font-bold shadow-sm transition-all ${isAdvanced ? 'bg-slate-900 border-2 border-slate-700 focus:border-violet-500' : 'bg-slate-50 border-2 border-slate-200 focus:border-emerald-500'}`} 
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Budget Structure</label>
                        <div className="flex gap-4">
                          <label className={`flex-1 flex flex-col justify-center p-4 rounded-xl cursor-pointer border-2 transition-all font-bold ${isGroupedBudget ? (isAdvanced ? 'border-violet-500 bg-violet-500/10' : 'border-emerald-500 bg-emerald-50') : (isAdvanced ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50')}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <input 
                                type="radio" 
                                checked={isGroupedBudget} 
                                onChange={() => setIsGroupedBudget(true)}
                                className="hidden" 
                              />
                              <span className={isGroupedBudget ? (isAdvanced ? 'text-violet-400' : 'text-emerald-600') : (isAdvanced ? 'text-slate-400' : 'text-slate-500')}>Grouped Categories</span>
                            </div>
                            <span className="text-xs font-medium text-slate-500">E.g., Needs -{'>'} Food, Water</span>
                          </label>
                          <label className={`flex-1 flex flex-col justify-center p-4 rounded-xl cursor-pointer border-2 transition-all font-bold ${!isGroupedBudget ? (isAdvanced ? 'border-violet-500 bg-violet-500/10' : 'border-emerald-500 bg-emerald-50') : (isAdvanced ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50')}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <input 
                                type="radio" 
                                checked={!isGroupedBudget} 
                                onChange={() => setIsGroupedBudget(false)}
                                className="hidden" 
                              />
                              <span className={!isGroupedBudget ? (isAdvanced ? 'text-violet-400' : 'text-emerald-600') : (isAdvanced ? 'text-slate-400' : 'text-slate-500')}>Simple Categories</span>
                            </div>
                            <span className="text-xs font-medium text-slate-500">No grouping structure</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Total Monthly Budget</label>
                        
                        <div className="flex gap-2 mb-3">
                           <select onChange={(e) => {
                              if (e.target.value) {
                                 const flow = dbIncomeFlows.find(f => f.id.toString() === e.target.value);
                                 if (flow) {
                                    setTotalBudgetLimit(flow.amount.toString());
                                    if (flow.budget_preset_id) {
                                       // they could also apply the preset automatically but that's handled in step 2 usually
                                    }
                                 }
                              }
                           }} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${isAdvanced ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                              <option value="">Select an Income Flow...</option>
                              {dbIncomeFlows.map(flow => (
                                 <option key={flow.id} value={flow.id}>{flow.name} (₱{parseFloat(flow.amount).toLocaleString()})</option>
                              ))}
                           </select>
                        </div>
                        
                        <div className="relative">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-2xl">₱</span>
                          <input 
                            type="number" 
                            value={totalBudgetLimit}
                            onChange={(e) => setTotalBudgetLimit(e.target.value)}
                            className={`w-full pl-12 pr-6 py-5 rounded-2xl text-3xl outline-none font-black shadow-inner transition-all ${isAdvanced ? 'bg-slate-900 border-2 border-slate-700 focus:border-violet-500' : 'bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 focus:shadow-emerald-500/10'}`} 
                            placeholder="0.00" 
                          />
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleNextStep}
                      disabled={!totalBudgetLimit || parseFloat(totalBudgetLimit) <= 0 || !budgetPlanName}
                      className={`w-full py-5 rounded-2xl font-black text-lg transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 ${isAdvanced ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-900/40' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'}`}
                    >
                      Next: Allocate {isGroupedBudget ? 'Groups' : 'Categories'}
                    </button>
                 </div>
              ) : (
                 <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center mb-2">
                       <h2 className="text-3xl font-black">Allocate Budget {isGroupedBudget ? 'Groups' : 'Categories'}</h2>
                       <button 
                          onClick={() => setBudgetStep(1)}
                          className="text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                       >
                          Edit Total
                       </button>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-4">We've suggested a 50/30/20 split based on ₱{parseFloat(totalBudgetLimit).toLocaleString()}. Adjust to your liking.</p>
                    
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
                       {dbPresets.map(preset => (
                          <button 
                             key={preset.id}
                             onClick={() => {
                                let allocs = []; try { allocs = JSON.parse(preset.allocations || '[]'); } catch(e) {} if (!Array.isArray(allocs)) allocs = [];
                                const total = parseFloat(totalBudgetLimit) || 0;
                                const newAllocations = allocs.map((a: any, i: number) => ({
                                   id: Date.now() + i,
                                   name: a.name,
                                   percentage: a.percentage,
                                   amount: (total * (a.percentage / 100)).toString(),
                                   color: a.color || 'emerald',
                                   categories: a.categories || []
                                }));
                                setAllocations(newAllocations);
                             }}
                             className={`px-4 py-2 whitespace-nowrap rounded-xl text-xs font-bold border transition-all ${isAdvanced ? 'bg-slate-900 border-slate-700 hover:border-violet-500' : 'bg-white border-slate-200 hover:border-emerald-500'}`}
                          >
                             Apply {preset.name}
                          </button>
                       ))}
                       <button 
                          onClick={async () => {
                             const name = prompt("Enter a name for this preset:");
                             if (!name) return;
                             const toSave = allocations.map(a => ({
                                name: a.name, percentage: a.percentage, color: a.color, categories: a.categories
                             }));
                             await fetch('/api/budget_presets', {
                                method: 'POST', headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({name, allocations: toSave})
                             });
                             window.location.reload();
                          }}
                          className={`px-4 py-2 whitespace-nowrap rounded-xl text-xs font-bold border border-dashed transition-all ${isAdvanced ? 'bg-slate-900 border-slate-700 hover:border-violet-500' : 'bg-slate-50 border-slate-300 hover:border-emerald-500'}`}
                       >
                          + Save Current as Preset
                       </button>
                    </div>
                    
                    <div className="space-y-4 mb-6">
                      {allocations.map((alloc, idx) => (
                        <div key={alloc.id} className={`p-5 rounded-2xl border transition-all ${isAdvanced ? 'bg-slate-900 border-slate-700 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                          <div className="flex justify-between items-center mb-4 gap-3">
                            <div className="flex items-center gap-3 flex-1 bg-white dark:bg-slate-800 p-1.5 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-emerald-500/50 dark:focus-within:ring-violet-500/50 transition-all shadow-sm">
                               <div className="relative group">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer ${
                                    alloc.color === 'emerald' ? 'bg-emerald-500' : 
                                    alloc.color === 'blue' ? 'bg-blue-500' : 
                                    alloc.color === 'violet' ? 'bg-violet-500' : 
                                    alloc.color === 'amber' ? 'bg-amber-500' : 
                                    alloc.color === 'rose' ? 'bg-rose-500' : 'bg-fuchsia-500'
                                  }`}
                                  onClick={() => {
                                      const colors = ['emerald', 'blue', 'violet', 'amber', 'rose', 'fuchsia'];
                                      const nextColor = colors[(colors.indexOf(alloc.color) + 1) % colors.length];
                                      const newAlloc = [...allocations];
                                      newAlloc[idx].color = nextColor;
                                      setAllocations(newAlloc);
                                  }}
                                  >
                                    <div className="w-3 h-3 rounded-full bg-white/30 group-hover:scale-150 transition-transform" />
                                  </div>
                               </div>
                               <input 
                                 type="text" 
                                 value={alloc.name}
                                 onChange={(e) => {
                                   const newAlloc = [...allocations];
                                   newAlloc[idx].name = e.target.value;
                                   setAllocations(newAlloc);
                                 }}
                                 placeholder={isGroupedBudget ? "Group Name" : "Category Name"}
                                 className={`w-full bg-transparent outline-none font-bold text-base ${isAdvanced ? 'text-white' : 'text-slate-900'}`}
                               />
                            </div>
                            <button 
                              onClick={() => setAllocations(allocations.filter((_, i) => i !== idx))}
                              className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors shrink-0"
                            ><X size={18} /></button>
                          </div>
                          
                          <div className="relative mb-4">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">₱</span>
                            <input 
                              type="number" 
                              value={alloc.amount}
                              onChange={(e) => {
                                const newAlloc = [...allocations];
                                newAlloc[idx].amount = e.target.value;
                                setAllocations(newAlloc);
                              }}
                              className={`w-full pl-10 pr-4 py-3 rounded-xl text-xl outline-none font-black shadow-inner transition-colors ${isAdvanced ? 'bg-slate-800 border-2 border-slate-700 focus:border-violet-500' : 'bg-white border-2 border-slate-200 focus:border-emerald-500'}`} 
                              placeholder="0.00"
                            />
                          </div>

                          {isGroupedBudget && (
                            <div className="space-y-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categories</label>
                              { (alloc.categories || []).map((cat: any, catIdx: number) => (
                                <div key={catIdx} className="flex gap-2">
                                  <input 
                                    type="text"
                                    value={cat.name}
                                    onChange={(e) => {
                                      const newAlloc = [...allocations];
                                      newAlloc[idx].categories[catIdx].name = e.target.value;
                                      setAllocations(newAlloc);
                                    }}
                                    placeholder="Name"
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold outline-none border transition-colors ${isAdvanced ? 'bg-slate-800 border-slate-700 focus:border-violet-500 text-white' : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900'}`}
                                  />
                                  <div className="relative w-32 shrink-0">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">₱</span>
                                    <input 
                                      type="number"
                                      value={cat.limit || ''}
                                      onChange={(e) => {
                                        const newAlloc = [...allocations];
                                        newAlloc[idx].categories[catIdx].limit = parseFloat(e.target.value) || 0;
                                        setAllocations(newAlloc);
                                      }}
                                      placeholder="0.00"
                                      className={`w-full pl-7 pr-3 py-2 rounded-lg text-sm font-bold outline-none border transition-colors ${isAdvanced ? 'bg-slate-800 border-slate-700 focus:border-violet-500 text-white' : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900'}`}
                                    />
                                  </div>
                                  <button
                                    onClick={() => {
                                      const newAlloc = [...allocations];
                                      newAlloc[idx].categories = newAlloc[idx].categories.filter((_: any, i: number) => i !== catIdx);
                                      setAllocations(newAlloc);
                                    }}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                              
                              <button 
                                onClick={() => {
                                  const newAlloc = [...allocations];
                                  newAlloc[idx].categories.push({ id: Date.now(), name: '', limit: 0, spent: 0, color: alloc.color, transactions: [] });
                                  setAllocations(newAlloc);
                                }}
                                className={`w-full py-2 rounded-lg font-bold text-xs border border-dashed transition-colors ${isAdvanced ? 'border-slate-700 text-slate-400 hover:text-violet-400 hover:border-violet-500' : 'border-slate-300 text-slate-500 hover:text-emerald-600 hover:border-emerald-500'}`}
                              >
                                + Add Category to {alloc.name || 'Group'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => setAllocations([...allocations, { id: Date.now(), name: isGroupedBudget ? 'New Group' : 'New Category', amount: '', percentage: 0, color: 'blue', categories: [] }])}
                      className={`w-full mb-8 py-4 rounded-xl font-bold text-sm border-2 border-dashed transition-colors ${isAdvanced ? 'border-slate-700 text-slate-400 hover:text-violet-400 hover:border-violet-500' : 'border-slate-300 text-slate-500 hover:text-emerald-600 hover:border-emerald-500'}`}
                    >
                      <Plus className="inline w-4 h-4 mr-2" /> Add {isGroupedBudget ? 'Group' : 'Category'}
                    </button>

                    <button 
                      onClick={handleAddBudget}
                      disabled={allocations.length === 0 || unallocated < 0}
                      className={`w-full py-5 rounded-2xl font-black text-lg transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 ${isAdvanced ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-900/40' : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20'}`}
                    >
                      Save Budget Plan
                    </button>
                 </div>
              )}
            </div>
          </div>
          
          {/* Right Column: Visualization */}
          <div className="space-y-6">
            <div className={`rounded-3xl p-6 sm:p-8 shadow-sm border h-full min-h-[400px] flex flex-col ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
               <h3 className="text-xl font-bold mb-8">Budget Overview</h3>
               
               <div className="flex-1 flex flex-col items-center justify-center">
                 {budgetStep === 1 && !totalBudgetLimit ? (
                   <div className="text-center text-slate-400 dark:text-slate-500">
                      <PieChart className="w-24 h-24 mx-auto mb-4 opacity-20" />
                      <p className="font-medium">Enter a total amount to begin</p>
                   </div>
                 ) : (
                   <div className="w-full max-w-sm mx-auto animate-in fade-in zoom-in-95 duration-500">
                     <div className="relative aspect-square w-full rounded-full flex items-center justify-center overflow-hidden mb-8"
                          style={{
                            background: `conic-gradient(${pieData.map((d, i) => {
                              const prev = pieData.slice(0, i).reduce((sum, item) => sum + item.percentage, 0);
                              return `${d.color} ${prev}% ${prev + d.percentage}%`;
                            }).join(', ')})`
                          }}
                     >
                        <div className={`absolute inset-4 rounded-full flex flex-col items-center justify-center shadow-inner ${isAdvanced ? 'bg-slate-800' : 'bg-white'}`}>
                          <p className="text-sm font-bold text-slate-500 mb-1">Total Limit</p>
                          <p className="text-3xl font-black">₱{parseFloat(totalBudgetLimit || '0').toLocaleString()}</p>
                        </div>
                     </div>
                     
                     {budgetStep === 2 && (
                       <div className="space-y-3">
                         <div className={`p-4 rounded-xl flex justify-between items-center font-bold ${unallocated < 0 ? 'bg-rose-500/10 text-rose-500' : isAdvanced ? 'bg-slate-900 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                           <span>Unallocated</span>
                           <span className={unallocated < 0 ? 'text-rose-500' : 'text-emerald-500'}>
                             ₱{unallocated.toLocaleString()}
                           </span>
                         </div>
                         
                         {pieData.filter(d => d.name !== 'Unallocated').map((d, i) => (
                           <div key={i} className="flex items-center justify-between text-sm font-bold">
                             <div className="flex items-center gap-2">
                               <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                               <span className={isAdvanced ? 'text-slate-300' : 'text-slate-700'}>{d.name}</span>
                             </div>
                             <span className={isAdvanced ? 'text-slate-400' : 'text-slate-500'}>{d.percentage.toFixed(0)}%</span>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 )}
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold capitalize">{category ? category : 'All Plans'}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your budgets and crush your financial goals</p>
        </div>
        <div className="flex gap-2">
          {(showAll || isBudget) && (
            <button 
              onClick={() => setIsBudgetBuilderOpen(true)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${isAdvanced ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-violet-900/20 shadow-lg hover:scale-105' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm hover:scale-105'}`}
            >
              <Plus className="w-4 h-4" /> Add Budget
            </button>
          )}
          {(showAll || isGoals) && (
            <button 
              onClick={() => setIsGoalModalOpen(true)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${isAdvanced ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-violet-900/20 shadow-lg hover:scale-105' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm hover:scale-105'}`}
            >
              <Plus className="w-4 h-4" /> New Goal
            </button>
          )}
        </div>
      </div>

            {(showAll || isBudget) && (
        <div className="space-y-8">
          {!selectedPlan && (
             <div className="space-y-8">
                {budgetPlans.length === 0 ? (
             <div className="text-center py-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
               <p className="text-slate-500 mb-4">No budget plans yet.</p>
               <button onClick={() => setIsBudgetBuilderOpen(true)} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-900 text-white hover:bg-slate-800">Create one</button>
             </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {budgetPlans.map(plan => {
                 const totalSpent = plan.isGrouped 
                    ? (plan.groups || []).reduce((sum: number, g: any) => sum + (g.spent || 0), 0)
                    : (plan.groups?.[0]?.categories || []).reduce((sum: number, c: any) => sum + (c.spent || 0), 0) || 0;
                 const planProgress = (totalSpent / plan.totalLimit) * 100;
                 const planIsWarning = planProgress > 85;
                 const planIsOver = planProgress >= 100;

                 return (
                    <div key={plan.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-emerald-500/50 cursor-pointer transition-all" onClick={() => setSelectedPlan(plan)}>
                      <div className="flex justify-between items-start mb-6">
                         <div>
                            <h3 className="font-bold text-lg">{plan.name}</h3>
                            <p className="text-xs font-bold text-slate-500 mt-1">
                               {plan.type === 'recurring' ? 'Recurring Monthly' : `${new Date(plan.startDate).toLocaleDateString()} - ${new Date(plan.endDate).toLocaleDateString()}`}
                            </p>
                         </div>
                         <div className="text-right">
                            <p className="font-black text-xl">₱{plan.totalLimit.toLocaleString()}</p>
                            <p className="text-xs font-bold text-slate-500 mt-1">{totalSpent > 0 ? `₱${totalSpent.toLocaleString()} spent` : 'No spending yet'}</p>
                         </div>
                      </div>
                      
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${planIsOver ? 'bg-rose-500' : planIsWarning ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(planProgress, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs font-bold text-slate-500 mb-4">
                         <span>{planProgress.toFixed(0)}% Used</span>
                         <span>{plan.isGrouped ? `${plan.groups.length} Groups` : `${plan.groups[0]?.categories.length || 0} Categories`}</span>
                      </div>

                      <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        {plan.isGrouped ? (
                          (plan.groups || []).slice(0, 3).map((g: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="font-bold flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${g.color === 'emerald' ? 'bg-emerald-500' : g.color === 'blue' ? 'bg-blue-500' : g.color === 'violet' ? 'bg-violet-500' : g.color === 'amber' ? 'bg-amber-500' : g.color === 'rose' ? 'bg-rose-500' : 'bg-fuchsia-500'}`} />
                                {g.name}
                              </span>
                              <span className="text-slate-500">{g.categories.length} categories</span>
                            </div>
                          ))
                        ) : (
                          (plan.groups?.[0]?.categories || []).slice(0, 3).map((c: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="font-bold flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${c.color === 'emerald' ? 'bg-emerald-500' : c.color === 'blue' ? 'bg-blue-500' : c.color === 'violet' ? 'bg-violet-500' : c.color === 'amber' ? 'bg-amber-500' : c.color === 'rose' ? 'bg-rose-500' : 'bg-fuchsia-500'}`} />
                                {c.name}
                              </span>
                              <span className="text-slate-500">₱{c.limit.toLocaleString()}</span>
                            </div>
                          ))
                        )}
                        {(plan.isGrouped ? plan.groups.length > 3 : (plan.groups[0]?.categories.length || 0) > 3) && (
                          <div className="text-xs font-bold text-slate-400 text-center mt-2">
                            + {(plan.isGrouped ? plan.groups.length : plan.groups[0]?.categories.length) - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );                })}
              </div>
            )}
            </div>
          )}
            
          {!selectedPlan && (
              <div className="space-y-6 mt-12 pt-12 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">Budget Models</h3>
                  <button onClick={() => { setIsModelBuilderOpen(true); setModelName(''); setModelAllocations([{ id: Date.now(), name: 'Housing', percentage: 30, color: 'emerald', categories: [] }]); }} className="text-sm font-bold text-emerald-500 hover:text-emerald-600 transition-colors bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg">+ New Model</button>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                   {dbPresets.length === 0 && <p className="text-sm text-slate-500 col-span-full">No budget models created yet. Save a budget plan as a preset to create one.</p>}
                   {dbPresets.map(preset => {
                      let allocs = []; try { allocs = JSON.parse(preset.allocations || '[]'); } catch(e) {} if (!Array.isArray(allocs)) allocs = [];
                      return (
                         <div key={preset.id} className={`p-5 rounded-2xl border ${isAdvanced ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex justify-between items-start mb-4">
                               <h4 className="font-bold">{preset.name}</h4>
                               <button onClick={async () => {
                                  if (confirm('Delete this budget model?')) {
                                     await fetch(`/api/budget_presets/${preset.id}`, { method: 'DELETE' });
                                     window.location.reload();
                                  }
                               }} className="text-slate-400 hover:text-rose-500"><X className="w-4 h-4"/></button>
                            </div>
                            <div className="space-y-2">
                               {allocs.map((a: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between text-xs">
                                     <span className="font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                        <div className={`w-2 h-2 rounded-full ${a.color === 'emerald' ? 'bg-emerald-500' : a.color === 'blue' ? 'bg-blue-500' : a.color === 'violet' ? 'bg-violet-500' : a.color === 'amber' ? 'bg-amber-500' : a.color === 'rose' ? 'bg-rose-500' : 'bg-fuchsia-500'}`} />
                                        {a.name}
                                     </span>
                                     <span className="font-bold text-slate-700 dark:text-slate-300">{a.percentage}%</span>
                                  </div>
                               ))}
                            </div>
                         </div>
                      );
                   })}
                </div>
              </div>
            )}
            
            {selectedPlan && (
              <div className={`rounded-3xl shadow-sm border p-6 sm:p-8 ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
                  <div>
                    <button 
                      onClick={() => setSelectedPlan(null)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 flex items-center gap-1 mb-4"
                    >
                      ← Back to Plans
                    </button>
                    <h4 className="text-2xl font-black mb-1">{selectedPlan.name}</h4>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                       {selectedPlan.type === 'recurring' ? (
                         <span className="px-2 py-1 bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400 rounded-lg">Recurring Monthly</span>
                       ) : (
                         <span className="px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 rounded-lg">
                           {new Date(selectedPlan.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(selectedPlan.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                         </span>
                       )}
                       <span className="hidden md:inline px-2 text-slate-300 dark:text-slate-600">•</span>
                       <span className={((selectedPlan.groups.reduce((sum: number, g: any) => sum + g.categories.reduce((s: number, c: any) => s + c.spent, 0), 0) / selectedPlan.totalLimit) * 100) > 100 ? 'text-rose-500' : (((selectedPlan.groups.reduce((sum: number, g: any) => sum + g.categories.reduce((s: number, c: any) => s + c.spent, 0), 0) / selectedPlan.totalLimit) * 100) > 85 ? 'text-amber-500' : '')}>
                         {((selectedPlan.groups.reduce((sum: number, g: any) => sum + g.categories.reduce((s: number, c: any) => s + c.spent, 0), 0) / selectedPlan.totalLimit) * 100).toFixed(0)}% Used (₱{selectedPlan.groups.reduce((sum: number, g: any) => sum + g.categories.reduce((s: number, c: any) => s + c.spent, 0), 0).toLocaleString()} of ₱{selectedPlan.totalLimit.toLocaleString()})
                       </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-8 mt-8">
                  {selectedPlan.groups.map((group: any) => {
                     const groupSpent = group.categories.reduce((s: number, c: any) => s + c.spent, 0);
                     const groupProgress = (groupSpent / group.limit) * 100;
                     const groupIsOver = groupProgress > 100;

                     return (
                       <div key={group.id} className="space-y-4">
                         {selectedPlan.isGrouped && (
                           <div className="flex justify-between items-end border-b pb-2 border-slate-100 dark:border-slate-800">
                             <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  group.color === 'emerald' ? 'bg-emerald-500' :
                                  group.color === 'blue' ? 'bg-blue-500' :
                                  group.color === 'violet' ? 'bg-violet-500' :
                                  group.color === 'amber' ? 'bg-amber-500' :
                                  group.color === 'rose' ? 'bg-rose-500' : 'bg-fuchsia-500'
                                }`}></div>
                                <h4 className="font-bold text-lg">{group.name}</h4>
                             </div>
                             <div className="text-sm">
                                <span className={`font-bold ${groupIsOver ? 'text-rose-500' : ''}`}>₱{groupSpent.toLocaleString()}</span>
                                <span className="text-slate-500"> / ₱{group.limit.toLocaleString()}</span>
                             </div>
                           </div>
                         )}

                         {group.categories.length > 0 ? (
                           <div className={selectedPlan.isGrouped ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6" : "grid md:grid-cols-2 gap-4"}>
                             {group.categories.map((budget: any, i: number) => {
                               const progress = (budget.spent / budget.limit) * 100;
                               const isOver = progress > 100;
                               const isWarning = progress > 85 && !isOver;
                               const budgetLeft = Math.max(0, budget.limit - budget.spent);
                               const dailyBudgetLeft = budgetLeft / daysLeft;
                               
                               return selectedPlan.isGrouped ? (
                                 <div 
                                   key={i} 
                                   onClick={() => setSelectedBudget(budget)}
                                   className={`cursor-pointer rounded-3xl p-6 shadow-sm border relative overflow-hidden group-card transition-all hover:-translate-y-1 hover:shadow-md ${isAdvanced ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                                 >
                                   <div className="flex justify-between text-sm mb-2 relative z-10">
                                     <span className="font-bold flex items-center gap-2">
                                       {budget.name}
                                       {isOver && <AlertCircle className="w-4 h-4 text-rose-500" />}
                                     </span>
                                     <span className={`font-bold ${isOver ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-slate-500'}`}>
                                       {progress.toFixed(0)}%
                                     </span>
                                   </div>
                                   <h4 className="text-2xl font-bold mb-1 relative z-10">₱{budget.spent.toLocaleString()}</h4>
                                   <p className="text-sm font-medium text-slate-500 mb-4 relative z-10">of ₱{budget.limit.toLocaleString()} limit</p>
                                   
                                   <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-4 relative z-10">
                                     <div 
                                       className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : (
                                         budget.color === 'emerald' ? 'bg-emerald-500' :
                                         budget.color === 'blue' ? 'bg-blue-500' :
                                         budget.color === 'violet' ? 'bg-violet-500' :
                                         budget.color === 'amber' ? 'bg-amber-500' :
                                         budget.color === 'rose' ? 'bg-rose-500' : 'bg-fuchsia-500'
                                       )}`}
                                       style={{ width: `${Math.min(progress, 100)}%` }}
                                     />
                                   </div>
                                   
                                   <div className={`p-3 rounded-2xl flex justify-between items-center text-xs font-bold relative z-10 ${isAdvanced ? 'bg-slate-800/50' : 'bg-white'}`}>
                                      <span className="text-slate-500">Suggested Daily</span>
                                      <span className={dailyBudgetLeft < 100 ? 'text-rose-500' : 'text-emerald-500 dark:text-emerald-400'}>
                                         ₱{dailyBudgetLeft.toLocaleString(undefined, { maximumFractionDigits: 0 })} / day
                                      </span>
                                   </div>
                                 </div>
                               ) : (
                                 <div 
                                   key={i} 
                                   onClick={() => setSelectedBudget(budget)}
                                   className={`cursor-pointer rounded-2xl p-4 shadow-sm border relative overflow-hidden flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-md ${isAdvanced ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
                                 >
                                   <div className="flex items-center justify-between mb-4">
                                     <div className="flex items-center gap-3">
                                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                         budget.color === 'emerald' ? (isAdvanced ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600') :
                                         budget.color === 'blue' ? (isAdvanced ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600') :
                                         budget.color === 'violet' ? (isAdvanced ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600') :
                                         budget.color === 'amber' ? (isAdvanced ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600') :
                                         budget.color === 'rose' ? (isAdvanced ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-600') :
                                         (isAdvanced ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'bg-fuchsia-100 text-fuchsia-600')
                                       }`}>
                                         <div className={`w-2.5 h-2.5 rounded-full ${
                                           budget.color === 'emerald' ? 'bg-emerald-500' :
                                           budget.color === 'blue' ? 'bg-blue-500' :
                                           budget.color === 'violet' ? 'bg-violet-500' :
                                           budget.color === 'amber' ? 'bg-amber-500' :
                                           budget.color === 'rose' ? 'bg-rose-500' : 'bg-fuchsia-500'
                                         }`} />
                                       </div>
                                       <div>
                                         <div className="font-bold flex items-center gap-2">
                                           {budget.name}
                                           {isOver && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                                         </div>
                                         <div className="text-xs font-bold text-slate-500">Suggested ₱{dailyBudgetLeft.toLocaleString(undefined, { maximumFractionDigits: 0 })} / day</div>
                                       </div>
                                     </div>
                                     <div className="text-right">
                                       <div className={`font-black text-lg ${isOver ? 'text-rose-500' : ''}`}>₱{budget.spent.toLocaleString()}</div>
                                       <div className="text-xs font-bold text-slate-500">of ₱{budget.limit.toLocaleString()}</div>
                                     </div>
                                   </div>

                                   <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                                     <div 
                                       className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : (
                                         budget.color === 'emerald' ? 'bg-emerald-500' :
                                         budget.color === 'blue' ? 'bg-blue-500' :
                                         budget.color === 'violet' ? 'bg-violet-500' :
                                         budget.color === 'amber' ? 'bg-amber-500' :
                                         budget.color === 'rose' ? 'bg-rose-500' : 'bg-fuchsia-500'
                                       )}`}
                                       style={{ width: `${Math.min(progress, 100)}%` }}
                                     />
                                   </div>
                                 </div>
                               );
                             })}
                           </div>
                         ) : (
                           <div className="p-6 text-center border-2 border-dashed rounded-3xl text-sm font-bold text-slate-500 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-500 transition-colors cursor-pointer">
                             + Add {selectedPlan.isGrouped ? `Categories to ${group.name}` : 'Category'}
                           </div>
                         )}
                       </div>
                     );
                  })}
                </div>
              </div>
            )}
        </div>
      )}

      {(showAll || isGoals) && (
        <div className="space-y-4 mt-8">
          <h3 className="font-bold text-lg flex items-center">
            <Target className="w-5 h-5 mr-2" /> Financial Goals
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.length === 0 ? (
              <div className={`col-span-full flex flex-col items-center justify-center p-12 text-center rounded-3xl border-2 border-dashed ${isAdvanced ? 'border-slate-700 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isAdvanced ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-400 shadow-sm'}`}>
                  <Target className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">No Goals Yet</h3>
                <p className="text-slate-500 mb-6 max-w-sm">Start saving for your dreams by creating a new financial goal.</p>
                <button 
                  onClick={() => setIsGoalModalOpen(true)}
                  className={`px-6 py-3 rounded-xl font-bold shadow-sm transition-transform hover:scale-105 ${isAdvanced ? 'bg-violet-600 text-white' : 'bg-slate-900 text-white'}`}
                >
                  Create Goal
                </button>
              </div>
            ) : goals.map((goal, i) => {
              const progress = Math.min((goal.saved / goal.target) * 100, 100);
              const targetDate = new Date(goal.date);
              const monthsLeft = getMonthsBetween(now, targetDate);
              const daysLeft = getDaysBetween(now, targetDate);
              const amountLeft = Math.max(0, goal.target - goal.saved);
              const monthlyNeeded = amountLeft / monthsLeft;
              const dailyNeeded = amountLeft / daysLeft;
              const isCompleted = progress >= 100;
              
              return (
                <div 
                  key={i} 
                  onClick={() => setSelectedGoal(goal)}
                  className={`cursor-pointer rounded-3xl p-6 shadow-sm border relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-md ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}
                >
                  {isCompleted && (
                     <div className="absolute top-0 right-0 p-4">
                       <CheckCircle2 className="w-8 h-8 text-emerald-500 drop-shadow-sm" />
                     </div>
                  )}
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${isCompleted ? 'bg-emerald-500' : isAdvanced ? 'bg-violet-600 shadow-violet-900/30' : 'bg-slate-900 shadow-slate-200'}`}>
                      {getIcon(goal.icon)}
                    </div>
                    {!isCompleted && (
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Target Date</span>
                        <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg flex items-center gap-1.5">
                          <CalendarIcon className="w-3 h-3" />
                          {targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 block mt-1">{daysLeft} days left</span>
                      </div>
                    )}
                  </div>
                  
                  <p className="font-bold text-lg relative z-10">{goal.name}</p>
                  
                  <div className="flex items-end gap-2 mt-1 mb-4 relative z-10">
                    <p className={`text-3xl font-black ${isCompleted ? 'text-emerald-500' : ''}`}>₱{goal.saved.toLocaleString()}</p>
                    <p className="text-sm font-medium text-slate-500 mb-1">/ ₱{goal.target.toLocaleString()}</p>
                  </div>
                  
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full mb-2 overflow-hidden relative z-10">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : isAdvanced ? 'bg-violet-500' : 'bg-slate-900'}`} 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-5 relative z-10">
                    <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => setSavingViewMode('monthly')}
                        className={`px-2 py-1 rounded-md transition-colors ${savingViewMode === 'monthly' ? (isAdvanced ? 'bg-slate-600 text-white' : 'bg-white text-slate-900 shadow-sm') : ''}`}
                      >Monthly</button>
                      <button 
                        onClick={() => setSavingViewMode('daily')}
                        className={`px-2 py-1 rounded-md transition-colors ${savingViewMode === 'daily' ? (isAdvanced ? 'bg-slate-600 text-white' : 'bg-white text-slate-900 shadow-sm') : ''}`}
                      >Daily</button>
                    </div>
                    <span>{progress.toFixed(1)}% Complete</span>
                  </div>

                  {!isCompleted && (
                    <div className={`p-3.5 rounded-2xl flex items-start gap-3 relative z-10 ${isAdvanced ? 'bg-slate-900/50 border border-slate-700/50' : 'bg-slate-50 border border-slate-100'}`}>
                      <div className={`p-1.5 rounded-xl ${isAdvanced ? 'bg-slate-800' : 'bg-white'}`}>
                        <TrendingUp className="w-4 h-4 text-violet-500" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 mb-0.5">{savingViewMode === 'monthly' ? 'Monthly Target' : 'Daily Target'}</p>
                        <p className="text-sm font-bold">₱{(savingViewMode === 'monthly' ? monthlyNeeded : dailyNeeded).toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs font-medium text-slate-400 ml-1">/ {savingViewMode === 'monthly' ? `mo for ${monthsLeft} mos` : `day for ${daysLeft} days`}</span></p>
                      </div>
                    </div>
                  )}
                  {isCompleted && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2 font-bold text-sm relative z-10 border border-emerald-100 dark:border-emerald-500/20">
                      Goal Achieved! 🎉
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsGoalModalOpen(false)}>
          <div 
            className={`w-full max-w-md rounded-3xl shadow-xl flex flex-col p-6 overflow-y-auto max-h-[90vh] custom-scrollbar ${isAdvanced ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-white border border-slate-100'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Create New Goal</h3>
              <button onClick={() => setIsGoalModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Goal Name</label>
                  <input 
                    type="text" 
                    value={newGoal.name}
                    onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none font-medium ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-slate-400'}`} 
                    placeholder="e.g. Dream Car" 
                  />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Target Amount ($)</label>
                    <input 
                      type="number" 
                      value={newGoal.target}
                      onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none font-medium ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-slate-400'}`} 
                      placeholder="0" 
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Target Date</label>
                    <input 
                      type="date" 
                      value={newGoal.date}
                      onChange={(e) => setNewGoal({ ...newGoal, date: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none font-medium ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-slate-400'}`} 
                    />
                 </div>
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Color</label>
                  <div className="flex gap-2">
                    {['emerald', 'blue', 'violet', 'amber', 'rose', 'fuchsia'].map(color => (
                      <button
                        key={color}
                        onClick={() => setNewGoal({ ...newGoal, color })}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          color === 'emerald' ? 'bg-emerald-500' :
                          color === 'blue' ? 'bg-blue-500' :
                          color === 'violet' ? 'bg-violet-500' :
                          color === 'amber' ? 'bg-amber-500' :
                          color === 'rose' ? 'bg-rose-500' : 'bg-fuchsia-500'
                        } ${newGoal.color === color ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-500 scale-110' : 'hover:scale-110'}`}
                      />
                    ))}
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Icon</label>
                  <div className="flex gap-3">
                    {['Target', 'Plane', 'Laptop', 'ShieldAlert', 'Car', 'Home'].map(icon => (
                      <button
                        key={icon}
                        onClick={() => setNewGoal({ ...newGoal, icon })}
                        className={`p-3 rounded-xl transition-all ${newGoal.icon === icon ? (isAdvanced ? 'bg-violet-600 text-white' : 'bg-slate-900 text-white') : (isAdvanced ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-50 text-slate-500 hover:text-slate-900')}`}
                      >
                        {getIcon(icon)}
                      </button>
                    ))}
                  </div>
               </div>
            </div>

            <button 
              onClick={handleAddGoal}
              disabled={!newGoal.name || !newGoal.target || !newGoal.date}
              className={`w-full mt-8 py-4 rounded-xl font-bold transition-all shadow-lg ${
                (!newGoal.name || !newGoal.target || !newGoal.date) 
                ? 'opacity-50 cursor-not-allowed bg-slate-300 text-slate-500 dark:bg-slate-700 dark:text-slate-400' 
                : (isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-900/20 hover:scale-105' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm hover:scale-105')
              }`}
            >
              Start Saving
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
