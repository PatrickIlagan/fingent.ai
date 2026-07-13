import React, { useState } from 'react';
import { Home, Calendar, Briefcase, Bot, PieChart, Settings, CreditCard, Clock, Receipt, Target, ChevronDown, ChevronRight, Building, FileText, Download, ArrowLeft, Megaphone, Package, ShoppingCart, Activity, Users, DollarSign, TrendingUp, Tags, UserRound, FileSpreadsheet, Menu, MoreHorizontal, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { exportEverythingWorkbook } from '../lib/workbookExport';
import { exportEverythingPdfStatement } from '../lib/export';

export function Layout({ children, currentTab, setCurrentTab, toggleChat }: any) {
  const { themeMode, setThemeMode, selectedBusiness, setSelectedBusiness, selectedFreelance, setSelectedFreelance } = useStore();
  const [expandedTabs, setExpandedTabs] = useState<Record<string, boolean>>({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdvanced = themeMode === 'advanced';

  
  let tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { 
      id: 'accounts', 
      icon: CreditCard, 
      label: 'Accounts',
      subItems: ['Card', 'Bank', 'Digital', 'Cash']
    },
    { 
      id: 'liabilities', 
      icon: Receipt, 
      label: 'Liabilities',
      subItems: ['Quick Expenses', 'Bills', 'Credits', 'Debts', 'Installments']
    },
    { 
      id: 'plans', 
      icon: Target, 
      label: 'Plans',
      subItems: ['Budget', 'Goals']
    },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
    { 
      id: 'investments', 
      icon: PieChart, 
      label: 'Investments',
      subItems: ['Real Estate', 'Stocks', 'Cryptos', 'Others']
    },
    {
      id: 'career',
      icon: Briefcase,
      label: 'Career',
      subItems: ['Overview', 'Calendar', 'Tasks', 'Upskilling', 'Income']
    },
    { id: 'business', icon: Building, label: 'Business' },
    { id: 'freelancing', icon: Briefcase, label: 'Freelancing' },
    { id: 'taxes', icon: FileText, label: 'Taxes' },
  ];

  if (selectedBusiness) {
    if (selectedBusiness.type === 'Store') {
      tabs = [
        { id: 'business-dashboard', icon: Building, label: 'Dashboard' },
        { id: 'business-records', icon: Package, label: 'Catalogue & Stock' },
        { id: 'business-sales', icon: ShoppingCart, label: 'Orders' },
        { id: 'business-operations', icon: Megaphone, label: 'Marketing & Supply' },
        { id: 'business-finance', icon: Activity, label: 'Cash Flow' },
      ];
    } else if (selectedBusiness.type === 'SaaS') {
      tabs = [
        { id: 'business-dashboard', icon: Building, label: 'Dashboard' },
        { id: 'business-records', icon: Users, label: 'Subscriptions' },
        { id: 'business-sales', icon: Megaphone, label: 'Acquisition' },
        { id: 'business-operations', icon: Package, label: 'Product & Support' },
        { id: 'business-finance', icon: DollarSign, label: 'Cash Flow' },
      ];
    } else if (selectedBusiness.type === 'Agency' || selectedBusiness.type === 'Professional Services') {
      tabs = [
        { id: 'business-dashboard', icon: Building, label: 'Dashboard' },
        { id: 'business-records', icon: Users, label: 'Clients' },
        { id: 'business-sales', icon: Briefcase, label: selectedBusiness.type === 'Agency' ? 'Pipeline & Proposals' : 'Opportunities' },
        { id: 'business-operations', icon: Package, label: 'Delivery' },
        { id: 'business-finance', icon: DollarSign, label: 'Cash Flow' },
      ];
    } else if (selectedBusiness.type === 'Creator') {
      tabs = [
        { id: 'business-dashboard', icon: Building, label: 'Dashboard' },
        { id: 'business-records', icon: DollarSign, label: 'Partnerships' },
        { id: 'business-sales', icon: TrendingUp, label: 'Revenue Streams' },
        { id: 'business-operations', icon: Megaphone, label: 'Content & Growth' },
        { id: 'business-finance', icon: Activity, label: 'Cash Flow' },
      ];
    }
  } else if (selectedFreelance) {
    tabs = [
      { id: 'freelance-dashboard', icon: Building, label: 'Dashboard' },
      { id: 'freelance-contracts', icon: Briefcase, label: 'Contracts' },
      { id: 'freelance-invoices', icon: DollarSign, label: 'Invoices' },
      { id: 'freelance-time', icon: Clock, label: 'Time Logs' },
    ];
  }


  const toggleExpand = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTabs(prev => ({ ...prev, [tabId]: !prev[tabId] }));
  };

  return (
    <div className={`min-h-screen w-full flex flex-col md:flex-row transition-colors duration-500 ${isAdvanced ? 'bg-slate-900 text-slate-100 dark' : 'bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-slate-900'}`}>
      
      {/* Top Header (Mobile & Desktop) */}
      <header className={`fixed top-0 left-0 right-0 h-16 z-30 flex items-center justify-between px-4 md:px-8 border-b shadow-sm backdrop-blur-md ${isAdvanced ? 'bg-slate-900/80 border-slate-700' : 'bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border-emerald-100'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold bg-gradient-to-br ${isAdvanced ? 'from-violet-500 to-fuchsia-500' : 'from-emerald-400 to-teal-500 shadow-emerald-200 shadow-sm'}`}>
            F
          </div>
          <h1 className="font-extrabold text-lg tracking-tight">FinGent</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={toggleChat} className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm hover:scale-105 ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-900/20' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>
            <span className="text-lg leading-none">+</span> Quick Add
          </button>
          <button 
            onClick={() => setCurrentTab('settings')}
            className={`p-2 rounded-full transition-colors ${currentTab === 'settings' ? (isAdvanced ? 'bg-slate-700 text-violet-400' : 'bg-emerald-100 text-emerald-700') : (isAdvanced ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-white shadow-sm border border-emerald-100 hover:bg-emerald-50 text-emerald-600')}`}
          >
            <Settings size={20} />
          </button>
          <button onClick={() => setIsMobileMenuOpen(true)} aria-label="Open navigation" className={`p-2 rounded-full md:hidden ${isAdvanced ? 'bg-slate-800 text-slate-200' : 'bg-white border border-emerald-100 text-emerald-700 shadow-sm'}`}>
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar Nav */}
      <aside className={`hidden md:flex flex-col fixed top-16 left-0 bottom-0 w-64 border-r z-20 pt-8 px-4 ${isAdvanced ? 'bg-slate-900 border-slate-700' : 'bg-gradient-to-b from-white to-emerald-50/30 border-emerald-100'}`}>
        <div className="flex-1 space-y-2 overflow-y-auto hide-scrollbar pb-4">
          {selectedBusiness && (
            <div className="mb-4">
              <button 
                onClick={() => { setSelectedBusiness(null); setCurrentTab('business'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors w-full ${isAdvanced ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <ArrowLeft size={16} /> Back to Portfolio
              </button>
            </div>
          )}
          {selectedFreelance && (
            <div className="mb-4">
              <button 
                onClick={() => { setSelectedFreelance(null); setCurrentTab('freelancing'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors w-full ${isAdvanced ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <ArrowLeft size={16} /> Back to Services
              </button>
            </div>
          )}
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            const hasSubItems = !!tab.subItems;
            const isExpanded = !!expandedTabs[tab.id];

            return (
              <div key={tab.id} className="w-full">
                <button
                  onClick={(e) => {
                    setCurrentTab(tab.id);
                    if (hasSubItems && !isExpanded) {
                      toggleExpand(tab.id, e);
                    } else if (hasSubItems && isExpanded && isActive) {
                      toggleExpand(tab.id, e);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
                    isActive 
                      ? (isAdvanced ? 'bg-violet-600/20 text-violet-400 font-bold' : 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-bold shadow-md shadow-emerald-500/20') 
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    <span>{tab.label}</span>
                  </div>
                  {hasSubItems && (
                    <div 
                      onClick={(e) => toggleExpand(tab.id, e)}
                      className={`p-1 rounded-full transition-colors ${isActive ? (isAdvanced ? 'hover:bg-violet-600/40 text-violet-300' : 'hover:bg-emerald-300 text-white') : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  )}
                </button>
                
                {/* Sub Items */}
                <AnimatePresence>
                  {hasSubItems && isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden ml-4 pl-4 border-l-2 border-slate-100 dark:border-slate-800 mt-2 space-y-1"
                    >
                      {tab.subItems.map((sub, i) => {
                        const subId = `${tab.id}-${sub.toLowerCase()}`;
                        const isSubActive = currentTab === subId;
                        return (
                          <button
                            key={i}
                            onClick={() => setCurrentTab(subId)}
                            className={`w-full text-left px-4 py-2 rounded-xl text-sm transition-colors ${
                              isSubActive
                                ? (isAdvanced ? 'bg-violet-600/30 text-violet-300 font-medium' : 'bg-emerald-100 text-emerald-700 font-medium')
                                : (isAdvanced 
                                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' 
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50')
                            }`}
                          >
                            {sub}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
        <div className={`mt-4 border-t pt-4 pb-3 ${isAdvanced ? 'border-slate-700' : 'border-emerald-100'}`}>
          <p className="px-3 pb-2 text-[10px] font-bold tracking-[0.15em] text-slate-400">PERSONAL SPACE</p>
          <div className={`rounded-2xl p-1.5 ${isAdvanced ? 'bg-slate-800/70' : 'bg-emerald-50/60'}`}>
            <button onClick={() => setCurrentTab('categories')} className={`mb-1 w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${currentTab === 'categories' ? (isAdvanced ? 'bg-violet-600/20 text-violet-300 font-bold' : 'bg-white text-emerald-700 font-bold shadow-sm') : 'text-slate-500 hover:bg-white/70 dark:hover:bg-slate-700'}`}><Tags size={18} /> Categories</button>
            <div>
              <button onClick={(event) => { setCurrentTab('personal'); if (!expandedTabs.personal) toggleExpand('personal', event); }} className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors ${currentTab.startsWith('personal') ? (isAdvanced ? 'bg-violet-600/20 text-violet-300 font-bold' : 'bg-emerald-100 text-emerald-700 font-bold') : 'text-slate-500 hover:bg-white/70 dark:hover:bg-slate-700'}`}><span className="flex items-center gap-3"><UserRound size={18} /> Personal</span><span onClick={(event) => { setCurrentTab('personal'); toggleExpand('personal', event); }} className="rounded-full p-1 hover:bg-slate-200 dark:hover:bg-slate-700">{expandedTabs.personal ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span></button>
              <AnimatePresence>{expandedTabs.personal && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-1 space-y-1 overflow-hidden px-2 pb-1"><button onClick={() => setCurrentTab('personal-notes')} className={`w-full rounded-lg px-3 py-2 text-left text-xs ${currentTab === 'personal-notes' ? 'bg-white font-bold text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-violet-300' : 'text-slate-500 hover:bg-white/70 dark:hover:bg-slate-700'}`}>Notes</button><button onClick={() => setCurrentTab('personal-routines')} className={`w-full rounded-lg px-3 py-2 text-left text-xs ${currentTab === 'personal-routines' ? 'bg-white font-bold text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-violet-300' : 'text-slate-500 hover:bg-white/70 dark:hover:bg-slate-700'}`}>Routines</button></motion.div>}</AnimatePresence>
            </div>
          </div>
        </div>
        <div className="space-y-2 pb-8">
          <button onClick={() => exportEverythingWorkbook().catch(console.error)} className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition-all shadow-sm ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'}`}>
            <FileSpreadsheet size={18} /> Export Excel Workbook
          </button>
          <button onClick={() => exportEverythingPdfStatement().catch(console.error)} className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all ${isAdvanced ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-emerald-700 hover:bg-emerald-50'}`}>
            <Download size={15} /> Export PDF Statement
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.button aria-label="Close navigation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm md:hidden" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 28, stiffness: 280 }} className={`fixed inset-y-0 left-0 z-[60] flex w-[min(20rem,88vw)] flex-col border-r shadow-2xl md:hidden ${isAdvanced ? 'bg-slate-900 border-slate-700' : 'bg-white border-emerald-100'}`}>
              <div className={`flex h-16 shrink-0 items-center justify-between border-b px-4 ${isAdvanced ? 'border-slate-700' : 'border-emerald-100'}`}><div className="flex items-center gap-2 font-black"><div className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm text-white ${isAdvanced ? 'bg-violet-600' : 'bg-emerald-500'}`}>F</div>FinGent</div><button onClick={() => setIsMobileMenuOpen(false)} aria-label="Close navigation" className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={20} /></button></div>
              <nav className="flex-1 overflow-y-auto p-3 pb-6">
                {selectedBusiness && <button onClick={() => { setSelectedBusiness(null); setCurrentTab('business'); setIsMobileMenuOpen(false); }} className={`mb-3 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold ${isAdvanced ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-emerald-50'}`}><ArrowLeft size={16} /> Back to Portfolio</button>}
                {selectedFreelance && <button onClick={() => { setSelectedFreelance(null); setCurrentTab('freelancing'); setIsMobileMenuOpen(false); }} className={`mb-3 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold ${isAdvanced ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-emerald-50'}`}><ArrowLeft size={16} /> Back to Services</button>}
                <div className="space-y-1">
                  {tabs.map(tab => { const Icon = tab.icon; const active = currentTab === tab.id || currentTab.startsWith(tab.id + '-'); return <div key={tab.id}><button onClick={() => { setCurrentTab(tab.id); setIsMobileMenuOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold ${active ? (isAdvanced ? 'bg-violet-600/20 text-violet-300' : 'bg-emerald-100 text-emerald-800') : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}><Icon size={18} />{tab.label}</button>{tab.subItems && <div className="ml-8 border-l border-slate-200 py-1 pl-2 dark:border-slate-700">{tab.subItems.map(sub => { const id = `${tab.id}-${sub.toLowerCase()}`; return <button key={id} onClick={() => { setCurrentTab(id); setIsMobileMenuOpen(false); }} className={`block w-full rounded-lg px-3 py-2 text-left text-xs ${currentTab === id ? 'font-bold text-emerald-700 dark:text-violet-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{sub}</button>; })}</div>}</div>; })}
                </div>
                <div className={`mt-4 border-t pt-4 ${isAdvanced ? 'border-slate-700' : 'border-emerald-100'}`}><p className="px-3 pb-2 text-[10px] font-bold tracking-[0.15em] text-slate-400">PERSONAL SPACE</p><button onClick={() => { setCurrentTab('categories'); setIsMobileMenuOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${currentTab === 'categories' ? 'font-bold text-emerald-700 dark:text-violet-300' : 'text-slate-600 dark:text-slate-300'}`}><Tags size={18} /> Categories</button><button onClick={() => { setCurrentTab('personal'); setIsMobileMenuOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${currentTab.startsWith('personal') ? 'font-bold text-emerald-700 dark:text-violet-300' : 'text-slate-600 dark:text-slate-300'}`}><UserRound size={18} /> Personal</button><div className="ml-8 space-y-1 py-1"><button onClick={() => { setCurrentTab('personal-notes'); setIsMobileMenuOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Notes</button><button onClick={() => { setCurrentTab('personal-routines'); setIsMobileMenuOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Routines</button></div></div>
              </nav>
              <div className={`shrink-0 space-y-2 border-t p-3 ${isAdvanced ? 'border-slate-700' : 'border-emerald-100'}`}><button onClick={() => exportEverythingWorkbook().catch(console.error)} className={`flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold text-white ${isAdvanced ? 'bg-violet-600' : 'bg-emerald-500'}`}><FileSpreadsheet size={17} /> Export Excel</button><button onClick={() => exportEverythingPdfStatement().catch(console.error)} className={`flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold ${isAdvanced ? 'text-slate-300 hover:bg-slate-800' : 'text-emerald-700 hover:bg-emerald-50'}`}><Download size={15} /> Export PDF statement</button></div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 pb-[calc(6.75rem+env(safe-area-inset-bottom))] md:pb-8 pt-20 md:pt-24 px-4 md:pl-72 md:pr-8 max-w-[1920px] mx-auto w-full min-h-screen overflow-y-auto hide-scrollbar">
        {children}
      </main>

      {/* Desktop Copilot FAB */}
      <button
        onClick={toggleChat}
        className={`hidden md:flex fixed bottom-8 right-8 items-center justify-center gap-2 px-6 py-4 rounded-full shadow-2xl transition-transform hover:scale-105 active:scale-95 text-white font-bold bg-gradient-to-r z-50 ${
          isAdvanced 
            ? 'from-violet-600 to-fuchsia-600 shadow-violet-500/30' 
            : 'from-emerald-400 to-teal-500 shadow-emerald-500/40 border border-emerald-300'
        }`}
      >
        <Bot size={24} />
        <span>FinGent Copilot</span>
      </button>

      {/* Mobile Bottom Navigation */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 h-[calc(5.25rem+env(safe-area-inset-bottom))] rounded-t-3xl border-t pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:hidden ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="mx-auto flex h-[5.25rem] max-w-md items-center justify-around px-2">
          {tabs.slice(0, 2).map(tab => { const Icon = tab.icon; const active = currentTab === tab.id || currentTab.startsWith(tab.id + '-'); return <button key={tab.id} onClick={() => setCurrentTab(tab.id)} className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 ${active ? (isAdvanced ? 'text-violet-400' : 'text-emerald-600') : 'text-slate-400'}`}><Icon size={22} strokeWidth={active ? 2.5 : 2} /><span className="max-w-full truncate text-[10px] font-semibold">{tab.label}</span></button>; })}
          <div className="relative flex min-w-0 flex-1 justify-center"><button onClick={toggleChat} aria-label="Open FinGent Copilot" className={`absolute -top-9 flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95 ${isAdvanced ? 'bg-gradient-to-tr from-violet-600 to-fuchsia-500 shadow-violet-500/50' : 'bg-gradient-to-tr from-emerald-400 to-teal-500 shadow-emerald-500/50'}`}><Bot size={27} /></button></div>
          {tabs[2] && (() => { const tab = tabs[2]; const Icon = tab.icon; const active = currentTab === tab.id || currentTab.startsWith(tab.id + '-'); return <button onClick={() => setCurrentTab(tab.id)} className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 ${active ? (isAdvanced ? 'text-violet-400' : 'text-emerald-600') : 'text-slate-400'}`}><Icon size={22} strokeWidth={active ? 2.5 : 2} /><span className="max-w-full truncate text-[10px] font-semibold">{tab.label}</span></button>; })()}
          <button onClick={() => setIsMobileMenuOpen(true)} className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 ${isMobileMenuOpen || !tabs.slice(0, 3).some(tab => currentTab === tab.id || currentTab.startsWith(tab.id + '-')) ? (isAdvanced ? 'text-violet-400' : 'text-emerald-600') : 'text-slate-400'}`}><MoreHorizontal size={23} /><span className="text-[10px] font-semibold">More</span></button>
        </div>
      </div>
    </div>
  );
}
