import re

with open("src/pages/Freelancing.tsx", "r") as f:
    content = f.read()

# Replace ContractsTab
old_contracts_start = "function ContractsTab({"
old_contracts_end = "  );\n}"

contracts_content = content[content.find(old_contracts_start):content.find(old_contracts_end, content.find(old_contracts_start)) + len(old_contracts_end)]

new_contracts = """function ContractsTab({
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
}"""

content = content.replace(contracts_content, new_contracts)

with open("src/pages/Freelancing.tsx", "w") as f:
    f.write(content)
