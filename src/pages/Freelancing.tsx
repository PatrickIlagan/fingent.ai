import React, { useState, useEffect } from 'react';
import { Briefcase, Clock, Plus, Play, Square, FileText, ArrowUpRight, MoreVertical } from 'lucide-react';
import { useStore } from '../store/useStore';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

export function Freelancing({ currentTab, onNavigate }: any) {
  const { themeMode } = useStore();
  const isAdvanced = themeMode === 'advanced';

  const [activeTab, setActiveTab] = useState('overview');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timeLogs, setTimeLogs] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('fingent-time-logs') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else if (!isTimerRunning && timerSeconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTimer = () => {
    if (!isTimerRunning) {
      setIsTimerRunning(true);
      return;
    }

    setIsTimerRunning(false);
    if (timerSeconds > 0) {
      const description = window.prompt('What did you work on during this session?')?.trim();
      setTimeLogs((logs) => [{
        id: Date.now(),
        description: description || 'Untitled work session',
        duration: timerSeconds,
        date: new Date().toISOString(),
      }, ...logs]);
    }
    setTimerSeconds(0);
  };

  useEffect(() => {
    localStorage.setItem('fingent-time-logs', JSON.stringify(timeLogs));
  }, [timeLogs]);

  const incomeData = [
    { month: 'Jan', hourly: 25000, fixed: 45000, retainer: 30000 },
    { month: 'Feb', hourly: 32000, fixed: 15000, retainer: 30000 },
    { month: 'Mar', hourly: 28000, fixed: 60000, retainer: 30000 },
    { month: 'Apr', hourly: 41000, fixed: 20000, retainer: 45000 },
    { month: 'May', hourly: 35000, fixed: 40000, retainer: 45000 },
    { month: 'Jun', hourly: 39000, fixed: 55000, retainer: 45000 },
  ];

  const gigs = [
    { id: 1, name: 'Web App MVP', client: 'TechStart Inc', type: 'Fixed Price', status: 'In Progress', progress: 65, value: 120000, deadline: 'Aug 15, 2026', nextMilestone: 'Backend API Integration' },
    { id: 2, name: 'UI/UX Consulting', client: 'Global Media', type: 'Hourly', status: 'Active', rate: 1500, hoursLogged: 24.5, cap: 40 },
    { id: 3, name: 'Monthly Maintenance', client: 'RetailShop', type: 'Retainer', status: 'Active', value: 45000, hoursUsed: 12, hoursTotal: 30, renewDate: 'Aug 1, 2026' }
  ];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black">Freelance Hub</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track your time, manage services, and monitor income streams.</p>
        </div>
      </div>

      <div className={`flex gap-2 p-1 rounded-xl w-fit ${isAdvanced ? 'bg-slate-800' : 'bg-slate-100'}`}>
        {['overview', 'services', 'invoices'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-bold capitalize rounded-lg transition-colors ${
              activeTab === tab 
                ? (isAdvanced ? 'bg-slate-700 text-white' : 'bg-white text-slate-900 shadow-sm') 
                : (isAdvanced ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
            }`}
          >
            {tab === 'services' ? 'My Services & Gigs' : tab === 'invoices' ? 'Time & Invoices' : tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid lg:grid-cols-3 gap-6">
            
            <div className={`lg:col-span-1 p-6 rounded-3xl border shadow-sm flex flex-col justify-between ${isAdvanced ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-br from-white to-blue-50/50 border-slate-100'}`}>
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-slate-500 flex items-center gap-2"><Clock size={18}/> Active Timer</h3>
                  {isTimerRunning && <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>}
                </div>
                <div className={`text-5xl font-black font-mono tracking-tight mb-2 ${isAdvanced ? 'text-white' : 'text-slate-900'}`}>
                  {formatTime(timerSeconds)}
                </div>
                <p className="text-sm font-bold text-blue-500 mb-6">UI/UX Consulting - Global Media</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleTimer}
                  className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-transform active:scale-95 ${
                    isTimerRunning 
                      ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20' 
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                  }`}
                >
                  {isTimerRunning ? <><Square size={18} fill="currentColor"/> Stop</> : <><Play size={18} fill="currentColor"/> Start Tracking</>}
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
               <div className={`p-5 rounded-2xl border flex flex-col justify-center ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                 <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">YTD Earnings</p>
                 <p className="font-black text-3xl">₱620,000</p>
                 <p className="text-xs text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={14}/> +24% vs last year</p>
               </div>
               <div className={`p-5 rounded-2xl border flex flex-col justify-center ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                 <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">Pending Invoices</p>
                 <p className="font-black text-3xl text-amber-500">₱45,500</p>
                 <p className="text-xs text-amber-600 font-bold mt-2">2 invoices awaiting payment</p>
               </div>
               <div className={`p-5 rounded-2xl border flex flex-col justify-center ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                 <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">Unbilled Time</p>
                 <p className="font-black text-3xl">18.5h</p>
                 <p className="text-xs text-slate-500 font-bold mt-2">Est. Value: ₱27,750</p>
               </div>
               <div className={`p-5 rounded-2xl border flex flex-col justify-center ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                 <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">Active Services</p>
                 <p className="font-black text-3xl">3</p>
                 <p className="text-xs text-slate-500 font-bold mt-2">Across 3 different clients</p>
               </div>
            </div>
          </div>

          <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <h3 className="font-bold text-lg mb-6">Income by Service Type</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isAdvanced ? '#334155' : '#e2e8f0'} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isAdvanced ? '#94a3b8' : '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isAdvanced ? '#94a3b8' : '#64748b' }} tickFormatter={(val) => `₱${val/1000}k`} />
                  <Tooltip 
                    cursor={{ fill: isAdvanced ? '#1e293b' : '#f8fafc' }}
                    contentStyle={{ backgroundColor: isAdvanced ? "#0f172a" : "#ffffff", border: "none", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Bar dataKey="hourly" name="Hourly Work" stackId="a" fill={isAdvanced ? '#8b5cf6' : '#6366f1'} radius={[0, 0, 4, 4]} />
                  <Bar dataKey="fixed" name="Fixed Price" stackId="a" fill={isAdvanced ? '#06b6d4' : '#0ea5e9'} />
                  <Bar dataKey="retainer" name="Retainers" stackId="a" fill={isAdvanced ? '#10b981' : '#10b981'} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2"><Clock size={20} /> Recent Time Logs</h3>
              <span className="text-xs font-bold text-slate-500">{timeLogs.length} saved</span>
            </div>
            {timeLogs.length === 0 ? (
              <p className="text-sm text-slate-500">Start the timer and stop it with a note to save your first work session.</p>
            ) : (
              <div className="space-y-3">
                {timeLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className={`flex items-center justify-between gap-4 p-4 rounded-2xl ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                    <div>
                      <p className="font-bold text-sm">{log.description}</p>
                      <p className="text-xs text-slate-500 mt-1">{new Date(log.date).toLocaleDateString()}</p>
                    </div>
                    <p className="font-mono font-bold">{formatTime(log.duration)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'services' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-2">
             <h3 className="font-bold text-lg">My Services</h3>
             <button className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${isAdvanced ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
               <Plus size={16} /> New Service
             </button>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
             {gigs.map(gig => (
               <div key={gig.id} className={`p-6 rounded-3xl border flex flex-col justify-between shadow-sm transition-transform hover:-translate-y-1 ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                 <div>
                   <div className="flex justify-between items-start mb-4">
                     <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg ${
                       gig.type === 'Fixed Price' ? (isAdvanced ? 'bg-cyan-500/20 text-cyan-400' : 'bg-sky-100 text-sky-700') :
                       gig.type === 'Hourly' ? (isAdvanced ? 'bg-violet-500/20 text-violet-400' : 'bg-indigo-100 text-indigo-700') :
                       (isAdvanced ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                     }`}>
                       {gig.type}
                     </span>
                     <span className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"><MoreVertical size={16} className="text-slate-400" /></span>
                   </div>
                   <h4 className="font-black text-xl mb-1">{gig.name}</h4>
                   <p className="text-sm font-bold text-slate-500 mb-6 flex items-center gap-2"><Briefcase size={14}/> {gig.client}</p>

                   {gig.type === 'Fixed Price' && (
                     <div className="space-y-4">
                       <div>
                         <p className="text-xs font-bold text-slate-500 mb-1">Contract Value</p>
                         <p className="font-black text-2xl">₱{gig.value?.toLocaleString()}</p>
                       </div>
                       <div>
                         <div className="flex justify-between text-xs font-bold mb-1 text-slate-500">
                           <span>Progress</span>
                           <span>{gig.progress}%</span>
                         </div>
                         <div className={`h-2 w-full rounded-full overflow-hidden ${isAdvanced ? 'bg-slate-700' : 'bg-slate-100'}`}>
                           <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${gig.progress}%` }}></div>
                         </div>
                       </div>
                       <div className={`p-3 rounded-xl mt-4 ${isAdvanced ? 'bg-slate-900' : 'bg-slate-50'}`}>
                         <p className="text-xs font-bold text-slate-500 mb-1">Next Milestone</p>
                         <p className="text-sm font-medium">{gig.nextMilestone}</p>
                       </div>
                     </div>
                   )}

                   {gig.type === 'Hourly' && (
                     <div className="space-y-4">
                       <div>
                         <p className="text-xs font-bold text-slate-500 mb-1">Hourly Rate</p>
                         <p className="font-black text-2xl">₱{gig.rate?.toLocaleString()}<span className="text-sm text-slate-400">/hr</span></p>
                       </div>
                       <div>
                         <div className="flex justify-between text-xs font-bold mb-1 text-slate-500">
                           <span>Hours Logged (Week)</span>
                           <span>{gig.hoursLogged} / {gig.cap}h</span>
                         </div>
                         <div className={`h-2 w-full rounded-full overflow-hidden ${isAdvanced ? 'bg-slate-700' : 'bg-slate-100'}`}>
                           <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(gig.hoursLogged! / gig.cap!) * 100}%` }}></div>
                         </div>
                       </div>
                       <div className={`p-3 rounded-xl mt-4 ${isAdvanced ? 'bg-slate-900' : 'bg-slate-50'}`}>
                         <p className="text-xs font-bold text-slate-500 mb-1">Current Unbilled</p>
                         <p className="text-lg font-black text-emerald-500">₱{(gig.rate! * gig.hoursLogged!).toLocaleString()}</p>
                       </div>
                     </div>
                   )}

                   {gig.type === 'Retainer' && (
                     <div className="space-y-4">
                       <div>
                         <p className="text-xs font-bold text-slate-500 mb-1">Monthly Retainer</p>
                         <p className="font-black text-2xl">₱{gig.value?.toLocaleString()}</p>
                       </div>
                       <div>
                         <div className="flex justify-between text-xs font-bold mb-1 text-slate-500">
                           <span>Capacity Used</span>
                           <span>{gig.hoursUsed} / {gig.hoursTotal}h</span>
                         </div>
                         <div className={`h-2 w-full rounded-full overflow-hidden ${isAdvanced ? 'bg-slate-700' : 'bg-slate-100'}`}>
                           <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(gig.hoursUsed! / gig.hoursTotal!) * 100}%` }}></div>
                         </div>
                       </div>
                       <div className={`p-3 rounded-xl mt-4 ${isAdvanced ? 'bg-slate-900' : 'bg-slate-50'}`}>
                         <p className="text-xs font-bold text-slate-500 mb-1">Renews On</p>
                         <p className="text-sm font-medium">{gig.renewDate}</p>
                       </div>
                     </div>
                   )}
                 </div>
               </div>
             ))}
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-lg flex items-center gap-2"><FileText className={isAdvanced ? 'text-violet-400' : 'text-blue-500'} size={20} /> Recent Invoices</h3>
               <button className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${isAdvanced ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                 <Plus size={16} /> Create Invoice
               </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className={`border-b ${isAdvanced ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                    <th className="pb-3 font-medium">Invoice</th>
                    <th className="pb-3 font-medium">Client</th>
                    <th className="pb-3 font-medium">Date Issued</th>
                    <th className="pb-3 font-medium text-right">Amount</th>
                    <th className="pb-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed dark:divide-slate-700">
                  <tr className={isAdvanced ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}>
                    <td className="py-4 font-mono font-bold text-violet-500">INV-2026-042</td>
                    <td className="py-4 font-bold">TechStart Inc</td>
                    <td className="py-4 text-slate-500">Jul 1, 2026</td>
                    <td className="py-4 text-right font-bold">₱45,500</td>
                    <td className="py-4 text-right">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${isAdvanced ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>Pending</span>
                    </td>
                  </tr>
                  <tr className={isAdvanced ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}>
                    <td className="py-4 font-mono font-bold text-violet-500">INV-2026-041</td>
                    <td className="py-4 font-bold">RetailShop</td>
                    <td className="py-4 text-slate-500">Jun 28, 2026</td>
                    <td className="py-4 text-right font-bold">₱45,000</td>
                    <td className="py-4 text-right">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${isAdvanced ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>Paid</span>
                    </td>
                  </tr>
                  <tr className={isAdvanced ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}>
                    <td className="py-4 font-mono font-bold text-violet-500">INV-2026-040</td>
                    <td className="py-4 font-bold">Global Media</td>
                    <td className="py-4 text-slate-500">Jun 15, 2026</td>
                    <td className="py-4 text-right font-bold">₱36,750</td>
                    <td className="py-4 text-right">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${isAdvanced ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>Paid</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
