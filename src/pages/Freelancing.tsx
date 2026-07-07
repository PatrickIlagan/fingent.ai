import React, { useState } from 'react';
import { Briefcase, DollarSign, Calendar as CalendarIcon, Clock, Users, Plus, Target, CheckCircle2, Circle } from 'lucide-react';
import { useStore } from '../store/useStore';

export function Freelancing() {
  const { themeMode } = useStore();
  const isAdvanced = themeMode === 'advanced';

  const [activeTab, setActiveTab] = useState('projects');

  const [projects] = useState([
    {
      id: 1,
      client: "Acme Corp",
      project: "Website Redesign",
      status: "In Progress",
      rate: 45,
      rateType: "hourly",
      hoursLogged: 24,
      totalEst: 40,
      dueDate: "2023-12-15",
      color: "emerald"
    },
    {
      id: 2,
      client: "TechStart",
      project: "Mobile App MVP",
      status: "Planning",
      rate: 3500,
      rateType: "fixed",
      dueDate: "2024-01-30",
      color: "violet"
    }
  ]);

  const stats = [
    { label: "Active Projects", value: "3", icon: Briefcase, color: "blue" },
    { label: "Hours This Week", value: "32h", icon: Clock, color: "violet" },
    { label: "Monthly Revenue", value: "₱145,000", icon: DollarSign, color: "emerald" },
    { label: "Pending Invoices", value: "₱45,000", icon: Target, color: "amber" }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black mb-3">Freelancing</h1>
          <p className={`text-lg font-medium ${isAdvanced ? 'text-slate-400' : 'text-slate-500'}`}>Manage your freelance projects, clients, and revenue.</p>
        </div>
        <button className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-transform hover:scale-105 active:scale-95 text-white shadow-lg ${isAdvanced ? 'bg-violet-600 shadow-violet-900/20 hover:bg-violet-500' : 'bg-slate-900 shadow-slate-900/20 hover:bg-slate-800'}`}>
          <Plus size={20} /> New Project
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center ${
              stat.color === 'blue' ? (isAdvanced ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600') :
              stat.color === 'violet' ? (isAdvanced ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-50 text-violet-600') :
              stat.color === 'emerald' ? (isAdvanced ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600') :
              (isAdvanced ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600')
            }`}>
              <stat.icon size={24} />
            </div>
            <p className={`text-sm font-bold mb-1 ${isAdvanced ? 'text-slate-400' : 'text-slate-500'}`}>{stat.label}</p>
            <h3 className="text-2xl font-black">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className={`rounded-3xl shadow-sm border overflow-hidden ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <div className={`flex gap-6 px-6 border-b ${isAdvanced ? 'border-slate-700' : 'border-slate-100'}`}>
          {['projects', 'clients', 'invoices'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 text-sm font-bold capitalize transition-colors relative ${activeTab === tab ? (isAdvanced ? 'text-violet-400' : 'text-emerald-600') : (isAdvanced ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-800')}`}
            >
              {tab}
              {activeTab === tab && (
                <div className={`absolute bottom-0 left-0 right-0 h-1 rounded-t-full ${isAdvanced ? 'bg-violet-400' : 'bg-emerald-500'}`} />
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'projects' && (
            <div className="space-y-4">
              {projects.map((project) => (
                <div key={project.id} className={`p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:-translate-y-1 ${isAdvanced ? 'bg-slate-900 border-slate-700 hover:shadow-lg hover:shadow-violet-900/10' : 'bg-slate-50 border-slate-100 hover:shadow-md'}`}>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-bold">{project.project}</h4>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        project.status === 'In Progress' ? (isAdvanced ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700') :
                        (isAdvanced ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-700')
                      }`}>
                        {project.status}
                      </span>
                    </div>
                    <div className={`flex items-center gap-4 text-sm font-medium ${isAdvanced ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span className="flex items-center gap-1.5"><Users size={16} /> {project.client}</span>
                      <span className="flex items-center gap-1.5"><CalendarIcon size={16} /> Due {new Date(project.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8 w-full md:w-auto">
                    {project.rateType === 'hourly' ? (
                      <div className="flex-1 md:flex-none">
                        <div className="flex justify-between text-sm mb-2">
                          <span className={`font-bold ${isAdvanced ? 'text-slate-400' : 'text-slate-500'}`}>{project.hoursLogged} / {project.totalEst} hrs</span>
                          <span className="font-bold">₱{(project.rate * project.hoursLogged).toLocaleString()}</span>
                        </div>
                        <div className={`h-2 w-full md:w-32 rounded-full overflow-hidden ${isAdvanced ? 'bg-slate-800' : 'bg-slate-200'}`}>
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(project.hoursLogged / (project.totalEst || 1)) * 100}%` }} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 md:flex-none text-right">
                        <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isAdvanced ? 'text-slate-500' : 'text-slate-400'}`}>Fixed Rate</div>
                        <div className="font-black text-xl">₱{project.rate.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab !== 'projects' && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isAdvanced ? 'bg-slate-900 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>
                <Briefcase size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module</h3>
              <p className={`text-sm ${isAdvanced ? 'text-slate-400' : 'text-slate-500'}`}>This section is ready to be connected to your data source.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
