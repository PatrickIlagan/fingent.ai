import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowLeft, ArrowRight, BadgeDollarSign, BarChart3, BriefcaseBusiness,
  Building2, CheckCircle2, Clapperboard, CreditCard, DollarSign, Layers3,
  Megaphone, MonitorSmartphone, Package, Pencil, Plus, ReceiptText, ShoppingBag,
  Sparkles, Store, Trash2, TrendingDown, TrendingUp, Users, Wrench, X
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { exportCsv, exportPdf } from '../lib/export';

type Business = { id: number; name: string; type: string; status: string; target: number; mrr?: number; customers?: number };
type Item = { id: number; business_id: number; type: string; name: string; status: string; value: number; extra_info?: string | null };
type Transaction = { id: number; business_id: number; type: 'income' | 'expense'; amount: number; date: string; description: string; status?: string; category?: string };

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
const today = () => new Date().toISOString().slice(0, 10);
const money = (value: number) => peso.format(Number(value) || 0);
const parseExtra = (value?: string | null) => {
  try { return JSON.parse(value || '{}') as Record<string, string>; } catch { return {}; }
};
const paid = (transaction: Transaction) => !['Draft', 'Pending', 'Overdue', 'Scheduled'].includes(transaction.status || 'Paid');

const VENTURE_TYPES = [
  { type: 'Store', label: 'Store', description: 'Physical retail or e-commerce products', icon: Store },
  { type: 'SaaS', label: 'SaaS', description: 'Subscription software and digital products', icon: MonitorSmartphone },
  { type: 'Agency', label: 'Agency', description: 'Creative, marketing, development, or operations agency', icon: BriefcaseBusiness },
  { type: 'Professional Services', label: 'Professional services', description: 'Consulting, coaching, practice, or specialist work', icon: Wrench },
  { type: 'Creator', label: 'Creator business', description: 'Content, media, community, and brand partnerships', icon: Clapperboard },
];

type WorkspaceConfig = {
  headline: string;
  primaryMetric: string;
  primaryTypes: string[];
  sections: Record<string, { title: string; description: string; types: string[]; valueLabel: string; detailLabel: string; dateLabel: string; statuses: string[]; icon: React.ElementType }>;
};

