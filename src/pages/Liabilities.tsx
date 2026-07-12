import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';

import { Receipt, CreditCard, ShoppingBag, Home, Zap, X, RefreshCw, Landmark, ArrowUpRight, ArrowRight, CheckCircle2, History, Download, FileText } from 'lucide-react';
import { exportCsv, exportPdf } from '../lib/export';

export function Liabilities({ category, onNavigate }: { category?: string, onNavigate?: (tab: string) => void }) {
  const { themeMode } = useStore();
  const isAdvanced = themeMode === 'advanced';

  const [liabilitiesData, setLiabilitiesData] = useState<any[]>([]);

  const { triggerRefresh, shouldRefresh } = useStore();

  useEffect(() => {
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
  }, [shouldRefresh]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLiability, setSelectedLiability] = useState<any | null>(null);
  
  const [newLiability, setNewLiability] = useState({ 
    title: '', amount: '', date: '', category: 'Quick Expenses', notes: '',
    merchant: '', paidUsing: 'Cash', provider: '', 
    totalAmount: '', remainingAmount: '', totalMonths: '', currentMonth: '', cardName: '', isRecurring: false
  });

  const [includedCategories, setIncludedCategories] = useState<string[]>(['Quick Expenses', 'Bills', 'Credits', 'Debts', 'Installments']);

  useEffect(() => {
    if (category && category !== 'All') {
      let formattedCat = category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      setNewLiability(prev => ({ ...prev, category: formattedCat }));
    }
  }, [category]);

  const handleAddLiability = async () => {
    if (!newLiability.title || !newLiability.amount) return;
    
    // Choose icon and color based on category
    let icon = Receipt;
    let color = 'text-slate-500 bg-slate-50 dark:bg-slate-500/20';
    
    switch (newLiability.category) {
      case 'Quick Expenses': icon = ShoppingBag; color = 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/20'; break;
      case 'Bills': icon = Zap; color = 'text-amber-500 bg-amber-50 dark:bg-amber-500/20'; break;
      case 'Credits': icon = CreditCard; color = 'text-rose-500 bg-rose-50 dark:bg-rose-500/20'; break;
      case 'Debts': icon = Landmark; color = 'text-blue-500 bg-blue-50 dark:bg-blue-500/20'; break;
      case 'Installments': icon = Home; color = 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/20'; break;
    }
    
    const newItem = {
      name: newLiability.title,
      type: newLiability.category,
      amount: parseFloat(newLiability.amount),
      date: newLiability.date || 'Pending',
      merchant: newLiability.merchant || (newLiability.category === 'Debts' ? newLiability.provider : ''),
      paid_using: newLiability.paidUsing,
      provider: newLiability.provider,
      total_amount: parseFloat(newLiability.totalAmount) || 0,
      remaining_amount: parseFloat(newLiability.remainingAmount) || 0,
      total_months: parseInt(newLiability.totalMonths) || 0,
      current_month: parseInt(newLiability.currentMonth) || 0,
      card_name: newLiability.cardName || newLiability.title,
      is_recurring: newLiability.isRecurring,
      status: 'Unpaid'
    };

    try {
      await fetch('/api/liabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      triggerRefresh();
    } catch (e) {
      console.error(e);
    }
    
    setIsModalOpen(false);
    setNewLiability({ 
      title: '', amount: '', date: '', category: category ? category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Quick Expenses', notes: '',
      merchant: '', paidUsing: 'Cash', provider: '', totalAmount: '', remainingAmount: '', totalMonths: '', currentMonth: '', cardName: '', isRecurring: false
    });
  };

  const isAll = !category || category === 'All';
  const activeCategoryName = category ? category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'All';

  const filteredData = isAll
    ? liabilitiesData
    : liabilitiesData.filter(d => d.type.toLowerCase() === category?.replace('-', ' ').toLowerCase());

  const totalAmount = isAll 
    ? filteredData.filter(d => includedCategories.includes(d.type)).reduce((acc, curr) => acc + curr.amount, 0)
    : filteredData.reduce((acc, curr) => acc + curr.amount, 0);

  const toggleCategory = (catName: string) => {
    setIncludedCategories(prev => 
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const categoriesList = [
    { name: 'Quick Expenses', icon: ShoppingBag, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/20' },
    { name: 'Bills', icon: Zap, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/20' },
    { name: 'Credits', icon: CreditCard, color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/20' },
    { name: 'Debts', icon: Landmark, color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/20' },
    { name: 'Installments', icon: Home, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/20' }
  ];

  if (selectedLiability) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => setSelectedLiability(null)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isAdvanced ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-sm'}`}
          >
            <ArrowUpRight className="w-4 h-4 rotate-[-135deg]" /> Back
          </button>
        </div>

        {/* Header Details */}
        <div className={`rounded-3xl p-6 sm:p-8 shadow-sm border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-5">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br flex items-center justify-center shadow-lg ${selectedLiability.color}`}>
              <selectedLiability.icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">{selectedLiability.name}</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">{selectedLiability.type}</p>
            </div>
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
              {selectedLiability.type === 'Credits' ? 'Statement Balance' : 'Amount Due'}
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-rose-500">₱{selectedLiability.amount.toLocaleString()}</h1>
            {selectedLiability.date && (
              <p className="text-sm font-medium text-slate-500 mt-2 flex items-center sm:justify-end gap-2">
                <CheckCircle2 size={16} className={isAdvanced ? 'text-violet-500' : 'text-emerald-500'} />
                Due: {selectedLiability.date}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className={`rounded-3xl p-6 sm:p-8 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <h3 className="text-lg font-bold mb-6">Details</h3>
            <div className="space-y-4">
              {selectedLiability.type === 'Quick Expenses' && (
                <>
                  <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400">Merchant</span>
                    <span className="font-medium">{selectedLiability.merchant || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400">Paid Using</span>
                    <span className="font-medium">{selectedLiability.paidUsing || 'Cash'}</span>
                  </div>
                </>
              )}

              {(selectedLiability.type === 'Bills') && (
                <>
                  <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400">Provider</span>
                    <span className="font-medium">{selectedLiability.provider || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400">Status</span>
                    <span className="font-medium">{selectedLiability.status || 'Pending'}</span>
                  </div>
                  {selectedLiability.isRecurring && (
                     <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                       <span className="text-slate-500 dark:text-slate-400">Type</span>
                       <span className="font-medium">Recurring</span>
                     </div>
                  )}
                </>
              )}

              {selectedLiability.type === 'Debts' && (
                <>
                  <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400">Lender / Borrower</span>
                    <span className="font-medium">{selectedLiability.person || selectedLiability.provider || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400">Total Amount</span>
                    <span className="font-medium">₱{selectedLiability.totalAmount?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400">Remaining</span>
                    <span className="font-medium">₱{selectedLiability.remainingAmount?.toLocaleString() || '0'}</span>
                  </div>
                </>
              )}

              {selectedLiability.type === 'Installments' && (
                <>
                  <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400">Total Months</span>
                    <span className="font-medium">{selectedLiability.totalMonths || '0'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400">Current Month</span>
                    <span className="font-medium">{selectedLiability.currentMonth || '0'}</span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-8">
              <button onClick={async () => { if (selectedLiability.isCardStatement) return; const response = await fetch(`/api/liabilities/${selectedLiability.id}/pay`, { method: 'PUT' }); if (response.ok) { setSelectedLiability({ ...selectedLiability, status: 'Paid' }); triggerRefresh(); } }}
                disabled={selectedLiability.isCardStatement || selectedLiability.status === 'Paid'}
                className={`w-full py-4 rounded-xl font-bold transition-colors ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
              >
                {selectedLiability.isCardStatement ? 'Managed by Card Account' : selectedLiability.status === 'Paid' ? 'Paid' : 'Mark as Paid'}
              </button>
            </div>
          </div>

          {selectedLiability.type === 'Credits' && selectedLiability.history && selectedLiability.history.length > 0 && (
            <div className={`rounded-3xl p-6 sm:p-8 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                <History size={18} /> Billing History
              </h3>
              <div className="space-y-4">
                {selectedLiability.history.map((hist: any, i: number) => (
                  <div key={i} className={`flex justify-between items-center p-4 rounded-2xl border ${isAdvanced ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <span className="text-sm font-medium">{hist.date}</span>
                    <span className="font-bold">₱{hist.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold capitalize">{isAll ? 'All Liabilities' : activeCategoryName}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{isAll ? 'Track your expenses, bills, and debts' : `Manage your ${activeCategoryName.toLowerCase()}`}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCsv('liabilities', filteredData.map(item => ({ Name: item.name || item.title, Type: item.type, Provider: item.provider || '', DueDate: item.date || '', Status: item.status || 'Unpaid', Amount: item.amount })))} className={`p-2 rounded-xl border ${isAdvanced ? 'border-slate-700 hover:bg-slate-700 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`} title="Export CSV"><Download size={16} /></button>
          <button onClick={() => exportPdf('Liabilities Summary', filteredData.map(item => ({ Name: item.name || item.title, Type: item.type, Provider: item.provider || '', DueDate: item.date || '', Status: item.status || 'Unpaid', Amount: item.amount })), 'FinGent liabilities, bills, credits, debts, and installments')} className={`p-2 rounded-xl border ${isAdvanced ? 'border-slate-700 hover:bg-slate-700 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`} title="Export PDF"><FileText size={16} /></button>
          {!isAll && (
            <button 
              onClick={() => onNavigate?.('liabilities')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isAdvanced ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-sm'}`}
            >
              <ArrowUpRight className="w-4 h-4 rotate-[-135deg]" /> Back
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className={`px-4 py-2 rounded-xl font-medium text-sm ${isAdvanced ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
          >
            + Add {isAll ? 'Liability' : activeCategoryName}
          </button>
        </div>
      </div>

      <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-r from-rose-50 to-orange-50 border-rose-100'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total {isAll ? 'Due' : activeCategoryName}</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-rose-500">₱{totalAmount.toLocaleString()}</h1>
          </div>
          {isAll && (
            <div className="flex flex-wrap gap-2 sm:justify-end max-w-lg">
              {categoriesList.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => toggleCategory(cat.name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    includedCategories.includes(cat.name) 
                    ? (isAdvanced ? 'bg-rose-500/20 text-rose-300 border-rose-500/50' : 'bg-rose-100 text-rose-700 border-rose-200') 
                    : (isAdvanced ? 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        {isAll ? (
          // Show Categories List
          categoriesList.map((cat, idx) => {
            const Icon = cat.icon;
            const catTotal = liabilitiesData.filter(d => d.type === cat.name).reduce((sum, item) => sum + item.amount, 0);
            const count = liabilitiesData.filter(d => d.type === cat.name).length;
            
            return (
              <div 
                key={cat.name} 
                onClick={() => onNavigate?.(`liabilities-${cat.name.replace(' ', '-').toLowerCase()}`)}
                className={`p-5 flex items-center justify-between cursor-pointer ${idx !== categoriesList.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''} hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors`}
              >
                <div className="flex items-center">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-4 ${cat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-base">{cat.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{count} {count === 1 ? 'Item' : 'Items'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-lg">₱{catTotal.toLocaleString()}</span>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            );
          })
        ) : (
          // Show Items for specific category
          filteredData.length > 0 ? filteredData.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.id} 
                onClick={() => setSelectedLiability(item)}
                className={`p-5 flex items-center justify-between cursor-pointer ${idx !== filteredData.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''} hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors`}
              >
                <div className="flex items-center">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-4 ${item.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-base">{item.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.type === 'Quick Expenses' ? `${item.merchant || 'General'} • Paid via ${item.paidUsing || 'Cash'}` : 
                       item.type === 'Bills' ? `${item.provider || 'Provider'} • Due ${item.date} ${item.isRecurring ? ' (Recurring)' : ''}` :
                       item.type === 'Credits' ? `${item.cardName} • Due ${item.date}` : 
                       item.type === 'Debts' ? `${item.person || item.provider || 'Lender'} • Remaining: ₱₱{item.remainingAmount?.toLocaleString() || '0'}` :
                       item.type === 'Installments' ? `${item.item || 'Item'} • ${item.currentMonth || 0}/${item.totalMonths || 0} Months • Due ${item.date}` :
                       `${item.type} • Due ${item.date}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-lg">₱{item.amount.toLocaleString()}</span>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            );
          }) : (
            <div className="p-8 text-center text-slate-500">
              No {activeCategoryName} found.
            </div>
          )
        )}
      </div>

      {/* Add Liability Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div 
            className={`w-full max-w-md rounded-3xl shadow-xl flex flex-col p-6 ${isAdvanced ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-white border border-slate-100'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">New {isAll ? 'Liability' : activeCategoryName}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                  {newLiability.category === 'Credits' ? 'Statement Balance' : newLiability.category === 'Installments' ? 'Monthly Amount' : 'Amount'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₱</span>
                  <input 
                    type="number" 
                    value={newLiability.amount} 
                    onChange={(e) => setNewLiability(prev => ({ ...prev, amount: e.target.value }))}
                    className={`w-full pl-8 pr-4 py-3 rounded-xl font-bold text-lg outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                  {newLiability.category === 'Credits' ? 'Card Name' : 
                   newLiability.category === 'Installments' ? 'Item Name' : 
                   newLiability.category === 'Debts' ? 'Debt Name' : 'Title / Description'}
                </label>
                <input 
                  type="text" 
                  value={newLiability.title}
                  onChange={(e) => setNewLiability(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                  placeholder={newLiability.category === 'Credits' ? 'e.g., BPI Blue Mastercard' : 'e.g., Internet Bill, Groceries'}
                />
              </div>

              {/* Dynamic Fields Based on Category */}
              {newLiability.category === 'Expenses' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Merchant / Location</label>
                    <input 
                      type="text" 
                      value={newLiability.merchant}
                      onChange={(e) => setNewLiability(prev => ({ ...prev, merchant: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                      placeholder="e.g., SM Supermarket"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Paid Using</label>
                    <select 
                      value={newLiability.paidUsing}
                      onChange={(e) => setNewLiability(prev => ({ ...prev, paidUsing: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors appearance-none ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                    >
                      <option>Cash</option>
                      <option>GCash</option>
                      <option>Bank Transfer</option>
                      <option>Credit Card</option>
                      <option>Debit Card</option>
                    </select>
                  </div>
                </div>
              )}

              {(newLiability.category === 'Bills' || newLiability.category === 'Recurring') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Provider / Biller</label>
                    <input 
                      type="text" 
                      value={newLiability.provider}
                      onChange={(e) => setNewLiability(prev => ({ ...prev, provider: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                      placeholder="e.g., Meralco, Netflix"
                    />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={newLiability.isRecurring}
                      onChange={(e) => setNewLiability(prev => ({ ...prev, isRecurring: e.target.checked }))}
                      className="w-5 h-5 rounded border-slate-300 text-violet-500 focus:ring-violet-500"
                    />
                    <span className="text-sm font-medium">Set as recurring bill</span>
                  </label>
                </div>
              )}

              {newLiability.category === 'Debts' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Lender / Borrower Name</label>
                    <input 
                      type="text" 
                      value={newLiability.provider}
                      onChange={(e) => setNewLiability(prev => ({ ...prev, provider: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                      placeholder="e.g., John Doe"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Total Amount</label>
                      <input 
                        type="number" 
                        value={newLiability.totalAmount}
                        onChange={(e) => setNewLiability(prev => ({ ...prev, totalAmount: e.target.value }))}
                        className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Remaining</label>
                      <input 
                        type="number" 
                        value={newLiability.remainingAmount}
                        onChange={(e) => setNewLiability(prev => ({ ...prev, remainingAmount: e.target.value }))}
                        className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                      />
                    </div>
                  </div>
                </>
              )}

              {newLiability.category === 'Installments' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Total Months</label>
                    <input 
                      type="number" 
                      value={newLiability.totalMonths}
                      onChange={(e) => setNewLiability(prev => ({ ...prev, totalMonths: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Current Month</label>
                    <input 
                      type="number" 
                      value={newLiability.currentMonth}
                      onChange={(e) => setNewLiability(prev => ({ ...prev, currentMonth: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Due Date</label>
                  <input 
                    type="date" 
                    value={newLiability.date}
                    onChange={(e) => setNewLiability(prev => ({ ...prev, date: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Category</label>
                  <select 
                    value={newLiability.category}
                    onChange={(e) => setNewLiability(prev => ({ ...prev, category: e.target.value }))}
                    disabled={!isAll}
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors appearance-none ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500 disabled:opacity-50' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500 disabled:opacity-50'}`}
                  >
                    {categoriesList.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Notes (Optional)</label>
                <textarea 
                  value={newLiability.notes}
                  onChange={(e) => setNewLiability(prev => ({ ...prev, notes: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors resize-none h-20 ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
                  placeholder="Add a note..."
                />
              </div>

              <button 
                onClick={handleAddLiability}
                disabled={!newLiability.title || !newLiability.amount}
                className={`w-full py-4 rounded-xl font-bold mt-2 disabled:opacity-50 transition-colors ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
              >
                Save {isAll ? 'Liability' : activeCategoryName}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Liability is handled as a separate view now */}
    </div>
  );
}
