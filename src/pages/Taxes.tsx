import React from 'react';
import { useStore } from '../store/useStore';
import { FileText, Calendar as CalendarIcon, AlertCircle, CheckCircle2, TrendingUp, Download } from 'lucide-react';

export function Taxes() {
  const { themeMode } = useStore();
  const isAdvanced = themeMode === 'advanced';

  const upcomingDeadlines = [
    { name: 'Q2 Income Tax Return', date: 'August 15, 2026', type: 'Form 1701Q', status: 'Pending', daysLeft: 41 },
    { name: 'Monthly Percentage Tax', date: 'August 20, 2026', type: 'Form 2551Q', status: 'Pending', daysLeft: 46 },
    { name: 'Q1 Income Tax Return', date: 'May 15, 2026', type: 'Form 1701Q', status: 'Filed', daysLeft: 0 },
    { name: 'Annual Income Tax', date: 'April 15, 2026', type: 'Form 1701', status: 'Filed', daysLeft: 0 },
  ];

  const taxBreakdown = [
    { label: 'Employment Income Tax', amount: 85000, color: 'bg-blue-500' },
    { label: 'Business Percentage Tax', amount: 15000, color: 'bg-emerald-500' },
    { label: 'Capital Gains Tax', amount: 5000, color: 'bg-amber-500' },
  ];

  const totalEstTax = taxBreakdown.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Tax Center</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage compliance, deadlines, and estimated liabilities</p>
        </div>
        <button className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors border ${isAdvanced ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
          <Download className="w-4 h-4" /> Export PDF
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Estimated Liability */}
          <div className={`rounded-3xl p-6 md:p-8 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
             <h3 className="font-bold text-lg mb-6">2026 Estimated Tax Liability</h3>
             
             <div className="flex flex-col md:flex-row md:items-center gap-8 mb-8">
               <div className="shrink-0">
                 <p className="text-sm font-medium text-slate-500 mb-1">Total Estimated</p>
                 <p className="text-4xl font-black text-rose-500">₱{totalEstTax.toLocaleString()}</p>
                 <p className="text-sm font-medium text-slate-500 mt-2">Based on projected income of ₱850k</p>
               </div>
               
               <div className="flex-1 w-full space-y-4">
                 <div className="h-4 w-full rounded-full overflow-hidden flex">
                   {taxBreakdown.map((item, idx) => (
                     <div key={idx} className={`h-full ${item.color} ${isAdvanced ? 'opacity-80' : ''}`} style={{ width: `${(item.amount / totalEstTax) * 100}%` }} />
                   ))}
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {taxBreakdown.map((item, idx) => (
                     <div key={idx} className="flex items-center gap-3">
                       <div className={`w-3 h-3 rounded-full ${item.color}`} />
                       <div>
                         <p className="text-xs font-bold text-slate-500">{item.label}</p>
                         <p className="font-bold">₱{item.amount.toLocaleString()}</p>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             </div>

             <div className={`p-4 rounded-2xl flex items-start gap-3 ${isAdvanced ? 'bg-violet-900/20 border border-violet-500/30' : 'bg-emerald-50 border border-emerald-100'}`}>
               <TrendingUp className={`w-5 h-5 shrink-0 mt-0.5 ${isAdvanced ? 'text-violet-400' : 'text-emerald-500'}`} />
               <div>
                 <p className={`font-bold text-sm ${isAdvanced ? 'text-violet-300' : 'text-emerald-800'}`}>Tax Optimization Suggestion</p>
                 <p className={`text-xs mt-1 font-medium ${isAdvanced ? 'text-violet-400/80' : 'text-emerald-700/80'}`}>You can reduce your taxable income by contributing to a PERA (Personal Equity and Retirement Account). Up to ₱100,000 contribution per year is eligible for a 5% tax credit.</p>
               </div>
             </div>
          </div>

          {/* Deductions & Expenses */}
          <div className={`rounded-3xl p-6 md:p-8 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
             <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-lg">Claimable Deductions</h3>
               <button className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">View All</button>
             </div>
             
             <div className="grid sm:grid-cols-3 gap-4">
               {[
                 { category: 'Office Supplies', amount: 12500, count: 14 },
                 { category: 'Software Subs', amount: 24000, count: 6 },
                 { category: 'Internet/Comms', amount: 18000, count: 6 },
               ].map((deduction, idx) => (
                 <div key={idx} className={`p-5 rounded-2xl border ${isAdvanced ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                   <p className="text-sm font-bold text-slate-500 mb-2">{deduction.category}</p>
                   <p className="font-black text-xl mb-1">₱{deduction.amount.toLocaleString()}</p>
                   <p className="text-xs font-medium text-slate-400">{deduction.count} receipts logged</p>
                 </div>
               ))}
             </div>
             
             <button className={`w-full mt-6 py-3 rounded-xl font-bold text-sm border-2 border-dashed transition-colors ${isAdvanced ? 'border-slate-700 hover:border-violet-500 text-slate-400 hover:text-violet-400' : 'border-slate-200 hover:border-slate-400 text-slate-500 hover:text-slate-800'}`}>
              + Log Business Expense
            </button>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="space-y-6">
          <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <h3 className="font-bold text-lg mb-6 flex items-center">
              <CalendarIcon className="w-5 h-5 mr-2" /> Tax Calendar
            </h3>
            
            <div className="space-y-4">
              {upcomingDeadlines.map((deadline, idx) => (
                <div key={idx} className={`p-4 rounded-2xl border transition-all hover:shadow-sm ${deadline.status === 'Filed' ? (isAdvanced ? 'bg-slate-900/30 border-slate-800 opacity-60' : 'bg-slate-50 border-slate-100 opacity-70') : (isAdvanced ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200')}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className={`font-bold text-sm ${deadline.status === 'Filed' ? 'line-through text-slate-500' : ''}`}>{deadline.name}</h4>
                    {deadline.status === 'Filed' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${deadline.daysLeft <= 14 ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'}`}>
                        In {deadline.daysLeft} days
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <span className="font-bold">{deadline.type}</span>
                    <span>•</span>
                    <span>{deadline.date}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className={`mt-6 p-4 rounded-2xl flex items-start gap-3 ${isAdvanced ? 'bg-rose-900/10 border border-rose-500/20 text-rose-400' : 'bg-rose-50 border border-rose-100 text-rose-600'}`}>
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-xs font-bold leading-relaxed">Don't forget to prepare your books for the Q2 filing. Ensure all receipts are logged by August 10.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
