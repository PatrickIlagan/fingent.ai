import React, { useState, useEffect, useRef } from "react";
import {
  Briefcase,
  FileText,
  Clock,
  Play,
  Square,
  Plus,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  Filter,
  Building,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export function Freelancing({ currentTab, onNavigate }: any) {
  const { themeMode, selectedFreelance, setSelectedFreelance } = useStore();
  const isAdvanced = themeMode === "advanced";

  // State for Profiles List
  const [profiles, setProfiles] = useState<any[]>([]);
    const [isAddProfileOpen, setIsAddProfileOpen] = useState(false);
  const [newProfile, setNewProfile] = useState({
    name: "",
    type: "Design",
    description: "",
  });
  
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<any>(null);

  const handleDeleteProfile = async (id: number) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await fetch(`/api/freelance_businesses/${id}`, { method: 'DELETE' });
      fetchProfiles();
    } catch(e) {}
  };
  
  const handleEditProfile = async () => {
    try {
      await fetch(`/api/freelance_businesses/${editProfile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editProfile),
      });
      fetchProfiles();
      setIsEditProfileOpen(false);
      setEditProfile(null);
    } catch (e) {}
  };

  const fetchProfiles = async () => {
    try {
      const res = await fetch("/api/freelance_businesses");
      const data = await res.json();
      setProfiles(data);
    } catch (e) {}
  };

  useEffect(() => {
    if (!selectedFreelance) {
      fetchProfiles();
    }
  }, [selectedFreelance]);

  const handleAddProfile = async () => {
    try {
      await fetch("/api/freelance_businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProfile),
      });
      fetchProfiles();
      setIsAddProfileOpen(false);
      setNewProfile({ name: "", type: "Design", description: "" });
    } catch (e) {}
  };

  // State for inside a Profile
  const [services, setServices] = useState<any[]>([]); // Contracts
  const [invoices, setInvoices] = useState<any[]>([]);
  const [timeLogs, setTimeLogs] = useState<any[]>([]);

  const fetchData = async () => {
    if (!selectedFreelance) return;
    try {
      const [sRes, iRes, tRes] = await Promise.all([
        fetch(`/api/freelancing/services?business_id=${selectedFreelance.id}`),
        fetch(`/api/freelancing/invoices?business_id=${selectedFreelance.id}`),
        fetch(`/api/freelancing/time_logs?business_id=${selectedFreelance.id}`),
      ]);
      setServices(await sRes.json());
      setInvoices(await iRes.json());
      setTimeLogs(await tRes.json());
    } catch (e) {}
  };

  useEffect(() => {
    if (selectedFreelance) {
      fetchData();
    }
  }, [selectedFreelance]);

  // If no profile is selected, show the Profiles overview
  if (!selectedFreelance) {
    return (
      <div className="space-y-6 pb-10 animate-in fade-in duration-300">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black">Freelance Services</h1>
            <p className="text-slate-500 mt-2">
              Manage your different freelance offerings and businesses.
            </p>
          </div>
          <button
            onClick={() => setIsAddProfileOpen(true)}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 ${isAdvanced ? "bg-violet-600 text-white hover:bg-violet-700" : "bg-slate-900 text-white hover:bg-slate-800"}`}
          >
            <Plus size={16} /> New Service
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((p) => (
            <div
              key={p.id}
              className={`p-6 rounded-3xl border shadow-sm cursor-pointer transition-all hover:-translate-y-1 relative group ${isAdvanced ? "bg-slate-800 border-slate-700 hover:border-violet-500" : "bg-white border-slate-200 hover:border-indigo-300"}`}
              onClick={() => {
                setSelectedFreelance(p);
                onNavigate("freelance-dashboard");
              }}
            >
              <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                 <button onClick={(e) => { e.stopPropagation(); setEditProfile(p); setIsEditProfileOpen(true); }} className={`p-2 rounded-lg ${isAdvanced ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}>
                   <MoreHorizontal size={16} className="text-slate-500" />
                 </button>
                 <button onClick={(e) => { e.stopPropagation(); handleDeleteProfile(p.id); }} className={`p-2 rounded-lg ${isAdvanced ? "hover:bg-red-900/30" : "hover:bg-red-50"}`}>
                   <X size={16} className="text-red-500" />
                 </button>
              </div>

              <div className="flex justify-between items-start mb-4">
                <div
                  className={`p-3 rounded-2xl ${isAdvanced ? "bg-slate-900 text-violet-400" : "bg-indigo-50 text-indigo-600"}`}
                >
                  <Briefcase size={24} />
                </div>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${isAdvanced ? "bg-slate-900 text-slate-400" : "bg-slate-100 text-slate-500"}`}
                >
                  {p.type}
                </span>
              </div>
              <h3 className="text-xl font-bold mb-1">{p.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                {p.description}
              </p>
            </div>
          ))}
          {profiles.length === 0 && (
            <div className="col-span-full py-10 text-center">
              <p className="text-slate-500">
                No freelance services found. Create one to get started.
              </p>
            </div>
          )}
        </div>

        {(isAddProfileOpen || isEditProfileOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div
              className={`w-full max-w-md p-6 rounded-3xl ${isAdvanced ? "bg-slate-800" : "bg-white"}`}
            >
              <h3 className="text-xl font-bold mb-4">{isEditProfileOpen ? "Edit Freelance Service" : "Add Freelance Service"}</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">
                    Name
                  </label>
                  <input
                    type="text"
                    value={isEditProfileOpen ? editProfile.name : newProfile.name}
                    onChange={(e) =>
                      isEditProfileOpen ? setEditProfile({ ...editProfile, name: e.target.value }) : setNewProfile({ ...newProfile, name: e.target.value })
                    }
                    placeholder="e.g. Acme Web Design"
                    className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">
                    Category
                  </label>
                  <select
                    value={isEditProfileOpen ? editProfile.type : newProfile.type}
                    onChange={(e) =>
                      isEditProfileOpen ? setEditProfile({ ...editProfile, type: e.target.value }) : setNewProfile({ ...newProfile, type: e.target.value })
                    }
                    className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"}`}
                  >
                    <option value="Design">Design</option>
                    <option value="Development">Development</option>
                    <option value="Writing">Writing</option>
                    <option value="Consulting">Consulting</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">
                    Description
                  </label>
                  <textarea
                    value={isEditProfileOpen ? editProfile.description : newProfile.description}
                    onChange={(e) =>
                      isEditProfileOpen ? setEditProfile({ ...editProfile, description: e.target.value }) : setNewProfile({ ...newProfile, description: e.target.value })
                    }
                    rows={3}
                    className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"}`}
                  ></textarea>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setIsAddProfileOpen(false); setIsEditProfileOpen(false); }}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={isEditProfileOpen ? handleEditProfile : handleAddProfile}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white ${isAdvanced ? "bg-violet-600 hover:bg-violet-700" : "bg-slate-900 hover:bg-slate-800"}`}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Inside a Profile
  return (
    <FreelanceDashboard
      selectedFreelance={selectedFreelance}
      currentTab={currentTab}
      services={services}
      invoices={invoices}
      timeLogs={timeLogs}
      fetchAll={fetchData}
    />
  );
}

function FreelanceDashboard({
  selectedFreelance,
  currentTab,
  services,
  invoices,
  timeLogs,
  fetchAll,
}: any) {
  const { themeMode } = useStore();
  const isAdvanced = themeMode === "advanced";

  const totalBilled = invoices
    .filter((i: any) => i.status === "Paid")
    .reduce((a: any, c: any) => a + c.amount, 0);
  const totalOutstanding = invoices
    .filter((i: any) => i.status !== "Paid")
    .reduce((a: any, c: any) => a + c.amount, 0);
  const totalHours = timeLogs.reduce(
    (a: any, c: any) => a + c.seconds / 3600,
    0,
  );

  if (currentTab === "freelance-dashboard") {
    return (
      <div className="space-y-6 pb-10 animate-in fade-in duration-300">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black">{selectedFreelance.name}</h1>
            <p className="text-slate-500 mt-2">
              {selectedFreelance.type} • {selectedFreelance.description}
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}
          >
            <p className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">
              Total Billed
            </p>
            <p className="text-3xl font-black text-emerald-500">
              ₱{totalBilled.toLocaleString()}
            </p>
          </div>
          <div
            className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}
          >
            <p className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">
              Outstanding
            </p>
            <p className="text-3xl font-black text-amber-500">
              ₱{totalOutstanding.toLocaleString()}
            </p>
          </div>
          <div
            className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}
          >
            <p className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">
              Active Contracts
            </p>
            <p className="text-3xl font-black text-blue-500">
              {services.filter((s: any) => s.status === "Active").length}
            </p>
          </div>
          <div
            className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}
          >
            <p className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">
              Hours Logged
            </p>
            <p className="text-3xl font-black text-violet-500">
              {totalHours.toFixed(1)}h
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Contracts
  if (currentTab === "freelance-contracts") {
    return (
      <ContractsTab
        businessId={selectedFreelance.id}
        services={services}
        fetchAll={fetchAll}
        isAdvanced={isAdvanced}
      />
    );
  }

  // Invoices
  if (currentTab === "freelance-invoices") {
    return (
      <InvoicesTab
        businessId={selectedFreelance.id}
        invoices={invoices}
        services={services}
        fetchAll={fetchAll}
        isAdvanced={isAdvanced}
      />
    );
  }

  // Time Logs
  if (currentTab === "freelance-time") {
    return (
      <TimeLogsTab
        businessId={selectedFreelance.id}
        timeLogs={timeLogs}
        services={services}
        fetchAll={fetchAll}
        isAdvanced={isAdvanced}
      />
    );
  }

  return null;
}

function ContractsTab({
  businessId,
  services,
  fetchAll,
  isAdvanced,
}: any) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newService, setNewService] = useState({
    name: "",
    client: "",
    type: "Fixed Price",
    rate: "",
    value: "",
    cap: "",
    status: "Active"
  });
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editService, setEditService] = useState<any>(null);

  const handleAdd = async () => {
    try {
      await fetch("/api/freelancing/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newService, business_id: businessId }),
      });
      fetchAll();
      setIsAddOpen(false);
    } catch (e) {}
  };
  
  const handleEdit = async () => {
    try {
      await fetch(`/api/freelancing/services/${editService.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editService),
      });
      fetchAll();
      setIsEditOpen(false);
      setEditService(null);
    } catch (e) {}
  };
  
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this contract?')) return;
    try {
      await fetch(`/api/freelancing/services/${id}`, {
        method: "DELETE"
      });
      fetchAll();
    } catch (e) {}
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-300">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black">Contracts</h1>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 ${isAdvanced ? "bg-violet-600 text-white hover:bg-violet-700" : "bg-slate-900 text-white hover:bg-slate-800"}`}
        >
          <Plus size={16} /> New Contract
        </button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((s: any) => (
          <div
            key={s.id}
            className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"} relative group`}
          >
            <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-2">
               <button onClick={() => { setEditService(s); setIsEditOpen(true); }} className={`p-2 rounded-lg ${isAdvanced ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}>
                 <MoreHorizontal size={16} className="text-slate-500" />
               </button>
               <button onClick={() => handleDelete(s.id)} className={`p-2 rounded-lg ${isAdvanced ? "hover:bg-red-900/30" : "hover:bg-red-50"}`}>
                 <X size={16} className="text-red-500" />
               </button>
            </div>
            
            <div className="flex justify-between items-start mb-4">
              <span
                className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${isAdvanced ? "bg-slate-900 text-slate-400" : "bg-slate-100 text-slate-500"}`}
              >
                {s.type}
              </span>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${s.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
              >
                {s.status}
              </span>
            </div>
            <h3 className="text-xl font-bold">{s.name}</h3>
            <p className="text-sm text-slate-500 mb-4">{s.client}</p>
            {s.type === "Fixed Price" && (
              <p className="font-mono font-bold text-lg">
                ₱{s.value?.toLocaleString()}
              </p>
            )}
            {s.type === "Hourly" && (
              <p className="font-mono font-bold text-lg">₱{s.rate}/hr</p>
            )}
          </div>
        ))}
        {services.length === 0 && (
          <p className="col-span-full py-10 text-center text-slate-500">
            No contracts found.
          </p>
        )}
      </div>

      {(isAddOpen || isEditOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className={`w-full max-w-md p-6 rounded-3xl ${isAdvanced ? "bg-slate-800" : "bg-white"}`}
          >
            <h3 className="text-xl font-bold mb-4">{isEditOpen ? "Edit Contract" : "Add Contract"}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">
                  Name
                </label>
                <input
                  type="text"
                  value={isEditOpen ? editService.name : newService.name}
                  onChange={(e) =>
                    isEditOpen ? setEditService({ ...editService, name: e.target.value }) : setNewService({ ...newService, name: e.target.value })
                  }
                  className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"}`}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">
                  Client
                </label>
                <input
                  type="text"
                  value={isEditOpen ? editService.client : newService.client}
                  onChange={(e) =>
                    isEditOpen ? setEditService({ ...editService, client: e.target.value }) : setNewService({ ...newService, client: e.target.value })
                  }
                  className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"}`}
                />
              </div>
              
              {isEditOpen && (
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">
                    Status
                  </label>
                  <select
                    value={editService.status}
                    onChange={(e) =>
                      setEditService({ ...editService, status: e.target.value })
                    }
                    className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"}`}
                  >
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              )}
              
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">
                  Type
                </label>
                <select
                  value={isEditOpen ? editService.type : newService.type}
                  onChange={(e) =>
                    isEditOpen ? setEditService({ ...editService, type: e.target.value }) : setNewService({ ...newService, type: e.target.value })
                  }
                  className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"}`}
                >
                  <option value="Fixed Price">Fixed Price</option>
                  <option value="Hourly">Hourly</option>
                </select>
              </div>
              
              {(isEditOpen ? editService.type : newService.type) === "Fixed Price" && (
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">
                    Value
                  </label>
                  <input
                    type="number"
                    value={isEditOpen ? editService.value : newService.value}
                    onChange={(e) =>
                      isEditOpen ? setEditService({ ...editService, value: e.target.value }) : setNewService({ ...newService, value: e.target.value })
                    }
                    className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"}`}
                  />
                </div>
              )}
              {(isEditOpen ? editService.type : newService.type) === "Hourly" && (
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">
                    Hourly Rate
                  </label>
                  <input
                    type="number"
                    value={isEditOpen ? editService.rate : newService.rate}
                    onChange={(e) =>
                      isEditOpen ? setEditService({ ...editService, rate: e.target.value }) : setNewService({ ...newService, rate: e.target.value })
                    }
                    className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"}`}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={isEditOpen ? handleEdit : handleAdd}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white ${isAdvanced ? "bg-violet-600 hover:bg-violet-700" : "bg-slate-900 hover:bg-slate-800"}`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InvoicesTab({
  businessId,
  invoices,
  services,
  fetchAll,
  isAdvanced,
}: any) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    service_id: "",
    invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
    amount: "",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: "",
    client_name: "",
  });

  const invoiceRef = useRef<HTMLDivElement>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const handleAdd = async () => {
    try {
      await fetch("/api/freelancing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newInvoice,
          business_id: businessId,
          amount: parseFloat(newInvoice.amount) || 0,
        }),
      });
      fetchAll();
      setIsAddOpen(false);
    } catch (e) {}
  };


  const handleMarkAsPaid = async (inv: any) => {
    try {
      await fetch(`/api/freelancing/invoices/${inv.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...inv, status: 'Paid' })
      });
      fetchAll();
    } catch (e) {}
  };
  
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await fetch(`/api/freelancing/invoices/${id}`, { method: 'DELETE' });
      fetchAll();
    } catch (e) {}
  };

  const exportPDF = async (inv: any) => {
    setSelectedInvoice(inv);
    setTimeout(async () => {
      if (!invoiceRef.current) return;
      const canvas = await html2canvas(invoiceRef.current);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${inv.invoice_number}.pdf`);
      setSelectedInvoice(null);
    }, 100);
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-300">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black">Invoices</h1>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 ${isAdvanced ? "bg-violet-600 text-white hover:bg-violet-700" : "bg-slate-900 text-white hover:bg-slate-800"}`}
        >
          <Plus size={16} /> New Invoice
        </button>
      </div>

      <div
        className={`rounded-3xl border overflow-hidden ${isAdvanced ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead
              className={`border-b ${isAdvanced ? "border-slate-700 bg-slate-900/50" : "bg-slate-50 border-slate-200"}`}
            >
              <tr>
                <th className="p-4 font-bold text-slate-500">Invoice #</th>
                <th className="p-4 font-bold text-slate-500">Client</th>
                <th className="p-4 font-bold text-slate-500">Date</th>
                <th className="p-4 font-bold text-slate-500 text-right">
                  Amount
                </th>
                <th className="p-4 font-bold text-slate-500 text-right">
                  Status
                </th>
                <th className="p-4 font-bold text-slate-500 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i: any) => (
                <tr
                  key={i.id}
                  className={`border-b last:border-0 ${isAdvanced ? "border-slate-700 hover:bg-slate-700/30" : "border-slate-100 hover:bg-slate-50"}`}
                >
                  <td className="p-4 font-mono font-bold text-violet-500">
                    {i.invoice_number}
                  </td>
                  <td className="p-4 font-bold">{i.client_name}</td>
                  <td className="p-4 text-slate-500">{i.issue_date}</td>
                  <td className="p-4 text-right font-bold">
                    ₱{i.amount.toLocaleString()}
                  </td>
                  <td className="p-4 text-right">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${i.status === 'Paid' ? (isAdvanced ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700") : (isAdvanced ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700")}`}
                    >
                      {i.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-3">
                      {i.status !== 'Paid' && (
                        <button
                          className="text-emerald-500 hover:text-emerald-600 font-bold text-xs flex items-center gap-1"
                          onClick={() => handleMarkAsPaid(i)}
                        >
                          <CheckCircle2 size={14} /> Paid
                        </button>
                      )}
                      <button
                        className="text-blue-500 hover:text-blue-600 font-bold text-xs flex items-center gap-1"
                        onClick={() => exportPDF(i)}
                      >
                        <Download size={14} /> Export
                      </button>
                      <button
                        className="text-red-500 hover:text-red-600 font-bold text-xs flex items-center gap-1"
                        onClick={() => handleDelete(i.id)}
                      >
                        <X size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-500">
                    No invoices.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="fixed -left-[9999px]">
        {selectedInvoice && (
          <div ref={invoiceRef} className="p-10 bg-white text-black w-[800px]">
            <h1 className="text-4xl font-black mb-10">INVOICE</h1>
            <div className="flex justify-between mb-10">
              <div>
                <p className="font-bold text-xl">Freelancer</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">Billed To:</p>
                <p>{selectedInvoice.client_name}</p>
              </div>
            </div>
            <div className="flex justify-between mb-10 pb-5 border-b-2 border-black">
              <div>
                <p className="font-bold">Invoice Number:</p>
                <p>{selectedInvoice.invoice_number}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">Date of Issue:</p>
                <p>{selectedInvoice.issue_date}</p>
              </div>
            </div>
            <table className="w-full text-left mb-10">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="pb-2 font-bold">Description</th>
                  <th className="pb-2 text-right font-bold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-4">Service Rendered</td>
                  <td className="py-4 text-right">
                    ₱{selectedInvoice.amount.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="text-right">
              <p className="text-2xl font-black">
                Total: ₱{selectedInvoice.amount.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className={`w-full max-w-md p-6 rounded-3xl ${isAdvanced ? "bg-slate-800" : "bg-white"}`}
          >
            <h3 className="text-xl font-bold mb-4">Create Invoice</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">
                  Contract
                </label>
                <select
                  value={newInvoice.service_id}
                  onChange={(e) =>
                    setNewInvoice({ ...newInvoice, service_id: e.target.value })
                  }
                  className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"}`}
                >
                  <option value="">Select Contract</option>
                  {services.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">
                  Client Name
                </label>
                <input
                  type="text"
                  value={newInvoice.client_name}
                  onChange={(e) =>
                    setNewInvoice({
                      ...newInvoice,
                      client_name: e.target.value,
                    })
                  }
                  className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"}`}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">
                  Amount
                </label>
                <input
                  type="number"
                  value={newInvoice.amount}
                  onChange={(e) =>
                    setNewInvoice({ ...newInvoice, amount: e.target.value })
                  }
                  className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"}`}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsAddOpen(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white ${isAdvanced ? "bg-violet-600 hover:bg-violet-700" : "bg-slate-900 hover:bg-slate-800"}`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimeLogsTab({
  businessId,
  timeLogs,
  services,
  fetchAll,
  isAdvanced,
}: any) {
  const [activeTimer, setActiveTimer] = useState<{
    service_id: string;
    start: number;
  } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  
  const [isLogMessageOpen, setIsLogMessageOpen] = useState(false);
  const [logMessage, setLogMessage] = useState("");

  useEffect(() => {
    let interval: any;
    if (activeTimer) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - activeTimer.start) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const startTimer = (serviceId: string) => {
    setActiveTimer({ service_id: serviceId, start: Date.now() });
  };

  const stopTimer = () => {
    if (!activeTimer) return;
    setIsLogMessageOpen(true);
  };
  
  const saveTimer = async () => {
    if (!activeTimer) return;
    try {
      await fetch("/api/freelancing/time_logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          service_id: activeTimer.service_id,
          date: new Date().toISOString().split("T")[0],
          seconds: elapsed,
          description: logMessage || "Session",
        }),
      });
      setActiveTimer(null);
      setElapsed(0);
      setIsLogMessageOpen(false);
      setLogMessage("");
      fetchAll();
    } catch (e) {}
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-300">
      <div className="flex justify-between items-end">
        <h1 className="text-3xl font-black">Time Logs</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div
          className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}
        >
          <h3 className="font-bold text-lg mb-4">Timer</h3>
          {activeTimer ? (
            <div className="text-center">
              <p className="text-5xl font-mono font-black mb-4 text-violet-500">
                {Math.floor(elapsed / 3600)
                  .toString()
                  .padStart(2, "0")}
                :
                {Math.floor((elapsed % 3600) / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(elapsed % 60).toString().padStart(2, "0")}
              </p>
              <button
                onClick={stopTimer}
                className="w-full py-3 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2"
              >
                <Square fill="currentColor" size={16} /> Stop Timer
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <select
                id="timer-service"
                className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"}`}
              >
                {services
                  .filter((s: any) => s.type === "Hourly")
                  .map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
              <button
                onClick={() => {
                  const val = (
                    document.getElementById("timer-service") as HTMLSelectElement
                  )?.value;
                  if (val) startTimer(val);
                }}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${isAdvanced ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-emerald-500 text-white hover:bg-emerald-600"}`}
              >
                <Play fill="currentColor" size={16} /> Start Timer
              </button>
            </div>
          )}
        </div>
        <div
          className={`lg:col-span-2 p-6 rounded-3xl border shadow-sm ${isAdvanced ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}
        >
          <h3 className="font-bold text-lg mb-4">Recent Logs</h3>
          <div className="space-y-3">
            {timeLogs.map((l: any) => (
              <div
                key={l.id}
                className={`p-4 rounded-2xl flex justify-between items-center ${isAdvanced ? "bg-slate-900" : "bg-slate-50"}`}
              >
                <div>
                  <p className="font-bold text-sm">
                    {services.find((s: any) => s.id === l.service_id)?.name ||
                      "Unknown"}
                  </p>
                  <p className="text-xs text-slate-500">{l.date} • {l.description}</p>
                </div>
                <div className="font-mono font-bold text-violet-500">
                  {Math.floor(l.seconds / 3600)}h{" "}
                  {Math.floor((l.seconds % 3600) / 60)}m
                </div>
              </div>
            ))}
            {timeLogs.length === 0 && (
              <p className="text-slate-500 text-sm">No time logged yet.</p>
            )}
          </div>
        </div>
      </div>
      
      {isLogMessageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className={`w-full max-w-md p-6 rounded-3xl ${isAdvanced ? "bg-slate-800" : "bg-white"}`}
          >
            <h3 className="text-xl font-bold mb-4">Log Time</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">
                  Description / Work Done
                </label>
                <textarea
                  rows={3}
                  value={logMessage}
                  onChange={(e) => setLogMessage(e.target.value)}
                  placeholder="e.g. Completed homepage design"
                  className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"}`}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsLogMessageOpen(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={saveTimer}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white ${isAdvanced ? "bg-violet-600 hover:bg-violet-700" : "bg-slate-900 hover:bg-slate-800"}`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
