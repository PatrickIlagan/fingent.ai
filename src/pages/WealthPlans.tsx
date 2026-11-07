import { useCallback, useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Calculator, ChevronRight, GitCompare, GraduationCap, Home as HomeIcon, Layers, Percent, Plus, ShieldCheck, Sparkles, SquarePen, TrendingUp, X } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../store/useStore';
import { DATA_CHANGED } from '../lib/changeWatcher';
import { FALLBACK_FX_RATES, isCashFlow, localDate } from '../lib/sharedRules';
import {
  accountAllocation, accountRate, compound, incomeBasis, KIND_LABELS, MARKET_KINDS, milestoneDates, normalizePlan, PLAN_TEMPLATES, planActuals, planSoFar, planTemplate, simulate, trajectory,
  type ActualData, type Bucket, type Row, type Scenario, type SimOptions, type TemplateId, type WealthPlan,
} from '../lib/wealthPlan';
import { PlanView, type PlanRecord } from '../components/wealth/PlanView';
import { Segmented } from '../components/Segmented';
import { celebrate } from '../components/Celebrations';

const peso = (value: number) => '₱' + Math.round(value).toLocaleString('en-PH');
const shortPeso = (value: number) => { const a = Math.abs(value); return a >= 1e6 ? `₱${(value / 1e6).toFixed(2)}M` : a >= 1e3 ? `₱${Math.round(value / 1e3)}K` : peso(value); };
const TEMPLATE_ICONS: Record<TemplateId, ElementType> = { school: GraduationCap, emergency: ShieldCheck, invest: TrendingUp, purchase: HomeIcon, percent: Percent, blank: SquarePen };
const SCENARIO_OPTIONS: { value: Scenario; label: string }[] = [{ value: 'conservative', label: 'Conservative' }, { value: 'balanced', label: 'Balanced' }, { value: 'aggressive', label: 'Aggressive' }];
type View = 'list' | 'compare' | 'allocation' | 'calculator';
type Data = ActualData & { incomeFlows: any[] };

async function send(path: string, method: string, body?: unknown) {
  const response = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Something went wrong.');
  return result;
}

/** Projection options shared by every screen: percent-of-income buckets project from your income. */
export function simOptions(plan: WealthPlan, data: Data, today = localDate()): SimOptions {
  return { income: Object.fromEntries(plan.buckets.filter(bucket => bucket.contribution.mode === 'percent').map(bucket => [bucket.id, incomeBasis(bucket.contribution, data, today)])), actualIncomeUntil: today.slice(0, 7) };
}