const configs: Record<string, WorkspaceConfig> = {
  Store: {
    headline: 'Retail command centre', primaryMetric: 'Products tracked', primaryTypes: ['product'],
    sections: {
      'business-records': { title: 'Catalogue & stock', description: 'Keep products, pricing, quantities, and reorder notes in one place.', types: ['product'], valueLabel: 'Unit price', detailLabel: 'Stock quantity / SKU', dateLabel: 'Reorder date', statuses: ['In stock', 'Low stock', 'Out of stock', 'Discontinued'], icon: Package },
      'business-sales': { title: 'Orders', description: 'Track customer orders separately from when cash is actually received.', types: ['order'], valueLabel: 'Order total', detailLabel: 'Customer / order reference', dateLabel: 'Order date', statuses: ['New', 'Processing', 'Fulfilled', 'Cancelled'], icon: ShoppingBag },
      'business-operations': { title: 'Marketing & replenishment', description: 'Plan campaigns and supplier replenishment without using placeholder metrics.', types: ['campaign', 'restock'], valueLabel: 'Budget / expected cost', detailLabel: 'Channel or supplier', dateLabel: 'Start / expected date', statuses: ['Planned', 'Active', 'Paused', 'Complete'], icon: Megaphone },
    }
  },
  SaaS: {
    headline: 'Subscription operating system', primaryMetric: 'Active subscriptions', primaryTypes: ['subscription', 'user'],
    sections: {
      'business-records': { title: 'Subscriptions', description: 'Record plans, monthly value, renewal dates, and customer status.', types: ['subscription', 'user'], valueLabel: 'Monthly recurring value', detailLabel: 'Plan / account owner', dateLabel: 'Renewal date', statuses: ['Active', 'Trial', 'Past due', 'Cancelled'], icon: Users },
      'business-sales': { title: 'Acquisition', description: 'Track channels and campaigns with their planned spend and review date.', types: ['campaign'], valueLabel: 'Budget', detailLabel: 'Channel / campaign objective', dateLabel: 'Review date', statuses: ['Planned', 'Active', 'Paused', 'Complete'], icon: Megaphone },
      'business-operations': { title: 'Product & support', description: 'Keep your roadmap items and customer support work visible.', types: ['roadmap', 'support'], valueLabel: 'Estimated effort / cost', detailLabel: 'Owner or customer', dateLabel: 'Target date', statuses: ['Backlog', 'In progress', 'Waiting', 'Done'], icon: Layers3 },
    }
  },
  Agency: {
    headline: 'Agency delivery desk', primaryMetric: 'Active clients', primaryTypes: ['client'],
    sections: {
      'business-records': { title: 'Clients', description: 'Maintain retainers, contacts, and renewal or review dates.', types: ['client'], valueLabel: 'Monthly retainer', detailLabel: 'Contact / engagement', dateLabel: 'Renewal or review date', statuses: ['Lead', 'Active', 'Paused', 'Closed'], icon: Users },
      'business-sales': { title: 'Pipeline & proposals', description: 'Track opportunities before they become client work.', types: ['lead', 'proposal'], valueLabel: 'Potential value', detailLabel: 'Contact / next step', dateLabel: 'Expected close date', statuses: ['Qualification', 'Proposal sent', 'Negotiation', 'Won', 'Lost'], icon: BriefcaseBusiness },
      'business-operations': { title: 'Delivery', description: 'Use this for projects, milestones, and delivery owners.', types: ['project'], valueLabel: 'Project value / budget', detailLabel: 'Client / project owner', dateLabel: 'Due date', statuses: ['Not started', 'In progress', 'Waiting', 'Delivered'], icon: CheckCircle2 },
    }
  },
  'Professional Services': {
    headline: 'Practice and client desk', primaryMetric: 'Active clients', primaryTypes: ['client'],
    sections: {
      'business-records': { title: 'Clients', description: 'Keep recurring clients, engagements, and review dates organised.', types: ['client'], valueLabel: 'Monthly value', detailLabel: 'Contact / service', dateLabel: 'Review date', statuses: ['Prospect', 'Active', 'Paused', 'Closed'], icon: Users },
      'business-sales': { title: 'Opportunities', description: 'Track referrals, proposals, and their expected value.', types: ['lead', 'proposal'], valueLabel: 'Potential value', detailLabel: 'Source / next step', dateLabel: 'Expected close date', statuses: ['New', 'Discovery', 'Proposal sent', 'Won', 'Lost'], icon: BriefcaseBusiness },
      'business-operations': { title: 'Delivery', description: 'Track engagements, appointments, and scheduled work.', types: ['engagement', 'appointment'], valueLabel: 'Engagement value', detailLabel: 'Client / location', dateLabel: 'Service date', statuses: ['Scheduled', 'In progress', 'Completed', 'Cancelled'], icon: CheckCircle2 },
    }
  },
  Creator: {
    headline: 'Creator business studio', primaryMetric: 'Active partnerships', primaryTypes: ['partnership'],
    sections: {
      'business-records': { title: 'Partnerships', description: 'Track brand deals, retainers, deliverables, and payment terms.', types: ['partnership'], valueLabel: 'Monthly / deal value', detailLabel: 'Brand or contact', dateLabel: 'Delivery / renewal date', statuses: ['Prospect', 'Negotiating', 'Active', 'Complete'], icon: BadgeDollarSign },
      'business-sales': { title: 'Revenue streams', description: 'Record platform, affiliate, product, or membership income sources.', types: ['channel'], valueLabel: 'Expected monthly value', detailLabel: 'Platform / programme', dateLabel: 'Review date', statuses: ['Active', 'Testing', 'Paused', 'Ended'], icon: TrendingUp },
      'business-operations': { title: 'Content & growth', description: 'Plan content and audience-growth campaigns with real due dates.', types: ['content', 'campaign'], valueLabel: 'Production / campaign budget', detailLabel: 'Platform / owner', dateLabel: 'Publish / review date', statuses: ['Idea', 'In production', 'Scheduled', 'Published'], icon: Sparkles },
    }
  },
};

const genericConfig = configs['Professional Services'];
const card = (advanced: boolean) => advanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
const input = (advanced: boolean) => `w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${advanced ? 'bg-slate-900 border-slate-700 focus:border-violet-500' : 'bg-slate-50 border-slate-200 focus:border-emerald-500'}`;
const button = (advanced: boolean) => `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white ${advanced ? 'bg-violet-600 hover:bg-violet-700' : 'bg-slate-900 hover:bg-slate-800'}`;

