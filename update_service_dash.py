import re

with open("src/pages/Freelancing.tsx", "r") as f:
    content = f.read()

dashboard_component = """
function ServiceDashboard({ service, isAdvanced, onBack, onStartTimer }: any) {
  const [logs, setLogs] = useState<any[]>([]);
  
  useEffect(() => {
    fetch('/api/freelancing/time_logs').then(r => r.json()).then(data => {
      setLogs(data.filter((l: any) => l.service_id === service.id));
    }).catch(console.error);
  }, [service.id]);

  const totalBilled = service.type === 'Hourly' ? (service.hours_logged || 0) * (service.rate || 0) : service.value;
  const progress = service.type === 'Fixed Price' ? service.progress : service.type === 'Hourly' ? ((service.hours_logged||0) / (service.cap||1)) * 100 : ((service.hours_logged||0) / (service.hours_total||1)) * 100;

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className={`p-2 rounded-xl transition-colors ${isAdvanced ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-50 border shadow-sm text-slate-600'}`}>
             <X size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">{service.name} <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${isAdvanced ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{service.type}</span></h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2"><Briefcase size={14} /> {service.client}</p>
          </div>
        </div>
        <button onClick={onStartTimer} className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 ${isAdvanced ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
          <Play size={16} fill="currentColor" /> Start Timer
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <p className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Total Earned</p>
          <p className="text-3xl font-black text-emerald-500">₱{totalBilled?.toLocaleString()}</p>
        </div>
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <p className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Hours Logged</p>
          <p className="text-3xl font-black">{service.hours_logged?.toFixed(1) || 0}h</p>
        </div>
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
           <p className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Status</p>
           <p className="text-3xl font-black text-blue-500">{service.status}</p>
        </div>
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
           <p className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Progress</p>
           <div className="flex items-center gap-3">
             <p className="text-3xl font-black">{Math.min(progress||0, 100).toFixed(0)}%</p>
           </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Clock className={isAdvanced ? 'text-violet-400' : 'text-indigo-500'} size={20} /> Time Logs</h3>
            <div className="space-y-4">
              {logs.length === 0 ? (
                 <p className="text-sm text-slate-500">No time logged for this service yet.</p>
              ) : (
                logs.map(log => (
                  <div key={log.id} className={`p-4 rounded-xl flex justify-between items-center ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                    <div>
                      <p className="font-bold text-sm mb-1">{log.description || 'Session'}</p>
                      <p className="text-xs text-slate-500">{log.date}</p>
                    </div>
                    <div className="font-mono font-bold text-violet-500">
                      {Math.floor(log.seconds / 3600)}h {Math.floor((log.seconds % 3600) / 60)}m
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <h3 className="font-bold text-lg mb-4">Contract Details</h3>
            <div className="space-y-4 text-sm">
               <div className="flex justify-between border-b pb-2 dark:border-slate-700">
                 <span className="text-slate-500">Type</span>
                 <span className="font-bold">{service.type}</span>
               </div>
               {service.type === 'Hourly' && (
                 <div className="flex justify-between border-b pb-2 dark:border-slate-700">
                   <span className="text-slate-500">Rate</span>
                   <span className="font-bold">₱{service.rate}/hr</span>
                 </div>
               )}
               {service.type === 'Hourly' && service.cap > 0 && (
                 <div className="flex justify-between border-b pb-2 dark:border-slate-700">
                   <span className="text-slate-500">Weekly Cap</span>
                   <span className="font-bold">{service.cap} hrs</span>
                 </div>
               )}
               {service.type === 'Fixed Price' && (
                 <div className="flex justify-between border-b pb-2 dark:border-slate-700">
                   <span className="text-slate-500">Total Value</span>
                   <span className="font-bold">₱{service.value?.toLocaleString()}</span>
                 </div>
               )}
               {service.type === 'Fixed Price' && service.deadline && (
                 <div className="flex justify-between border-b pb-2 dark:border-slate-700">
                   <span className="text-slate-500">Deadline</span>
                   <span className="font-bold">{service.deadline}</span>
                 </div>
               )}
               {service.type === 'Retainer' && (
                 <div className="flex justify-between border-b pb-2 dark:border-slate-700">
                   <span className="text-slate-500">Monthly Value</span>
                   <span className="font-bold">₱{service.value?.toLocaleString()}</span>
                 </div>
               )}
               {service.type === 'Retainer' && service.renew_date && (
                 <div className="flex justify-between border-b pb-2 dark:border-slate-700">
                   <span className="text-slate-500">Renews On</span>
                   <span className="font-bold">{service.renew_date}</span>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"""

target = "export function Freelancing"
content = content.replace(target, dashboard_component + target)

old_selected_service_target = """  if (selectedService) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setSelectedService(null)} className={`p-2 rounded-xl transition-colors ${isAdvanced ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-50 border shadow-sm text-slate-600'}`}>
             <X size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold">{selectedService.name}</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{selectedService.client} - {selectedService.type}</p>
          </div>
        </div>
        <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
           <h3 className="text-xl font-bold mb-4">Service Details</h3>
           <p>Type: {selectedService.type}</p>
           {selectedService.type === 'Hourly' && <p>Rate: ₱{selectedService.rate}/hr</p>}
           {selectedService.type === 'Fixed Price' && <p>Contract Value: ₱{selectedService.value}</p>}
           <div className="mt-6">
             <button onClick={() => { setActiveServiceId(selectedService.id); setIsTimerRunning(true); setSelectedService(null); setActiveTab('overview'); }} className={`px-4 py-2 rounded-xl font-bold text-sm ${isAdvanced ? 'bg-violet-600 text-white' : 'bg-slate-900 text-white'}`}>
               Start Timer for this Service
             </button>
           </div>
        </div>
      </div>
    );
  }"""
  
new_selected_service = """  if (selectedService) {
    return (
      <ServiceDashboard 
        service={selectedService} 
        isAdvanced={isAdvanced} 
        onBack={() => setSelectedService(null)} 
        onStartTimer={() => { setActiveServiceId(selectedService.id); setIsTimerRunning(true); setSelectedService(null); setActiveTab('overview'); }} 
      />
    );
  }"""

content = content.replace(old_selected_service_target, new_selected_service)

with open("src/pages/Freelancing.tsx", "w") as f:
    f.write(content)