/** Wealth plans: multi-account savings and investing plans with projections and tracking. */
export function WealthPlans() {
  const { themeMode, shouldRefresh } = useStore();
  const advanced = themeMode === 'advanced';
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [raw, setRaw] = useState<{ accounts: any[]; transactions: any[]; portfolios: any[]; incomeFlows: any[]; goals: any[]; rates: Record<string, number> }>({ accounts: [], transactions: [], portfolios: [], incomeFlows: [], goals: [], rates: FALLBACK_FX_RATES });
  const [openId, setOpenId] = useState<number | null>(null);
  const [view, setView] = useState<View>('list');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const get = (path: string) => fetch(path).then(response => response.ok ? response.json() : null).catch(() => null);
    const [planRows, accounts, transactions, portfolios, incomeFlows, goals, rates] = await Promise.all(['/api/wealth-plans', '/api/accounts', '/api/transactions', '/api/portfolios', '/api/income_flows', '/api/goals', '/api/rates'].map(get));
    setPlans((Array.isArray(planRows) ? planRows : []).map((item: any) => ({ id: Number(item.id), name: String(item.name), plan: normalizePlan(item.plan) })));
    setRaw({ accounts: Array.isArray(accounts) ? accounts : [], transactions: Array.isArray(transactions) ? transactions : [], portfolios: Array.isArray(portfolios) ? portfolios : [], incomeFlows: Array.isArray(incomeFlows) ? incomeFlows : [], goals: Array.isArray(goals) ? goals : [], rates: rates && rates.PHP ? rates : FALLBACK_FX_RATES });
    setLoaded(true);
  }, []);
  useEffect(() => { void load(); }, [load, shouldRefresh]);
  useEffect(() => {
    let timer = 0;
    const soon = () => { window.clearTimeout(timer); timer = window.setTimeout(() => void load(), 500); };
    window.addEventListener(DATA_CHANGED, soon);
    return () => { window.clearTimeout(timer); window.removeEventListener(DATA_CHANGED, soon); };
  }, [load]);

  const data: Data = useMemo(() => {
    const rates = raw.rates;
    const toPhp = (amount: number, currency: string) => currency === 'PHP' ? amount : amount / (rates[currency] || 1) * (rates.PHP || 1);
    return { accounts: raw.accounts, transactions: raw.transactions, portfolios: raw.portfolios, incomeFlows: raw.incomeFlows, toPhp };
  }, [raw]);
  const cashAccounts = raw.accounts.filter(account => !['card', 'credit'].includes(String(account.type).toLowerCase()));

  const card = `rounded-3xl border shadow-sm ${advanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`;
  const primary = `inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-transform hover:scale-[1.02] disabled:opacity-50 ${advanced ? 'bg-violet-600 hover:bg-violet-700' : 'bg-slate-900 hover:bg-slate-800'}`;
  const tool = (active: boolean) => `inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${active ? (advanced ? 'bg-violet-600 text-white' : 'bg-slate-900 text-white') : (advanced ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-white text-slate-600 border border-slate-200')}`;

  const open = plans.find(item => item.id === openId);
  if (open) return <PlanView key={open.id} advanced={advanced} record={open} others={plans.filter(item => item.id !== open.id)} data={data} goals={raw.goals}
    onBack={() => setOpenId(null)} onSaved={() => void load()} onDeleted={() => { setOpenId(null); void load(); }}
    onDuplicate={async () => { const result = await send('/api/wealth-plans', 'POST', { name: `${open.name} (copy)`, plan: JSON.stringify({ ...open.plan, depositLog: [], overrides: {} }) }); await load(); setOpenId(Number(result.id)); celebrate({ kind: 'success', title: 'Plan copied', message: 'Change it to try a different approach, then compare.' }); }} />;

  const averageSpend = (() => {
    const today = localDate();
    const months = [1, 2, 3].map(back => { const [y, m] = today.slice(0, 7).split('-').map(Number); return new Date(Date.UTC(y, m - 1 - back, 1)).toISOString().slice(0, 7); });
    const totals = months.map(month => raw.transactions.filter(tx => tx.type === 'expense' && isCashFlow(tx) && String(tx.date).startsWith(month)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0)).filter(value => value > 0);
    return totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0;
  })();

  return <div className="space-y-5 pb-10">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 className="text-2xl font-bold">Wealth plans</h2><p className="mt-1 text-slate-500 dark:text-slate-400">Map out your savings and investments month by month, see where they could take you, and track how you're really doing.</p></div>
      <button onClick={() => setCreating(true)} className={primary}><Plus size={16} /> New plan</button>
    </div>

    <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
      <button onClick={() => setView('list')} className={tool(view === 'list')}><Sparkles size={14} /> Plans</button>
      <button onClick={() => setView('compare')} className={tool(view === 'compare')}><GitCompare size={14} /> Compare</button>
      <button onClick={() => setView('allocation')} className={tool(view === 'allocation')}><Layers size={14} /> Account split</button>
      <button onClick={() => setView('calculator')} className={tool(view === 'calculator')}><Calculator size={14} /> Calculator</button>
    </div>

    <AnimatePresence mode="wait">
      <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
        {view === 'list' && (!loaded ? <div className={`${card} h-40 animate-pulse`} /> : plans.length === 0
          ? <div className={`${card} p-5`}>
            <h3 className="text-lg font-black">Pick a starting point</h3>
            <p className="mt-1 text-sm text-slate-500">Each one is a ready-made plan you can change: amounts, accounts, returns, everything.</p>
            <TemplateGrid advanced={advanced} onPick={() => setCreating(true)} />
          </div>
          : <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{plans.map(record => <PlanCard key={record.id} advanced={advanced} record={record} data={data} onOpen={() => setOpenId(record.id)} />)}
            <button onClick={() => setCreating(true)} className={`flex min-h-40 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed text-sm font-bold ${advanced ? 'border-slate-700 text-slate-400 hover:bg-slate-800/60' : 'border-slate-200 text-slate-500 hover:bg-white'}`}><Plus size={22} /> Another plan</button>
          </div>)}
        {view === 'compare' && <Compare advanced={advanced} plans={plans} data={data} card={card} />}
        {view === 'allocation' && <Allocation advanced={advanced} plans={plans} goals={raw.goals} accounts={raw.accounts} card={card} onOpen={setOpenId} />}
        {view === 'calculator' && <QuickCalculator advanced={advanced} card={card} />}
      </motion.div>
    </AnimatePresence>

    {creating && <NewPlan advanced={advanced} accounts={cashAccounts} portfolios={raw.portfolios} data={data} averageSpend={averageSpend} onClose={() => setCreating(false)}
      onCreate={async (name, plan) => { const result = await send('/api/wealth-plans', 'POST', { name, plan: JSON.stringify(plan) }); await load(); setCreating(false); setOpenId(Number(result.id)); celebrate({ kind: 'success', title: 'Plan created', message: name }); }} />}
  </div>;
}

