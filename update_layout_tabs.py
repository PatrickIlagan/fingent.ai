import re

with open("src/components/Layout.tsx", "r") as f:
    content = f.read()

target = """  if (selectedBusiness) {
    if (selectedBusiness.type === 'Store') {"""
    
replacement = """  if (selectedBusiness) {
    if (selectedBusiness.type === 'Store') {"""

if "selectedFreelance" not in content:
    # Need to import selectedFreelance if not there
    target_store = "const { themeMode, setThemeMode, selectedBusiness, setSelectedBusiness } = useStore();"
    repl_store = "const { themeMode, setThemeMode, selectedBusiness, setSelectedBusiness, selectedFreelance, setSelectedFreelance } = useStore();"
    content = content.replace(target_store, repl_store)
    
    # Add tabs for freelance
    target_tabs = """      ];
    }
  }"""
    repl_tabs = """      ];
    }
  } else if (selectedFreelance) {
    tabs = [
      { id: 'freelance-dashboard', icon: Building, label: 'Dashboard' },
      { id: 'freelance-contracts', icon: Briefcase, label: 'Contracts' },
      { id: 'freelance-invoices', icon: DollarSign, label: 'Invoices' },
      { id: 'freelance-time', icon: Clock, label: 'Time Logs' },
    ];
  }"""
    content = content.replace(target_tabs, repl_tabs)
    
    # Add back button for freelance
    target_back = """          {selectedBusiness && (
            <div className="mb-4">
              <button 
                onClick={() => { setSelectedBusiness(null); setCurrentTab('business'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors w-full ${isAdvanced ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <ArrowLeft size={16} /> Back to Portfolio
              </button>
            </div>
          )}"""
    repl_back = target_back + """
          {selectedFreelance && (
            <div className="mb-4">
              <button 
                onClick={() => { setSelectedFreelance(null); setCurrentTab('freelancing'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors w-full ${isAdvanced ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <ArrowLeft size={16} /> Back to Services
              </button>
            </div>
          )}"""
    content = content.replace(target_back, repl_back)

with open("src/components/Layout.tsx", "w") as f:
    f.write(content)
