import re

with open("src/pages/Freelancing.tsx", "r") as f:
    content = f.read()

# I will write a completely new Freelancing component
new_component = """import React, { useState, useEffect, useRef } from 'react';
import { Briefcase, Clock, Plus, Play, Square, FileText, ArrowUpRight, MoreVertical, X, Download, Save } from 'lucide-react';
import { useStore } from '../store/useStore';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export function Freelancing({ currentTab, onNavigate }: any) {
  const { themeMode } = useStore();
  const isAdvanced = themeMode === 'advanced';

  const [activeTab, setActiveTab] = useState('overview');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [activeServiceId, setActiveServiceId] = useState<number | null>(null);

  const [services, setServices] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [newService, setNewService] = useState({ name: '', client: '', type: 'Fixed Price', rate: '', value: '', cap: '' });

  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ service_id: '', invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(Math.random()*1000)}`, amount: '', issue_date: new Date().toISOString().split('T')[0], due_date: '', client_name: '' });

  const [selectedService, setSelectedService] = useState<any | null>(null);

  const invoiceRef = useRef<HTMLDivElement>(null);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/freelancing/services');
      const data = await res.json();
      setServices(data);
    } catch(e) {}
  };

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/freelancing/invoices');
      const data = await res.json();
      setInvoices(data);
    } catch(e) {}
  };

  useEffect(() => {
    fetchServices();
    fetchInvoices();
  }, []);

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

  const saveTimeLog = async () => {
    if (timerSeconds === 0) return;
    try {
      await fetch('/api/freelancing/time_logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: activeServiceId,
          date: new Date().toISOString().split('T')[0],
          seconds: timerSeconds,
          description: 'Time logged'
        })
      });
      setTimerSeconds(0);
      setIsTimerRunning(false);
      setActiveServiceId(null);
      fetchServices();
    } catch(e) {}
  };

  const handleAddService = async () => {
    try {
      await fetch('/api/freelancing/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newService.name,
          client: newService.client,
          type: newService.type,
          rate: parseFloat(newService.rate) || 0,
          value: parseFloat(newService.value) || 0,
          cap: parseInt(newService.cap) || 0,
          status: 'Active',
          progress: 0
        })
      });
      fetchServices();
      setIsAddServiceOpen(false);
      setNewService({ name: '', client: '', type: 'Fixed Price', rate: '', value: '', cap: '' });
    } catch(e) {}
  };

  const handleAddInvoice = async () => {
    try {
      await fetch('/api/freelancing/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: newInvoice.service_id,
          invoice_number: newInvoice.invoice_number,
          amount: parseFloat(newInvoice.amount) || 0,
          issue_date: newInvoice.issue_date,
          due_date: newInvoice.due_date,
          client_name: newInvoice.client_name,
          status: 'Pending'
        })
      });
      fetchInvoices();
      setIsAddInvoiceOpen(false);
    } catch(e) {}
  };

  const exportPDF = async () => {
    if (!invoiceRef.current) return;
    const canvas = await html2canvas(invoiceRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('invoice.pdf');
  };

  const incomeData = [
    { month: 'Jan', hourly: 25000, fixed: 45000, retainer: 30000 },
    { month: 'Feb', hourly: 32000, fixed: 15000, retainer: 30000 },
    { month: 'Mar', hourly: 28000, fixed: 60000, retainer: 30000 },
    { month: 'Apr', hourly: 41000, fixed: 20000, retainer: 45000 },
    { month: 'May', hourly: 35000, fixed: 40000, retainer: 45000 },
    { month: 'Jun', hourly: 39000, fixed: 55000, retainer: 45000 },
  ];

  if (selectedService) {
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
  }

  return (
    <div className="space-y-6 pb-10 relative">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black">Freelance Hub</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage gigs, time tracking, and invoicing.</p>
        </div>
        
        {/* Active Timer Sticky Header */}
        <div className={`p-2 rounded-2xl flex items-center gap-4 ${isAdvanced ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200 shadow-sm'}`}>
          <div className={`font-mono font-black text-2xl w-32 text-center ${isTimerRunning ? (isAdvanced ? 'text-violet-400' : 'text-violet-600') : 'text-slate-400'}`}>
            {formatTime(timerSeconds)}
          </div>
          <div className="flex gap-2">
            {!isTimerRunning ? (
              <button onClick={() => setIsTimerRunning(true)} className="p-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
                <Play size={20} fill="currentColor" />
              </button>
            ) : (
              <button onClick={() => setIsTimerRunning(false)} className="p-3 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors">
                <Square size={20} fill="currentColor" />
              </button>
            )}
            {timerSeconds > 0 && !isTimerRunning && (
              <button onClick={saveTimeLog} className="p-3 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors" title="Save Time Log">
                <Save size={20} />
              </button>
            )}
          </div>
          <div className="px-3 border-l dark:border-slate-700 flex flex-col justify-center">
            <select 
              value={activeServiceId || ''} 
              onChange={(e) => setActiveServiceId(parseInt(e.target.value))}
              className={`text-xs font-bold bg-transparent outline-none ${isAdvanced ? 'text-slate-300' : 'text-slate-700'}`}
            >
               <option value="">No Active Service</option>
               {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl w-max overflow-x-auto">
        <button onClick={() => setActiveTab('overview')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'overview' ? (isAdvanced ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Overview</button>
        <button onClick={() => setActiveTab('gigs')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'gigs' ? (isAdvanced ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>My Services</button>
        <button onClick={() => setActiveTab('invoices')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'invoices' ? (isAdvanced ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Invoices</button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid md:grid-cols-3 gap-4">
            <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isAdvanced ? 'bg-slate-900 text-violet-400' : 'bg-slate-50 text-indigo-600'}`}>
                <Briefcase size={24} />
              </div>
              <p className="text-sm font-bold text-slate-500 mb-1">Active Gigs</p>
              <p className="text-3xl font-black">{services.length}</p>
            </div>
            <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isAdvanced ? 'bg-slate-900 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                <FileText size={24} />
              </div>
              <p className="text-sm font-bold text-slate-500 mb-1">Pending Invoices</p>
              <p className="text-3xl font-black">{invoices.filter(i => i.status === 'Pending').length}</p>
            </div>
            <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isAdvanced ? 'bg-slate-900 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                <Clock size={24} />
              </div>
              <p className="text-sm font-bold text-slate-500 mb-1">Hours Logged (Week)</p>
              <p className="text-3xl font-black">{services.reduce((acc, s) => acc + (s.hours_logged||0), 0).toFixed(1)}h</p>
            </div>
          </div>

          <div className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <h3 className="font-bold text-lg mb-6">Income Breakdown</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isAdvanced ? '#334155' : '#e2e8f0'} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isAdvanced ? '#94a3b8' : '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isAdvanced ? '#94a3b8' : '#64748b' }} tickFormatter={(val) => `₱${val/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: isAdvanced ? '#1e293b' : '#ffffff', border: isAdvanced ? '1px solid #334155' : '1px solid #e2e8f0', borderRadius: '12px' }}
                    itemStyle={{ color: isAdvanced ? '#e2e8f0' : '#0f172a', fontWeight: 'bold' }}
                    formatter={(value: number) => `₱${value.toLocaleString()}`}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="hourly" name="Hourly" stackId="a" fill={isAdvanced ? '#8b5cf6' : '#6366f1'} radius={[0, 0, 4, 4]} />
                  <Bar dataKey="fixed" name="Fixed Price" stackId="a" fill={isAdvanced ? '#3b82f6' : '#3b82f6'} />
                  <Bar dataKey="retainer" name="Retainer" stackId="a" fill={isAdvanced ? '#10b981' : '#10b981'} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'gigs' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-xl">Active Services</h3>
            <button onClick={() => setIsAddServiceOpen(true)} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${isAdvanced ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
              <Plus size={16} /> New Service
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
             {services.map((gig) => (
               <div key={gig.id} className={`p-6 rounded-3xl border shadow-sm transition-transform hover:-translate-y-1 ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                 <div className="flex justify-between items-start mb-4">
                   <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isAdvanced ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                     {gig.type}
                   </div>
                   <span onClick={() => setSelectedService(gig)} className="p-2 -mr-2 -mt-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"><MoreVertical size={16} className="text-slate-400" /></span>
                 </div>
                 <h4 className="font-black text-xl mb-1">{gig.name}</h4>
                 <p className="text-sm font-bold text-slate-500 mb-6 flex items-center gap-2"><Briefcase size={14}/> {gig.client}</p>

                 {gig.type === 'Fixed Price' && (
                   <div className="space-y-4">
                     <div>
                       <p className="text-xs font-bold text-slate-500 mb-1">Contract Value</p>
                       <p className="font-black text-2xl">₱{gig.value?.toLocaleString()}</p>
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
                         <span>Hours Logged</span>
                         <span>{gig.hours_logged?.toFixed(1)} {gig.cap ? `/ ${gig.cap}h` : ''}</span>
                       </div>
                     </div>
                   </div>
                 )}
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
               <button onClick={() => setIsAddInvoiceOpen(true)} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${isAdvanced ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
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
                    <th className="pb-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed dark:divide-slate-700">
                  {invoices.map(i => (
                    <tr key={i.id} className={isAdvanced ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}>
                      <td className="py-4 font-mono font-bold text-violet-500">{i.invoice_number}</td>
                      <td className="py-4 font-bold">{i.client_name}</td>
                      <td className="py-4 text-slate-500">{i.issue_date}</td>
                      <td className="py-4 text-right font-bold">₱{i.amount.toLocaleString()}</td>
                      <td className="py-4 text-right">
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${isAdvanced ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>{i.status}</span>
                      </td>
                      <td className="py-4 text-right">
                         <button className="text-blue-500 hover:text-blue-600 font-bold text-xs" onClick={() => {
                            // Show PDF Preview Modal for this invoice
                         }}>
                            Preview
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Hidden PDF template for export */}
          <div className="hidden">
             <div ref={invoiceRef} className="p-10 bg-white text-black w-[800px]">
                <h1 className="text-4xl font-black mb-10">INVOICE</h1>
                <div className="flex justify-between mb-10">
                   <div>
                      <p className="font-bold">FinGent Freelancer</p>
                      <p>freelance@fingent.com</p>
                   </div>
                   <div className="text-right">
                      <p className="font-bold">Invoice #INV-TEST</p>
                      <p>Date: {new Date().toLocaleDateString()}</p>
                   </div>
                </div>
                <table className="w-full text-left mb-10">
                   <thead><tr className="border-b-2 border-black"><th className="pb-2">Description</th><th className="pb-2 text-right">Amount</th></tr></thead>
                   <tbody>
                      <tr className="border-b"><td className="py-4">Service Rendered</td><td className="py-4 text-right">₱50,000</td></tr>
                   </tbody>
                </table>
                <div className="text-right">
                   <p className="text-2xl font-black">Total: ₱50,000</p>
                </div>
             </div>
          </div>

        </div>
      )}

      {/* Modals */}
      {isAddServiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl ${isAdvanced ? 'bg-slate-800' : 'bg-white'}`}>
            <h3 className="text-xl font-bold mb-4">Add Service</h3>
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-slate-500 mb-1 block">Service Name</label><input type="text" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} /></div>
              <div><label className="text-xs font-bold text-slate-500 mb-1 block">Client</label><input type="text" value={newService.client} onChange={e => setNewService({...newService, client: e.target.value})} className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} /></div>
              <div><label className="text-xs font-bold text-slate-500 mb-1 block">Type</label>
                <select value={newService.type} onChange={e => setNewService({...newService, type: e.target.value})} className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}>
                  <option value="Fixed Price">Fixed Price</option>
                  <option value="Hourly">Hourly</option>
                </select>
              </div>
              {newService.type === 'Fixed Price' && <div><label className="text-xs font-bold text-slate-500 mb-1 block">Value</label><input type="number" value={newService.value} onChange={e => setNewService({...newService, value: e.target.value})} className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} /></div>}
              {newService.type === 'Hourly' && <div><label className="text-xs font-bold text-slate-500 mb-1 block">Hourly Rate</label><input type="number" value={newService.rate} onChange={e => setNewService({...newService, rate: e.target.value})} className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} /></div>}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsAddServiceOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={handleAddService} className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700' : 'bg-slate-900 hover:bg-slate-800'}`}>Save</button>
            </div>
          </div>
        </div>
      )}

      {isAddInvoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl ${isAdvanced ? 'bg-slate-800' : 'bg-white'}`}>
            <h3 className="text-xl font-bold mb-4">Create Invoice</h3>
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-slate-500 mb-1 block">Client Name</label><input type="text" value={newInvoice.client_name} onChange={e => setNewInvoice({...newInvoice, client_name: e.target.value})} className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} /></div>
              <div><label className="text-xs font-bold text-slate-500 mb-1 block">Amount</label><input type="number" value={newInvoice.amount} onChange={e => setNewInvoice({...newInvoice, amount: e.target.value})} className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} /></div>
              <div><label className="text-xs font-bold text-slate-500 mb-1 block">Due Date</label><input type="date" value={newInvoice.due_date} onChange={e => setNewInvoice({...newInvoice, due_date: e.target.value})} className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} /></div>
              <div className="flex gap-2">
                 <button onClick={exportPDF} className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold flex justify-center items-center gap-2"><Download size={16}/> Export PDF</button>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsAddInvoiceOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={handleAddInvoice} className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700' : 'bg-slate-900 hover:bg-slate-800'}`}>Save</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
"""

with open("src/pages/Freelancing.tsx", "w") as f:
    f.write(new_component)
