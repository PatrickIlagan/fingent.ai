import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { CreditCard, Landmark, Wallet, Banknote, Plus, Minus, X, Edit2, Trash2, History, ArrowUpRight, ArrowDownRight, Calendar, FileText, Check } from 'lucide-react';

const getIconForType = (type: string) => {
  if (type.toLowerCase() === 'card' || type.toLowerCase() === 'credit') return CreditCard;
  if (type.toLowerCase() === 'digital' || type.toLowerCase() === 'wallet') return Wallet;
  if (type.toLowerCase() === 'cash') return Banknote;
  return Landmark;
};

const getColorForType = (type: string) => {
  if (type.toLowerCase() === 'card' || type.toLowerCase() === 'credit') return 'from-slate-700 to-slate-800';
  if (type.toLowerCase() === 'digital' || type.toLowerCase() === 'wallet') return 'from-blue-400 to-blue-500';
  if (type.toLowerCase() === 'bank') return 'from-emerald-500 to-emerald-600';
  return 'from-violet-500 to-violet-600';
};

export function Accounts({ category, onNavigate }: { category?: string, onNavigate?: (tab: string) => void }) {
  const { themeMode, triggerRefresh, shouldRefresh } = useStore();
  const isAdvanced = themeMode === 'advanced';

  const [accountsData, setAccountsData] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [txAccount, setTxAccount] = useState<any | null>(null);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [newTx, setNewTx] = useState({ type: 'expense', title: '', amount: '', date: '', notes: '', category: 'Expenses', goalId: '' });
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [newAccount, setNewAccount] = useState<any>({ name: '', type: 'Bank', balance: '', color: '', purpose: '', credit_limit: '', interest_rate_pa: '' });
  
  const colorOptions = [
    { value: 'from-blue-400 to-blue-500', name: 'Blue' },
    { value: 'from-emerald-500 to-emerald-600', name: 'Emerald' },
    { value: 'from-rose-500 to-rose-600', name: 'Rose' },
    { value: 'from-violet-500 to-violet-600', name: 'Violet' },
    { value: 'from-amber-400 to-amber-500', name: 'Amber' },
    { value: 'from-slate-700 to-slate-800', name: 'Slate' }
  ];

  
  const handleAccrueInterest = async () => {
    try {
      await fetch('/api/accounts/accrue-interest', { method: 'POST' });
      triggerRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  
  const handleAddAccount = async () => {
    if (!newAccount.name || !newAccount.balance) return;
    try {
      if (editingAccount) {
        await fetch('/api/accounts/' + editingAccount.id, {
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
        });
      } else {
        await fetch('/api/accounts', {
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
        });
      }
      triggerRefresh();
      setIsAddAccountModalOpen(false);
      setNewAccount({ name: '', type: 'Bank', balance: '', color: '', purpose: '', credit_limit: '', interest_rate_pa: '', statement_date: '', due_date: '' }); setEditingAccount(null);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [accRes, txRes, goalsRes, categoriesRes] = await Promise.all([
          fetch('/api/accounts').then(res => res.json()).catch(() => []),
          fetch('/api/transactions').then(res => res.json()).catch(() => []),
          fetch('/api/goals').then(res => res.json()).catch(() => []),
          fetch('/api/categories').then(res => res.json()).catch(() => [])
        ]);
        
        const accountsList = Array.isArray(accRes) ? accRes : [];
        const transactionsList = Array.isArray(txRes) ? txRes : [];
        
        // Map db properties to frontend properties
        const mappedAccounts = accountsList.map((a: any) => ({
          ...a,
          icon: getIconForType(a.type),
          color: a.color || getColorForType(a.type),
          purpose: a.purpose || '',
          transactions: transactionsList.filter((t: any) => t.account_id === a.id).map((t: any) => ({
            ...t,
            title: t.description || t.category
          }))
        }));
        
        setAccountsData(mappedAccounts);
        setGoals(goalsRes || []);
        setCategories(Array.isArray(categoriesRes) ? categoriesRes : []);
        
        setSelectedAccount((currentSelected: any) => {
           if (!currentSelected) return null;
           const updatedSelected = mappedAccounts.find((a: any) => a.id === currentSelected.id);
           return updatedSelected || currentSelected;
        });

      } catch (err) {
        console.error("Failed to fetch accounts:", err);
      }
    }
    fetchData();
  }, [shouldRefresh]);

  const handleOpenTransactionModal = (acc: any, type: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTxAccount(acc);
    setNewTx(prev => ({ ...prev, type, date: new Date().toISOString().split('T')[0] }));
    setIsTransactionModalOpen(true);
  };

  const handleDeleteAccount = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedAccount) return;
    if (!confirm('Are you sure you want to delete this account?')) return;
    try {
      await fetch('/api/accounts/' + selectedAccount.id, { method: 'DELETE' });
      triggerRefresh();
      setSelectedAccount(null);
    } catch(e) { console.error(e) }
  };

  const handleAddTransaction = async () => {
    if (!txAccount || !newTx.title || !newTx.amount) return;
    
    try {
      const amount = parseFloat(newTx.amount);
      
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: txAccount.id,
          type: newTx.type,
          amount,
          category: newTx.category,
          description: newTx.title,
          date: newTx.date || new Date().toISOString().split('T')[0]
        })
      });
      
      if (newTx.type === 'income' && newTx.goalId) {
        const goal = goals.find(g => g.id.toString() === newTx.goalId);
        if (goal) {
          const newTransaction = {
            id: Date.now(),
            amount,
            date: newTx.date || new Date().toISOString().split('T')[0],
            account: txAccount.name,
            type: 'deposit'
          };
          
          let sources = goal.sources || [];
          const existingSourceIndex = sources.findIndex((s: any) => s.name === txAccount.name);
          if (existingSourceIndex >= 0) {
            sources[existingSourceIndex].amount += amount;
          } else {
            sources.push({ name: txAccount.name, amount });
          }

          await fetch(`/api/goals/${goal.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...goal,
              saved: goal.saved + amount,
              sources,
              transactions: [newTransaction, ...(goal.transactions || [])]
            })
          });
        }
      }

      triggerRefresh();
      
      setIsTransactionModalOpen(false);
      setNewTx({ type: 'expense', title: '', amount: '', date: '', notes: '', category: 'Expenses', goalId: '' });
    } catch (err) {
      console.error("Failed to add transaction:", err);
    }
  };

  const filteredAccounts = category 
    ? accountsData.filter(a => {
        const t = a.type.toLowerCase();
        const c = category.toLowerCase();
        if (c === 'card') return t === 'card' || t === 'credit';
        if (c === 'digital') return t === 'digital' || t === 'wallet';
        if (c === 'cash') return t === 'cash';
        return t === c;
      })
    : accountsData.filter(a => a.type !== 'Investments');

  const totalBalance = filteredAccounts.reduce((acc, curr) => acc + curr.balance, 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const totalIncome30d = filteredAccounts.reduce((acc, curr) => {
    return acc + (curr.transactions || []).filter((t: any) => t.type === 'income' && new Date(t.date) >= thirtyDaysAgo).reduce((s: number, t: any) => s + t.amount, 0);
  }, 0);

  const totalExpenses30d = filteredAccounts.reduce((acc, curr) => {
    return acc + (curr.transactions || []).filter((t: any) => t.type === 'expense' && new Date(t.date) >= thirtyDaysAgo).reduce((s: number, t: any) => s + t.amount, 0);
  }, 0);

  if (selectedAccount) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => setSelectedAccount(null)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isAdvanced ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-sm'}`}
          >
            <ArrowUpRight className="w-4 h-4 rotate-[-135deg]" /> Back
          </button>
          <div className="flex gap-2">
            <button onClick={() => {
              setEditingAccount(selectedAccount);
              setNewAccount({
                name: selectedAccount.name,
                type: selectedAccount.type,
                balance: selectedAccount.balance.toString(),
                color: selectedAccount.color || '',
                purpose: selectedAccount.purpose || '',
                credit_limit: selectedAccount.credit_limit ? selectedAccount.credit_limit.toString() : '',
                interest_rate_pa: selectedAccount.interest_rate_pa ? (selectedAccount.interest_rate_pa * 100).toString() : '',
                statement_date: selectedAccount.statement_date ? selectedAccount.statement_date.toString() : '',
                due_date: selectedAccount.due_date ? selectedAccount.due_date.toString() : ''
              });
              setIsAddAccountModalOpen(true);
            }} className={`p-2.5 rounded-xl transition-colors ${isAdvanced ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 shadow-sm'}`}><Edit2 size={18} /></button>
            <button onClick={handleDeleteAccount} className={`p-2.5 rounded-xl transition-colors ${isAdvanced ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400' : 'bg-rose-50 hover:bg-rose-100 text-rose-500 border border-rose-100 shadow-sm'}`}><Trash2 size={18} /></button>
          </div>
        </div>

        {/* Header Details */}
        <div className={`rounded-3xl p-6 sm:p-8 shadow-sm border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-5">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br ${selectedAccount.color} flex items-center justify-center text-white shadow-lg`}>
              <selectedAccount.icon className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">{selectedAccount.name}</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">{selectedAccount.type} Account</p>
            </div>
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Current Balance</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">₱{Math.abs(selectedAccount.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h1>
          </div>
        </div>

        {selectedAccount?.type === 'Card' && (
          <div className={`rounded-3xl p-6 sm:p-8 shadow-sm border grid grid-cols-1 sm:grid-cols-3 gap-6 ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
             <div>
               <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                 <FileText size={18} /> <span className="text-sm font-medium uppercase tracking-wider">Statement Bal.</span>
               </div>
               <p className="font-bold text-2xl">₱{selectedAccount.statementBalance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0'}</p>
             </div>
             <div>
               <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                 <Calendar size={18} /> <span className="text-sm font-medium uppercase tracking-wider">Due Date</span>
               </div>
               <p className="font-bold text-2xl">{selectedAccount.dueDate}</p>
             </div>
             <div>
               <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                 <CreditCard size={18} /> <span className="text-sm font-medium uppercase tracking-wider">Credit Limit</span>
               </div>
               <p className="font-bold text-2xl">₱{selectedAccount.limit?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
               <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full mt-3 overflow-hidden">
                 <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(Math.abs(selectedAccount.balance) / (selectedAccount.limit || 1)) * 100}%` }} />
               </div>
             </div>
          </div>
        )}

        {/* Transactions */}
        <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2"><History size={20} /> Transaction History</h3>
            <button 
              onClick={() => setIsTransactionModalOpen(true)}
              className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
            >
              + Add Transaction
            </button>
          </div>
          
          <div className="space-y-6">
            {selectedAccount.transactions && selectedAccount.transactions.length > 0 ? (
              Object.entries(
                selectedAccount.transactions.reduce((acc: any, tx: any) => {
                  const date = tx.date;
                  if (!acc[date]) acc[date] = [];
                  acc[date].push(tx);
                  return acc;
                }, {})
              ).map(([date, txs]: [string, any]) => (
                <div key={date} className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider sticky top-0 bg-transparent py-1 backdrop-blur-sm z-10">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h4>
                  <div className={`rounded-3xl border overflow-hidden ${isAdvanced ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                    {txs.map((tx: any, idx: number) => (
                      <div key={tx.id} className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${idx !== txs.length - 1 ? (isAdvanced ? 'border-b border-slate-800' : 'border-b border-slate-100') : ''}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${tx.type === 'income' ? (isAdvanced ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600') : (isAdvanced ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>
                            {tx.type === 'income' ? <ArrowDownRight size={22} strokeWidth={2.5} /> : <ArrowUpRight size={22} strokeWidth={2.5} />}
                          </div>
                          <div>
                            <p className="font-bold text-base sm:text-lg">{tx.title}</p>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                              {tx.category && (
                                <span className={`px-2 py-0.5 rounded-md font-medium text-[10px] uppercase tracking-wider ${isAdvanced ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                  {tx.category}
                                </span>
                              )}
                              {tx.notes && <span className="italic line-clamp-1">{tx.notes}</span>}
                            </div>
                          </div>
                        </div>
                        <span className={`font-black text-lg ${tx.type === 'income' ? 'text-emerald-500 dark:text-emerald-400' : ''}`}>
                          {tx.type === 'income' ? '+' : '-'}₱{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-slate-500 border border-dashed rounded-3xl dark:border-slate-700 flex flex-col items-center justify-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isAdvanced ? 'bg-slate-900 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                  <History size={32} />
                </div>
                <p className="font-medium">No recent transactions</p>
                <p className="text-sm mt-1">Add your first transaction to track your spending.</p>
              </div>
            )}
          </div>
        </div>

        

      
    </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold capitalize">{category ? `${category} Accounts` : 'All Accounts'}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your connected financial accounts</p>
        </div>
        <div className="flex gap-2">
        <button onClick={handleAccrueInterest} className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 border transition-colors ${isAdvanced ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
             Simulate Next Day (Accrue Interest)
        </button>
        <button onClick={() => { setEditingAccount(null); setNewAccount({ name: '', type: 'Bank', balance: '', color: '', purpose: '', credit_limit: '', interest_rate_pa: '', statement_date: '', due_date: '' }); setIsAddAccountModalOpen(true); }} className={`px-4 py-2.5 rounded-xl font-bold text-sm ${isAdvanced ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
          + Add Account
        </button>
        </div>
      </div>

      <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <div className="flex flex-col sm:flex-row justify-between gap-6 sm:gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total {category ? category : 'Liquid'} Balance</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-emerald-500">₱{totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h1>
            <p className="text-xs font-medium text-slate-400 mt-2">Available across {filteredAccounts.length} accounts</p>
          </div>
          
          {!category && (
            <div className="flex gap-4 sm:border-l sm:pl-6 border-slate-100 dark:border-slate-700">
               <div>
                 <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><ArrowDownRight size={14} className="text-emerald-500" /> Income (30d)</p>
                 <p className="text-xl font-bold">₱{totalIncome30d.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
               </div>
               <div>
                 <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><ArrowUpRight size={14} className="text-rose-500" /> Expenses (30d)</p>
                 <p className="text-xl font-bold">₱{totalExpenses30d.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
               </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAccounts.map(acc => {
          const Icon = acc.icon;
          return (
            <div 
              key={acc.id} 
              onClick={() => setSelectedAccount(acc)}
              className={`cursor-pointer rounded-3xl p-5 shadow-sm border transition-transform hover:-translate-y-1 ${isAdvanced ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-100 hover:border-emerald-200'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${acc.color} flex items-center justify-center text-white shadow-md`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg uppercase tracking-wider">
                  {acc.type}
                </span>
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{acc.name}</p>
                {acc.purpose && <p className="text-xs text-slate-400 dark:text-slate-500">{acc.purpose}</p>}
              </div>
              
              <div className="flex items-end justify-between mt-1">
                <div className="flex flex-col">
                  <p className="text-2xl font-bold tracking-tight">₱{Math.abs(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  {acc.interest_rate_pa > 0 && (
                    <p className="text-xs font-bold text-emerald-500 mt-1">
                      {(acc.interest_rate_pa * 100).toFixed(2)}% p.a.
                    </p>
                  )}
                </div>
                
                  <div className="flex gap-1.5">
                    <button onClick={(e) => handleOpenTransactionModal(acc, 'expense', e)} className={`p-1.5 rounded-lg transition-colors ${isAdvanced ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}><Minus size={14} strokeWidth={3} /></button>
                    <button onClick={(e) => handleOpenTransactionModal(acc, 'income', e)} className={`p-1.5 rounded-lg transition-colors ${isAdvanced ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}><Plus size={14} strokeWidth={3} /></button>
                  </div>
              </div>

              {acc.type === 'Card' && (acc.statement_date || acc.due_date) && (() => {
                 let stmtDay = acc.statement_date ? acc.statement_date.toString() : '';
                 if (stmtDay.includes('-')) stmtDay = stmtDay.split('-')[2];
                 
                 let txAfter = 0;
                 if (stmtDay) {
                    const currentDate = new Date();
                    const stmtDateObj = new Date(`${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${stmtDay.padStart(2, '0')}`);
                    (acc.transactions || []).forEach((tx: any) => {
                       if (new Date(tx.date) > stmtDateObj) {
                          txAfter += (tx.type === 'income' ? tx.amount : -tx.amount);
                       }
                    });
                 }
                 const balanceAsOfStmt = acc.balance - txAfter;
                 const amountOwed = balanceAsOfStmt < 0 ? Math.abs(balanceAsOfStmt) : 0;
                 
                 return (
                   <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-xs">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-500 font-medium">Statement Balance</span>
                        <span className="font-bold text-rose-500">₱{amountOwed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                     </div>
                     {acc.due_date && (
                        <div className="flex justify-between items-center">
                           <span className="text-slate-500">Due Date</span>
                           <span className="font-medium">{acc.due_date}</span>
                        </div>
                     )}
                     {acc.statement_date && (
                        <div className="flex justify-between items-center mt-1">
                           <span className="text-slate-500">Next Statement</span>
                           <span className="font-medium">{acc.statement_date}</span>
                        </div>
                     )}
                   </div>
                 );
              })()}
              {acc.credit_limit && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500">Credit Limit</span>
                    <span className="font-medium">
                      ₱{acc.credit_limit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-rose-500 ml-1 font-bold">({((Math.abs(acc.balance) / acc.credit_limit) * 100).toFixed(0)}% used)</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(Math.abs(acc.balance) / acc.credit_limit) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    
      {/* Add Account Modal */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => { setIsAddAccountModalOpen(false); setEditingAccount(null); setNewAccount({ name: '', type: 'Bank', balance: '', color: '', purpose: '', credit_limit: '', interest_rate_pa: '', statement_date: '', due_date: '' }); }}>
          <div 
            className={`w-full max-w-md rounded-3xl shadow-xl flex flex-col p-6 ${isAdvanced ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-white border border-slate-100'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editingAccount ? 'Edit Account' : 'Add Account'}</h3>
              <button onClick={() => { setIsAddAccountModalOpen(false); setEditingAccount(null); setNewAccount({ name: '', type: 'Bank', balance: '', color: '', purpose: '', credit_limit: '', interest_rate_pa: '', statement_date: '', due_date: '' }); }} className={`p-2 rounded-full ${isAdvanced ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Account Name</label>
                <input 
                  type="text"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                  placeholder="e.g. BPI Savings"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Type</label>
                  <select 
                    value={newAccount.type}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, type: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors appearance-none ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                  >
                    <option value="Bank">Bank</option>
                    <option value="Digital">Digital Wallet</option>
                    <option value="Card">Credit Card</option>
                    <option value="Cash">Cash on Hand</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Initial Balance</label>
                  <input 
                    type="number" 
                    value={newAccount.balance}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, balance: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Purpose (Optional)</label>
                <input 
                  type="text"
                  value={newAccount.purpose}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, purpose: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                  placeholder="e.g. Savings, Emergency Fund, Checking"
                />
              </div>
              {newAccount.type === 'Card' && (
                <div className="space-y-4">
                   <div>
                     <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Credit Limit</label>
                     <input 
                       type="number"
                       value={newAccount.credit_limit}
                       onChange={(e) => setNewAccount(prev => ({ ...prev, credit_limit: e.target.value }))}
                       className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                       placeholder="e.g. 50000"
                     />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Statement Date</label>
                        <input 
                          type="date"
                          value={newAccount.statement_date}
                          onChange={(e) => setNewAccount(prev => ({ ...prev, statement_date: e.target.value }))}
                          className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Due Date</label>
                        <input 
                          type="date"
                          value={newAccount.due_date}
                          onChange={(e) => setNewAccount(prev => ({ ...prev, due_date: e.target.value }))}
                          className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                        />
                      </div>
                   </div>
                </div>
              )}
              
              {(newAccount.type === 'Bank' || newAccount.type === 'Digital') && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Interest Rate (PA %)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={newAccount.interest_rate_pa}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, interest_rate_pa: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                    placeholder="e.g. 4.5 for 4.5% PA"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Account Color</label>
                <div className="flex gap-3">
                  {colorOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setNewAccount(prev => ({ ...prev, color: option.value }))}
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${option.value} flex items-center justify-center transition-transform hover:scale-110 ${newAccount.color === option.value ? 'ring-2 ring-offset-2 ring-emerald-500 dark:ring-offset-slate-800' : ''}`}
                    >
                      {newAccount.color === option.value && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
              
              <button 
                onClick={handleAddAccount}
                disabled={!newAccount.name || !newAccount.balance}
                className={`w-full py-4 rounded-xl font-bold mt-2 disabled:opacity-50 transition-colors ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
              >
                {editingAccount ? 'Save Changes' : 'Add Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
        {isTransactionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsTransactionModalOpen(false)}>
            <div 
              className={`w-full max-w-md rounded-3xl shadow-xl flex flex-col p-6 ${isAdvanced ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-white border border-slate-100'}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">New Transaction</h3>
                <button onClick={() => setIsTransactionModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div className="flex rounded-xl overflow-hidden border dark:border-slate-700">
                  <button 
                    onClick={() => setNewTx(prev => ({ ...prev, type: 'expense', category: prev.category === 'Income' ? 'Expenses' : prev.category }))}
                    className={`flex-1 py-2 font-medium text-sm transition-colors ${newTx.type === 'expense' ? (isAdvanced ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-600') : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    Expense
                  </button>
                  <button 
                    onClick={() => setNewTx(prev => ({ ...prev, type: 'income', category: prev.category === 'Expenses' ? 'Income' : prev.category }))}
                    className={`flex-1 py-2 font-medium text-sm transition-colors ${newTx.type === 'income' ? (isAdvanced ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    Income
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₱</span>
                    <input 
                      type="number" 
                      value={newTx.amount} 
                      onChange={(e) => setNewTx(prev => ({ ...prev, amount: e.target.value }))}
                      className={`w-full pl-8 pr-4 py-3 rounded-xl font-bold text-lg outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Title / Merchant</label>
                  <input 
                    type="text" 
                    value={newTx.title}
                    onChange={(e) => setNewTx(prev => ({ ...prev, title: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                    placeholder="e.g., Groceries, Salary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Date</label>
                    <input 
                      type="date" 
                      value={newTx.date}
                      onChange={(e) => setNewTx(prev => ({ ...prev, date: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Category</label>
                    <input
                      list="personal-category-options"
                      value={newTx.category}
                      onChange={(e) => setNewTx(prev => ({ ...prev, category: e.target.value }))}
                      placeholder={newTx.type === 'income' ? 'e.g. Salary, Freelance' : 'e.g. Groceries, Transport'}
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                    />
                    <datalist id="personal-category-options">
                      {categories.filter(category => category.type === newTx.type || category.type === 'both').map(category => <option key={category.id} value={category.name} />)}
                    </datalist>
                    <p className="mt-1 text-[11px] text-slate-500">Type a new category to save it automatically for future transactions.</p>
                  </div>
                </div>

                {newTx.type === 'income' && goals.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Contribute to Goal (Optional)</label>
                    <select 
                      value={newTx.goalId || ''}
                      onChange={(e) => setNewTx(prev => ({ ...prev, goalId: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors appearance-none ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                    >
                      <option value="">None</option>
                      {goals.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Notes (Optional)</label>
                  <textarea 
                    value={newTx.notes}
                    onChange={(e) => setNewTx(prev => ({ ...prev, notes: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors resize-none h-20 ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                    placeholder="Add a note..."
                  />
                </div>

                <button 
                  onClick={handleAddTransaction}
                  disabled={!newTx.title || !newTx.amount}
                  className={`w-full py-4 rounded-xl font-bold mt-2 disabled:opacity-50 transition-colors ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                >
                  Save Transaction
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