export function Business({ currentTab, onNavigate }: { currentTab: string; onNavigate: (tab: string) => void }) {
  const { themeMode, selectedBusiness, setSelectedBusiness, shouldRefresh, triggerRefresh } = useStore();
  const advanced = themeMode === 'advanced';
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [ventureEditor, setVentureEditor] = useState<Business | null | 'new'>(null);

  const loadBusinesses = async () => {
    const response = await fetch('/api/businesses');
    if (response.ok) setBusinesses(await response.json());
  };
  useEffect(() => { loadBusinesses().catch(console.error); }, [shouldRefresh, currentTab === 'business']);

  const saveVenture = async (values: Omit<Business, 'id'>) => {
    const editing = ventureEditor && ventureEditor !== 'new' ? ventureEditor : null;
    const response = await fetch(editing ? `/api/businesses/${editing.id}` : '/api/businesses', {
      method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values)
    });
    if (!response.ok) return;
    setVentureEditor(null); triggerRefresh(); await loadBusinesses();
    if (editing && selectedBusiness?.id === editing.id) setSelectedBusiness({ ...editing, ...values });
  };
  const deleteVenture = async (business: Business) => {
    if (!window.confirm(`Delete ${business.name} and all of its records? This cannot be undone.`)) return;
    const response = await fetch(`/api/businesses/${business.id}`, { method: 'DELETE' });
    if (!response.ok) return;
    if (selectedBusiness?.id === business.id) { setSelectedBusiness(null); onNavigate('business'); }
    triggerRefresh(); await loadBusinesses();
  };

  if (selectedBusiness && currentTab !== 'business') {
    return <BusinessWorkspace business={selectedBusiness} currentTab={currentTab} onNavigate={onNavigate} advanced={advanced} />;
  }

  const totalMrr = businesses.reduce((sum, business) => sum + (Number(business.mrr) || 0), 0);
  const totalCustomers = businesses.reduce((sum, business) => sum + (Number(business.customers) || 0), 0);
  const totalTarget = businesses.reduce((sum, business) => sum + (Number(business.target) || 0), 0);
  const targetProgress = totalTarget ? Math.min(100, Math.round(totalMrr / totalTarget * 100)) : 0;

  return <div className="space-y-6 pb-10">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 className="text-2xl font-bold">Business Operations</h2><p className="mt-1 text-slate-500">A portfolio of distinct ventures, each with its own operating workspace.</p></div>
      <button onClick={() => setVentureEditor('new')} className={button(advanced)}><Plus size={17} /> New venture</button>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric advanced={advanced} icon={Building2} label="Active ventures" value={String(businesses.filter(b => b.status !== 'Archived').length)} helper="Separate dashboards and records" />
      <Metric advanced={advanced} icon={TrendingUp} label="Monthly recurring value" value={money(totalMrr)} helper="Only active recurring records" color="emerald" />
      <Metric advanced={advanced} icon={Users} label="Active customers / clients" value={String(totalCustomers)} helper="Across your active ventures" />
      <Metric advanced={advanced} icon={BarChart3} label="Portfolio target" value={totalTarget ? `${targetProgress}%` : 'Not set'} helper={totalTarget ? `${money(totalMrr)} of ${money(totalTarget)}` : 'Set a target per venture'} />
    </div>

    {businesses.length === 0 ? <EmptyState advanced={advanced} icon={Building2} title="Start with your first venture" text="Choose a business model and FinGent will set up a relevant workspace without any sample data." action={() => setVentureEditor('new')} actionLabel="Create venture" /> :
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {businesses.map(business => {
          const type = VENTURE_TYPES.find(t => t.type === business.type) || VENTURE_TYPES[3];
          const Icon = type.icon; const progress = business.target ? Math.min(100, Math.round((business.mrr || 0) / business.target * 100)) : 0;
          return <div key={business.id} className={`group rounded-3xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${card(advanced)}`}>
            <div className="mb-6 flex items-start justify-between gap-4"><div className="flex items-center gap-3"><div className={`rounded-2xl p-3 ${advanced ? 'bg-violet-500/15 text-violet-300' : 'bg-emerald-50 text-emerald-600'}`}><Icon size={23} /></div><div><p className="font-bold">{business.name}</p><p className="text-xs text-slate-500">{type.label}</p></div></div><span className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${business.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{business.status}</span></div>
            <div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-slate-500">Monthly value</p><p className="mt-1 text-xl font-black">{money(business.mrr || 0)}</p></div><div><p className="text-xs text-slate-500">Customers</p><p className="mt-1 text-xl font-black">{business.customers || 0}</p></div></div>
            <div className="mt-5"><div className="mb-1.5 flex justify-between text-xs font-medium text-slate-500"><span>Monthly target</span><span>{business.target ? `${progress}%` : 'Not set'}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className={`h-full rounded-full ${advanced ? 'bg-violet-500' : 'bg-emerald-500'}`} style={{ width: `${progress}%` }} /></div></div>
            <div className="mt-6 flex gap-2"><button onClick={() => { setSelectedBusiness(business); onNavigate('business-dashboard'); }} className={`${button(advanced)} flex-1`}>Open workspace <ArrowRight size={16} /></button><button aria-label={`Edit ${business.name}`} onClick={() => setVentureEditor(business)} className={`rounded-xl border p-2.5 ${advanced ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}><Pencil size={16} /></button><button aria-label={`Delete ${business.name}`} onClick={() => deleteVenture(business)} className="rounded-xl border border-rose-200 p-2.5 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"><Trash2 size={16} /></button></div>
          </div>;
        })}
      </div>}

    <div className={`rounded-3xl border p-6 ${card(advanced)}`}><div className="flex items-center gap-3"><div className={`rounded-2xl p-3 ${advanced ? 'bg-slate-900 text-violet-300' : 'bg-slate-50 text-slate-600'}`}><Sparkles size={21} /></div><div><h3 className="font-bold">How the portfolio stays accurate</h3><p className="mt-1 text-sm text-slate-500">Venture cards use the records inside each workspace: active subscriptions, retainers, partnerships, or this month's paid store income. No demo totals are mixed in.</p></div></div></div>
    {ventureEditor && <VentureModal advanced={advanced} business={ventureEditor === 'new' ? null : ventureEditor} onClose={() => setVentureEditor(null)} onSave={saveVenture} />}
  </div>;
}

function BusinessWorkspace({ business, currentTab, onNavigate, advanced }: { business: Business; currentTab: string; onNavigate: (tab: string) => void; advanced: boolean }) {
  const { shouldRefresh, triggerRefresh, setSelectedBusiness } = useStore();
  const [items, setItems] = useState<Item[]>([]); const [transactions, setTransactions] = useState<Transaction[]>([]); const [loading, setLoading] = useState(true);
  const [recordEditor, setRecordEditor] = useState<{ item?: Item; section: WorkspaceConfig['sections'][string] } | null>(null);
  const [transactionEditor, setTransactionEditor] = useState<Transaction | null | 'new'>(null);
  const config = configs[business.type] || genericConfig;
  const section = config.sections[currentTab];
  const exportRows = [
    ...items.map(item => ({ Record: 'Operating record', Type: item.type, Name: item.name, Status: item.status, Value: item.value, Details: parseExtra(item.extra_info).detail || '', Date: parseExtra(item.extra_info).date || '', Notes: parseExtra(item.extra_info).note || '' })),
    ...transactions.map(transaction => ({ Record: 'Cash flow', Date: transaction.date, Type: transaction.type, Status: transaction.status || 'Paid', Category: transaction.category || '', Description: transaction.description, Amount: transaction.amount }))
  ];
  const load = async () => {
    setLoading(true);
    try {
      const [itemResponse, transactionResponse] = await Promise.all([fetch(`/api/businesses/${business.id}/items`), fetch(`/api/businesses/${business.id}/transactions`)]);
      if (itemResponse.ok) setItems(await itemResponse.json());
      if (transactionResponse.ok) setTransactions(await transactionResponse.json());
    } finally { setLoading(false); }
  };
  useEffect(() => { load().catch(console.error); }, [business.id, shouldRefresh]);

  const saveItem = async (values: Omit<Item, 'id' | 'business_id'>, editing?: Item) => {
    const response = await fetch(editing ? `/api/businesses/${business.id}/items/${editing.id}` : `/api/businesses/${business.id}/items`, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    if (!response.ok) return; setRecordEditor(null); triggerRefresh(); await load();
  };
  const deleteItem = async (item: Item) => { if (!window.confirm(`Delete "${item.name}"?`)) return; const response = await fetch(`/api/businesses/${business.id}/items/${item.id}`, { method: 'DELETE' }); if (response.ok) { triggerRefresh(); await load(); } };
  const saveTransaction = async (values: Omit<Transaction, 'id' | 'business_id'>, editing?: Transaction) => {
    const response = await fetch(editing ? `/api/businesses/${business.id}/transactions/${editing.id}` : `/api/businesses/${business.id}/transactions`, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    if (!response.ok) return; setTransactionEditor(null); triggerRefresh(); await load();
  };
  const deleteTransaction = async (transaction: Transaction) => { if (!window.confirm(`Delete this ${transaction.type} record?`)) return; const response = await fetch(`/api/businesses/${business.id}/transactions/${transaction.id}`, { method: 'DELETE' }); if (response.ok) { triggerRefresh(); await load(); } };

  if (loading) return <div className="py-20 text-center text-sm text-slate-500">Loading {business.name}...</div>;
  if (currentTab === 'business-finance') return <>
    <WorkspaceHeader business={business} advanced={advanced} onBack={() => { setSelectedBusiness(null); onNavigate('business'); }} />
    <TransactionManager advanced={advanced} transactions={transactions} onAdd={() => setTransactionEditor('new')} onEdit={setTransactionEditor} onDelete={deleteTransaction} />
    {transactionEditor && <TransactionModal advanced={advanced} transaction={transactionEditor === 'new' ? null : transactionEditor} onClose={() => setTransactionEditor(null)} onSave={saveTransaction} />}
  </>;
  if (section) return <>
    <WorkspaceHeader business={business} advanced={advanced} onBack={() => { setSelectedBusiness(null); onNavigate('business'); }} />
    <RecordManager advanced={advanced} section={section} items={items.filter(item => section.types.includes(item.type))} onAdd={() => setRecordEditor({ section })} onEdit={item => setRecordEditor({ item, section })} onDelete={deleteItem} />
    {recordEditor && <RecordModal advanced={advanced} section={recordEditor.section} item={recordEditor.item} onClose={() => setRecordEditor(null)} onSave={saveItem} />}
  </>;

  const primary = items.filter(item => config.primaryTypes.includes(item.type));
  const activePrimary = primary.filter(item => business.type === 'Store' ? item.status !== 'Discontinued' : item.status === 'Active');
  const cashIn = transactions.filter(t => t.type === 'income' && paid(t)).reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const cashOut = transactions.filter(t => t.type === 'expense' && paid(t)).reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const receivables = transactions.filter(t => t.type === 'income' && !paid(t)).reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const pipelineTypes = config.sections['business-sales'].types;
  const pipelineValue = items.filter(item => pipelineTypes.includes(item.type) && !['Won', 'Lost', 'Cancelled'].includes(item.status)).reduce((sum, item) => sum + Number(item.value || 0), 0);
  const currentMonth = today().slice(0, 7);
  const monthlyValue = business.type === 'Store'
    ? transactions.filter(t => t.type === 'income' && paid(t) && String(t.date || '').startsWith(currentMonth)).reduce((sum, t) => sum + Number(t.amount || 0), 0)
    : activePrimary.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const targetProgress = business.target ? Math.min(100, Math.round(monthlyValue / business.target * 100)) : 0;

  return <div className="space-y-6 pb-10">
    <WorkspaceHeader business={business} advanced={advanced} onBack={() => { setSelectedBusiness(null); onNavigate('business'); }} />
    <div className={`overflow-hidden rounded-3xl border p-6 sm:p-8 ${advanced ? 'border-violet-500/20 bg-gradient-to-br from-violet-950/50 to-slate-800' : 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-white'}`}><div className="max-w-2xl"><p className={`text-xs font-bold uppercase tracking-[0.16em] ${advanced ? 'text-violet-300' : 'text-emerald-700'}`}>{business.type}</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">{config.headline}</h2><p className="mt-2 text-sm text-slate-500">Use the workspace sidebar to keep operational records and cash flow separate. This dashboard summarises only what you add.</p></div><div className="mt-6 flex flex-wrap gap-2"><button onClick={() => onNavigate('business-records')} className={button(advanced)}><Plus size={16} /> Add {config.sections['business-records'].title.replace(/s$/, '')}</button><button onClick={() => onNavigate('business-finance')} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold ${advanced ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-white'}`}><CreditCard size={16} /> Record cash flow</button><button onClick={() => exportCsv(`${business.name}-workspace`, exportRows)} className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${advanced ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-white'}`}>CSV</button><button onClick={() => exportPdf(`${business.name} Workspace`, exportRows, `${business.type} operating records and cash flow`)} className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${advanced ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-white'}`}>PDF</button></div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric advanced={advanced} icon={Users} label={config.primaryMetric} value={String(activePrimary.length)} helper={`${primary.length} total records`} /><Metric advanced={advanced} icon={TrendingUp} label="Cash collected" value={money(cashIn)} helper="Paid income records" color="emerald" /><Metric advanced={advanced} icon={TrendingDown} label="Cash paid out" value={money(cashOut)} helper="Paid expense records" color="rose" /><Metric advanced={advanced} icon={DollarSign} label="Open receivables" value={money(receivables)} helper="Draft, pending, scheduled, or overdue" color="amber" /></div>
    <div className="grid gap-6 xl:grid-cols-3"><div className={`xl:col-span-2 rounded-3xl border p-6 ${card(advanced)}`}><div className="mb-5 flex items-center justify-between"><div><h3 className="font-bold">Operating snapshot</h3><p className="mt-1 text-sm text-slate-500">Current work and cash health, without extrapolated trends.</p></div><Activity className={advanced ? 'text-violet-300' : 'text-emerald-600'} /></div><div className="grid gap-4 sm:grid-cols-3"><Snapshot label="Recorded net cash" value={money(cashIn - cashOut)} tone={cashIn - cashOut >= 0 ? 'emerald' : 'rose'} /><Snapshot label="Open pipeline value" value={money(pipelineValue)} tone="violet" /><Snapshot label="Monthly target" value={business.target ? `${targetProgress}%` : 'Not set'} tone="slate" /></div>{business.target ? <div className="mt-6"><div className="mb-2 flex justify-between text-sm text-slate-500"><span>Current value against target</span><span>{money(monthlyValue)} / {money(business.target)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className={`h-full rounded-full ${advanced ? 'bg-violet-500' : 'bg-emerald-500'}`} style={{ width: `${targetProgress}%` }} /></div></div> : null}</div><div className={`rounded-3xl border p-6 ${card(advanced)}`}><h3 className="font-bold">Next best actions</h3><div className="mt-4 space-y-3"><ActionRow text={primary.length ? `Review ${primary.length} ${config.sections['business-records'].title.toLowerCase()} record${primary.length === 1 ? '' : 's'}` : `Add your first ${config.sections['business-records'].title.toLowerCase()} record`} onClick={() => onNavigate('business-records')} /><ActionRow text={pipelineValue ? `Follow up ${money(pipelineValue)} in open pipeline` : `Start a ${config.sections['business-sales'].title.toLowerCase()} record`} onClick={() => onNavigate('business-sales')} /><ActionRow text={receivables ? `Resolve ${money(receivables)} in receivables` : 'Keep cash flow up to date'} onClick={() => onNavigate('business-finance')} /></div></div></div>
    <div className="grid gap-6 lg:grid-cols-2"><RecentRecords advanced={advanced} title={config.sections['business-records'].title} items={primary.slice(0, 5)} empty="No records yet. Add the people, products, subscriptions, or partnerships that drive this venture." onOpen={() => onNavigate('business-records')} /><RecentTransactions advanced={advanced} transactions={transactions.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 5)} onOpen={() => onNavigate('business-finance')} /></div>
  </div>;
}

function WorkspaceHeader({ business, advanced, onBack }: { business: Business; advanced: boolean; onBack: () => void }) { return <div className="flex items-center gap-4"><button onClick={onBack} aria-label="Back to business portfolio" className={`rounded-xl border p-2.5 ${advanced ? 'border-slate-700 bg-slate-800 hover:bg-slate-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`}><ArrowLeft size={18} /></button><div><h2 className="text-xl font-bold">{business.name}</h2><p className="text-sm text-slate-500">{business.type} workspace</p></div></div>; }
function Metric({ advanced, icon: Icon, label, value, helper, color = 'violet' }: { advanced: boolean; icon: React.ElementType; label: string; value: string; helper: string; color?: string }) { const tone: Record<string, string> = { emerald: advanced ? 'text-emerald-300 bg-emerald-500/10' : 'text-emerald-600 bg-emerald-50', rose: advanced ? 'text-rose-300 bg-rose-500/10' : 'text-rose-600 bg-rose-50', amber: advanced ? 'text-amber-300 bg-amber-500/10' : 'text-amber-600 bg-amber-50', violet: advanced ? 'text-violet-300 bg-violet-500/10' : 'text-violet-600 bg-violet-50' }; return <div className={`rounded-3xl border p-5 shadow-sm ${card(advanced)}`}><div className="flex items-start justify-between"><div className={`rounded-2xl p-3 ${tone[color] || tone.violet}`}><Icon size={21} /></div></div><p className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className="mt-1 text-xs text-slate-500">{helper}</p></div>; }
function Snapshot({ label, value, tone }: { label: string; value: string; tone: string }) { const classes: Record<string, string> = { emerald: 'text-emerald-600 dark:text-emerald-300', rose: 'text-rose-600 dark:text-rose-300', violet: 'text-violet-600 dark:text-violet-300', slate: 'text-slate-900 dark:text-slate-100' }; return <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/50"><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 text-xl font-black ${classes[tone]}`}>{value}</p></div>; }
function ActionRow({ text, onClick }: { text: string; onClick: () => void }) { return <button onClick={onClick} className="flex w-full items-center justify-between rounded-xl bg-slate-50 p-3 text-left text-sm font-medium hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-700"><span>{text}</span><ArrowRight size={15} className="text-slate-400" /></button>; }
function EmptyState({ advanced, icon: Icon, title, text, action, actionLabel }: { advanced: boolean; icon: React.ElementType; title: string; text: string; action: () => void; actionLabel: string }) { return <div className={`rounded-3xl border border-dashed p-12 text-center ${advanced ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white/70'}`}><div className={`mx-auto mb-4 w-fit rounded-2xl p-4 ${advanced ? 'bg-slate-800 text-violet-300' : 'bg-slate-50 text-slate-500'}`}><Icon size={30} /></div><h3 className="font-bold">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{text}</p><button onClick={action} className={`${button(advanced)} mt-5`}><Plus size={16} /> {actionLabel}</button></div>; }

function RecentRecords({ advanced, title, items, empty, onOpen }: { advanced: boolean; title: string; items: Item[]; empty: string; onOpen: () => void }) { return <div className={`rounded-3xl border p-6 ${card(advanced)}`}><div className="flex items-center justify-between"><h3 className="font-bold">{title}</h3><button onClick={onOpen} className="text-sm font-bold text-emerald-600 hover:underline dark:text-violet-300">View all</button></div>{items.length ? <div className="mt-4 space-y-3">{items.map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50"><div className="min-w-0"><p className="truncate text-sm font-bold">{item.name}</p><p className="mt-0.5 text-xs text-slate-500">{item.status}</p></div><p className="shrink-0 text-sm font-bold">{money(item.value)}</p></div>)}</div> : <p className="mt-4 text-sm text-slate-500">{empty}</p>}</div>; }
function RecentTransactions({ advanced, transactions, onOpen }: { advanced: boolean; transactions: Transaction[]; onOpen: () => void }) { return <div className={`rounded-3xl border p-6 ${card(advanced)}`}><div className="flex items-center justify-between"><h3 className="font-bold">Recent cash flow</h3><button onClick={onOpen} className="text-sm font-bold text-emerald-600 hover:underline dark:text-violet-300">Manage</button></div>{transactions.length ? <div className="mt-4 space-y-3">{transactions.map(transaction => <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50"><div className="min-w-0"><p className="truncate text-sm font-bold">{transaction.description}</p><p className="mt-0.5 text-xs text-slate-500">{transaction.date} - {transaction.status || 'Paid'}</p></div><p className={`shrink-0 text-sm font-bold ${transaction.type === 'income' ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>{transaction.type === 'income' ? '+' : '-'}{money(transaction.amount)}</p></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No cash flow has been recorded for this venture.</p>}</div>; }

function RecordManager({ advanced, section, items, onAdd, onEdit, onDelete }: { advanced: boolean; section: WorkspaceConfig['sections'][string]; items: Item[]; onAdd: () => void; onEdit: (item: Item) => void; onDelete: (item: Item) => void }) { const Icon = section.icon; return <div className="space-y-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="flex items-center gap-2 text-2xl font-bold"><Icon className={advanced ? 'text-violet-300' : 'text-emerald-600'} /> {section.title}</h3><p className="mt-1 text-sm text-slate-500">{section.description}</p></div><button onClick={onAdd} className={button(advanced)}><Plus size={16} /> Add record</button></div>{items.length === 0 ? <EmptyState advanced={advanced} icon={Icon} title={`No ${section.title.toLowerCase()} yet`} text="Add a real record when you are ready. This space intentionally starts empty." action={onAdd} actionLabel="Add record" /> : <div className="grid gap-4 lg:grid-cols-2">{items.map(item => <div key={item.id}><RecordCard advanced={advanced} item={item} section={section} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} /></div>)}</div>}</div>; }
function RecordCard({ advanced, item, section, onEdit, onDelete }: { advanced: boolean; item: Item; section: WorkspaceConfig['sections'][string]; onEdit: () => void; onDelete: () => void }) { const extra = parseExtra(item.extra_info); return <div className={`rounded-3xl border p-5 ${card(advanced)}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h4 className="truncate font-bold">{item.name}</h4><p className="mt-1 text-sm text-slate-500">{extra.detail || 'No additional detail'}</p></div><span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">{item.status}</span></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50"><p className="text-xs text-slate-500">{section.valueLabel}</p><p className="mt-1 font-black">{money(item.value)}</p></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50"><p className="text-xs text-slate-500">{section.dateLabel}</p><p className="mt-1 truncate font-bold">{extra.date || 'Not set'}</p></div></div>{extra.note ? <p className="mt-4 line-clamp-2 text-sm text-slate-500">{extra.note}</p> : null}<div className="mt-5 flex justify-end gap-2"><button onClick={onEdit} className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold ${advanced ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><Pencil size={14} /> Edit</button><button onClick={onDelete} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 size={14} /> Delete</button></div></div>; }

function TransactionManager({ advanced, transactions, onAdd, onEdit, onDelete }: { advanced: boolean; transactions: Transaction[]; onAdd: () => void; onEdit: (transaction: Transaction) => void; onDelete: (transaction: Transaction) => void }) { const sorted = [...transactions].sort((a, b) => String(b.date).localeCompare(String(a.date))); return <div className="space-y-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="flex items-center gap-2 text-2xl font-bold"><ReceiptText className={advanced ? 'text-violet-300' : 'text-emerald-600'} /> Cash flow</h3><p className="mt-1 text-sm text-slate-500">Record actual income and expenses. Pending income remains a receivable until you mark it paid.</p></div><button onClick={onAdd} className={button(advanced)}><Plus size={16} /> Add transaction</button></div>{sorted.length === 0 ? <EmptyState advanced={advanced} icon={ReceiptText} title="No cash flow yet" text="Add an income, invoice, supplier payment, payroll cost, or other business transaction." action={onAdd} actionLabel="Add transaction" /> : <div className={`overflow-hidden rounded-3xl border ${card(advanced)}`}><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700"><tr><th className="px-5 py-4">Date</th><th className="px-5 py-4">Description</th><th className="px-5 py-4">Category</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Amount</th><th className="px-5 py-4" /></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{sorted.map(transaction => <tr key={transaction.id}><td className="px-5 py-4 text-slate-500">{transaction.date}</td><td className="max-w-[240px] truncate px-5 py-4 font-bold">{transaction.description}</td><td className="px-5 py-4 text-slate-500">{transaction.category || 'Uncategorised'}</td><td className="px-5 py-4"><span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">{transaction.status || 'Paid'}</span></td><td className={`px-5 py-4 text-right font-bold ${transaction.type === 'income' ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>{transaction.type === 'income' ? '+' : '-'}{money(transaction.amount)}</td><td className="px-5 py-4"><div className="flex justify-end gap-1"><button aria-label="Edit transaction" onClick={() => onEdit(transaction)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil size={15} /></button><button aria-label="Delete transaction" onClick={() => onDelete(transaction)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div></div>}</div>; }

function VentureModal({ advanced, business, onClose, onSave }: { advanced: boolean; business: Business | null; onClose: () => void; onSave: (values: Omit<Business, 'id'>) => void }) { const [form, setForm] = useState({ name: business?.name || '', type: business?.type || 'Store', status: business?.status || 'Active', target: String(business?.target || '') }); return <Modal advanced={advanced} title={business ? 'Edit venture' : 'Create venture'} onClose={onClose}><div className="space-y-4"><label className="block text-sm font-bold">Venture name<input autoFocus value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} className={`${input(advanced)} mt-1.5`} placeholder="e.g. Northline Studio" /></label><label className="block text-sm font-bold">Business model<select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })} className={`${input(advanced)} mt-1.5`}>{VENTURE_TYPES.map(type => <option key={type.type} value={type.type}>{type.label} - {type.description}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-bold">Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })} className={`${input(advanced)} mt-1.5`}><option>Active</option><option>Planning</option><option>Paused</option><option>Archived</option></select></label><label className="block text-sm font-bold">Monthly target<input type="number" min="0" value={form.target} onChange={event => setForm({ ...form, target: event.target.value })} className={`${input(advanced)} mt-1.5`} placeholder="0" /></label></div><button disabled={!form.name.trim()} onClick={() => onSave({ name: form.name.trim(), type: form.type, status: form.status, target: Number(form.target) || 0 })} className={`${button(advanced)} mt-2 w-full disabled:cursor-not-allowed disabled:opacity-50`}>{business ? 'Save changes' : 'Create workspace'}</button></div></Modal>; }
function RecordModal({ advanced, section, item, onClose, onSave }: { advanced: boolean; section: WorkspaceConfig['sections'][string]; item?: Item; onClose: () => void; onSave: (values: Omit<Item, 'id' | 'business_id'>, editing?: Item) => void }) { const extra = parseExtra(item?.extra_info); const [form, setForm] = useState({ name: item?.name || '', type: item?.type || section.types[0], status: item?.status || section.statuses[0], value: String(item?.value || ''), detail: extra.detail || '', date: extra.date || '', note: extra.note || '' }); return <Modal advanced={advanced} title={item ? `Edit ${section.title.replace(/s$/, '')}` : `Add ${section.title.replace(/s$/, '')}`} onClose={onClose}><div className="space-y-4"><label className="block text-sm font-bold">Name<input autoFocus value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} className={`${input(advanced)} mt-1.5`} /></label>{section.types.length > 1 ? <label className="block text-sm font-bold">Record type<select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })} className={`${input(advanced)} mt-1.5`}>{section.types.map(type => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}</select></label> : null}<div className="grid grid-cols-2 gap-3"><label className="block text-sm font-bold">Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })} className={`${input(advanced)} mt-1.5`}>{section.statuses.map(status => <option key={status}>{status}</option>)}</select></label><label className="block text-sm font-bold">{section.valueLabel}<input type="number" min="0" value={form.value} onChange={event => setForm({ ...form, value: event.target.value })} className={`${input(advanced)} mt-1.5`} placeholder="0" /></label></div><label className="block text-sm font-bold">{section.detailLabel}<input value={form.detail} onChange={event => setForm({ ...form, detail: event.target.value })} className={`${input(advanced)} mt-1.5`} /></label><label className="block text-sm font-bold">{section.dateLabel}<input type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} className={`${input(advanced)} mt-1.5`} /></label><label className="block text-sm font-bold">Notes<textarea rows={3} value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} className={`${input(advanced)} mt-1.5 resize-none`} /></label><button disabled={!form.name.trim()} onClick={() => onSave({ type: form.type, name: form.name.trim(), status: form.status, value: Number(form.value) || 0, extra_info: JSON.stringify({ detail: form.detail, date: form.date, note: form.note }) }, item)} className={`${button(advanced)} w-full disabled:cursor-not-allowed disabled:opacity-50`}>{item ? 'Save changes' : 'Add record'}</button></div></Modal>; }
function TransactionModal({ advanced, transaction, onClose, onSave }: { advanced: boolean; transaction: Transaction | null; onClose: () => void; onSave: (values: Omit<Transaction, 'id' | 'business_id'>, editing?: Transaction) => void }) { const [form, setForm] = useState({ type: transaction?.type || 'income', description: transaction?.description || '', amount: String(transaction?.amount || ''), date: transaction?.date || today(), status: transaction?.status || 'Paid', category: transaction?.category || '' }); return <Modal advanced={advanced} title={transaction ? 'Edit transaction' : 'Add cash-flow record'} onClose={onClose}><div className="space-y-4"><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-bold">Type<select value={form.type} onChange={event => setForm({ ...form, type: event.target.value as Transaction['type'] })} className={`${input(advanced)} mt-1.5`}><option value="income">Income / receivable</option><option value="expense">Expense</option></select></label><label className="block text-sm font-bold">Amount<input type="number" min="0" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} className={`${input(advanced)} mt-1.5`} placeholder="0" /></label></div><label className="block text-sm font-bold">Description<input autoFocus value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} className={`${input(advanced)} mt-1.5`} placeholder="e.g. July retainer - Acme" /></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-bold">Date<input type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} className={`${input(advanced)} mt-1.5`} /></label><label className="block text-sm font-bold">Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })} className={`${input(advanced)} mt-1.5`}><option>Paid</option><option>Pending</option><option>Draft</option><option>Scheduled</option><option>Overdue</option></select></label></div><label className="block text-sm font-bold">Category<input value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} className={`${input(advanced)} mt-1.5`} placeholder="e.g. Sales, Payroll, Software, Supplier" /></label><p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-900/50">Only paid income is counted as collected cash. Pending, draft, scheduled, and overdue income remain in receivables.</p><button disabled={!form.description.trim() || !form.amount} onClick={() => onSave({ type: form.type, description: form.description.trim(), amount: Number(form.amount) || 0, date: form.date, status: form.status, category: form.category.trim() }, transaction || undefined)} className={`${button(advanced)} w-full disabled:cursor-not-allowed disabled:opacity-50`}>{transaction ? 'Save changes' : 'Add transaction'}</button></div></Modal>; }
function Modal({ advanced, title, onClose, children }: { advanced: boolean; title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={onClose}><div role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()} className={`max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border p-6 shadow-2xl ${card(advanced)}`}><div className="mb-5 flex items-center justify-between"><h3 className="text-xl font-bold">{title}</h3><button aria-label="Close" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} /></button></div>{children}</div></div>; }
