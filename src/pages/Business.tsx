import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { Building, TrendingUp, Users, DollarSign, Plus, ArrowUpRight, ArrowDownRight, Store, MonitorSmartphone, X, ArrowLeft, ShoppingCart, Package, Megaphone, CheckSquare, Activity, RefreshCw, FileText, Briefcase } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function Business({ currentTab, onNavigate }: any) {
  const { themeMode, selectedBusiness, setSelectedBusiness } = useStore();
  const isAdvanced = themeMode === 'advanced';

  const [businesses, setBusinesses] = useState<any[]>(() => {
    const savedBusinesses = localStorage.getItem('fingent-businesses');
    if (savedBusinesses) {
      try {
        return JSON.parse(savedBusinesses);
      } catch {
        localStorage.removeItem('fingent-businesses');
      }
    }

    return [
      { id: 1, name: 'TechStore E-commerce', type: 'Store', status: 'Active', mrr: 124500, growth: 12.5, customers: 156, target: 200000 },
      { id: 2, name: 'Analytics SaaS', type: 'SaaS', status: 'Active', mrr: 85000, growth: 8.4, customers: 120, target: 150000 },
      { id: 3, name: 'Design Agency', type: 'Agency', status: 'Active', mrr: 245000, growth: 18.4, customers: 12, target: 500000 },
    ];
  });
  const [isPipelineOpen, setIsPipelineOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);

  useEffect(() => {
    localStorage.setItem('fingent-businesses', JSON.stringify(businesses));
  }, [businesses]);

  const globalDeals = [
    { id: 'D-1', title: 'Enterprise Analytics Deal', venture: 'Analytics SaaS', stage: 'Negotiation', value: 250000, probability: 80, closing: '12 days', contact: 'Sarah Jenkins (TechCorp)', notes: 'Awaiting final legal review on MSA.' },
    { id: 'D-2', title: 'Website Redesign Retainer', venture: 'Design Agency', stage: 'Proposal Sent', value: 120000, probability: 60, closing: '5 days', contact: 'Mike Ross (Lawyer Inc)', notes: 'They requested 3 optional homepage mockups before signing.' },
    { id: 'D-3', title: 'Bulk Order Wholesale', venture: 'TechStore E-commerce', stage: 'Qualification', value: 45000, probability: 30, closing: '20 days', contact: 'David Lee (Retail Hub)', notes: 'Checking inventory availability for 500 units.' },
    { id: 'D-4', title: 'Q3 Ad Campaign', venture: 'Design Agency', stage: 'Closed Won', value: 350000, probability: 100, closing: 'Closed', contact: 'Emily Chen (GlobalBrands)', notes: 'Project kicked off last week.' },
  ];

  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [newBusiness, setNewBusiness] = useState({ name: '', type: 'Store', status: 'Active', mrr: '', customers: '', target: '' });
  
  const handleAddBusiness = () => {
    setBusinesses([...businesses, {
      id: Date.now(),
      name: newBusiness.name,
      type: newBusiness.type,
      status: 'Active',
      mrr: parseFloat(newBusiness.mrr) || 0,
      growth: 0,
      customers: parseInt(newBusiness.customers) || 0,
      target: parseFloat(newBusiness.target) || 100000
    }]);
    setIsModalOpen(false);
    setStep(1);
    setNewBusiness({ name: '', type: 'Store', status: 'Active', mrr: '', customers: '', target: '' });
  };

  const totalMrr = businesses.reduce((acc, b) => acc + b.mrr, 0);
  const revenueData = [
    { name: 'Jan', value: totalMrr * 0.72 },
    { name: 'Feb', value: totalMrr * 0.81 },
    { name: 'Mar', value: totalMrr * 0.78 },
    { name: 'Apr', value: totalMrr * 0.87 },
    { name: 'May', value: totalMrr * 0.93 },
    { name: 'Jun', value: totalMrr },
  ];

  if (isPipelineOpen) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => { setIsPipelineOpen(false); setSelectedDeal(null); }} className={`p-2 rounded-xl transition-colors ${isAdvanced ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-50 border shadow-sm text-slate-600'}`}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold">Global Pipeline</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Cross-venture sales and lead tracking</p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <p className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Total Value</p>
            <p className="text-3xl font-black">₱854,000</p>
          </div>
          <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <p className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Active Deals</p>
            <p className="text-3xl font-black">18</p>
          </div>
          <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <p className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Win Rate</p>
            <p className="text-3xl font-black text-emerald-500">68%</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h4 className="font-bold text-lg mb-4">All Opportunities</h4>
            {globalDeals.map((deal) => (
              <div 
                key={deal.id} 
                onClick={() => setSelectedDeal(deal)}
                className={`p-5 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer transition-all hover:scale-[1.01] shadow-sm ${selectedDeal?.id === deal.id ? (isAdvanced ? 'bg-violet-900/30 border-violet-500/50' : 'bg-violet-50 border-violet-200') : (isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200')}`}
              >
                <div className="flex items-center gap-4 mb-3 sm:mb-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${isAdvanced ? 'bg-slate-900 text-violet-400' : 'bg-slate-100 text-violet-600'}`}>
                    {deal.title.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{deal.title}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">{deal.venture} &bull; <span className={deal.stage === 'Closed Won' ? 'text-emerald-500' : 'text-orange-500'}>{deal.stage}</span></p>
                  </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                  <p className="font-black text-xl text-emerald-500">₱{deal.value.toLocaleString()}</p>
                  <p className="text-xs font-bold text-slate-500 mt-1">Closing in {deal.closing}</p>
                </div>
              </div>
            ))}
          </div>

          <div>
            {selectedDeal ? (
              <div className={`p-6 rounded-3xl border shadow-sm sticky top-6 ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <h3 className="text-xl font-bold mb-1">{selectedDeal.title}</h3>
                <p className="text-sm text-slate-500 mb-6">{selectedDeal.venture}</p>

                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${selectedDeal.stage === 'Closed Won' ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                      <p className="font-bold">{selectedDeal.stage}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Deal Value</p>
                    <p className="font-black text-2xl text-emerald-500">₱{selectedDeal.value.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Probability</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                         <div className="h-full bg-violet-500 rounded-full" style={{ width: `${selectedDeal.probability}%` }}></div>
                      </div>
                      <p className="font-bold text-sm">{selectedDeal.probability}%</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Primary Contact</p>
                    <p className="font-bold">{selectedDeal.contact}</p>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl mb-6 ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Latest Notes</p>
                  <p className="text-sm">{selectedDeal.notes}</p>
                </div>

                <div className="flex gap-2">
                  <button className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>
                    Update Stage
                  </button>
                  <button className={`py-3 px-4 rounded-xl font-bold text-sm border transition-colors ${isAdvanced ? 'border-slate-700 hover:bg-slate-700 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                    Edit
                  </button>
                </div>
              </div>
            ) : (
              <div className={`p-8 text-center rounded-3xl border border-dashed ${isAdvanced ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${isAdvanced ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-400 shadow-sm'}`}>
                  <ArrowUpRight size={24} />
                </div>
                <p className="font-bold text-slate-500">Select a deal to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (selectedBusiness && currentTab !== "business") {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => { setSelectedBusiness(null); onNavigate('business'); }} className={`p-2 rounded-xl transition-colors ${isAdvanced ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-50 border shadow-sm text-slate-600'}`}>
              <ArrowLeft size={20} />
            </button>
            <div>
                <h2 className="text-2xl font-bold">{selectedBusiness.name}</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">{selectedBusiness.type} Dashboard</p>
            </div>
          </div>
        </div>
        
        {selectedBusiness.type === 'Store' && <StoreDashboard business={selectedBusiness} isAdvanced={isAdvanced} currentTab={currentTab}  onNavigate={onNavigate} />}
        {selectedBusiness.type === 'SaaS' && <SaaSDashboard business={selectedBusiness} isAdvanced={isAdvanced} currentTab={currentTab}  onNavigate={onNavigate} />}
        {selectedBusiness.type === 'Agency' && <AgencyDashboard business={selectedBusiness} isAdvanced={isAdvanced} currentTab={currentTab}  onNavigate={onNavigate} />}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Business Operations</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your active ventures and track revenue</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm hover:scale-105 ${isAdvanced ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-violet-900/20' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
          <Plus className="w-4 h-4" /> New Venture
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(() => {
          const totalMrr = businesses.reduce((acc, b) => acc + b.mrr, 0);
          const totalCustomers = businesses.reduce((acc, b) => acc + b.customers, 0);
          const avgGrowth = businesses.length > 0 ? businesses.reduce((acc, b) => acc + b.growth, 0) / businesses.length : 0;
          const totalTarget = businesses.reduce((acc, b) => acc + b.target, 0);
          const percentComplete = totalTarget > 0 ? (totalMrr / totalTarget) * 100 : 0;

          return [
            { label: 'Total Monthly Revenue', value: `₱${totalMrr.toLocaleString()}`, icon: DollarSign, trend: '+8.5%', positive: true },
            { label: 'Active Customers', value: totalCustomers.toLocaleString(), icon: Users, trend: '+12%', positive: true },
            { label: 'Avg Growth Rate', value: `${avgGrowth.toFixed(1)}%`, icon: TrendingUp, trend: '+2.1%', positive: true },
            { label: 'Total MRR Goal', value: `₱${totalTarget.toLocaleString()}`, icon: Building, trend: `${percentComplete.toFixed(0)}% Complete`, positive: true, noColor: true },
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
        })})()}
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
                   {(() => {
                      const topBusiness = [...businesses].sort((a, b) => b.mrr - a.mrr)[0];
                      const total = businesses.reduce((acc, b) => acc + b.mrr, 0);
                      const percentage = total > 0 && topBusiness ? ((topBusiness.mrr / total) * 100).toFixed(0) : 0;
                      return (
                        <>
                           <p className="font-bold text-sm">Business Insight</p>
                           <p className="text-xs mt-0.5 opacity-80">
                             {topBusiness 
                               ? `Your ${topBusiness.name} is driving ${percentage}% of your overall revenue. Consider re-investing profits to boost its marketing.` 
                               : 'Add ventures to get intelligent business insights and performance reviews.'}
                           </p>
                        </>
                      );
                   })()}
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
                    formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Revenue']}
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
              {businesses.length === 0 ? (
                <div className="text-center py-8">
                  <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${isAdvanced ? 'bg-slate-900 text-violet-400' : 'bg-slate-100 text-slate-400'}`}>
                    <Building size={32} />
                  </div>
                  <h4 className="font-bold text-slate-600 dark:text-slate-300 mb-2">No active ventures</h4>
                  <p className="text-xs text-slate-500 mb-4">Add your first business to track your MRR and growth.</p>
                  <button onClick={() => setIsModalOpen(true)} className={`px-4 py-2 rounded-xl text-xs font-bold ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>Start a Business</button>
                </div>
              ) : businesses.map((business) => {
                const progress = (business.mrr / business.target) * 100;
                return (
                  <div key={business.id} onClick={() => { setSelectedBusiness(business); onNavigate('business-dashboard'); }} className={`p-4 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer ${isAdvanced ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold">{business.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${business.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                            {business.status}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isAdvanced ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                            {business.type}
                          </span>
                        </div>
                      </div>
                      {business.growth > 0 && (
                        <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
                          <ArrowUpRight size={12} /> {business.growth}%
                        </span>
                      )}
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
            
            <button onClick={() => setIsPipelineOpen(true)} className={`w-full mt-4 py-3 rounded-xl font-bold text-sm border-2 border-dashed transition-colors ${isAdvanced ? 'border-slate-700 hover:border-violet-500 text-slate-400 hover:text-violet-400' : 'border-slate-200 hover:border-slate-400 text-slate-500 hover:text-slate-800'}`}>
              View All Pipeline
            </button>
          </div>      </div>
    </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div 
            className={`w-full max-w-md rounded-3xl shadow-xl flex flex-col p-6 overflow-y-auto max-h-[90vh] custom-scrollbar ${isAdvanced ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-white border border-slate-100'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Start a New Venture</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
            </div>
            
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-500 mb-4">What kind of business are you starting?</p>
                <div 
                  onClick={() => setNewBusiness({...newBusiness, type: 'Store'})}
                  className={`p-4 rounded-2xl border cursor-pointer transition-colors flex items-center gap-4 ${newBusiness.type === 'Store' ? (isAdvanced ? 'bg-violet-900/30 border-violet-500' : 'bg-slate-100 border-slate-900') : (isAdvanced ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200')}`}
                >
                  <div className={`p-3 rounded-xl ${newBusiness.type === 'Store' ? (isAdvanced ? 'bg-violet-600 text-white' : 'bg-slate-900 text-white') : (isAdvanced ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}><Store size={24} /></div>
                  <div>
                    <h4 className="font-bold">Physical / E-commerce Store</h4>
                    <p className="text-xs text-slate-500">Sell physical products</p>
                  </div>
                </div>
                <div 
                  onClick={() => setNewBusiness({...newBusiness, type: 'SaaS'})}
                  className={`p-4 rounded-2xl border cursor-pointer transition-colors flex items-center gap-4 ${newBusiness.type === 'SaaS' ? (isAdvanced ? 'bg-violet-900/30 border-violet-500' : 'bg-slate-100 border-slate-900') : (isAdvanced ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200')}`}
                >
                  <div className={`p-3 rounded-xl ${newBusiness.type === 'SaaS' ? (isAdvanced ? 'bg-violet-600 text-white' : 'bg-slate-900 text-white') : (isAdvanced ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}><MonitorSmartphone size={24} /></div>
                  <div>
                    <h4 className="font-bold">Software as a Service</h4>
                    <p className="text-xs text-slate-500">Digital subscriptions</p>
                  </div>
                </div>
                <div 
                  onClick={() => setNewBusiness({...newBusiness, type: 'Agency'})}
                  className={`p-4 rounded-2xl border cursor-pointer transition-colors flex items-center gap-4 ${newBusiness.type === 'Agency' ? (isAdvanced ? 'bg-violet-900/30 border-violet-500' : 'bg-slate-100 border-slate-900') : (isAdvanced ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200')}`}
                >
                  <div className={`p-3 rounded-xl ${newBusiness.type === 'Agency' ? (isAdvanced ? 'bg-violet-600 text-white' : 'bg-slate-900 text-white') : (isAdvanced ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}><Users size={24} /></div>
                  <div>
                    <h4 className="font-bold">Service Agency</h4>
                    <p className="text-xs text-slate-500">Consulting, design, etc.</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setStep(2)}
                  className={`w-full mt-6 py-4 rounded-xl font-bold transition-colors ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                >
                  Continue
                </button>
              </div>
            )}
            
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Business Name</label>
                  <input 
                    type="text" 
                    value={newBusiness.name}
                    onChange={(e) => setNewBusiness({...newBusiness, name: e.target.value})}
                    placeholder="e.g. Acme Corp"
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Current MRR (₱)</label>
                    <input 
                      type="number" 
                      value={newBusiness.mrr}
                      onChange={(e) => setNewBusiness({...newBusiness, mrr: e.target.value})}
                      placeholder="0"
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Target MRR (₱)</label>
                    <input 
                      type="number" 
                      value={newBusiness.target}
                      onChange={(e) => setNewBusiness({...newBusiness, target: e.target.value})}
                      placeholder="100000"
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Active Customers</label>
                  <input 
                    type="number" 
                    value={newBusiness.customers}
                    onChange={(e) => setNewBusiness({...newBusiness, customers: e.target.value})}
                    placeholder="0"
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}
                  />
                </div>
                
                <div className="flex gap-4 mt-6">
                  <button 
                    onClick={() => setStep(1)}
                    className={`px-6 py-4 rounded-xl font-bold transition-colors ${isAdvanced ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleAddBusiness}
                    disabled={!newBusiness.name}
                    className={`flex-1 py-4 rounded-xl font-bold transition-colors ${!newBusiness.name ? 'opacity-50 cursor-not-allowed' : ''} ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                  >
                    Launch Business
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}


function StoreDashboard({ business, isAdvanced, currentTab, onNavigate }: any) {
  const [search, setSearch] = React.useState('');
  const [inventory, setInventory] = React.useState([
    { id: 'INV-1001', name: 'Premium Leather Wallet', stock: 45, status: 'In Stock', price: 1200 },
    { id: 'INV-1002', name: 'Minimalist Watch', stock: 12, status: 'Low Stock', price: 3500 },
    { id: 'INV-1003', name: 'Canvas Backpack', stock: 0, status: 'Out of Stock', price: 2100 },
    { id: 'INV-1004', name: 'Sunglasses', stock: 89, status: 'In Stock', price: 800 },
  ]);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [newItem, setNewItem] = React.useState({ name: '', stock: '', price: '' });

  const [restockOrders, setRestockOrders] = React.useState([
    { id: 'RST-001', item: 'Premium Leather Wallet', quantity: 50, date: 'Today, 10:00 AM', status: 'Pending' }
  ]);
  const [isAddRestockOpen, setIsAddRestockOpen] = React.useState(false);
  const [newRestock, setNewRestock] = React.useState({ item: '', quantity: '' });

  const [campaigns, setCampaigns] = React.useState([
    { id: 'CMP-1', name: 'Summer Sale - FB Ads', spend: '1,500/day', roas: '3.2x', status: 'Active' },
    { id: 'CMP-2', name: 'Retargeting - Google', spend: '500/day', roas: '4.5x', status: 'Active' }
  ]);
  const [isAddCampaignOpen, setIsAddCampaignOpen] = React.useState(false);
  const [newCampaign, setNewCampaign] = React.useState({ name: '', spend: '', roas: '' });

  const [orders, setOrders] = React.useState([
    { id: 'ORD-5092', date: 'Today, 2:30 PM', customer: 'Alice Smith', amount: 3200, status: 'Processing' },
    { id: 'ORD-5091', date: 'Today, 10:15 AM', customer: 'Bob Jones', amount: 1450, status: 'Fulfilled' }
  ]);
  const [isAddOrderOpen, setIsAddOrderOpen] = React.useState(false);
  const [newOrder, setNewOrder] = React.useState({ customer: '', amount: '' });

  const [transactions, setTransactions] = React.useState([
    { id: 'TXN-1', name: 'Payout from Stripe', date: 'Today', amount: 12450.00, type: 'income' },
    { id: 'TXN-2', name: 'Supplier Payment (Leather Goods)', date: 'Yesterday', amount: 8200.00, type: 'expense' },
    { id: 'TXN-3', name: 'Facebook Ads Billing', date: 'Jul 5, 2026', amount: 5000.00, type: 'expense' }
  ]);
  const [isAddTxnOpen, setIsAddTxnOpen] = React.useState(false);
  const [newTxn, setNewTxn] = React.useState({ name: '', amount: '', type: 'income' });

  const handleAddItem = () => {
    if (!newItem.name) return;
    const stock = parseInt(newItem.stock) || 0;
    setInventory([...inventory, {
      id: `INV-${1000 + inventory.length + 1}`,
      name: newItem.name,
      stock: stock,
      status: stock > 20 ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock',
      price: parseFloat(newItem.price) || 0
    }]);
    setNewItem({ name: '', stock: '', price: '' });
    setIsAddOpen(false);
  };

  const handleAddRestock = () => {
    if (!newRestock.item) return;
    setRestockOrders([{
      id: `RST-00${restockOrders.length + 1}`,
      item: newRestock.item,
      quantity: parseInt(newRestock.quantity) || 0,
      date: 'Just now',
      status: 'Pending'
    }, ...restockOrders]);
    setNewRestock({ item: '', quantity: '' });
    setIsAddRestockOpen(false);
  };

  const handleAddCampaign = () => {
    if (!newCampaign.name) return;
    setCampaigns([...campaigns, {
      id: `CMP-${campaigns.length + 1}`,
      name: newCampaign.name,
      spend: newCampaign.spend,
      roas: newCampaign.roas || '0x',
      status: 'Active'
    }]);
    setNewCampaign({ name: '', spend: '', roas: '' });
    setIsAddCampaignOpen(false);
  };

  const handleAddOrder = () => {
    if (!newOrder.customer) return;
    setOrders([{
      id: `ORD-${5092 + orders.length}`,
      date: 'Just now',
      customer: newOrder.customer,
      amount: parseFloat(newOrder.amount) || 0,
      status: 'Processing'
    }, ...orders]);
    setNewOrder({ customer: '', amount: '' });
    setIsAddOrderOpen(false);
  };

  const handleAddTxn = () => {
    if (!newTxn.name) return;
    setTransactions([{
      id: `TXN-${transactions.length + 1}`,
      name: newTxn.name,
      date: 'Just now',
      amount: parseFloat(newTxn.amount) || 0,
      type: newTxn.type
    }, ...transactions]);
    setNewTxn({ name: '', amount: '', type: 'income' });
    setIsAddTxnOpen(false);
  };

  const filteredInventory = inventory.filter(item => item.name.toLowerCase().includes(search.toLowerCase()) || item.id.toLowerCase().includes(search.toLowerCase()));

  if (currentTab === 'business-logistics') {
    return (
      <div className="space-y-6">
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="font-bold text-xl flex items-center gap-2"><Package className={isAdvanced ? 'text-violet-400' : 'text-orange-500'} size={24} /> Inventory</h3>
            <button onClick={() => setIsAddOpen(true)} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>
              <Plus size={16} /> Add Item
            </button>
          </div>

          <div className="mb-6">
             <input 
               type="text" 
               placeholder="Search by ID or Name..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
             />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={`border-b ${isAdvanced ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                  <th className="pb-3 font-medium">Item ID</th>
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium text-right">Stock</th>
                  <th className="pb-3 font-medium text-right">Price</th>
                  <th className="pb-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed dark:divide-slate-700">
                {filteredInventory.map(item => (
                  <tr key={item.id} className={`${isAdvanced ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>
                    <td className="py-4 font-mono text-xs text-slate-500">{item.id}</td>
                    <td className="py-4 font-bold">{item.name}</td>
                    <td className="py-4 text-right">{item.stock}</td>
                    <td className="py-4 text-right">₱{item.price.toLocaleString()}</td>
                    <td className="py-4 text-right">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${item.status === 'In Stock' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : item.status === 'Low Stock' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Restocking Table */}
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="font-bold text-xl flex items-center gap-2"><RefreshCw className={isAdvanced ? 'text-violet-400' : 'text-blue-500'} size={24} /> Logistic Orders / Restocking</h3>
            <button onClick={() => setIsAddRestockOpen(true)} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>
              <Plus size={16} /> Add Restock Order
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={`border-b ${isAdvanced ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                  <th className="pb-3 font-medium">Order ID</th>
                  <th className="pb-3 font-medium">Item Name</th>
                  <th className="pb-3 font-medium text-right">Qty</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed dark:divide-slate-700">
                {restockOrders.map(order => (
                  <tr key={order.id} className={`${isAdvanced ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>
                    <td className="py-4 font-mono text-xs text-slate-500">{order.id}</td>
                    <td className="py-4 font-bold">{order.item}</td>
                    <td className="py-4 text-right">{order.quantity}</td>
                    <td className="py-4 text-slate-500">{order.date}</td>
                    <td className="py-4 text-right">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${order.status === 'Fulfilled' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddOpen(false)}>
            <div className={`w-full max-w-md rounded-3xl p-6 shadow-xl ${isAdvanced ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">Add Inventory Item</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Item Name</label>
                  <input type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Stock Count</label>
                    <input type="number" value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Price (₱)</label>
                    <input type="number" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button onClick={() => setIsAddOpen(false)} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>Cancel</button>
                  <button onClick={handleAddItem} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-violet-600 text-white' : 'bg-emerald-600 text-white'}`}>Save Item</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isAddRestockOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddRestockOpen(false)}>
            <div className={`w-full max-w-md rounded-3xl p-6 shadow-xl ${isAdvanced ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">Add Restock Order</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Item Name</label>
                  <input type="text" value={newRestock.item} onChange={e => setNewRestock({...newRestock, item: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Quantity</label>
                  <input type="number" value={newRestock.quantity} onChange={e => setNewRestock({...newRestock, quantity: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                </div>
                <div className="flex gap-4 mt-6">
                  <button onClick={() => setIsAddRestockOpen(false)} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>Cancel</button>
                  <button onClick={handleAddRestock} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-violet-600 text-white' : 'bg-emerald-600 text-white'}`}>Save Order</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (currentTab === 'business-marketing') {
    return (
      <div className="space-y-6">
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="font-bold text-xl flex items-center gap-2"><Megaphone className={isAdvanced ? 'text-violet-400' : 'text-blue-500'} size={24} /> Marketing Campaigns</h3>
            <button onClick={() => setIsAddCampaignOpen(true)} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>
              <Plus size={16} /> Add Campaign
            </button>
          </div>
          
          {/* Detailed marketing stats */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className={`p-4 rounded-2xl ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
              <p className="text-sm text-slate-500">Total Spend</p>
              <p className="text-2xl font-black">₱45,200</p>
            </div>
            <div className={`p-4 rounded-2xl ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
              <p className="text-sm text-slate-500">Impressions</p>
              <p className="text-2xl font-black">1.2M</p>
            </div>
            <div className={`p-4 rounded-2xl ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
              <p className="text-sm text-slate-500">Avg. CPC</p>
              <p className="text-2xl font-black">₱12.50</p>
            </div>
          </div>
          <div className="space-y-3">
             {campaigns.map(camp => (
               <div key={camp.id} className="flex justify-between items-center p-4 rounded-xl border dark:border-slate-700">
                 <div>
                   <h4 className="font-bold">{camp.name}</h4>
                   <p className="text-xs text-slate-500">{camp.status} • ₱{camp.spend}</p>
                 </div>
                 <span className="text-emerald-500 font-bold">{camp.roas} ROAS</span>
               </div>
             ))}
          </div>
        </div>

        {isAddCampaignOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddCampaignOpen(false)}>
            <div className={`w-full max-w-md rounded-3xl p-6 shadow-xl ${isAdvanced ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">Add Campaign</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Campaign Name</label>
                  <input type="text" value={newCampaign.name} onChange={e => setNewCampaign({...newCampaign, name: e.target.value})} placeholder="e.g. Meta Conversions" className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Daily Spend</label>
                    <input type="text" value={newCampaign.spend} onChange={e => setNewCampaign({...newCampaign, spend: e.target.value})} placeholder="e.g. 500/day" className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Target ROAS</label>
                    <input type="text" value={newCampaign.roas} onChange={e => setNewCampaign({...newCampaign, roas: e.target.value})} placeholder="e.g. 2.0x" className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button onClick={() => setIsAddCampaignOpen(false)} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>Cancel</button>
                  <button onClick={handleAddCampaign} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-violet-600 text-white' : 'bg-emerald-600 text-white'}`}>Save Campaign</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (currentTab === 'business-ordering') {
    return (
      <div className="space-y-6">
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="font-bold text-xl flex items-center gap-2"><ShoppingCart className={isAdvanced ? 'text-violet-400' : 'text-emerald-500'} size={24} /> Recent Orders</h3>
            <button onClick={() => setIsAddOrderOpen(true)} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>
              <Plus size={16} /> Add Order
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={`border-b ${isAdvanced ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                  <th className="pb-3 font-medium">Order ID</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium text-right">Amount</th>
                  <th className="pb-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed dark:divide-slate-700">
                {orders.map(order => (
                  <tr key={order.id} className={`${isAdvanced ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>
                    <td className="py-4 font-mono text-xs text-slate-500">{order.id}</td>
                    <td className="py-4 text-slate-500">{order.date}</td>
                    <td className="py-4 font-bold">{order.customer}</td>
                    <td className="py-4 text-right">₱{order.amount.toLocaleString()}</td>
                    <td className="py-4 text-right">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${order.status === 'Fulfilled' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isAddOrderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddOrderOpen(false)}>
            <div className={`w-full max-w-md rounded-3xl p-6 shadow-xl ${isAdvanced ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">Add Customer Order</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Customer Name</label>
                  <input type="text" value={newOrder.customer} onChange={e => setNewOrder({...newOrder, customer: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Amount (₱)</label>
                  <input type="number" value={newOrder.amount} onChange={e => setNewOrder({...newOrder, amount: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                </div>
                <div className="flex gap-4 mt-6">
                  <button onClick={() => setIsAddOrderOpen(false)} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>Cancel</button>
                  <button onClick={handleAddOrder} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-violet-600 text-white' : 'bg-emerald-600 text-white'}`}>Save Order</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (currentTab === 'business-transactions') {
    return (
      <div className="space-y-6">
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="font-bold text-xl flex items-center gap-2"><Activity className={isAdvanced ? 'text-violet-400' : 'text-indigo-500'} size={24} /> Financial Transactions</h3>
            <button onClick={() => setIsAddTxnOpen(true)} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>
              <Plus size={16} /> Add Transaction
            </button>
          </div>
          <div className="space-y-4">
             {transactions.map(txn => (
               <div key={txn.id} className="flex justify-between items-center p-4 rounded-xl border dark:border-slate-700">
                 <div>
                   <h4 className="font-bold">{txn.name}</h4>
                   <p className="text-xs text-slate-500">{txn.date}</p>
                 </div>
                 <span className={`font-bold ${txn.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                   {txn.type === 'income' ? '+' : '-'}₱{txn.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                 </span>
               </div>
             ))}
          </div>
        </div>

        {isAddTxnOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddTxnOpen(false)}>
            <div className={`w-full max-w-md rounded-3xl p-6 shadow-xl ${isAdvanced ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">Add Transaction</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                  <input type="text" value={newTxn.name} onChange={e => setNewTxn({...newTxn, name: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                    <select value={newTxn.type} onChange={e => setNewTxn({...newTxn, type: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Amount (₱)</label>
                    <input type="number" value={newTxn.amount} onChange={e => setNewTxn({...newTxn, amount: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button onClick={() => setIsAddTxnOpen(false)} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>Cancel</button>
                  <button onClick={handleAddTxn} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-violet-600 text-white' : 'bg-emerald-600 text-white'}`}>Save</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Total Sales (Monthly)</p>
          <p className="font-black text-2xl">₱{(business?.mrr || 124500).toLocaleString()}</p>
          <p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={12} /> +12.5% this month</p>
        </div>
        <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Orders</p>
          <p className="font-black text-2xl">{business?.customers || 156}</p>
          <p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={12} /> +5.2% this month</p>
        </div>
        <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Avg Order Value</p>
          <p className="font-black text-2xl">₱798</p>
          <p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={12} /> +1.2% this month</p>
        </div>
        <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Low Stock</p>
          <p className="font-black text-2xl text-rose-500">3</p>
          <p className="text-[10px] text-rose-500 font-bold mt-2">Requires attention</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Megaphone className={isAdvanced ? 'text-violet-400' : 'text-blue-500'} size={20} /> Marketing</h3>
          <div className="space-y-3">
            <div className={`p-3 rounded-xl ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
              <p className="text-xs text-slate-500 mb-1">Active Ad Spend</p>
              <p className="font-bold">₱15,000</p>
            </div>
            <div className={`p-3 rounded-xl ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
              <p className="text-xs text-slate-500 mb-1">ROAS (Return on Ad Spend)</p>
              <p className="font-bold text-emerald-500">2.4x</p>
            </div>
          </div>
        </div>
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Package className={isAdvanced ? 'text-violet-400' : 'text-orange-500'} size={20} /> Top Products</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-2 border-b border-dashed dark:border-slate-700">
               <span className="text-sm">Premium Leather Wallet</span>
               <span className="text-sm font-bold text-emerald-500">120 sold</span>
            </div>
            <div className="flex justify-between items-center p-2 border-b border-dashed dark:border-slate-700">
               <span className="text-sm">Minimalist Watch</span>
               <span className="text-sm font-bold text-emerald-500">45 sold</span>
            </div>
            <div className="flex justify-between items-center p-2 border-b border-dashed dark:border-slate-700">
               <span className="text-sm">Canvas Backpack</span>
               <span className="text-sm font-bold text-emerald-500">32 sold</span>
            </div>
          </div>
        </div>
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><ShoppingCart className={isAdvanced ? 'text-violet-400' : 'text-emerald-500'} size={20} /> Pending Orders</h3>
          <div className="space-y-3">
             <div className={`p-4 rounded-xl flex justify-between items-center ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                <div>
                   <p className="text-sm font-bold">New Orders (Today)</p>
                   <p className="text-xs text-slate-500">To be fulfilled</p>
                </div>
                <p className="font-black text-2xl text-orange-500">24</p>
             </div>
             <button onClick={() => onNavigate('business-ordering')} className={`w-full py-2 rounded-xl text-sm font-bold ${isAdvanced ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}>
               View Orders
             </button>
          </div>
        </div>
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Activity className={isAdvanced ? 'text-violet-400' : 'text-indigo-500'} size={20} /> Recent Transactions</h3>
          <div className="space-y-3">
             <div className="flex justify-between text-sm p-2 border-b border-dashed dark:border-slate-700">
               <span>Order #1029</span>
               <span className="font-bold text-emerald-500">+₱1,200</span>
             </div>
             <div className="flex justify-between text-sm p-2 border-b border-dashed dark:border-slate-700">
               <span>Order #1028</span>
               <span className="font-bold text-emerald-500">+₱850</span>
             </div>
             <div className="flex justify-between text-sm p-2 border-b border-dashed dark:border-slate-700">
               <span>Meta Ads Billing</span>
               <span className="font-bold text-rose-500">-₱5,000</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function SaaSDashboard({ business, isAdvanced, currentTab, onNavigate }: any) {
  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false);
  const [users, setUsers] = React.useState([
    { id: 'USR-01', email: 'john@example.com', plan: 'Pro', status: 'Active' },
    { id: 'USR-02', email: 'sarah@test.com', plan: 'Basic', status: 'Trial' }
  ]);
  const [newUser, setNewUser] = React.useState({ email: '', plan: 'Basic' });

  const handleAddUser = () => {
    if (!newUser.email) return;
    setUsers([{
      id: `USR-${10 + users.length}`,
      email: newUser.email,
      plan: newUser.plan,
      status: 'Active'
    }, ...users]);
    setIsAddUserOpen(false);
    setNewUser({ email: '', plan: 'Basic' });
  };

  const [isAddCampaignOpen, setIsAddCampaignOpen] = React.useState(false);
  const [campaigns, setCampaigns] = React.useState([
    { id: 'CMP-1', name: 'Google Search Ads', spend: 12000, signups: 145 },
    { id: 'CMP-2', name: 'Twitter Sponsored', spend: 5000, signups: 32 }
  ]);
  const [newCampaign, setNewCampaign] = React.useState({ name: '', spend: '' });

  const handleAddCampaign = () => {
    if (!newCampaign.name) return;
    setCampaigns([{
      id: `CMP-${campaigns.length + 1}`,
      name: newCampaign.name,
      spend: parseFloat(newCampaign.spend) || 0,
      signups: 0
    }, ...campaigns]);
    setIsAddCampaignOpen(false);
    setNewCampaign({ name: '', spend: '' });
  };

  const [isAddExpenseOpen, setIsAddExpenseOpen] = React.useState(false);
  const [expenses, setExpenses] = React.useState([
    { id: 'EXP-1', name: 'Claude API', category: 'AI Tools', amount: 4500, frequency: 'Monthly' },
    { id: 'EXP-2', name: 'AWS Hosting', category: 'Infrastructure', amount: 12500, frequency: 'Monthly' },
    { id: 'EXP-3', name: 'Vercel', category: 'Infrastructure', amount: 1500, frequency: 'Monthly' },
    { id: 'EXP-4', name: 'GitHub Copilot', category: 'Tools', amount: 500, frequency: 'Monthly' },
  ]);
  const [newExpense, setNewExpense] = React.useState({ name: '', category: 'Tools', amount: '', frequency: 'Monthly' });

  const handleAddExpense = () => {
    if (!newExpense.name) return;
    setExpenses([{
      id: `EXP-${expenses.length + 1}`,
      name: newExpense.name,
      category: newExpense.category,
      amount: parseFloat(newExpense.amount) || 0,
      frequency: newExpense.frequency
    }, ...expenses]);
    setIsAddExpenseOpen(false);
    setNewExpense({ name: '', category: 'Tools', amount: '', frequency: 'Monthly' });
  };

  if (currentTab === 'business-mrr') {
    return (
      <div className="space-y-6">
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <h3 className="font-bold text-xl mb-6 flex items-center gap-2"><Activity className={isAdvanced ? 'text-violet-400' : 'text-blue-500'} size={24} /> MRR & Churn Metrics</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className={`p-6 rounded-2xl ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
              <p className="text-sm text-slate-500 mb-1">Total MRR</p>
              <p className="font-black text-3xl text-emerald-500">₱{business.mrr.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-2">+12% from last month</p>
            </div>
            <div className={`p-6 rounded-2xl ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
              <p className="text-sm text-slate-500 mb-1">Revenue Churn</p>
              <p className="font-black text-3xl text-rose-500">4.2%</p>
              <p className="text-xs text-slate-500 mt-2">-0.5% from last month</p>
            </div>
            <div className={`p-6 rounded-2xl ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
              <p className="text-sm text-slate-500 mb-1">ARPU</p>
              <p className="font-black text-3xl">₱{(business.mrr / Math.max(1, business.customers)).toFixed(0)}</p>
            </div>
            <div className={`p-6 rounded-2xl ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
              <p className="text-sm text-slate-500 mb-1">LTV (Lifetime Value)</p>
              <p className="font-black text-3xl">₱{((business.mrr / Math.max(1, business.customers)) / 0.042).toFixed(0)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentTab === 'business-users') {
    return (
      <div className="space-y-6">
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="font-bold text-xl flex items-center gap-2"><Users className={isAdvanced ? 'text-violet-400' : 'text-indigo-500'} size={24} /> Subscriptions</h3>
            <button onClick={() => setIsAddUserOpen(true)} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>
              <Plus size={16} /> Add User
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={`border-b ${isAdvanced ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                  <th className="pb-3 font-medium">User ID</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Plan</th>
                  <th className="pb-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed dark:divide-slate-700">
                {users.map(u => (
                  <tr key={u.id} className={`${isAdvanced ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>
                    <td className="py-4 font-mono text-xs text-slate-500">{u.id}</td>
                    <td className="py-4 font-bold">{u.email}</td>
                    <td className="py-4">{u.plan}</td>
                    <td className="py-4 text-right">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${u.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'}`}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isAddUserOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddUserOpen(false)}>
            <div className={`w-full max-w-md rounded-3xl p-6 shadow-xl ${isAdvanced ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">Add Subscription</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                  <input type="text" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Plan</label>
                  <select value={newUser.plan} onChange={e => setNewUser({...newUser, plan: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                    <option value="Basic">Basic</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="flex gap-4 mt-6">
                  <button onClick={() => setIsAddUserOpen(false)} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>Cancel</button>
                  <button onClick={handleAddUser} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-violet-600 text-white' : 'bg-emerald-600 text-white'}`}>Save</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (currentTab === 'business-acquisition') {
    return (
      <div className="space-y-6">
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="font-bold text-xl flex items-center gap-2"><Megaphone className={isAdvanced ? 'text-violet-400' : 'text-orange-500'} size={24} /> Acquisition</h3>
            <button onClick={() => setIsAddCampaignOpen(true)} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>
              <Plus size={16} /> Add Campaign
            </button>
          </div>
          
          <div className="space-y-4">
            {campaigns.map(c => (
              <div key={c.id} className="flex justify-between items-center p-4 rounded-xl border dark:border-slate-700">
                <div>
                  <h4 className="font-bold">{c.name}</h4>
                  <p className="text-xs text-slate-500">Spend: ₱{c.spend.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-500">{c.signups} Signups</p>
                  <p className="text-xs text-slate-500">CAC: ₱{(c.spend / Math.max(1, c.signups)).toFixed(0)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {isAddCampaignOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddCampaignOpen(false)}>
            <div className={`w-full max-w-md rounded-3xl p-6 shadow-xl ${isAdvanced ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">Add Campaign</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Campaign Name</label>
                  <input type="text" value={newCampaign.name} onChange={e => setNewCampaign({...newCampaign, name: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Spend (₱)</label>
                  <input type="number" value={newCampaign.spend} onChange={e => setNewCampaign({...newCampaign, spend: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                </div>
                <div className="flex gap-4 mt-6">
                  <button onClick={() => setIsAddCampaignOpen(false)} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>Cancel</button>
                  <button onClick={handleAddCampaign} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-violet-600 text-white' : 'bg-emerald-600 text-white'}`}>Save</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }


  if (currentTab === 'business-expenditure') {
    const totalMonthly = expenses.filter(e => e.frequency === 'Monthly').reduce((acc, curr) => acc + curr.amount, 0);
    const totalAnnual = expenses.filter(e => e.frequency === 'Yearly').reduce((acc, curr) => acc + curr.amount, 0);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-xl">Tools & Subscriptions</h3>
          <button onClick={() => setIsAddExpenseOpen(true)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isAdvanced ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-violet-900/20' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
            <Plus size={16} /> Add Expense
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <p className="text-sm font-bold text-slate-500 mb-2">Monthly Expenditure</p>
            <p className="font-black text-3xl text-rose-500">₱{totalMonthly.toLocaleString()}</p>
          </div>
          <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <p className="text-sm font-bold text-slate-500 mb-2">Annual Expenditure</p>
            <p className="font-black text-3xl text-rose-500">₱{totalAnnual.toLocaleString()}</p>
          </div>
        </div>

        {isAddExpenseOpen && (
          <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold">New Subscription/Tool</h4>
              <button onClick={() => setIsAddExpenseOpen(false)} className="text-slate-500 hover:text-slate-700"><X size={20} /></button>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <input 
                type="text"
                placeholder="Name (e.g., Claude API)"
                value={newExpense.name}
                onChange={(e) => setNewExpense({...newExpense, name: e.target.value})}
                className={`w-full p-3 rounded-xl border ${isAdvanced ? 'bg-slate-900/50 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
              <select
                value={newExpense.category}
                onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                className={`w-full p-3 rounded-xl border ${isAdvanced ? 'bg-slate-900/50 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              >
                <option value="Tools">Tools</option>
                <option value="AI Tools">AI Tools</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Marketing">Marketing</option>
                <option value="Other">Other</option>
              </select>
              <input 
                type="number"
                placeholder="Amount (₱)"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                className={`w-full p-3 rounded-xl border ${isAdvanced ? 'bg-slate-900/50 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
              <select
                value={newExpense.frequency}
                onChange={(e) => setNewExpense({...newExpense, frequency: e.target.value})}
                className={`w-full p-3 rounded-xl border ${isAdvanced ? 'bg-slate-900/50 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              >
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
                <option value="One-time">One-time</option>
              </select>
            </div>
            <div className="flex justify-end">
              <button onClick={handleAddExpense} className={`px-6 py-2 rounded-xl text-sm font-bold ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>
                Save Expense
              </button>
            </div>
          </div>
        )}

        <div className={`rounded-3xl border overflow-hidden ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={`${isAdvanced ? 'bg-slate-900/50 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                <tr>
                  <th className="p-4 font-medium">Tool / Subscription</th>
                  <th className="p-4 font-medium">Category</th>
                  <th className="p-4 font-medium">Amount</th>
                  <th className="p-4 font-medium">Frequency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {expenses.map((expense) => (
                  <tr key={expense.id} className={`${isAdvanced ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50/50'}`}>
                    <td className="p-4 font-medium">{expense.name}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${isAdvanced ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{expense.category}</span></td>
                    <td className="p-4 font-bold text-rose-500">₱{expense.amount.toLocaleString()}</td>
                    <td className="p-4">{expense.frequency}</td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      No expenses recorded. Add your first tool or subscription!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Total MRR</p>
          <p className="font-black text-2xl">₱{business.mrr.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={12} /> +8.4% this month</p>
        </div>
        <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Active Users</p>
          <p className="font-black text-2xl">{business.customers}</p>
          <p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={12} /> +12.1% this month</p>
        </div>
        <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Churn Rate</p>
          <p className="font-black text-2xl text-rose-500">4.2%</p>
          <p className="text-[10px] text-rose-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={12} /> +0.5% this month</p>
        </div>
        <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">ARPU</p>
          <p className="font-black text-2xl">₱{(business.mrr / Math.max(1, business.customers)).toFixed(0)}</p>
          <p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={12} /> +2.1% this month</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Activity className={isAdvanced ? 'text-violet-400' : 'text-blue-500'} size={20} /> Subscription Activity</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
               <span>New Signups (Today)</span>
               <span className="font-bold">+12</span>
            </div>
            <div className="flex justify-between text-sm p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
               <span>Upgrades to Pro</span>
               <span className="font-bold">+4</span>
            </div>
            <div className="flex justify-between text-sm p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400">
               <span>Cancellations</span>
               <span className="font-bold">-2</span>
            </div>
          </div>
        </div>
        
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Users className={isAdvanced ? 'text-violet-400' : 'text-indigo-500'} size={20} /> User Pipeline</h3>
          <div className="space-y-3">
             <div className="flex justify-between items-center p-2 border-b border-dashed dark:border-slate-700">
               <span className="text-sm">Trial Users</span>
               <span className="text-sm font-bold text-amber-500">45</span>
             </div>
             <div className="flex justify-between items-center p-2 border-b border-dashed dark:border-slate-700">
               <span className="text-sm">Expiring Trials (Next 7 days)</span>
               <span className="text-sm font-bold text-rose-500">12</span>
             </div>
             <div className="flex justify-between items-center p-2 border-b border-dashed dark:border-slate-700">
               <span className="text-sm">Active Subscribers</span>
               <span className="text-sm font-bold">{business.customers}</span>
             </div>
          </div>
        </div>

        <div className={`p-6 rounded-3xl border shadow-sm md:col-span-2 ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2"><Megaphone className={isAdvanced ? 'text-violet-400' : 'text-orange-500'} size={20} /> Marketing & Acquisition</h3>
            <button onClick={() => onNavigate('business-acquisition')} className={`text-sm font-bold ${isAdvanced ? 'text-violet-400 hover:text-violet-300' : 'text-slate-600 hover:text-slate-900'}`}>View Details</button>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
             <div className={`p-4 rounded-xl ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
               <p className="text-xs text-slate-500 mb-1">Customer Acquisition Cost</p>
               <p className="font-bold text-xl">₱450</p>
               <p className="text-[10px] text-emerald-500 mt-1">-5% vs last month</p>
             </div>
             <div className={`p-4 rounded-xl ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
               <p className="text-xs text-slate-500 mb-1">Organic Traffic</p>
               <p className="font-bold text-xl">12,450 /mo</p>
               <p className="text-[10px] text-emerald-500 mt-1">+15% vs last month</p>
             </div>
             <div className={`p-4 rounded-xl ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
               <p className="text-xs text-slate-500 mb-1">Trial Conversion Rate</p>
               <p className="font-bold text-xl">12.8%</p>
               <p className="text-[10px] text-emerald-500 mt-1">+1.2% vs last month</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgencyDashboard({ business, isAdvanced, currentTab, onNavigate }: any) {
  const [isAddClientOpen, setIsAddClientOpen] = React.useState(false);
  const [clients, setClients] = React.useState([
    { id: 'CLI-1', name: 'Client A', type: 'Retainer', revenue: 40000, status: 'Active' },
    { id: 'CLI-2', name: 'Client B', type: 'Project', revenue: 150000, status: 'In Progress' }
  ]);
  const [newClient, setNewClient] = React.useState({ name: '', type: 'Retainer', revenue: '' });

  const handleAddClient = () => {
    if (!newClient.name) return;
    setClients([{
      id: `CLI-${clients.length + 1}`,
      name: newClient.name,
      type: newClient.type,
      revenue: parseFloat(newClient.revenue) || 0,
      status: 'Active'
    }, ...clients]);
    setIsAddClientOpen(false);
    setNewClient({ name: '', type: 'Retainer', revenue: '' });
  };

  const [isAddLeadOpen, setIsAddLeadOpen] = React.useState(false);
  const [leads, setLeads] = React.useState([
    { id: 'LD-1', name: 'TechStartup Inc', status: 'Hot', value: 250000 },
    { id: 'LD-2', name: 'Local Bakery', status: 'Warm', value: 30000 }
  ]);
  const [newLead, setNewLead] = React.useState({ name: '', status: 'Warm', value: '' });

  const handleAddLead = () => {
    if (!newLead.name) return;
    setLeads([{
      id: `LD-${leads.length + 1}`,
      name: newLead.name,
      status: newLead.status,
      value: parseFloat(newLead.value) || 0
    }, ...leads]);
    setIsAddLeadOpen(false);
    setNewLead({ name: '', status: 'Warm', value: '' });
  };

  const [isAddProposalOpen, setIsAddProposalOpen] = React.useState(false);
  const [proposals, setProposals] = React.useState([
    { id: 'PRP-1', title: 'Website Redesign - XYZ Corp', status: 'Pending', value: 120000 },
    { id: 'PRP-2', title: 'SEO Audit - ABC Inc', status: 'Accepted', value: 25000 }
  ]);
  const [newProposal, setNewProposal] = React.useState({ title: '', status: 'Pending', value: '' });

  const handleAddProposal = () => {
    if (!newProposal.title) return;
    setProposals([{
      id: `PRP-${proposals.length + 1}`,
      title: newProposal.title,
      status: newProposal.status,
      value: parseFloat(newProposal.value) || 0
    }, ...proposals]);
    setIsAddProposalOpen(false);
    setNewProposal({ title: '', status: 'Pending', value: '' });
  };

  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = React.useState(false);
  const [invoices, setInvoices] = React.useState([
    { id: 'INV-001', client: 'Client A', status: 'Paid', amount: 40000 },
    { id: 'INV-002', client: 'Client B', status: 'Overdue', amount: 75000 }
  ]);
  const [newInvoice, setNewInvoice] = React.useState({ client: '', status: 'Sent', amount: '' });

  const handleAddInvoice = () => {
    if (!newInvoice.client) return;
    setInvoices([{
      id: `INV-${String(invoices.length + 1).padStart(3, '0')}`,
      client: newInvoice.client,
      status: newInvoice.status,
      amount: parseFloat(newInvoice.amount) || 0
    }, ...invoices]);
    setIsAddInvoiceOpen(false);
    setNewInvoice({ client: '', status: 'Sent', amount: '' });
  };

  if (currentTab === 'business-clients') {
    return (
      <div className="space-y-6">
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="font-bold text-xl flex items-center gap-2"><Users className={isAdvanced ? 'text-violet-400' : 'text-blue-500'} size={24} /> Active Clients</h3>
            <button onClick={() => setIsAddClientOpen(true)} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>
              <Plus size={16} /> Add Client
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={`border-b ${isAdvanced ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                  <th className="pb-3 font-medium">Client</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium text-right">Revenue</th>
                  <th className="pb-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed dark:divide-slate-700">
                {clients.map(c => (
                  <tr key={c.id} className={`${isAdvanced ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>
                    <td className="py-4 font-bold">{c.name}</td>
                    <td className="py-4 text-slate-500">{c.type}</td>
                    <td className="py-4 text-right font-mono">₱{c.revenue.toLocaleString()}</td>
                    <td className="py-4 text-right">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isAddClientOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddClientOpen(false)}>
            <div className={`w-full max-w-md rounded-3xl p-6 shadow-xl ${isAdvanced ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">Add Client</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Client Name</label>
                  <input type="text" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                    <select value={newClient.type} onChange={e => setNewClient({...newClient, type: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                      <option value="Retainer">Retainer</option>
                      <option value="Project">Project</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Revenue (₱)</label>
                    <input type="number" value={newClient.revenue} onChange={e => setNewClient({...newClient, revenue: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button onClick={() => setIsAddClientOpen(false)} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>Cancel</button>
                  <button onClick={handleAddClient} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-violet-600 text-white' : 'bg-emerald-600 text-white'}`}>Save</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (currentTab === 'business-pipeline') {
    return (
      <div className="space-y-6">
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="font-bold text-xl flex items-center gap-2"><Briefcase className={isAdvanced ? 'text-violet-400' : 'text-indigo-500'} size={24} /> Pipeline</h3>
            <button onClick={() => setIsAddLeadOpen(true)} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>
              <Plus size={16} /> Add Lead
            </button>
          </div>
          
          <div className="space-y-4">
            {leads.map(l => (
              <div key={l.id} className="flex justify-between items-center p-4 rounded-xl border dark:border-slate-700">
                <div>
                  <h4 className="font-bold">{l.name}</h4>
                  <p className="text-xs text-slate-500">Value: ₱{l.value.toLocaleString()}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${l.status === 'Hot' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'}`}>
                  {l.status} Lead
                </span>
              </div>
            ))}
          </div>
        </div>

        {isAddLeadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddLeadOpen(false)}>
            <div className={`w-full max-w-md rounded-3xl p-6 shadow-xl ${isAdvanced ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">Add Lead</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Lead Name</label>
                  <input type="text" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                    <select value={newLead.status} onChange={e => setNewLead({...newLead, status: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                      <option value="Hot">Hot</option>
                      <option value="Warm">Warm</option>
                      <option value="Cold">Cold</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Value (₱)</label>
                    <input type="number" value={newLead.value} onChange={e => setNewLead({...newLead, value: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button onClick={() => setIsAddLeadOpen(false)} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>Cancel</button>
                  <button onClick={handleAddLead} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-violet-600 text-white' : 'bg-emerald-600 text-white'}`}>Save</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (currentTab === 'business-proposals') {
    return (
      <div className="space-y-6">
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="font-bold text-xl flex items-center gap-2"><FileText className={isAdvanced ? 'text-violet-400' : 'text-rose-500'} size={24} /> Proposals</h3>
            <button onClick={() => setIsAddProposalOpen(true)} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>
              <Plus size={16} /> Add Proposal
            </button>
          </div>
          
          <div className="space-y-4">
            {proposals.map(p => (
              <div key={p.id} className="flex justify-between items-center p-4 rounded-xl border dark:border-slate-700">
                <div>
                  <h4 className="font-bold">{p.title}</h4>
                  <p className="text-xs text-slate-500">Value: ₱{p.value.toLocaleString()}</p>
                </div>
                <span className={`font-bold ${p.status === 'Accepted' ? 'text-emerald-500' : p.status === 'Pending' ? 'text-amber-500' : 'text-slate-500'}`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {isAddProposalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddProposalOpen(false)}>
            <div className={`w-full max-w-md rounded-3xl p-6 shadow-xl ${isAdvanced ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">Add Proposal</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Proposal Title</label>
                  <input type="text" value={newProposal.title} onChange={e => setNewProposal({...newProposal, title: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                    <select value={newProposal.status} onChange={e => setNewProposal({...newProposal, status: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                      <option value="Pending">Pending</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Value (₱)</label>
                    <input type="number" value={newProposal.value} onChange={e => setNewProposal({...newProposal, value: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button onClick={() => setIsAddProposalOpen(false)} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>Cancel</button>
                  <button onClick={handleAddProposal} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-violet-600 text-white' : 'bg-emerald-600 text-white'}`}>Save</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (currentTab === 'business-invoices') {
    return (
      <div className="space-y-6">
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="font-bold text-xl flex items-center gap-2"><DollarSign className={isAdvanced ? 'text-violet-400' : 'text-emerald-500'} size={24} /> Invoices</h3>
            <button onClick={() => setIsAddInvoiceOpen(true)} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>
              <Plus size={16} /> Add Invoice
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={`border-b ${isAdvanced ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                  <th className="pb-3 font-medium">Inv ID</th>
                  <th className="pb-3 font-medium">Client</th>
                  <th className="pb-3 font-medium text-right">Amount</th>
                  <th className="pb-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed dark:divide-slate-700">
                {invoices.map(inv => (
                  <tr key={inv.id} className={`${isAdvanced ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>
                    <td className="py-4 font-mono text-xs text-slate-500">{inv.id}</td>
                    <td className="py-4 font-bold">{inv.client}</td>
                    <td className="py-4 text-right">₱{inv.amount.toLocaleString()}</td>
                    <td className="py-4 text-right">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : inv.status === 'Overdue' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isAddInvoiceOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddInvoiceOpen(false)}>
            <div className={`w-full max-w-md rounded-3xl p-6 shadow-xl ${isAdvanced ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">Add Invoice</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Client Name</label>
                  <input type="text" value={newInvoice.client} onChange={e => setNewInvoice({...newInvoice, client: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                    <select value={newInvoice.status} onChange={e => setNewInvoice({...newInvoice, status: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                      <option value="Draft">Draft</option>
                      <option value="Sent">Sent</option>
                      <option value="Paid">Paid</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Amount (₱)</label>
                    <input type="number" value={newInvoice.amount} onChange={e => setNewInvoice({...newInvoice, amount: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button onClick={() => setIsAddInvoiceOpen(false)} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>Cancel</button>
                  <button onClick={handleAddInvoice} className={`flex-1 py-3 rounded-xl font-bold ${isAdvanced ? 'bg-violet-600 text-white' : 'bg-emerald-600 text-white'}`}>Save</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Total Revenue</p>
          <p className="font-black text-2xl">₱{(business?.mrr || 245000).toLocaleString()}</p>
          <p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={12} /> +18.4% this month</p>
        </div>
        <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Active Clients</p>
          <p className="font-black text-2xl">{business?.customers || 12}</p>
          <p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={12} /> +2 this month</p>
        </div>
        <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Pipeline Value</p>
          <p className="font-black text-2xl">₱380,000</p>
          <p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={12} /> +12% this month</p>
        </div>
        <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Outstanding Inv</p>
          <p className="font-black text-2xl text-amber-500">₱75,000</p>
          <p className="text-[10px] text-rose-500 font-bold mt-2 flex items-center gap-1">2 invoices overdue</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2"><Users className={isAdvanced ? 'text-violet-400' : 'text-blue-500'} size={20} /> Top Clients</h3>
            <button onClick={() => onNavigate('business-clients')} className={`text-sm font-bold ${isAdvanced ? 'text-violet-400 hover:text-violet-300' : 'text-slate-600 hover:text-slate-900'}`}>View All</button>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-2 border-b border-dashed dark:border-slate-700">
               <div>
                  <p className="text-sm font-bold">Client A</p>
                  <p className="text-xs text-slate-500">Retainer</p>
               </div>
               <span className="text-sm font-bold text-emerald-500">₱40,000/mo</span>
            </div>
            <div className="flex justify-between items-center p-2 border-b border-dashed dark:border-slate-700">
               <div>
                  <p className="text-sm font-bold">Client B</p>
                  <p className="text-xs text-slate-500">Project Based</p>
               </div>
               <span className="text-sm font-bold text-blue-500">₱150,000 Total</span>
            </div>
            <div className="flex justify-between items-center p-2 border-b border-dashed dark:border-slate-700">
               <div>
                  <p className="text-sm font-bold">Client C</p>
                  <p className="text-xs text-slate-500">Retainer</p>
               </div>
               <span className="text-sm font-bold text-emerald-500">₱25,000/mo</span>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2"><Briefcase className={isAdvanced ? 'text-violet-400' : 'text-indigo-500'} size={20} /> Pipeline Overview</h3>
            <button onClick={() => onNavigate('business-pipeline')} className={`text-sm font-bold ${isAdvanced ? 'text-violet-400 hover:text-violet-300' : 'text-slate-600 hover:text-slate-900'}`}>Manage Leads</button>
          </div>
          <div className="space-y-3">
             <div className={`p-3 rounded-xl flex justify-between items-center ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                <div>
                   <p className="text-sm font-bold">Hot Leads</p>
                   <p className="text-xs text-slate-500">High probability to close</p>
                </div>
                <p className="font-black text-xl text-orange-500">3</p>
             </div>
             <div className={`p-3 rounded-xl flex justify-between items-center ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                <div>
                   <p className="text-sm font-bold">Warm Leads</p>
                   <p className="text-xs text-slate-500">In discussion/discovery</p>
                </div>
                <p className="font-black text-xl text-yellow-500">8</p>
             </div>
             <div className={`p-3 rounded-xl flex justify-between items-center ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                <div>
                   <p className="text-sm font-bold">Cold Leads</p>
                   <p className="text-xs text-slate-500">Initial contact</p>
                </div>
                <p className="font-black text-xl text-slate-500">12</p>
             </div>
          </div>
        </div>

        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText className={isAdvanced ? 'text-violet-400' : 'text-rose-500'} size={20} /> Recent Proposals</h3>
          <div className="space-y-3">
             <div className="flex justify-between text-sm p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
               <span className="font-bold">Website Redesign - XYZ Corp</span>
               <span>Pending (₱120k)</span>
             </div>
             <div className="flex justify-between text-sm p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
               <span className="font-bold">SEO Audit - ABC Inc</span>
               <span>Accepted (₱25k)</span>
             </div>
             <div className="flex justify-between text-sm p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400">
               <span className="font-bold">App Dev - Startup LLC</span>
               <span>Drafting (₱350k)</span>
             </div>
          </div>
        </div>

        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><DollarSign className={isAdvanced ? 'text-violet-400' : 'text-emerald-500'} size={20} /> Financial Status</h3>
          <div className="space-y-3">
             <div className="flex justify-between text-sm p-2 border-b border-dashed dark:border-slate-700">
               <span>Collected this month</span>
               <span className="font-bold text-emerald-500">₱140,000</span>
             </div>
             <div className="flex justify-between text-sm p-2 border-b border-dashed dark:border-slate-700">
               <span>Outstanding (Sent)</span>
               <span className="font-bold text-amber-500">₱105,000</span>
             </div>
             <div className="flex justify-between text-sm p-2 border-b border-dashed dark:border-slate-700">
               <span>Overdue</span>
               <span className="font-bold text-rose-500">₱75,000</span>
             </div>
             <button onClick={() => onNavigate('business-invoices')} className={`w-full mt-2 py-2 rounded-xl text-sm font-bold ${isAdvanced ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}>
               Manage Invoices
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}



