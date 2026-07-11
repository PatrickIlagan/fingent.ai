import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { FileText, Calendar as CalendarIcon, AlertCircle, CheckCircle2, TrendingUp, Download, Globe } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export function Taxes() {
  const { themeMode } = useStore();
  const isAdvanced = themeMode === 'advanced';
  const [region, setRegion] = useState<'PH' | 'US'>('PH');

  const phDeadlines = [
    { name: 'Q2 Income Tax Return', date: 'August 15, 2026', type: 'Form 1701Q', status: 'Pending', daysLeft: 41 },
    { name: 'Monthly Percentage Tax', date: 'August 20, 2026', type: 'Form 2551Q', status: 'Pending', daysLeft: 46 },
    { name: 'Q1 Income Tax Return', date: 'May 15, 2026', type: 'Form 1701Q', status: 'Filed', daysLeft: 0 },
    { name: 'Annual Income Tax', date: 'April 15, 2026', type: 'Form 1701', status: 'Filed', daysLeft: 0 },
  ];

  const usDeadlines = [
    { name: 'Estimated Tax Payment (Q3)', date: 'September 15, 2026', type: 'Form 1040-ES', status: 'Pending', daysLeft: 71 },
    { name: 'FBAR (FinCEN 114) Deadline', date: 'October 15, 2026', type: 'FBAR', status: 'Pending', daysLeft: 101 },
    { name: 'Estimated Tax Payment (Q2)', date: 'June 15, 2026', type: 'Form 1040-ES', status: 'Filed', daysLeft: 0 },
    { name: 'Annual Tax Return', date: 'April 15, 2026', type: 'Form 1040', status: 'Filed', daysLeft: 0 },
  ];

  const phTaxBreakdown = [
    { label: 'Employment Income Tax', amount: 85000, color: '#3b82f6' },
    { label: 'Business Percentage Tax', amount: 15000, color: '#10b981' },
    { label: 'Capital Gains Tax', amount: 5000, color: '#f59e0b' },
  ];

  const usTaxBreakdown = [
    { label: 'Federal Income Tax', amount: 12500, color: '#3b82f6' },
    { label: 'State Income Tax (CA)', amount: 4200, color: '#10b981' },
    { label: 'Self-Employment Tax', amount: 5800, color: '#f59e0b' },
  ];

  const currentDeadlines = region === 'PH' ? phDeadlines : usDeadlines;
  const currentBreakdown = region === 'PH' ? phTaxBreakdown : usTaxBreakdown;
  const totalEstTax = currentBreakdown.reduce((acc, curr) => acc + curr.amount, 0);
  const currencySymbol = region === 'PH' ? '₱' : '$';

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black">Tax Center</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage compliance, deadlines, and estimated liabilities for {region === 'PH' ? 'Philippines' : 'United States'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex p-1 rounded-xl ${isAdvanced ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <button 
              onClick={() => setRegion('PH')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${region === 'PH' ? (isAdvanced ? 'bg-slate-700 text-white' : 'bg-white text-slate-900 shadow-sm') : (isAdvanced ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
            >
              <Globe size={16} /> PH
            </button>
            <button 
              onClick={() => setRegion('US')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${region === 'US' ? (isAdvanced ? 'bg-slate-700 text-white' : 'bg-white text-slate-900 shadow-sm') : (isAdvanced ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
            >
              <Globe size={16} /> US
            </button>
          </div>
          <button onClick={() => window.print()} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors border ${isAdvanced ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
        <div className="lg:col-span-2 space-y-6">
          {/* Estimated Liability */}
          <div className={`rounded-3xl p-6 md:p-8 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
             <h3 className="font-bold text-lg mb-6">2026 Estimated Tax Liability ({region})</h3>
             
             <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
               <div className="shrink-0 text-center md:text-left">
                 <p className="text-sm font-medium text-slate-500 mb-1">Total Estimated</p>
                 <p className="text-4xl font-black text-rose-500">{currencySymbol}{totalEstTax.toLocaleString()}</p>
                 <p className="text-sm font-medium text-slate-500 mt-2">Based on projected income of {currencySymbol}{region === 'PH' ? '850,000' : '95,000'}</p>
               </div>
               
               <div className="flex-1 w-full h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={currentBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="amount"
                        stroke="none"
                      >
                        {currentBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, 'Amount']}
                        contentStyle={{ backgroundColor: isAdvanced ? '#1e293b' : '#ffffff', border: isAdvanced ? '1px solid #334155' : '1px solid #e2e8f0', borderRadius: '12px' }}
                        itemStyle={{ color: isAdvanced ? '#e2e8f0' : '#0f172a', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
               </div>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
               {currentBreakdown.map((item, idx) => (
                 <div key={idx} className={`p-4 rounded-2xl border ${isAdvanced ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                   <div className="flex items-center gap-2 mb-2">
                     <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                     <p className="text-xs font-bold text-slate-500 truncate" title={item.label}>{item.label}</p>
                   </div>
                   <p className="font-bold text-lg">{currencySymbol}{item.amount.toLocaleString()}</p>
                 </div>
               ))}
             </div>

             {region === 'PH' ? (
               <div className={`p-4 rounded-2xl flex items-start gap-3 ${isAdvanced ? 'bg-violet-900/20 border border-violet-500/30' : 'bg-emerald-50 border border-emerald-100'}`}>
                 <TrendingUp className={`w-5 h-5 shrink-0 mt-0.5 ${isAdvanced ? 'text-violet-400' : 'text-emerald-500'}`} />
                 <div>
                   <p className={`font-bold text-sm ${isAdvanced ? 'text-violet-300' : 'text-emerald-800'}`}>Tax Optimization Suggestion</p>
                   <p className={`text-xs mt-1 font-medium ${isAdvanced ? 'text-violet-400/80' : 'text-emerald-700/80'}`}>You can reduce your taxable income by contributing to a PERA (Personal Equity and Retirement Account). Up to ₱100,000 contribution per year is eligible for a 5% tax credit.</p>
                 </div>
               </div>
             ) : (
               <div className={`p-4 rounded-2xl flex items-start gap-3 ${isAdvanced ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-100'}`}>
                 <TrendingUp className={`w-5 h-5 shrink-0 mt-0.5 ${isAdvanced ? 'text-blue-400' : 'text-blue-500'}`} />
                 <div>
                   <p className={`font-bold text-sm ${isAdvanced ? 'text-blue-300' : 'text-blue-800'}`}>Tax Optimization Suggestion</p>
                   <p className={`text-xs mt-1 font-medium ${isAdvanced ? 'text-blue-400/80' : 'text-blue-700/80'}`}>Consider maximizing your Traditional IRA or 401(k) contributions to lower your AGI. You may also qualify for the Qualified Business Income (QBI) deduction.</p>
                 </div>
               </div>
             )}
          </div>

          {/* Deductions & Expenses */}
          <div className={`rounded-3xl p-6 md:p-8 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
             <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-lg">Claimable Deductions</h3>
               <button className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">View All</button>
             </div>
             
             <div className="grid sm:grid-cols-3 gap-4">
               {[
                 { category: 'Home Office', amount: region === 'PH' ? 12500 : 1500, count: 14 },
                 { category: 'Software Subs', amount: region === 'PH' ? 24000 : 800, count: 6 },
                 { category: 'Travel', amount: region === 'PH' ? 18000 : 1200, count: 6 },
               ].map((deduction, idx) => (
                 <div key={idx} className={`p-5 rounded-2xl border ${isAdvanced ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                   <p className="text-sm font-bold text-slate-500 mb-2">{deduction.category}</p>
                   <p className="font-black text-xl mb-1">{currencySymbol}{deduction.amount.toLocaleString()}</p>
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
              {currentDeadlines.map((deadline, idx) => (
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
              <p className="text-xs font-bold leading-relaxed">
                {region === 'PH' 
                  ? "Don't forget to prepare your books for the Q2 filing. Ensure all receipts are logged by August 10." 
                  : "Quarterly estimated tax payments are coming up. Ensure your Q3 books are reconciled by September 10."}
              </p>
            </div>
          </div>
        </div>
      </div>
      <p className="px-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Planning estimates only — verify filing dates, deductions, and tax obligations with the relevant tax authority or a qualified professional.</p>
    </div>
  );
}
