import sys

with open("src/pages/Career.tsx", "r") as f:
    content = f.read()

replacement = """import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Briefcase, Lightbulb, CheckCircle2, ChevronRight, TrendingUp, Edit2, Check, X } from 'lucide-react';

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

  useEffect(() => {
     fetch('/api/career').then(r => r.json()).then(data => {
        if (data) {
           setCareer(data);
           try {
              setSkills(JSON.parse(data.skills_needed || '[]'));
           } catch(e) { setSkills([]); }
           setEditForm({
              current_role: data.current_role || '',
              target_role: data.target_role || '',
              current_salary: data.current_salary?.toString() || '',
              target_salary: data.target_salary?.toString() || ''
           });
        }
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

  const sideHustles = [
    { name: 'Freelance Web Development', potential: '₱20k - ₱50k/mo', effort: 'Medium', tags: ['Coding', 'Remote'] },
    { name: 'Tech Mentoring/Tutoring', potential: '₱10k - ₱30k/mo', effort: 'Low', tags: ['Teaching', 'Flexible'] },
    { name: 'SaaS Micro-product', potential: 'Variable', effort: 'High', tags: ['Product', 'Passive Income'] },
    { name: 'Technical Writing', potential: '₱5k - ₱15k/article', effort: 'Medium', tags: ['Writing', 'Remote'] },
  ];

  if (!career) return <div className="animate-pulse space-y-4"><div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div></div>;

  const currentSal = parseFloat(career.current_salary || 0);
  const targetSal = parseFloat(career.target_salary || 0);
  const progress = targetSal > 0 ? Math.min(100, Math.round((currentSal / targetSal) * 100)) : 0;

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
"""

with open("src/pages/Career.tsx", "w") as f:
    f.write(replacement)
    
print("Updated Career.tsx")
