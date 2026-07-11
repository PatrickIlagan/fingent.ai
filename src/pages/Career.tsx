import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { Briefcase, Lightbulb, CheckCircle2, ChevronRight, TrendingUp } from 'lucide-react';

export function Career() {
  const { themeMode } = useStore();
  const isAdvanced = themeMode === 'advanced';

  const [newSkill, setNewSkill] = useState('');
  const [career, setCareer] = useState<any>({ current_role: 'Current role', target_role: 'Target role', current_salary: 0, target_salary: 0 });
  const [skills, setSkills] = useState([
    { id: 1, name: 'React Advanced Patterns', completed: true },
    { id: 2, name: 'System Design', completed: false },
    { id: 3, name: 'Node.js Microservices', completed: false },
    { id: 4, name: 'SQL Performance Tuning', completed: false },
    { id: 5, name: 'AWS Cloud Practitioner', completed: false },
  ]);

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    setSkills([...skills, { id: Date.now(), name: newSkill.trim(), completed: false }]);
    setNewSkill('');
  };

  const toggleSkill = (id: number) => {
    setSkills(skills.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  useEffect(() => {
    fetch('/api/career')
      .then((response) => response.ok ? response.json() : null)
      .then((savedCareer) => {
        if (!savedCareer) return;
        setCareer(savedCareer);
        const savedSkills = JSON.parse(savedCareer.skills_needed || '[]');
        if (Array.isArray(savedSkills) && savedSkills.length > 0) {
          setSkills(savedSkills.map((skill, index) => ({ id: index + 1, name: typeof skill === 'string' ? skill : skill.name, completed: typeof skill === 'object' ? Boolean(skill.completed) : false })));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!career.id) return;
    fetch(`/api/career/${career.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...career, skills_needed: JSON.stringify(skills) }),
    }).catch(() => undefined);
  }, [career, skills]);

  const progress = career.target_salary > career.current_salary ? Math.min(100, Math.round((career.current_salary / career.target_salary) * 100)) : 0;

  const sideHustles = [
    { name: 'Freelance Web Development', potential: '₱20k - ₱50k/mo', effort: 'Medium', tags: ['Coding', 'Remote'] },
    { name: 'Tech Mentoring/Tutoring', potential: '₱10k - ₱30k/mo', effort: 'Low', tags: ['Teaching', 'Flexible'] },
    { name: 'SaaS Micro-product', potential: 'Variable', effort: 'High', tags: ['Product', 'Passive Income'] },
    { name: 'Technical Writing', potential: '₱5k - ₱15k/article', effort: 'Medium', tags: ['Writing', 'Remote'] },
  ];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold">Career & Growth</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track your professional development and side income</p>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className={`rounded-3xl p-6 md:p-8 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-xl ${isAdvanced ? 'bg-violet-600' : 'bg-emerald-500'} text-white shadow-lg`}>
                <Briefcase size={24} />
              </div>
              <h3 className="font-bold text-xl">Current Trajectory</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 relative">
              <div className={`p-6 rounded-2xl border ${isAdvanced ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">Current Role</p>
                <p className="font-black text-2xl mb-1">{career.current_role}</p>
                <p className={`${isAdvanced ? 'text-violet-400' : 'text-emerald-600'} font-bold`}>₱{Number(career.current_salary || 0).toLocaleString()} / mo</p>
              </div>
              
              <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm text-slate-400">
                <ChevronRight size={20} />
              </div>
              
              <div className={`p-6 rounded-2xl border ${isAdvanced ? 'bg-slate-900 border-violet-500/30' : 'bg-white border-emerald-500/30'} shadow-sm`}>
                <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">Target Role</p>
                <p className="font-black text-2xl mb-1">{career.target_role}</p>
                <p className={`${isAdvanced ? 'text-violet-500' : 'text-emerald-500'} font-bold`}>₱{Number(career.target_salary || 0).toLocaleString()} / mo</p>
              </div>
            </div>
            
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
                   className={`flex items-center p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] ${
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
                     {skill.completed && <CheckCircle2 size={16} strokeWidth={3} />}
                   </div>
                   <p className={`text-sm font-medium ${skill.completed ? (isAdvanced ? 'text-violet-300' : 'text-emerald-700 line-through opacity-70') : ''}`}>{skill.name}</p>
                 </div>
              ))}
            </div>
            
            <button className={`w-full mt-6 py-3 rounded-xl font-bold text-sm border-2 border-dashed transition-colors ${isAdvanced ? 'border-slate-700 hover:border-violet-500 text-slate-400 hover:text-violet-400' : 'border-slate-200 hover:border-slate-400 text-slate-500 hover:text-slate-800'}`}>
              + Add New Skill
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
             <h3 className="font-bold text-lg mb-6 flex items-center">
               <Lightbulb className="w-5 h-5 mr-2 text-amber-500" /> Side Hustle Ideas
             </h3>
             <div className="space-y-4">
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
    </div>
  );
}
