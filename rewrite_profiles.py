import re

with open("src/pages/Freelancing.tsx", "r") as f:
    content = f.read()

# Replace Freelancing component profile rendering to add edit and delete
old_profiles_start = "          {profiles.map((p) => ("
old_profiles_end = "          {profiles.length === 0 && ("

profiles_content = content[content.find(old_profiles_start):content.find(old_profiles_end, content.find(old_profiles_start))]

new_profiles = """          {profiles.map((p) => (
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
"""

content = content.replace(profiles_content, new_profiles)

# Now add the state for edit Profile
state_start = "const [isAddProfileOpen, setIsAddProfileOpen] = useState(false);"
state_end = "  const fetchProfiles = async () => {"

old_state_content = content[content.find(state_start):content.find(state_end, content.find(state_start))]

new_state = """  const [isAddProfileOpen, setIsAddProfileOpen] = useState(false);
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

"""

content = content.replace(old_state_content, new_state)

# Replace the Add profile modal to support Edit
modal_start = "{isAddProfileOpen && ("
modal_end = "      </div>\n    );\n  }"

old_modal_content = content[content.find(modal_start):content.find(modal_end, content.find(modal_start))]

new_modal = """{(isAddProfileOpen || isEditProfileOpen) && (
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
"""

content = content.replace(old_modal_content, new_modal)

with open("src/pages/Freelancing.tsx", "w") as f:
    f.write(content)