function TemplateGrid({ advanced, selected, onPick }: { advanced: boolean; selected?: TemplateId; onPick: (id: TemplateId) => void }) {
  return <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">{PLAN_TEMPLATES.map(template => { const Icon = TEMPLATE_ICONS[template.id]; const active = selected === template.id; return <motion.button key={template.id} type="button" whileTap={{ scale: 0.98 }} onClick={() => onPick(template.id)}
    className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors ${active ? (advanced ? 'border-violet-500 bg-violet-500/15' : 'border-emerald-400 bg-emerald-50') : (advanced ? 'border-slate-700 bg-slate-900/40 hover:border-slate-500' : 'border-slate-100 bg-slate-50 hover:border-slate-300')}`}>
    <span className={`rounded-xl p-2 ${advanced ? 'bg-slate-800 text-violet-300' : 'bg-white text-emerald-600 shadow-sm'}`}><Icon size={18} /></span>
    <span className="min-w-0"><span className="block text-sm font-black">{template.name}</span><span className="mt-0.5 block text-xs text-slate-500">{template.blurb}</span></span>
  </motion.button>; })}</div>;
}

function PlanCard({ advanced, record, data, onOpen }: { key?: number; advanced: boolean; record: PlanRecord; data: Data; onOpen: () => void }) {
  const summary = useMemo(() => {
    const options = simOptions(record.plan, data);
    const rows = simulate(record.plan, 'balanced', options);
    const low = simulate(record.plan, 'conservative', options).at(-1)?.total ?? 0;
    const high = simulate(record.plan, 'aggressive', options).at(-1)?.total ?? 0;
    const actuals = planActuals(record.plan, data);
    const counted = record.plan.milestoneBuckets.length ? record.plan.milestoneBuckets : record.plan.buckets.map(bucket => bucket.id);
    const actualTotal = actuals.buckets.filter(item => counted.includes(item.bucket)).reduce((sum, item) => sum + item.balance, 0);
    const planNow = actuals.current > 0 ? planSoFar(record.plan, rows, actuals.current) : 0;
    const next = record.plan.milestones.find(value => value > actualTotal);
    return { rows, low, high, current: actuals.current, actualTotal, planNow, next, nextRow: next ? milestoneDates(rows)[next] : undefined };
  }, [record, data]);
  const last = summary.rows.at(-1);
  const behind = summary.current > 0 && summary.actualTotal < summary.planNow * 0.98;
  const progress = summary.next ? Math.min(100, (summary.actualTotal / summary.next) * 100) : 100;
  return <motion.button type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }} onClick={onOpen} className={`group w-full overflow-hidden rounded-3xl border text-left shadow-sm ${advanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
    <div className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0"><p className="truncate text-base font-black">{record.name}</p><p className="text-xs text-slate-500">{summary.rows[0]?.label} – {last?.label} · {record.plan.buckets.length} account{record.plan.buckets.length === 1 ? '' : 's'}</p></div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${summary.current < 1 ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300' : behind ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'}`}>{summary.current < 1 ? `Starts ${summary.rows[0]?.label}` : behind ? `Behind ${shortPeso(summary.planNow - summary.actualTotal)}` : 'On track'}</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Could reach</p><p className="text-2xl font-black">{shortPeso(last?.total ?? 0)}</p><p className="text-[11px] font-bold text-slate-500">{shortPeso(summary.low)} – {shortPeso(summary.high)}</p></div>
        <div className="h-14 w-32 shrink-0"><ResponsiveContainer width="100%" height="100%"><AreaChart data={summary.rows} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}><defs><linearGradient id={`spark-${record.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity="0.4" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient></defs><Area type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} fill={`url(#spark-${record.id})`} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div>
      </div>
      {summary.next && <div className="mt-3">
        <div className="flex justify-between text-[11px] font-bold"><span className="text-slate-500">Next: {shortPeso(summary.next)}{summary.nextRow ? ` · plan ${summary.nextRow.label}` : ''}</span><span>{peso(summary.actualTotal)}</span></div>
        <div className={`mt-1 h-2 overflow-hidden rounded-full ${advanced ? 'bg-slate-700' : 'bg-slate-100'}`}><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-400" style={{ width: `${progress}%` }} /></div>
      </div>}
    </div>
    <div className={`flex items-center gap-1 px-4 py-2.5 ${advanced ? 'bg-slate-900/40' : 'bg-slate-50'}`}>{record.plan.buckets.map(bucket => <span key={bucket.id} className="h-1.5 flex-1 rounded-full" style={{ background: bucket.color }} title={bucket.name} />)}<ChevronRight size={16} className="ml-1 text-slate-400 transition-transform group-hover:translate-x-0.5" /></div>
  </motion.button>;
}

function Sheet({ advanced, title, onClose, children, wide }: { advanced: boolean; title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
    <motion.div role="dialog" aria-modal="true" aria-label={title} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onMouseDown={event => event.stopPropagation()} className={`max-h-[90dvh] w-full ${wide ? 'max-w-2xl' : 'max-w-md'} overflow-y-auto rounded-t-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl ${advanced ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}>
      <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-lg font-black">{title}</h3><button aria-label="Close" onClick={onClose} className="rounded-lg p-2 text-slate-400"><X size={18} /></button></div>
      {children}
    </motion.div>
  </div>;
}

/** Choose a template, make it yours (amounts, starting balances, linked accounts), then create it. */
function NewPlan({ advanced, accounts, portfolios, data, averageSpend, onClose, onCreate }: {
  advanced: boolean; accounts: any[]; portfolios: any[]; data: Data; averageSpend: number; onClose: () => void; onCreate: (name: string, plan: WealthPlan) => Promise<void>;
}) {
  const [template, setTemplate] = useState<TemplateId | null>(null);
  const [name, setName] = useState('');
  const [plan, setPlan] = useState<WealthPlan | null>(null);
  const [spend, setSpend] = useState(String(averageSpend || 20000));
  const [target, setTarget] = useState('300000');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = `w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm outline-none ${advanced ? 'bg-slate-900 border-slate-700 focus:border-violet-500' : 'bg-slate-50 border-slate-200 focus:border-emerald-500'}`;
  const label = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500';
  const thisMonth = localDate().slice(0, 7);

  const pick = (id: TemplateId, options: { spend?: string; target?: string } = {}) => {
    const made = planTemplate(id, { monthlyExpenses: Number(options.spend ?? spend) || 0, target: Number(options.target ?? target) || 0 });
    setTemplate(id); setPlan(made.plan); if (!name || PLAN_TEMPLATES.some(item => item.name === name) || name === 'My plan') setName(made.name);
  };
  const setBucket = (id: string, patch: Partial<Bucket>) => plan && setPlan({ ...plan, buckets: plan.buckets.map(bucket => bucket.id === id ? { ...bucket, ...patch } : bucket) });
  const linkValue = (bucket: Bucket) => bucket.links[0] ? `${bucket.links[0].type}:${bucket.links[0].id}` : '';
  const holdingValue = (holding: any) => data.toPhp ? data.toPhp(Number(holding.current_value || 0), String(holding.currency || 'USD')) : Number(holding.current_value || 0);
  const link = (bucket: Bucket, value: string) => {
    if (!plan) return;
    if (!value) { setBucket(bucket.id, { links: [] }); return; }
    const [type, id] = value.split(':');
    const patch: Partial<Bucket> = { links: [{ type: type as 'account' | 'holding', id: Number(id), mode: 'whole', value: 100, since: localDate() }] };
    const account = type === 'account' ? accounts.find(item => Number(item.id) === Number(id)) : null;
    const holding = type === 'holding' ? portfolios.find(item => Number(item.id) === Number(id)) : null;
    // A plan starting now begins from what's already there.
    if (plan.start >= thisMonth) patch.startBalance = Math.round(account ? Number(account.balance || 0) : holding ? holdingValue(holding) : 0);
    const rate = account && !MARKET_KINDS.includes(bucket.kind) ? accountRate(account) : null;
    if (rate) { patch.rates = { conservative: rate.rate, balanced: rate.rate, aggressive: rate.rate }; patch.taxRate = rate.tax; }
    setBucket(bucket.id, patch);
  };
  const preview = useMemo(() => plan ? simulate(plan, 'balanced', simOptions(plan, data)) : [], [plan, data]);
  const create = async () => {
    if (!plan || !template) return;
    setBusy(true); setError('');
    try { await onCreate(name.trim() || 'My plan', plan); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create the plan.'); setBusy(false); }
  };

  return <Sheet advanced={advanced} title={plan ? 'Make it yours' : 'New wealth plan'} onClose={onClose} wide>
    {!plan && <><p className="text-sm text-slate-500">Start from a common plan. You can change every part of it later.</p><TemplateGrid advanced={advanced} selected={template ?? undefined} onPick={id => pick(id)} /></>}
    {plan && template && <div className="space-y-4">
      <button onClick={() => { setPlan(null); setTemplate(null); }} className="flex items-center gap-1 text-xs font-bold text-slate-500"><ArrowLeft size={14} /> Choose another starting point</button>
      <div className="grid grid-cols-[1fr_1fr] gap-3">
        <label className="col-span-2"><span className={label}>Plan name</span><input value={name} onChange={event => setName(event.target.value)} className={input} /></label>
        <label><span className={label}>Starts</span><input type="month" value={plan.start} onChange={event => event.target.value && setPlan({ ...plan, start: event.target.value })} className={input} /></label>
        <label><span className={label}>Months</span><input type="number" min="1" max="600" value={plan.periods} onChange={event => setPlan({ ...plan, periods: Math.max(1, Math.min(600, Number(event.target.value) || 1)) })} className={input} /></label>
        {template === 'emergency' && <label className="col-span-2"><span className={label}>Your monthly spending</span><input type="number" inputMode="decimal" value={spend} onChange={event => { setSpend(event.target.value); pick('emergency', { spend: event.target.value }); }} className={input} /><span className="mt-1 block text-[11px] text-slate-500">{averageSpend ? `Your average over the last 3 months is ${peso(averageSpend)}.` : 'Log a few expenses and FinGent will suggest this for you.'} The goal is 6 months of it.</span></label>}
        {template === 'purchase' && <label className="col-span-2"><span className={label}>How much you need</span><input type="number" inputMode="decimal" value={target} onChange={event => { setTarget(event.target.value); pick('purchase', { target: event.target.value }); }} className={input} /></label>}
      </div>
      <div>
        <p className={label}>Accounts in this plan</p>
        <p className="mb-2 text-[11px] text-slate-500">Link one to your real account or investment and its money counts automatically. Savings accounts use their own interest rate.</p>
        <div className="space-y-2">{plan.buckets.map(bucket => <div key={bucket.id} className={`rounded-2xl border p-3 ${advanced ? 'border-slate-700 bg-slate-900/40' : 'border-slate-100 bg-slate-50'}`} style={{ borderLeft: `4px solid ${bucket.color}` }}>
          <div className="flex items-center gap-2"><input value={bucket.name} onChange={event => setBucket(bucket.id, { name: event.target.value })} aria-label="Account name" className={`${input} font-bold`} /><span className="shrink-0 text-[11px] font-bold text-slate-500">{KIND_LABELS[bucket.kind]}</span></div>
          <div className="mt-2 grid grid-cols-[1fr_1fr] gap-2">
            {bucket.contribution.mode === 'fixed'
              ? <label className="text-[11px] font-bold text-slate-500">Each month<input type="number" inputMode="decimal" value={bucket.contribution.amount || ''} onChange={event => setBucket(bucket.id, { contribution: { mode: 'fixed', amount: Number(event.target.value) || 0 } })} className={`${input} mt-1`} placeholder="₱" /></label>
              : (() => { const contribution = bucket.contribution; return <label className="text-[11px] font-bold text-slate-500">% of every income<input type="number" step="0.5" value={contribution.percent} onChange={event => setBucket(bucket.id, { contribution: { ...contribution, percent: Number(event.target.value) || 0 } })} className={`${input} mt-1`} /></label>; })()}
            <label className="text-[11px] font-bold text-slate-500">Starting balance<input type="number" inputMode="decimal" value={bucket.startBalance || ''} onChange={event => setBucket(bucket.id, { startBalance: Number(event.target.value) || 0 })} className={`${input} mt-1`} placeholder="₱0" /></label>
            <label className="col-span-2 text-[11px] font-bold text-slate-500">Linked to
              <select value={linkValue(bucket)} onChange={event => link(bucket, event.target.value)} className={`${input} mt-1`}>
                <option value="">Not linked (log deposits yourself)</option>
                {accounts.length > 0 && <optgroup label="Accounts">{accounts.map(account => <option key={`a${account.id}`} value={`account:${account.id}`}>{account.name} · {peso(account.balance || 0)}</option>)}</optgroup>}
                {portfolios.length > 0 && <optgroup label="Investments">{portfolios.map(holding => <option key={`h${holding.id}`} value={`holding:${holding.id}`}>{holding.ticker || holding.name} · {peso(holdingValue(holding))}</option>)}</optgroup>}
              </select>
            </label>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">Grows {bucket.rates.conservative === bucket.rates.aggressive ? `${Number((bucket.rates.balanced * 100).toFixed(2))}%` : `${(bucket.rates.conservative * 100).toFixed(1)}–${(bucket.rates.aggressive * 100).toFixed(1)}%`} a year{bucket.taxRate ? `, ${Math.round(bucket.taxRate * 100)}% tax` : ''}{bucket.deployEvery > 1 ? ` · invested every ${bucket.deployEvery} months` : ''}</p>
        </div>)}</div>
      </div>
      {preview.length > 0 && <div className={`rounded-2xl p-3 text-sm ${advanced ? 'bg-violet-500/10' : 'bg-emerald-50'}`}>By <strong>{preview.at(-1)!.label}</strong> this could reach <strong>{peso(preview.at(-1)!.total)}</strong> on a balanced outlook, from {peso(preview.at(-1)!.principalTotal)} put in.</div>}
      {error && <p className="text-sm text-rose-500">{error}</p>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className={`rounded-xl border px-4 py-2.5 text-sm font-bold ${advanced ? 'border-slate-600' : 'border-slate-200'}`}>Cancel</button><button disabled={busy} onClick={create} className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${advanced ? 'bg-violet-600' : 'bg-emerald-500'}`}><Sparkles size={15} /> Create plan</button></div>
    </div>}
  </Sheet>;
}

/** Two plans, a plan against your current path, or one plan under two outlooks, side by side. */
function Compare({ advanced, plans, data, card }: { advanced: boolean; plans: PlanRecord[]; data: Data; card: string }) {
  const [aId, setAId] = useState<number>(plans[0]?.id ?? 0);
  const [b, setB] = useState<string>('path');
  const [aScenario, setAScenario] = useState<Scenario>('balanced');
  const [bScenario, setBScenario] = useState<Scenario>('balanced');
  const input = `w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm outline-none ${advanced ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`;
  const a = plans.find(item => item.id === aId) ?? plans[0];
  const result = useMemo(() => {
    if (!a) return null;
    const aRows = simulate(a.plan, aScenario, simOptions(a.plan, data));
    let bRows: Row[]; let bName: string;
    if (b === 'path') { bRows = trajectory(a.plan, data, bScenario, simOptions(a.plan, data)); bName = 'Your current path'; }
    else if (b === 'scenario') { bRows = simulate(a.plan, bScenario, simOptions(a.plan, data)); bName = `${a.name} · ${bScenario}`; }
    else { const other = plans.find(item => `plan:${item.id}` === b) ?? a; bRows = simulate(other.plan, bScenario, simOptions(other.plan, data)); bName = other.name; }
    const months = [...new Set([...aRows.map(row => row.month), ...bRows.map(row => row.month)])].sort();
    const label = (month: string) => aRows.find(row => row.month === month)?.label ?? bRows.find(row => row.month === month)?.label ?? month;
    const value = (rows: Row[], month: string) => { const exact = rows.find(row => row.month === month); if (exact) return exact.total; const before = rows.filter(row => row.month < month).at(-1); return before && rows.some(row => row.month > month) ? before.total : null; };
    const points = months.map(month => ({ month, label: label(month), a: value(aRows, month), b: value(bRows, month) }));
    const aDates = milestoneDates(aRows); const bDates = milestoneDates(bRows);
    const milestones = [...new Set([...Object.keys(aDates), ...Object.keys(bDates)].map(Number))].sort((x, y) => x - y);
    return { aRows, bRows, bName, points, milestones, aDates, bDates };
  }, [a, b, aScenario, bScenario, plans, data]);

  if (!plans.length || !a || !result) return <div className={`${card} p-5 text-sm text-slate-500`}>Create a plan first, then compare it with another plan or with the path you're on today.</div>;
  const aEnd = result.aRows.at(-1)!; const bEnd = result.bRows.at(-1)!;
  const monthsBetween = (x?: Row, y?: Row) => { if (!x || !y) return null; const [xy, xm] = x.month.split('-').map(Number); const [yy, ym] = y.month.split('-').map(Number); return (yy * 12 + ym) - (xy * 12 + xm); };
  return <div className="space-y-4">
    <div className={`${card} grid grid-cols-1 gap-3 p-4 md:grid-cols-2`}>
      <div className="space-y-2"><p className="text-[11px] font-black uppercase tracking-wider text-violet-500">Plan A</p><select value={a.id} onChange={event => setAId(Number(event.target.value))} className={input}>{plans.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><Segmented label="Plan A outlook" size="sm" value={aScenario} onChange={setAScenario} options={SCENARIO_OPTIONS} /></div>
      <div className="space-y-2"><p className="text-[11px] font-black uppercase tracking-wider text-amber-500">Compare with</p><select value={b} onChange={event => setB(event.target.value)} className={input}><option value="path">Your current path (today's real balances)</option><option value="scenario">Same plan, another outlook</option>{plans.filter(item => item.id !== a.id).map(item => <option key={item.id} value={`plan:${item.id}`}>{item.name}</option>)}</select><Segmented label="Comparison outlook" size="sm" value={bScenario} onChange={setBScenario} options={SCENARIO_OPTIONS} /></div>
    </div>
    <div className="grid grid-cols-[1fr_1fr] gap-3 sm:grid-cols-3">
      <div className={`${card} p-4`}><p className="text-[11px] font-bold uppercase tracking-wider text-violet-500">{a.name}</p><p className="mt-1 text-xl font-black">{shortPeso(aEnd.total)}</p><p className="text-[11px] text-slate-500">by {aEnd.label} · {shortPeso(aEnd.principalTotal)} put in</p></div>
      <div className={`${card} p-4`}><p className="truncate text-[11px] font-bold uppercase tracking-wider text-amber-500">{result.bName}</p><p className="mt-1 text-xl font-black">{shortPeso(bEnd.total)}</p><p className="text-[11px] text-slate-500">by {bEnd.label} · {shortPeso(bEnd.principalTotal)} put in</p></div>
      <div className={`${card} col-span-2 p-4 sm:col-span-1`}><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Difference at the end</p><p className={`mt-1 text-xl font-black ${bEnd.total >= aEnd.total ? 'text-emerald-600' : 'text-rose-500'}`}>{bEnd.total >= aEnd.total ? '+' : '−'}{shortPeso(Math.abs(bEnd.total - aEnd.total))}</p><p className="text-[11px] text-slate-500">{bEnd.total >= aEnd.total ? 'more' : 'less'} with {result.bName}</p></div>
    </div>
    <div className={`${card} p-4`}>
      <div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={result.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={advanced ? '#334155' : '#e2e8f0'} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: advanced ? '#94a3b8' : '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={18} />
        <YAxis tick={{ fill: advanced ? '#94a3b8' : '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={shortPeso} width={52} />
        <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12, background: advanced ? '#1e293b' : '#fff', color: advanced ? '#e2e8f0' : '#0f172a' }} formatter={(value: unknown, key: unknown) => [peso(Number(value)), key === 'a' ? a.name : result.bName]} />
        <Line type="monotone" dataKey="a" stroke="#8b5cf6" strokeWidth={2.5} dot={false} connectNulls />
        <Line type="monotone" dataKey="b" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="6 4" dot={false} connectNulls />
      </LineChart></ResponsiveContainer></div>
      <div className="mt-2 flex flex-wrap gap-4 text-[11px] font-bold text-slate-500"><span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-violet-500" />{a.name}</span><span className="flex items-center gap-1"><span className="h-0.5 w-4 border-t-2 border-dashed border-amber-500" />{result.bName}</span></div>
    </div>
    {result.milestones.length > 0 && <div className={`${card} p-4`}>
      <h3 className="font-black">When you reach each milestone</h3>
      <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-700/60">{result.milestones.map(value => { const x = result.aDates[value]; const y = result.bDates[value]; const gap = monthsBetween(x, y); return <div key={value} className="flex items-center justify-between gap-2 py-2 text-sm"><span className="font-black">{shortPeso(value)}</span><span className="text-right text-xs"><span className="text-violet-500">{x?.label ?? '—'}</span> vs <span className="text-amber-600">{y?.label ?? '—'}</span>{gap !== null && gap !== 0 && <span className={`ml-2 font-bold ${gap < 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{Math.abs(gap)} mo {gap < 0 ? 'sooner' : 'later'}</span>}</span></div>; })}</div>
    </div>}
    <div className={`${card} p-3`}>
      <div className="max-h-96 overflow-auto rounded-2xl border border-slate-100 dark:border-slate-700"><table className="w-full text-right text-xs">
        <thead className={`sticky top-0 ${advanced ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-500'} text-[10px] uppercase tracking-wider`}><tr><th className="px-3 py-2 text-left">Month</th><th className="px-3 py-2 text-violet-500">A</th><th className="px-3 py-2 text-amber-600">B</th><th className="px-3 py-2">Difference</th></tr></thead>
        <tbody>{result.points.map(point => { const diff = point.a !== null && point.b !== null ? point.b - point.a : null; return <tr key={point.month} className="border-t border-slate-100 dark:border-slate-700/60"><td className="px-3 py-1.5 text-left font-bold">{point.label}</td><td className="px-3 py-1.5">{point.a === null ? '—' : peso(point.a)}</td><td className="px-3 py-1.5">{point.b === null ? '—' : peso(point.b)}</td><td className={`px-3 py-1.5 font-bold ${diff === null ? '' : diff >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{diff === null ? '—' : `${diff >= 0 ? '+' : '−'}${peso(Math.abs(diff))}`}</td></tr>; })}</tbody>
      </table></div>
    </div>
  </div>;
}

/** How each account is shared between plans and goals. */
function Allocation({ advanced, plans, goals, accounts, card, onOpen }: { advanced: boolean; plans: PlanRecord[]; goals: any[]; accounts: any[]; card: string; onOpen: (id: number) => void }) {
  const rows = useMemo(() => accountAllocation(plans.map(item => ({ name: item.name, plan: item.plan })), goals, accounts), [plans, goals, accounts]);
  const colors = ['#8b5cf6', '#22c3a0', '#4d8eff', '#fb923c', '#f472b6', '#facc15'];
  if (!rows.length) return <div className={`${card} p-5 text-sm text-slate-500`}>No account is linked to a plan or goal yet. Link accounts in a plan's Edit tab, or add savings to a goal, and you'll see how each account is shared here.</div>;
  return <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{rows.map(row => <div key={row.account_id} className={`${card} p-4`}>
    <div className="flex items-center justify-between gap-2"><p className="truncate font-black">{row.name}</p><p className="shrink-0 text-sm font-black">{peso(row.balance)}</p></div>
    <div className={`mt-3 flex h-3 overflow-hidden rounded-full ${advanced ? 'bg-slate-700' : 'bg-slate-100'}`}>{row.owners.map((owner, index) => <div key={owner.owner} title={owner.owner} style={{ width: `${row.balance ? Math.min(100, (owner.amount / row.balance) * 100) : 0}%`, background: colors[index % colors.length] }} />)}</div>
    <div className="mt-3 space-y-1.5">{row.owners.map((owner, index) => { const planName = owner.owner.split(' · ')[0]; const plan = owner.kind === 'plan' ? plans.find(item => item.name === planName) : undefined; return <div key={owner.owner} className="flex items-center justify-between gap-2 text-xs">
      <button disabled={!plan} onClick={() => plan && onOpen(plan.id)} className="flex min-w-0 items-center gap-1.5 text-left font-bold"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[index % colors.length] }} /><span className="truncate">{owner.owner}</span><span className="shrink-0 font-normal text-slate-500">{owner.kind === 'goal' ? 'goal' : 'plan'}</span></button>
      <span className="shrink-0 text-slate-500">{owner.mode === 'whole' ? 'whole account' : owner.mode === 'percent' ? `${owner.value}%` : peso(owner.value)} · <strong className="text-slate-700 dark:text-slate-200">{peso(owner.amount)}</strong></span>
    </div>; })}
      <div className="flex justify-between text-xs text-slate-500"><span>Not assigned</span><span className="font-bold">{peso(row.unassigned)}</span></div>
    </div>
    {row.problems.length > 0 && <div className={`mt-3 rounded-xl p-2.5 text-xs ${advanced ? 'bg-amber-500/10 text-amber-200' : 'bg-amber-50 text-amber-900'}`}>{row.problems.join(' ')}</div>}
  </div>)}</div>;
}

/** Quick what-could-it-become calculator, separate from any plan. */
function QuickCalculator({ advanced, card }: { advanced: boolean; card: string }) {
  const [principal, setPrincipal] = useState('10000');
  const [monthly, setMonthly] = useState('2000');
  const [years, setYears] = useState('10');
  const [rate, setRate] = useState('8');
  const [inflation, setInflation] = useState('4');
  const input = `w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm outline-none ${advanced ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`;
  const label = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500';
  const rows = useMemo(() => compound(Number(principal) || 0, Number(monthly) || 0, Math.min(60, Number(years) || 0), (Number(rate) || 0) / 100, (Number(inflation) || 0) / 100), [principal, monthly, years, rate, inflation]);
  const last = rows.at(-1)!;
  const presets = [['Savings 3%', '3'], ['Time deposit 5%', '5'], ['Conservative 4%', '4'], ['Balanced 8%', '8'], ['Aggressive 12%', '12']];
  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
    <div className={`${card} space-y-3 p-4`}>
      <div className="grid grid-cols-[1fr_1fr] gap-3">
        <label><span className={label}>Start with</span><input type="number" inputMode="decimal" value={principal} onChange={event => setPrincipal(event.target.value)} className={input} /></label>
        <label><span className={label}>Add each month</span><input type="number" inputMode="decimal" value={monthly} onChange={event => setMonthly(event.target.value)} className={input} /></label>
        <label><span className={label}>Years</span><input type="number" min="1" max="60" value={years} onChange={event => setYears(event.target.value)} className={input} /></label>
        <label><span className={label}>Growth % a year</span><input type="number" step="0.1" value={rate} onChange={event => setRate(event.target.value)} className={input} /></label>
        <label className="col-span-2"><span className={label}>Inflation % a year</span><input type="number" step="0.1" value={inflation} onChange={event => setInflation(event.target.value)} className={input} /></label>
      </div>
      <div className="flex flex-wrap gap-1.5">{presets.map(([text, value]) => <button key={text} onClick={() => setRate(value)} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${rate === value ? (advanced ? 'bg-violet-600 text-white' : 'bg-slate-900 text-white') : (advanced ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')}`}>{text}</button>)}</div>
    </div>
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_1fr] gap-3 sm:grid-cols-4">
        {[['After ' + (rows.length - 1) + ' years', last.value, 'text-violet-600 dark:text-violet-300'], ["In today's money", last.real, ''], ['You put in', last.deposited, ''], ['Growth', last.growth, 'text-emerald-600']].map(([text, value, tone]) => <div key={String(text)} className={`${card} min-w-0 p-3.5`}><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{text}</p><p className={`mt-1 truncate text-lg font-black ${tone}`}>{shortPeso(Number(value))}</p></div>)}
      </div>
      <div className={`${card} p-4`}><div className="h-64"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={advanced ? '#334155' : '#e2e8f0'} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="year" tick={{ fill: advanced ? '#94a3b8' : '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(year: number) => `Y${year}`} />
        <YAxis tick={{ fill: advanced ? '#94a3b8' : '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={shortPeso} width={52} />
        <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12, background: advanced ? '#1e293b' : '#fff', color: advanced ? '#e2e8f0' : '#0f172a' }} formatter={(value: unknown, key: unknown) => [peso(Number(value)), key === 'value' ? 'Value' : key === 'real' ? "Today's money" : 'Put in']} labelFormatter={(year: unknown) => `Year ${year}`} />
        <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
        <Area type="monotone" dataKey="deposited" stroke="#64748b" fill="#64748b" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 4" />
        <Line type="monotone" dataKey="real" stroke="#10b981" strokeWidth={2} dot={false} />
      </ComposedChart></ResponsiveContainer></div></div>
    </div>
  </div>;
}
