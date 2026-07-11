import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Briefcase, CheckCircle2, ChevronRight, TrendingUp, Edit2, Check, X, CalendarDays, Plus, Target } from 'lucide-react';

export function Career() {
  const { themeMode } = useStore();
  const isAdvanced = themeMode === 'advanced';

  const [career, setCareer] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [skills, setSkills] = useState<any[]>([]);

  const [editForm, setEditForm] = useState({
     current_role: '', target_role: '', current_salary: '', target_salary: ''
  });

  const [dbIncomeFlows, setDbIncomeFlows] = useState<any[]>([]);
  const [budgetPresets, setBudgetPresets] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  const [incomeViewMode, setIncomeViewMode] = useState<"list" | "add" | "details">("list");
  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null);
  const [incomeForm, setIncomeForm] = useState({ name: '', amount: '', date: '', is_recurring: false, budget_preset_id: '', account_id: '' });
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ name: '', date: new Date().toISOString().split('T')[0], type: 'Career meeting' });

  useEffect(() => {
     Promise.all([
        fetch('/api/career'),
        fetch('/api/income_flows'),
        fetch('/api/budget_presets'),
        fetch('/api/accounts'),
        fetch('/api/calendar_events')
     ]).then(async ([c, i, b, a, events]) => {
        const data = await c.json().catch(()=>null);
        if (data) {
           setCareer(data);
           try { const parsed = JSON.parse(data.skills_needed || '[]'); setSkills(Array.isArray(parsed) ? parsed : []); } catch(e) { setSkills([]); }
           setEditForm({ current_role: data.current_role || '', target_role: data.target_role || '', current_salary: data.current_salary?.toString() || '', target_salary: data.target_salary?.toString() || '' });
        }
        const iRes = await i.json().catch(()=>[]); setDbIncomeFlows(Array.isArray(iRes) ? iRes : []);
        const bRes = await b.json().catch(()=>[]); setBudgetPresets(Array.isArray(bRes) ? bRes : []);
        const aRes = await a.json().catch(()=>[]); setAccounts(Array.isArray(aRes) ? aRes : []);
        const eventRes = await events.json().catch(()=>[]); setCalendarEvents(Array.isArray(eventRes) ? eventRes : []);
     });
  }, []);
  


  const handleSaveTrajectory = async () => {
     const updated = {
        ...editForm,
        current_salary: parseFloat(editForm.current_salary) || 0,
        target_salary: parseFloat(editForm.target_salary) || 0,
        skills_needed: skills
     };
     await fetch('/api/career', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated)
     });
     setCareer(updated);
     setIsEditing(false);
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    const newSkills = [...skills, { id: Date.now(), name: newSkill.trim(), completed: false }];
    setSkills(newSkills);
    setNewSkill('');
    if (career) {
       await fetch('/api/career', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({...career, skills_needed: newSkills})
       });
    }
  };

  const toggleSkill = async (id: number) => {
    const newSkills = skills.map(s => s.id === id ? { ...s, completed: !s.completed } : s);
    setSkills(newSkills);
    if (career) {
       await fetch('/api/career', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({...career, skills_needed: newSkills})
       });
    }
  };

  const deleteSkill = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const newSkills = skills.filter(s => s.id !== id);
    setSkills(newSkills);
    if (career) {
       await fetch('/api/career', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({...career, skills_needed: newSkills})
       });
    }
  };

  if (!career) return <div className="animate-pulse space-y-4"><div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div></div>;

  const currentSal = parseFloat(career.current_salary || 0);
  const targetSal = parseFloat(career.target_salary || 0);
  const progress = targetSal > 0 ? Math.min(100, Math.round((currentSal / targetSal) * 100)) : 0;
  const completedSkills = skills.filter((skill) => skill.completed).length;
  const careerEvents = calendarEvents.filter((event) => event.source === 'career' || event.type === 'career' || event.type === 'interview').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const sideHustles = careerEvents.map((event) => ({
    name: event.name,
    potential: new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    effort: event.provider || 'Career event',
    tags: ['Calendar', 'Career']
  }));

  const scheduleCareerEvent = async () => {
    if (!scheduleForm.name.trim() || !scheduleForm.date) return;
    const response = await fetch('/api/calendar_events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: scheduleForm.name.trim(), type: 'career', amount: 0, date: scheduleForm.date, color: 'violet', icon: 'Briefcase', provider: scheduleForm.type, source: 'career' })
    });
    if (!response.ok) return;
    const created = await response.json();
    setCalendarEvents((items) => [...items, { id: created.id, name: scheduleForm.name.trim(), type: 'career', date: scheduleForm.date, color: 'violet', provider: scheduleForm.type, source: 'career' }]);
    setScheduleForm({ name: '', date: new Date().toISOString().split('T')[0], type: 'Career meeting' });
    setIsScheduleOpen(false);
  };

  const renderIncomeBuilder = () => (
    <div className="max-w-3xl mx-auto space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-8">
         <button onClick={() => setIncomeViewMode('list')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><ChevronRight className="w-5 h-5 rotate-180" /></button>
         <div>
            <h2 className="text-2xl font-black">Add Income Flow</h2>
            <p className="text-slate-500 font-medium">Create a new source of income and optionally automate its budgeting.</p>
         </div>
      </div>
      
      <form onSubmit={async (e) => {
         e.preventDefault();
         await fetch('/api/income_flows', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
               name: incomeForm.name,
               amount: parseFloat(incomeForm.amount) || 0,
               date: incomeForm.date,
               is_recurring: incomeForm.is_recurring,
               budget_preset_id: parseInt(incomeForm.budget_preset_id) || null,
               account_id: parseInt(incomeForm.account_id) || null
            })
         });
         window.location.reload();
      }} className={`rounded-3xl p-8 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} space-y-8`}>
         
         <div className="space-y-6">
            <div>
               <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Income Source Name</label>
               <input required value={incomeForm.name} onChange={e=>setIncomeForm({...incomeForm, name: e.target.value})} className={`w-full px-5 py-4 rounded-xl outline-none font-bold text-lg ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} placeholder="e.g. Salary, Freelance Project" />
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Amount</label>
                  <div className="relative">
                     <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400">₱</span>
                     <input required type="number" value={incomeForm.amount} onChange={e=>setIncomeForm({...incomeForm, amount: e.target.value})} className={`w-full pl-10 pr-5 py-4 rounded-xl outline-none font-bold text-lg ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} placeholder="0.00" />
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Date</label>
                  <input required type="date" value={incomeForm.date} onChange={e=>setIncomeForm({...incomeForm, date: e.target.value})} className={`w-full px-5 py-4 rounded-xl outline-none font-bold text-lg ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} />
               </div>
            </div>
            
            <label className={`flex items-center justify-between p-5 rounded-2xl cursor-pointer border-2 transition-all ${incomeForm.is_recurring ? (isAdvanced ? 'border-emerald-500 bg-emerald-500/10' : 'border-emerald-500 bg-emerald-50') : (isAdvanced ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50')}`}>
               <div>
                  <p className="font-bold">Recurring Monthly</p>
                  <p className="text-xs text-slate-500 font-medium">This income repeats on this date every month</p>
               </div>
               <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 ${incomeForm.is_recurring ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 bg-transparent'}`}>
                  {incomeForm.is_recurring && <Check className="w-4 h-4" />}
               </div>
               <input type="checkbox" className="hidden" checked={incomeForm.is_recurring} onChange={e=>setIncomeForm({...incomeForm, is_recurring: e.target.checked})} />
            </label>
         </div>
         
         <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-lg">Automations (Optional)</h3>
            
            <div>
               <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Deposit To Account</label>
               <select value={incomeForm.account_id} onChange={e=>setIncomeForm({...incomeForm, account_id: e.target.value})} className={`w-full px-5 py-4 rounded-xl outline-none font-bold ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                  <option value="">Do not auto-deposit</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
               </select>
               <p className="text-xs text-slate-500 mt-2">Automatically update the balance of this account when the income arrives.</p>
            </div>
            
            <div>
               <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Auto-Budget Model</label>
               <select value={incomeForm.budget_preset_id} onChange={e=>setIncomeForm({...incomeForm, budget_preset_id: e.target.value})} className={`w-full px-5 py-4 rounded-xl outline-none font-bold ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                  <option value="">No Auto-Budgeting</option>
                  {budgetPresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
               </select>
               <p className="text-xs text-slate-500 mt-2">Automatically generate a new Budget Plan using this model when the income arrives.</p>
            </div>
         </div>
         
         <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <button type="submit" className={`w-full py-5 rounded-2xl font-black text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all ${isAdvanced ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40' : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20'}`}>
               Save Income Flow
            </button>
         </div>
      </form>
    </div>
  );

  const renderIncomeDetails = () => {
      const flow = dbIncomeFlows.find(f => f.id === selectedFlowId);
      if (!flow) return null;
      
      const account = accounts.find(a => a.id === flow.account_id);
      const preset = budgetPresets.find(p => p.id === flow.budget_preset_id);
      
      return (
         <div className="max-w-3xl mx-auto space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex items-center gap-4 mb-8">
              <button onClick={() => { setIncomeViewMode('list'); setSelectedFlowId(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><ChevronRight className="w-5 h-5 rotate-180" /></button>
              <div>
                 <h2 className="text-2xl font-black">Income Details</h2>
                 <p className="text-slate-500 font-medium">Manage this income flow</p>
              </div>
           </div>
           
           <div className={`rounded-3xl p-8 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} space-y-8`}>
              <div className="flex justify-between items-start">
                 <div>
                    <h3 className="text-3xl font-black mb-2">{flow.name}</h3>
                    <div className="flex items-center gap-3">
                       <span className="text-xl font-bold text-emerald-500">₱{parseFloat(flow.amount).toLocaleString()}</span>
                       <span className={`px-3 py-1 rounded-lg text-xs font-bold ${flow.is_recurring ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                          {flow.is_recurring ? 'Recurring Monthly' : 'One-time'}
                       </span>
                    </div>
                 </div>
                 
                 <button onClick={async () => {
                     if (confirm('Delete income flow?')) {
                        await fetch(`/api/income_flows/${flow.id}`, { method: 'DELETE' });
                        window.location.reload();
                     }
                  }} className="p-3 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 transition-colors">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                 <div className={`p-5 rounded-2xl ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Next Date</p>
                    <p className="font-bold text-lg">{new Date(flow.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                 </div>
                 
                 <div className={`p-5 rounded-2xl ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                    <p className="font-bold text-lg text-emerald-500 flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> Active</p>
                 </div>
              </div>
              
              <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-700">
                 <h4 className="font-bold">Automations</h4>
                 
                 <div className={`p-5 rounded-2xl border ${isAdvanced ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Destination Account</p>
                    {account ? (
                       <p className="font-bold flex items-center gap-2">🏦 {account.name}</p>
                    ) : (
                       <p className="text-sm font-medium text-slate-400 italic">No account selected</p>
                    )}
                 </div>
                 
                 <div className={`p-5 rounded-2xl border ${isAdvanced ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Auto-Budget Model</p>
                    {preset ? (
                       <div>
                          <p className="font-bold flex items-center gap-2 mb-3">📊 {preset.name}</p>
                          <div className="space-y-2">
                             {(() => { try { return JSON.parse(preset.allocations || '[]'); } catch(e) { return []; } })().map((a: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-sm">
                                   <span className="flex items-center gap-2 font-medium">
                                      <div className={`w-2 h-2 rounded-full ${a.color === 'emerald' ? 'bg-emerald-500' : a.color === 'blue' ? 'bg-blue-500' : a.color === 'violet' ? 'bg-violet-500' : a.color === 'amber' ? 'bg-amber-500' : a.color === 'rose' ? 'bg-rose-500' : 'bg-fuchsia-500'}`}/>
                                      {a.name}
                                   </span>
                                   <span className="font-bold">{a.percentage}% (₱{(parseFloat(flow.amount) * (a.percentage / 100)).toLocaleString()})</span>
                                </div>
                             ))}
                          </div>
                       </div>
                    ) : (
                       <p className="text-sm font-medium text-slate-400 italic">No auto-budgeting configured</p>
                    )}
                 </div>
              </div>
           </div>
         </div>
      );
  }

  if (incomeViewMode === 'add') return renderIncomeBuilder();
  if (incomeViewMode === 'details') return renderIncomeDetails();

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black">Career Command Center</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">A practical view of your next role, skills, income, and important career dates.</p>
        </div>
        <button onClick={() => setIsScheduleOpen(true)} className={`hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}><CalendarDays size={16} /> Schedule</button>
      </div>

      <div className={`relative overflow-hidden rounded-[2rem] p-7 md:p-9 border shadow-sm ${isAdvanced ? 'bg-gradient-to-br from-violet-950 via-slate-800 to-slate-900 border-violet-500/30' : 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 border-emerald-400 text-white'}`}>
        <div className="relative z-10 grid lg:grid-cols-[1.3fr_.7fr] gap-8">
          <div>
            <p className={`text-xs font-black uppercase tracking-[0.2em] ${isAdvanced ? 'text-violet-300' : 'text-emerald-50'}`}>Professional trajectory</p>
            <div className="mt-4 flex flex-wrap items-center gap-3"><h3 className="text-3xl md:text-4xl font-black">{career.current_role || 'Set your current role'}</h3><ChevronRight className={isAdvanced ? 'text-violet-300' : 'text-emerald-50'} /><h3 className="text-3xl md:text-4xl font-black">{career.target_role || 'Choose a target role'}</h3></div>
            <p className={`mt-4 max-w-2xl text-sm md:text-base ${isAdvanced ? 'text-slate-300' : 'text-emerald-50'}`}>Focus on the skills and meetings that move you toward your next meaningful career step—not a generic checklist.</p>
            <div className={`mt-7 h-3 overflow-hidden rounded-full ${isAdvanced ? 'bg-slate-700' : 'bg-white/25'}`}><div className={`h-full rounded-full ${isAdvanced ? 'bg-violet-400' : 'bg-white'}`} style={{ width: `${progress}%` }} /></div>
            <div className="mt-2 flex justify-between text-xs font-bold"><span>{progress}% salary trajectory</span><span>{completedSkills}/{skills.length} skills mastered</span></div>
          </div>
          <div className={`rounded-3xl p-5 backdrop-blur-sm ${isAdvanced ? 'bg-slate-950/35 border border-slate-700' : 'bg-white/15 border border-white/20'}`}>
            <p className={`text-xs font-bold uppercase tracking-wider ${isAdvanced ? 'text-slate-400' : 'text-emerald-50'}`}>Income runway</p>
            <p className="mt-2 text-3xl font-black">₱{currentSal.toLocaleString()}</p>
            <p className={`text-sm ${isAdvanced ? 'text-slate-400' : 'text-emerald-50'}`}>Current monthly compensation</p>
            <div className={`mt-5 pt-5 border-t ${isAdvanced ? 'border-slate-700' : 'border-white/20'}`}><p className={`text-xs font-bold ${isAdvanced ? 'text-slate-400' : 'text-emerald-50'}`}>Target monthly compensation</p><p className="mt-1 text-xl font-black">₱{targetSal.toLocaleString()}</p></div>
          </div>
        </div>
        <Target className={`absolute -right-6 -bottom-8 h-44 w-44 opacity-15 ${isAdvanced ? 'text-violet-300' : 'text-white'}`} />
      </div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className={`rounded-3xl p-6 md:p-8 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 <div className={`p-3 rounded-xl ${isAdvanced ? 'bg-violet-600' : 'bg-emerald-500'} text-white shadow-lg`}>
                   <Briefcase size={24} />
                 </div>
                 <h3 className="font-bold text-xl">Current Trajectory</h3>
              </div>
              <button onClick={() => setIsEditing(!isEditing)} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors">
                 <Edit2 className="w-4 h-4" />
              </button>
            </div>
            
            {isEditing ? (
               <div className="space-y-4 mb-8">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Current Role</label>
                        <input value={editForm.current_role} onChange={e => setEditForm({...editForm, current_role: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700" placeholder="e.g. Junior Dev" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Target Role</label>
                        <input value={editForm.target_role} onChange={e => setEditForm({...editForm, target_role: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700" placeholder="e.g. Senior Dev" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Current Salary</label>
                        <input type="number" value={editForm.current_salary} onChange={e => setEditForm({...editForm, current_salary: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700" placeholder="0" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Target Salary</label>
                        <input type="number" value={editForm.target_salary} onChange={e => setEditForm({...editForm, target_salary: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700" placeholder="0" />
                     </div>
                  </div>
                  <button onClick={handleSaveTrajectory} className={`px-4 py-2 rounded-xl font-bold text-sm text-white ${isAdvanced ? 'bg-violet-600' : 'bg-emerald-600'}`}>Save Changes</button>
               </div>
            ) : (
               <div className="grid md:grid-cols-2 gap-6 relative">
                 <div className={`p-6 rounded-2xl border ${isAdvanced ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                   <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">Current Role</p>
                   <p className="font-black text-2xl mb-1">{career.current_role || 'Not Set'}</p>
                   <p className={`${isAdvanced ? 'text-violet-400' : 'text-emerald-600'} font-bold`}>₱{currentSal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits:2})} / mo</p>
                 </div>
                 
                 <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm text-slate-400">
                   <ChevronRight size={20} />
                 </div>
                 
                 <div className={`p-6 rounded-2xl border ${isAdvanced ? 'bg-slate-900 border-violet-500/30' : 'bg-white border-emerald-500/30'} shadow-sm`}>
                   <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">Target Role</p>
                   <p className="font-black text-2xl mb-1">{career.target_role || 'Not Set'}</p>
                   <p className={`${isAdvanced ? 'text-violet-500' : 'text-emerald-500'} font-bold`}>₱{targetSal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits:2})} / mo</p>
                 </div>
               </div>
            )}
            
            <div className="mt-8">
              <div className="flex justify-between items-center mb-2 text-sm font-bold">
                <span className="text-slate-500">Progress to Goal</span>
                <span className={isAdvanced ? 'text-violet-400' : 'text-emerald-600'}>{progress}% Complete</span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r transition-all duration-1000 ${isAdvanced ? 'from-violet-500 to-fuchsia-500' : 'from-emerald-400 to-teal-500'}`} style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          <div className={`rounded-3xl p-6 md:p-8 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-bold text-lg flex items-center">
                 <CheckCircle2 className="w-5 h-5 mr-2" /> Skills Checklist
               </h3>
               <span className="text-xs font-bold text-slate-500">{skills.filter(s => s.completed).length}/{skills.length} Mastered</span>
            </div>
            
            <form onSubmit={handleAddSkill} className="mb-4 flex gap-2">
              <input 
                type="text" 
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add a new skill to master..."
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
              />
              <button 
                type="submit" 
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
              >
                Add
              </button>
            </form>

            <div className="grid sm:grid-cols-2 gap-4">
              {skills.map((skill) => (
                 <div
                   key={skill.id}
                   onClick={() => toggleSkill(skill.id)}
                   className={`group flex items-center p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] ${
                     skill.completed
                       ? (isAdvanced ? 'bg-violet-900/20 border-violet-500/30' : 'bg-emerald-50 border-emerald-200')
                       : (isAdvanced ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200')
                   }`}
                 >
                   <div className={`w-6 h-6 rounded-lg flex items-center justify-center mr-3 transition-colors ${
                     skill.completed
                       ? (isAdvanced ? 'bg-violet-500 text-white' : 'bg-emerald-500 text-white')
                       : (isAdvanced ? 'border-2 border-slate-600 bg-slate-800' : 'border-2 border-slate-300 bg-slate-50')
                   }`}>
                     {skill.completed && <Check size={16} strokeWidth={3} />}
                   </div>
                   <p className={`flex-1 text-sm font-medium ${skill.completed ? (isAdvanced ? 'text-violet-300' : 'text-emerald-700 line-through opacity-70') : ''}`}>{skill.name}</p>
                   <button onClick={(e) => deleteSkill(e, skill.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity">
                     <X size={16} />
                   </button>
                 </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
             <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-lg flex items-center">
                 <TrendingUp className="w-5 h-5 mr-2 text-emerald-500" /> Income Flows
               </h3>
               <button onClick={() => setIncomeViewMode('add')} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${isAdvanced ? 'bg-slate-900 border-slate-700 hover:border-violet-500' : 'bg-slate-50 border-slate-200 hover:border-emerald-500'}`}>+ Add Income</button>
             </div>
             
             <div className="space-y-3">
               {dbIncomeFlows.length === 0 && <p className="text-xs text-slate-500">No income flows setup yet.</p>}
               {dbIncomeFlows.map(flow => {
                  const account = accounts.find(a => a.id === flow.account_id);
                  const preset = budgetPresets.find(p => p.id === flow.budget_preset_id);
                  return (
                     <div key={flow.id} onClick={() => { setSelectedFlowId(flow.id); setIncomeViewMode('details'); }} className={`p-4 rounded-2xl border cursor-pointer hover:border-emerald-500 transition-colors ${isAdvanced ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex justify-between items-start mb-2">
                           <div>
                              <p className="font-bold text-sm">{flow.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="text-xs font-bold text-emerald-500">₱{parseFloat(flow.amount).toLocaleString()}</span>
                                 <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{flow.is_recurring ? 'Recurring' : 'One-time'}</span>
                              </div>
                           </div>
                           <button onClick={async () => {
                              if (confirm('Delete income flow?')) {
                                 await fetch(`/api/income_flows/${flow.id}`, { method: 'DELETE' });
                                 window.location.reload();
                              }
                           }} className="text-slate-400 hover:text-rose-500"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="text-xs text-slate-500 font-medium space-y-1 mt-3">
                           <p>📅 Next date: {new Date(flow.date).toLocaleDateString()}</p>
                           {account && <p>🏦 Dest: {account.name}</p>}
                           {preset && <p>📊 Auto-Budget: {preset.name}</p>}
                        </div>
                     </div>
                  );
               })}
             </div>
          </div>

          <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
             <h3 className="font-bold text-lg mb-6 flex items-center">
               <CalendarDays className="w-5 h-5 mr-2 text-violet-500" /> Career Calendar
             </h3>
             <button onClick={() => setIsScheduleOpen(true)} className={`-mt-12 ml-auto mb-5 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${isAdvanced ? 'bg-slate-900 text-violet-400' : 'bg-emerald-50 text-emerald-700'}`}><Plus size={14} /> Add date</button>
             <div className="space-y-4">
               {sideHustles.length === 0 && <p className="text-sm text-slate-500">No career events yet. Add interviews, 1:1s, reviews, or study blocks.</p>}
               {sideHustles.map((hustle, idx) => (
                 <div key={idx} className={`p-4 rounded-2xl border ${isAdvanced ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                   <div className="flex justify-between items-start mb-2">
                     <p className="font-bold text-sm">{hustle.name}</p>
                   </div>
                   <div className="flex items-center gap-2 mb-3">
                     <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400 flex items-center gap-1">
                       <TrendingUp size={12} /> {hustle.potential}
                     </span>
                     <span className="text-xs font-medium text-slate-400">•</span>
                     <span className="text-xs font-medium text-slate-500">Effort: {hustle.effort}</span>
                   </div>
                   <div className="flex flex-wrap gap-2">
                     {hustle.tags.map(tag => (
                       <span key={tag} className={`text-[10px] font-bold px-2 py-1 rounded-md ${isAdvanced ? 'bg-slate-800 text-slate-300' : 'bg-white border border-slate-200 text-slate-600'}`}>
                         {tag}
                       </span>
                     ))}
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>

      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl ${isAdvanced ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}>
            <div className="flex items-center justify-between mb-5"><div><h3 className="text-xl font-black">Schedule career date</h3><p className="mt-1 text-sm text-slate-500">This will appear in the Calendar and Career dashboard.</p></div><button onClick={() => setIsScheduleOpen(false)} className="p-2 text-slate-500"><X size={20} /></button></div>
            <div className="space-y-4">
              <label className="block text-sm font-bold">What is it?<input value={scheduleForm.name} onChange={(event) => setScheduleForm({ ...scheduleForm, name: event.target.value })} placeholder="e.g. Interview with Acme" className={`mt-1.5 w-full rounded-xl border p-3 outline-none ${isAdvanced ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`} /></label>
              <label className="block text-sm font-bold">Date<input type="date" value={scheduleForm.date} onChange={(event) => setScheduleForm({ ...scheduleForm, date: event.target.value })} className={`mt-1.5 w-full rounded-xl border p-3 outline-none ${isAdvanced ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`} /></label>
              <label className="block text-sm font-bold">Type<select value={scheduleForm.type} onChange={(event) => setScheduleForm({ ...scheduleForm, type: event.target.value })} className={`mt-1.5 w-full rounded-xl border p-3 outline-none ${isAdvanced ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}><option>Career meeting</option><option>Interview</option><option>Performance review</option><option>Study block</option><option>Networking</option></select></label>
            </div>
            <div className="mt-6 flex justify-end gap-3"><button onClick={() => setIsScheduleOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500">Cancel</button><button onClick={scheduleCareerEvent} className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700' : 'bg-slate-900 hover:bg-slate-800'}`}>Add to calendar</button></div>
          </div>
        </div>
      )}

    </div>
  );
}
