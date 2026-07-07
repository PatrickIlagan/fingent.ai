import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Building, TrendingUp, Users, DollarSign, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function Business() {
  const { themeMode } = useStore();
  const isAdvanced = themeMode === 'advanced';

  const [businesses, setBusinesses] = useState([
    { id: 1, name: 'SaaS Tool', status: 'Active', mrr: 45000, growth: 12, customers: 150, target: 100000 },
    { id: 2, name: 'E-commerce Store', status: 'Active', mrr: 120000, growth: 5, customers: 850, target: 200000 },
    { id: 3, name: 'Consulting Agency', status: 'Idle', mrr: 0, growth: 0, customers: 0, target: 50000 },
  ]);

  const revenueData = [
    { name: 'Jan', value: 120000 },
    { name: 'Feb', value: 135000 },
    { name: 'Mar', value: 130000 },
    { name: 'Apr', value: 145000 },
    { name: 'May', value: 155000 },
    { name: 'Jun', value: 165000 },
  ];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Business Operations</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your active ventures and track revenue</p>
        </div>
        <button className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm hover:scale-105 ${isAdvanced ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-violet-900/20' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
          <Plus className="w-4 h-4" /> New Venture
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Monthly Revenue', value: '₱165,000', icon: DollarSign, trend: '+8.5%', positive: true },
          { label: 'Active Customers', value: '1,000', icon: Users, trend: '+12%', positive: true },
          { label: 'Avg Profit Margin', value: '42%', icon: TrendingUp, trend: '+2.1%', positive: true },
          { label: 'Total MRR Goal', value: '₱350,000', icon: Building, trend: '47% Complete', positive: true, noColor: true },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${isAdvanced ? 'bg-slate-900 text-violet-400' : 'bg-slate-50 text-emerald-600'}`}>
                  <Icon size={24} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${kpi.noColor ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' : kpi.positive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                  {!kpi.noColor && (kpi.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />)}
                  {kpi.trend}
                </div>
              </div>
              <p className="text-sm font-medium text-slate-500 mb-1">{kpi.label}</p>
              <h3 className="text-2xl font-black">{kpi.value}</h3>
            </div>
          );
        })}
      </div>

      {/* Chart and Active Ventures */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className={`p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between ${isAdvanced ? 'bg-slate-900/50 border border-slate-700 text-slate-300' : 'bg-blue-50 border border-blue-100 text-blue-800'}`}>
             <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl shrink-0 ${isAdvanced ? 'bg-slate-800 text-violet-400' : 'bg-blue-100 text-blue-600'}`}>
                   <Building size={20} />
                </div>
                <div>
                   <p className="font-bold text-sm">Business Insight</p>
                   <p className="text-xs mt-0.5 opacity-80">Your SaaS Tool is driving 38% of your overall growth. Consider re-investing profits from your E-commerce store to boost marketing for the SaaS.</p>
                </div>
             </div>
             <button className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isAdvanced ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-blue-100 text-blue-600'}`}>
                Apply Strategy
             </button>
          </div>

          <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <h3 className="font-bold text-lg mb-6">Total Revenue Trend</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isAdvanced ? '#8b5cf6' : '#10B981'} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={isAdvanced ? '#8b5cf6' : '#10B981'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isAdvanced ? '#94a3b8' : '#64748b' }} padding={{ left: 20, right: 20 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isAdvanced ? '#94a3b8' : '#64748b' }} tickFormatter={(val) => `₱${(val/1000)}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: isAdvanced ? '#1e293b' : '#ffffff', border: isAdvanced ? '1px solid #334155' : '1px solid #e2e8f0', borderRadius: '12px' }} 
                    itemStyle={{ color: isAdvanced ? '#e2e8f0' : '#0f172a', fontWeight: 'bold' }}
                    formatter={(value: number) => [`₱₱{value.toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="value" stroke={isAdvanced ? '#8b5cf6' : '#10B981'} strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <h3 className="font-bold text-lg mb-4">Ventures</h3>
            <div className="space-y-4">
              {businesses.map((business) => {
                const progress = (business.mrr / business.target) * 100;
                return (
                  <div key={business.id} className={`p-4 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer ${isAdvanced ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold">{business.name}</h4>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${business.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                        {business.status}
                      </span>
                    </div>
                    
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-0.5">Monthly Rev</p>
                        <p className="font-black text-lg">₱{business.mrr.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-slate-500 mb-0.5">Customers</p>
                        <p className="font-bold">{business.customers}</p>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                        <span>Target: ₱{business.target.toLocaleString()}</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${isAdvanced ? 'bg-violet-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <button className={`w-full mt-4 py-3 rounded-xl font-bold text-sm border-2 border-dashed transition-colors ${isAdvanced ? 'border-slate-700 hover:border-violet-500 text-slate-400 hover:text-violet-400' : 'border-slate-200 hover:border-slate-400 text-slate-500 hover:text-slate-800'}`}>
              View All Pipeline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
