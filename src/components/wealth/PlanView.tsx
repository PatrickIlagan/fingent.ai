import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CalendarDays, Copy, Download, FileText, Flag, LineChart, PencilLine, Plus, Save, Sparkles, Table2, Target, Trash2, X, Zap, Gauge, Wallet } from 'lucide-react';
import { actualHistory, planSoFar, inTodaysMoney, incomeBasis, linkProblems, MAJOR_MILESTONES, milestoneDates, periodFor, periodProgress, planActuals, simulate, timeline, type ActualData, type Row, type Scenario, type WealthPlan, type WhatIf, KIND_LABELS } from '../../lib/wealthPlan';
import { localDate } from '../../lib/sharedRules';
import { exportExcel } from '../../lib/workbookExport';
import { exportPdf } from '../../lib/export';
import { Segmented } from '../Segmented';
import { CountUp } from '../CountUp';
import { celebrate } from '../Celebrations';
import { PlanChart, type ChartShow } from './PlanChart';
import { PlanEditor } from './PlanEditor';

export type PlanRecord = { id: number; name: string; plan: WealthPlan };
const peso = (value: number) => '₱' + Math.round(value).toLocaleString('en-PH');
const shortPeso = (value: number) => { const a = Math.abs(value); return a >= 1e6 ? `₱${(value / 1e6).toFixed(2)}M` : a >= 1e3 ? `₱${Math.round(value / 1e3)}K` : peso(value); };
const TABS = [
  { value: 'overview', label: 'Overview', icon: Gauge },
  { value: 'table', label: 'Table', icon: Table2 },
  { value: 'calendar', label: 'Calendar', icon: CalendarDays },
  { value: 'graph', label: 'Graph', icon: LineChart },
  { value: 'tracker', label: 'Tracker', icon: Target },
  { value: 'edit', label: 'Edit', icon: PencilLine },
] as const;

async function send(path: string, method: string, body?: unknown) {
  const response = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Something went wrong.');
  return result;
}

export function PlanView({ advanced, record, others, data, goals, onBack, onSaved, onDuplicate, onDeleted }: {
  key?: number;
  advanced: boolean; record: PlanRecord; others: PlanRecord[]; data: ActualData & { incomeFlows: any[] }; goals: any[];
  onBack: () => void; onSaved: () => void; onDuplicate: () => void; onDeleted: () => void;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('overview');
  const [scenario, setScenario] = useState<Scenario>('balanced');
  const [draft, setDraft] = useState<WealthPlan>(record.plan);
  const [name, setName] = useState(record.name);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [todayMoney, setTodayMoney] = useState(false);
  const [whatIf, setWhatIf] = useState<WhatIf>({});
  const [show, setShow] = useState<ChartShow>({ buckets: true, band: true, actual: true, deposits: false, whatIf: true });
  const [tableMode, setTableMode] = useState<'plan' | 'actual'>('plan');
  const [openMonth, setOpenMonth] = useState<number | null>(null);
  const [logOpen, setLogOpen] = useState<number | null>(null);
  const [allMilestones, setAllMilestones] = useState(false);
  // Fresh data from elsewhere in the app never wipes edits you haven't saved yet.
  useEffect(() => { if (!dirty) { setDraft(record.plan); setName(record.name); } }, [record]);

  const card = `rounded-3xl border shadow-sm ${advanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`;
  const soft = advanced ? 'bg-slate-900/50' : 'bg-slate-50';
  const primary = `inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${advanced ? 'bg-violet-600 hover:bg-violet-700' : 'bg-emerald-500 hover:bg-emerald-600'}`;
  const secondary = `inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold disabled:opacity-50 ${advanced ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`;
  const chip = (active: boolean) => `inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${active ? (advanced ? 'bg-violet-600 text-white' : 'bg-slate-900 text-white') : (advanced ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')}`;

  const today = localDate();
  const income = useMemo(() => Object.fromEntries(draft.buckets.filter(bucket => bucket.contribution.mode === 'percent').map(bucket => [bucket.id, incomeBasis(bucket.contribution, data, today)])), [draft, data, today]);
  const options = { income, actualIncomeUntil: today.slice(0, 7) };
  const rows = useMemo(() => simulate(draft, scenario, options), [draft, scenario, income]);
  const low = useMemo(() => simulate(draft, 'conservative', options), [draft, income]);
  const high = useMemo(() => simulate(draft, 'aggressive', options), [draft, income]);
  const whatIfActive = Object.keys(whatIf).length > 0;
  const whatIfRows = useMemo(() => whatIfActive ? simulate(draft, scenario, { ...options, whatIf }) : null, [draft, scenario, whatIf, income]);
  const actuals = useMemo(() => planActuals(draft, data, today), [draft, data, today]);
  const history = useMemo(() => actualHistory(draft, data, today), [draft, data, today]);
  const periods = useMemo(() => timeline(draft), [draft]);
  const current = actuals.current;
  const last = rows[rows.length - 1];
  const reachedOn = milestoneDates(rows);
  const counted = draft.milestoneBuckets.length ? draft.milestoneBuckets : draft.buckets.map(bucket => bucket.id);
  const actualMilestoneTotal = actuals.buckets.filter(item => counted.includes(item.bucket)).reduce((sum, item) => sum + item.balance, 0);
  const planNow = current > 0 ? rows[current - 1] : null;
  // What should be there by now: the plan as of last month's end, since this month is still in progress.
  const planMilestoneNow = current > 0 ? planSoFar(draft, rows, current) : 0;
  const deflate = todayMoney ? (amount: number, index: number) => inTodaysMoney(amount, index - Math.max(current, 0), draft.inflation) : undefined;
  const show$ = (amount: number, index: number) => deflate ? deflate(amount, index) : amount;
  const problems = useMemo(() => linkProblems(name, draft, others.map(item => ({ name: item.name, plan: item.plan })), goals, data.accounts), [draft, others, goals, data.accounts, name]);

  const change = (plan: WealthPlan) => { setDraft(plan); setDirty(true); };
  const save = async (plan = draft, label = 'save') => {
    setBusy(label); setError('');
    try { await send(`/api/wealth-plans/${record.id}`, 'PUT', { name: name.trim() || record.name, plan: JSON.stringify(plan) }); setDirty(false); onSaved(); if (label === 'save') celebrate({ kind: 'success', title: 'Plan saved', message: name }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save.'); }
    finally { setBusy(''); }
  };
  const remove = async () => {
    if (!window.confirm(`Delete "${record.name}"? Your accounts and transactions stay as they are.`)) return;
    await send(`/api/wealth-plans/${record.id}`, 'DELETE'); onDeleted();
  };
  const exportRows = rows.map(row => ({ Month: row.label, ...Object.fromEntries(draft.buckets.flatMap(bucket => [[`${bucket.name} in`, row.deposits[bucket.id]], [`${bucket.name} balance`, Math.round(row.balances[bucket.id])]])), 'One-time': row.injectionTotal, 'Net worth': Math.round(row.total), 'Milestone total': Math.round(row.milestoneTotal), Milestones: row.hits.map(shortPeso).join(' ') }));
  const makeGoal = async (value: number, row: Row) => {
    const [y, m] = row.month.split('-').map(Number);
    await send('/api/goals', 'POST', { name: `${name} ${shortPeso(value)}`, target: value, date: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10), icon: 'Target', color: 'violet' });
    celebrate({ kind: 'success', title: 'Goal added', message: `${shortPeso(value)} by ${row.label}` });
  };

  const whatIfControls: { key: keyof WhatIf; label: string; make: () => WhatIf[keyof WhatIf] }[] = [
    { key: 'returnDelta', label: '+1% return', make: () => 0.01 },
    { key: 'crash', label: 'Market −20%', make: () => ({ period: Math.max(1, current + 1), drop: 0.2 }) },
    { key: 'pause', label: 'Pause 3 months', make: () => ({ from: Math.max(1, current + 1), count: 3 }) },
    { key: 'extraMonthly', label: '+₱1,000 a month', make: () => ({ bucket: draft.buckets[0]?.id ?? '', amount: 1000 }) },
    { key: 'bonus', label: '₱10,000 bonus', make: () => ({ period: Math.max(1, current + 1), bucket: draft.buckets[0]?.id ?? '', amount: 10000 }) },
    { key: 'stopAfter', label: 'Stop after a year', make: () => Math.max(1, current) + 12 },
  ];
  const toggleWhatIf = (key: keyof WhatIf, make: () => unknown) => setWhatIf(value => { const next = { ...value } as Record<string, unknown>; if (key in next) delete next[key]; else next[key] = make(); return next as WhatIf; });

  return <div className="space-y-4 pb-10">
    {/* Header */}
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={onBack} aria-label="Back to plans" className={`rounded-xl border p-2.5 ${advanced ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}><ArrowLeft size={18} /></button>
      <div className="min-w-0 flex-1"><h2 className="truncate text-xl font-black sm:text-2xl">{name}</h2><p className="text-xs text-slate-500">{periods[0]?.label} – {periods[periods.length - 1]?.label} · {draft.buckets.length} accounts{dirty ? ' · unsaved changes' : ''}</p></div>
      {dirty && <button disabled={!!busy} onClick={() => save()} className={primary}><Save size={15} /> Save</button>}
      <button onClick={onDuplicate} aria-label="Duplicate plan" title="Duplicate" className={secondary}><Copy size={15} /></button>
      <button onClick={remove} aria-label="Delete plan" title="Delete" className={`${secondary} text-rose-500`}><Trash2 size={15} /></button>
    </div>
    {error && <p className="text-sm text-rose-500">{error}</p>}

    <Segmented label="Plan view" size="sm" value={tab} onChange={setTab} options={TABS.map(item => ({ value: item.value, label: item.label, icon: item.icon }))} />

    {tab !== 'edit' && tab !== 'tracker' && <div className={`${card} space-y-3 p-3`}>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented label="Scenario" size="sm" fill={false} value={scenario} onChange={setScenario} options={[{ value: 'conservative', label: 'Conservative' }, { value: 'balanced', label: 'Balanced' }, { value: 'aggressive', label: 'Aggressive' }]} />
        <button onClick={() => setTodayMoney(value => !value)} className={chip(todayMoney)}>In today's money</button>
      </div>
      <div className="hide-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3"><span className="flex shrink-0 items-center gap-1 text-[11px] font-black uppercase tracking-wider text-amber-600"><Zap size={13} /> What if</span>{whatIfControls.map(control => <button key={control.key} onClick={() => toggleWhatIf(control.key, control.make)} className={`${chip(control.key in whatIf)} shrink-0`}>{control.label}</button>)}</div>
      {whatIfRows && <p className="text-xs font-bold text-amber-600">With these what-ifs: {peso(show$(whatIfRows[whatIfRows.length - 1].total, whatIfRows.length))} at the end ({whatIfRows[whatIfRows.length - 1].total >= last.total ? '+' : '−'}{peso(Math.abs(whatIfRows[whatIfRows.length - 1].total - last.total))} vs the plan).</p>}
    </div>}

    <AnimatePresence mode="wait">
      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="space-y-4">
        {tab === 'overview' && <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi advanced={advanced} label={`End value · ${periods[periods.length - 1]?.label}`} value={<CountUp value={show$(last.total, last.index)} format={peso} />} sub={`${shortPeso(show$(low[low.length - 1].total, last.index))} – ${shortPeso(show$(high[high.length - 1].total, last.index))} range`} tone="violet" />
            <Kpi advanced={advanced} label="You'll put in" value={peso(last.depositTotal)} sub={`plus ${peso(draft.buckets.reduce((sum, bucket) => sum + bucket.startBalance, 0))} to start`} />
            <Kpi advanced={advanced} label="Growth" value={peso(show$(last.growthTotal, last.index))} sub={last.principalTotal > 0 ? `${Math.round((last.growthTotal / last.principalTotal) * 100)}% on top` : ''} tone="emerald" />
            <Kpi advanced={advanced} label={current > 0 ? 'Today vs plan so far' : 'Starts'} value={current > 0 ? peso(actualMilestoneTotal) : periods[0]?.label} sub={current > 0 ? `${actualMilestoneTotal >= planMilestoneNow ? 'Ahead by' : 'Behind by'} ${peso(Math.abs(actualMilestoneTotal - planMilestoneNow))}` : 'Not started yet'} tone={current > 0 ? (actualMilestoneTotal >= planMilestoneNow ? 'emerald' : 'rose') : undefined} />
          </div>
          <div className={`${card} p-4`}>
            <div className="mb-2 flex items-center justify-between"><h3 className="font-black">Projection</h3><span className="text-[11px] font-bold text-slate-500">Shaded: conservative to aggressive</span></div>
            <PlanChart rows={rows} low={low} high={high} whatIf={whatIfRows} actual={history} buckets={draft.buckets} show={show} advanced={advanced} height={230} deflate={deflate} />
          </div>
          <div className={`${card} p-4`}>
            <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-black"><Flag size={16} /> Milestones</h3><button onClick={() => setAllMilestones(value => !value)} className="text-xs font-bold text-slate-500">{allMilestones ? 'Major only' : 'Show all'}</button></div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{draft.milestones.filter(value => allMilestones || MAJOR_MILESTONES.has(value) || draft.milestones.length <= 6).map(value => { const row = reachedOn[value]; const done = actualMilestoneTotal >= value; return <div key={value} className={`rounded-2xl p-3 ${done ? (advanced ? 'bg-emerald-500/15 ring-1 ring-emerald-500/40' : 'bg-emerald-50 ring-1 ring-emerald-200') : soft}`}>
              <p className="text-base font-black">{shortPeso(value)}</p>
              <p className="text-[11px] font-bold text-slate-500">{done ? 'Reached ✓' : row ? `Plan: ${row.label}` : 'After the plan ends'}</p>
              {row && !done && <button onClick={() => makeGoal(value, row)} className={`mt-1 text-[11px] font-bold ${advanced ? 'text-violet-300' : 'text-emerald-700'}`}>+ Make it a goal</button>}
            </div>; })}</div>
          </div>
          <div className={`${card} p-4`}>
            <h3 className="font-black">Accounts in this plan</h3>
            <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-700/60">{draft.buckets.map(bucket => { const actual = actuals.buckets.find(item => item.bucket === bucket.id); return <div key={bucket.id} className="flex items-center gap-3 py-2.5">
              <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: bucket.color }} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{bucket.name}</p><p className="truncate text-[11px] text-slate-500">{KIND_LABELS[bucket.kind]} · {bucket.contribution.mode === 'fixed' ? `${peso(bucket.contribution.amount)}/mo` : `${bucket.contribution.percent}% of income`} · {(bucket.rates[scenario] * 100).toFixed(2)}%{bucket.deployEvery > 1 ? ` · invested every ${bucket.deployEvery} mo` : ''}</p><p className="truncate text-[11px] text-slate-500">{bucket.links.length ? `Linked: ${bucket.links.map(link => { const target = link.type === 'account' ? data.accounts.find(account => Number(account.id) === link.id)?.name : (data.portfolios.find(item => Number(item.id) === link.id)?.ticker || data.portfolios.find(item => Number(item.id) === link.id)?.name); return `${target ?? 'missing'}${link.mode === 'percent' ? ` (${link.value}%)` : link.mode === 'amount' ? ` (${peso(link.value)})` : ''}`; }).join(', ')}` : 'Not linked: actuals come from logged deposits'}</p></div>
              <div className="shrink-0 text-right"><p className="text-sm font-black">{peso(show$(last.balances[bucket.id], last.index))}</p><p className="text-[11px] text-slate-500">now {peso(actual?.balance ?? 0)}</p></div>
            </div>; })}</div>
          </div>
        </>}

        {tab === 'table' && <div className={`${card} p-3 sm:p-4`}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Segmented label="Table" size="sm" fill={false} value={tableMode} onChange={setTableMode} options={[{ value: 'plan', label: 'Plan' }, { value: 'actual', label: 'Plan vs actual' }]} />
            <div className="ml-auto flex gap-2"><button onClick={() => exportExcel(`${name}-breakdown`, [{ name: 'Monthly breakdown', rows: exportRows }])} className={secondary}><Download size={14} /> Excel</button><button onClick={() => exportPdf(`${name} — monthly breakdown`, exportRows, `${scenario} scenario`)} className={secondary}><FileText size={14} /> PDF</button></div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700">
            <table className="w-full min-w-max text-right text-xs">
              <thead className={`${advanced ? 'bg-slate-900/60 text-slate-400' : 'bg-slate-50 text-slate-500'} text-[10px] uppercase tracking-wider`}>
                <tr><th className="sticky left-0 z-10 bg-inherit px-2 py-2 text-left">#</th><th className="px-2 py-2 text-left">Month</th>
                  {tableMode === 'plan'
                    ? <>{draft.buckets.map(bucket => <th key={`in${bucket.id}`} className="px-2 py-2" style={{ color: bucket.color }}>{bucket.name.split(' ')[0]} in</th>)}<th className="px-2 py-2 text-amber-600">Once</th>{draft.buckets.map(bucket => <th key={`bal${bucket.id}`} className="px-2 py-2" style={{ color: bucket.color }}>{bucket.name.split(' ')[0]} bal</th>)}<th className="px-2 py-2">Net worth</th><th className="px-2 py-2">Milestone</th></>
                    : <>{draft.buckets.map(bucket => <th key={`p${bucket.id}`} className="px-2 py-2" style={{ color: bucket.color }}>{bucket.name.split(' ')[0]} plan / actual</th>)}<th className="px-2 py-2">Status</th></>}
                </tr>
              </thead>
              <tbody>{rows.map((row, at) => {
                const separator = at > 0 && (row.afterSkip || row.group !== rows[at - 1].group);
                const isNow = row.index === current;
                const progress = draft.buckets.map(bucket => periodProgress(draft, rows, actuals.buckets.find(item => item.bucket === bucket.id)!, row.index));
                const status = row.index > current ? 'future' : progress.every(item => item.status === 'cleared' || item.status === 'none') ? 'cleared' : row.index === current ? 'due' : progress.some(item => item.deposited > 0) ? 'partial' : 'missed';
                return [
                  separator ? <tr key={`s${row.index}`}><td colSpan={99} className="px-2 py-1.5 text-left text-[11px] font-bold text-slate-500">— {rows[at - 1].groupLabel} end{row.afterSkip ? ' · break' : ''} —</td></tr> : null,
                  <tr key={row.index} className={`border-t border-slate-100 dark:border-slate-700/60 ${isNow ? (advanced ? 'bg-violet-500/10' : 'bg-emerald-50/70') : ''}`}>
                    <td className="sticky left-0 z-10 bg-inherit px-2 py-2 text-left text-slate-400">{row.index}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-left font-bold">{row.label}{row.extraNames.length > 0 && <span title={row.extraNames.join(', ')} className="ml-1 text-emerald-500">★</span>}{row.injectionTotal > 0 && <span title={row.injectionNames.join(', ')} className="ml-1 text-amber-500">⚡</span>}{row.hits.filter(value => MAJOR_MILESTONES.has(value) || draft.milestones.length <= 6).map(value => <span key={value} className="ml-1 rounded bg-amber-400 px-1 text-[9px] font-black text-amber-950">{shortPeso(value)}</span>)}</td>
                    {tableMode === 'plan'
                      ? <>{draft.buckets.map(bucket => <td key={`in${bucket.id}`} className="px-2 py-2" style={{ color: bucket.color }}>{peso(row.deposits[bucket.id])}</td>)}<td className="px-2 py-2 text-amber-600">{row.injectionTotal ? peso(row.injectionTotal) : '—'}</td>{draft.buckets.map(bucket => <td key={`bal${bucket.id}`} className="px-2 py-2">{peso(show$(row.balances[bucket.id], row.index))}</td>)}<td className="px-2 py-2 font-black">{peso(show$(row.total, row.index))}</td><td className="px-2 py-2 text-slate-500">{peso(show$(row.milestoneTotal, row.index))}</td></>
                      : <>{draft.buckets.map((bucket, index) => { const item = progress[index]; return <td key={`p${bucket.id}`} className="whitespace-nowrap px-2 py-2"><span className="text-slate-500">{peso(item.thisPlan)}</span> / <span className={row.index > current ? 'text-slate-400' : item.status === 'cleared' ? 'text-emerald-600' : item.status === 'partial' ? 'text-amber-600' : 'text-rose-500'}>{row.index > current ? '—' : peso(item.deposited)}</span></td>; })}<td className="px-2 py-2 text-[11px] font-bold">{status === 'future' ? '' : status === 'cleared' ? <span className="text-emerald-600">On track</span> : status === 'due' ? <span className="text-slate-500">This month</span> : status === 'partial' ? <span className="text-amber-600">Partly</span> : <span className="text-rose-500">Missed</span>}</td></>}
                  </tr>,
                ];
              })}</tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">★ repeating extra · ⚡ one-time deposit · highlighted row is this month. Scroll sideways for all columns.</p>
        </div>}

        {tab === 'calendar' && <div className="space-y-4">{[...new Set(periods.map(period => period.group))].map(group => { const groupPeriods = periods.filter(period => period.group === group); return <div key={group} className={`${card} p-4`}>
          <h3 className="mb-3 font-black">{groupPeriods[0].groupLabel} <span className="text-xs font-bold text-slate-500">{groupPeriods[0].label} – {groupPeriods[groupPeriods.length - 1].label}</span></h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">{groupPeriods.map(period => {
            const row = rows[period.index - 1];
            const planned = draft.buckets.reduce((sum, bucket) => sum + (row.deposits[bucket.id] ?? 0), 0);
            const progress = draft.buckets.map(bucket => periodProgress(draft, rows, actuals.buckets.find(item => item.bucket === bucket.id)!, period.index));
            const status = period.index > current ? 'future' : progress.every(item => item.status === 'cleared' || item.status === 'none') ? 'cleared' : period.index === current ? 'due' : progress.some(item => item.deposited > 0) ? 'partial' : 'missed';
            const tone = status === 'cleared' ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10' : status === 'partial' ? 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10' : status === 'missed' ? 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10' : advanced ? 'border-slate-700 bg-slate-900/40' : 'border-slate-100 bg-slate-50';
            return <motion.button key={period.index} whileTap={{ scale: 0.96 }} onClick={() => setOpenMonth(period.index)} className={`relative rounded-2xl border p-2.5 text-left ${tone} ${period.index === current ? 'ring-2 ring-violet-500' : ''}`}>
              <p className="text-xs font-black">{period.label}</p>
              <p className="mt-1 text-sm font-black">{planned ? shortPeso(planned) : '—'}</p>
              <div className="mt-1 flex flex-wrap gap-0.5 text-[10px] font-bold">{row.extraNames.length > 0 && <span className="text-emerald-600">★</span>}{row.injectionTotal > 0 && <span className="text-amber-600">⚡</span>}{period.isBreak && <span className="text-slate-400">break</span>}{row.hits.slice(-1).map(value => <span key={value} className="rounded bg-amber-400 px-1 text-amber-950">{shortPeso(value)}</span>)}</div>
            </motion.button>;
          })}</div>
        </div>; })}</div>}

        {tab === 'graph' && <div className={`${card} p-4`}>
          <div className="mb-3 flex flex-wrap gap-1.5">{([['buckets', 'By account'], ['band', 'Range'], ['actual', 'Actual'], ['deposits', 'Money put in'], ['whatIf', 'What-if']] as [keyof ChartShow, string][]).map(([key, text]) => <button key={key} onClick={() => setShow(value => ({ ...value, [key]: !value[key] }))} className={chip(show[key])}>{text}</button>)}</div>
          <PlanChart rows={rows} low={low} high={high} whatIf={whatIfRows} actual={history} buckets={draft.buckets} show={show} advanced={advanced} height={340} deflate={deflate} />
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-bold text-slate-500">{draft.buckets.map(bucket => <span key={bucket.id} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: bucket.color }} />{bucket.name}</span>)}<span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-emerald-500" />Actual</span>{whatIfRows && <span className="flex items-center gap-1"><span className="h-0.5 w-4 border-t-2 border-dashed border-rose-500" />What-if</span>}</div>
        </div>}

        {tab === 'tracker' && <Tracker advanced={advanced} plan={draft} rows={rows} actuals={actuals} current={current} data={data} planId={record.id} card={card} soft={soft} primary={primary} secondary={secondary}
          onOverride={(bucket, value) => { const key = String(current); const next = { ...draft, overrides: { ...draft.overrides, [key]: { ...(draft.overrides[key] ?? {}) } } }; if (value === null) delete next.overrides[key][bucket]; else next.overrides[key][bucket] = value; setDraft(next); void save(next, 'override'); }}
          onLog={() => setLogOpen(current || 1)} milestoneActual={actualMilestoneTotal} />}

        {tab === 'edit' && <div className="space-y-3">
          <PlanEditor advanced={advanced} name={name} plan={draft} onName={value => { setName(value); setDirty(true); }} onChange={change} accounts={data.accounts.filter(account => !['card', 'credit'].includes(String(account.type).toLowerCase()))} portfolios={data.portfolios} incomeFlows={data.incomeFlows} problems={problems} />
          <div className="sticky bottom-24 z-10 flex justify-end gap-2 md:bottom-4"><button disabled={!dirty} onClick={() => { setDraft(record.plan); setName(record.name); setDirty(false); }} className={secondary}>Discard</button><button disabled={!dirty || !!busy} onClick={() => save()} className={primary}><Save size={15} /> Save plan</button></div>
        </div>}
      </motion.div>
    </AnimatePresence>

    {openMonth !== null && (() => { const row = rows[openMonth - 1]; return <Sheet advanced={advanced} title={`${row.label}${row.extraNames.length ? ' · ' + row.extraNames.join(', ') : ''}`} onClose={() => setOpenMonth(null)}>
      <div className="space-y-2">{draft.buckets.map(bucket => { const item = periodProgress(draft, rows, actuals.buckets.find(entry => entry.bucket === bucket.id)!, openMonth); return <div key={bucket.id} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${soft}`}><span className="flex items-center gap-2 text-sm font-bold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: bucket.color }} />{bucket.name}</span><span className="text-right text-xs"><span className="font-bold">{peso(item.thisPlan)}</span>{openMonth <= current && <span className="block text-slate-500">put in {peso(item.deposited)}{item.carryover ? ` · ${peso(item.carryover)} early` : ''}</span>}</span></div>; })}</div>
      <p className="mt-3 text-sm">Balance on plan: <strong>{peso(row.total)}</strong>{row.hits.length ? <> · reaches {row.hits.map(shortPeso).join(', ')}</> : null}</p>
      {openMonth <= current && <button onClick={() => { setLogOpen(openMonth); setOpenMonth(null); }} className={`${primary} mt-4 w-full`}><Plus size={16} /> Log a deposit for {row.label}</button>}
    </Sheet>; })()}

    {logOpen !== null && <LogDeposit advanced={advanced} plan={draft} period={logOpen} label={periods[logOpen - 1]?.label ?? ''} accounts={data.accounts} planId={record.id} planName={name} primary={primary} secondary={secondary}
      onClose={() => setLogOpen(null)} onLogged={async (entries) => { const next = { ...draft, depositLog: [...draft.depositLog, ...entries] }; setDraft(next); await save(next, 'log'); setLogOpen(null); celebrate({ kind: 'success', title: 'Deposit logged', message: peso(entries.reduce((sum, entry) => sum + entry.amount, 0)) }); }} />}
  </div>;
}

function Kpi({ advanced, label, value, sub, tone }: { advanced: boolean; label: string; value: ReactNode; sub?: string; tone?: 'violet' | 'emerald' | 'rose' }) {
  const color = tone === 'violet' ? 'text-violet-600 dark:text-violet-300' : tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-300' : tone === 'rose' ? 'text-rose-500' : '';
  return <div className={`min-w-0 rounded-2xl border p-3.5 shadow-sm sm:rounded-3xl sm:p-4 ${advanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
    <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-500 sm:text-xs">{label}</p>
    <p className={`mt-1.5 truncate text-lg font-black sm:text-2xl ${color}`}>{value}</p>
    {sub && <p className={`mt-0.5 truncate text-[11px] font-bold ${tone === 'rose' ? 'text-rose-500' : tone === 'emerald' ? 'text-emerald-600' : 'text-slate-500'}`}>{sub}</p>}
  </div>;
}

function Sheet({ advanced, title, onClose, children }: { advanced: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
    <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()} className={`max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl p-5 shadow-2xl sm:rounded-3xl ${advanced ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}>
      <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-lg font-black">{title}</h3><button aria-label="Close" onClick={onClose} className="rounded-lg p-2 text-slate-400"><X size={18} /></button></div>
      {children}
    </div>
  </div>;
}

function Tracker({ advanced, plan, rows, actuals, current, card, soft, primary, onOverride, onLog, milestoneActual }: {
  advanced: boolean; plan: WealthPlan; rows: Row[]; actuals: ReturnType<typeof planActuals>; current: number; data: ActualData; planId: number;
  card: string; soft: string; primary: string; secondary: string; onOverride: (bucket: string, value: number | null) => void; onLog: () => void; milestoneActual: number;
}) {
  const [period, setPeriod] = useState(Math.max(1, current));
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const row = rows[period - 1];
  const nowRow = rows[Math.max(1, current) - 1];
  const next = plan.milestones.find(milestone => milestone > milestoneActual);
  if (current < 1) return <div className={`${card} p-5 text-sm text-slate-500`}>This plan starts in {rows[0]?.label}. The tracker opens once it begins.</div>;
  return <div className="space-y-4">
    <div className={`${card} flex items-center gap-3 p-3`}>
      <button aria-label="Previous month" disabled={period <= 1} onClick={() => setPeriod(value => value - 1)} className="rounded-xl border px-3 py-2 disabled:opacity-40 dark:border-slate-600">◀</button>
      <div className="flex-1 text-center"><p className="text-lg font-black">{row.label}</p><p className="text-[11px] text-slate-500">{row.groupLabel} · month {period} of {rows.length}{row.extraNames.length ? ` · ★ ${row.extraNames.join(', ')}` : ''}</p></div>
      <button aria-label="Next month" disabled={period >= rows.length} onClick={() => setPeriod(value => value + 1)} className="rounded-xl border px-3 py-2 disabled:opacity-40 dark:border-slate-600">▶</button>
    </div>

    <div>
      <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">Actual balances now (tap to correct)</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {plan.buckets.map(bucket => { const actual = actuals.buckets.find(item => item.bucket === bucket.id)!; const planned = nowRow.balances[bucket.id] ?? 0; const diff = actual.balance - planned; return <div key={bucket.id} className={`${card} p-3`} style={{ borderTop: `3px solid ${bucket.color}` }}>
          <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">{bucket.name}</p>
          {editing === bucket.id
            ? <form onSubmit={event => { event.preventDefault(); onOverride(bucket.id, Number(value) || 0); setEditing(null); }} className="mt-1 flex gap-1"><input autoFocus type="number" inputMode="decimal" value={value} onChange={event => setValue(event.target.value)} className={`w-full min-w-0 rounded-lg border px-2 py-1 text-sm ${advanced ? 'border-slate-600 bg-slate-900' : 'border-slate-200'}`} /><button className="text-xs font-bold text-emerald-600">OK</button></form>
            : <button onClick={() => { setEditing(bucket.id); setValue(String(Math.round(actual.balance))); }} className="mt-1 block text-left text-lg font-black" style={{ color: bucket.color }}>{peso(actual.balance)}</button>}
          <p className="text-[10px] text-slate-500">{actual.source === 'linked' ? 'From linked accounts' : actual.source === 'override' ? <>Typed in · <button onClick={() => onOverride(bucket.id, null)} className="underline">use linked</button></> : 'From logged deposits'}</p>
          <div className="mt-2 space-y-0.5 border-t border-slate-100 pt-2 text-[11px] dark:border-slate-700"><p className="flex justify-between"><span className="text-slate-500">Plan</span><span className="font-bold">{peso(planned)}</span></p><p className="flex justify-between"><span className="text-slate-500">Diff</span><span className={`font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{diff >= 0 ? '+' : '−'}{peso(Math.abs(diff))}</span></p></div>
        </div>; })}
      </div>
    </div>

    {next && <div className={`${card} p-4`}>
      <div className="flex items-center justify-between text-sm"><span className="font-bold">Next milestone: {shortPeso(next)}</span><span className="font-black text-amber-600">{peso(milestoneActual)} / {peso(next)}</span></div>
      <div className={`mt-2 h-2.5 overflow-hidden rounded-full ${advanced ? 'bg-slate-700' : 'bg-slate-100'}`}><motion.div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-400" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (milestoneActual / next) * 100)}%` }} transition={{ duration: 1 }} /></div>
      <p className="mt-1 text-right text-[11px] text-slate-500">{peso(next - milestoneActual)} to go</p>
    </div>}

    <div>
      <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">{row.label}: plan vs actual</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {plan.buckets.map(bucket => { const item = periodProgress(plan, rows, actuals.buckets.find(entry => entry.bucket === bucket.id)!, period); const future = period > current; return <div key={bucket.id} className={`${card} p-3`}>
          <div className="flex items-center justify-between"><p className="text-sm font-black" style={{ color: bucket.color }}>{bucket.name}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${future ? 'bg-slate-100 text-slate-500 dark:bg-slate-700' : item.status === 'cleared' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : item.status === 'partial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' : item.status === 'none' ? 'bg-slate-100 text-slate-500 dark:bg-slate-700' : 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300'}`}>{future ? 'Upcoming' : item.status === 'cleared' ? 'Done' : item.status === 'partial' ? 'Partly' : item.status === 'none' ? 'Nothing due' : 'Not yet'}</span></div>
          <div className={`mt-2 space-y-1 rounded-xl p-2 text-xs ${soft}`}>
            <p className="flex justify-between"><span className="text-slate-500">This month's plan</span><span className="font-bold">{peso(item.thisPlan)}</span></p>
            <p className="flex justify-between"><span className="text-slate-500">Put in early</span><span className="font-bold text-emerald-600">+{peso(item.carryover)}</span></p>
            <p className="flex justify-between"><span className="text-slate-500">Still to put in</span><span className="font-bold">{peso(Math.max(0, item.adjusted - item.deposited))}</span></p>
            <p className="flex justify-between"><span className="text-slate-500">Put in this month</span><span className="font-bold">{peso(item.deposited)}</span></p>
          </div>
        </div>; })}
      </div>
    </div>
    <button onClick={onLog} className={`${primary} w-full`}><Wallet size={16} /> Log a deposit</button>
  </div>;
}

function LogDeposit({ advanced, plan, period, label, accounts, planId, planName, primary, secondary, onClose, onLogged }: {
  advanced: boolean; plan: WealthPlan; period: number; label: string; accounts: any[]; planId: number; planName: string; primary: string; secondary: string;
  onClose: () => void; onLogged: (entries: WealthPlan['depositLog']) => Promise<void>;
}) {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [from, setFrom] = useState('');
  const [date, setDate] = useState(localDate());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = `w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm outline-none ${advanced ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`;
  const submit = async () => {
    setBusy(true); setError('');
    try {
      const entries: WealthPlan['depositLog'] = [];
      for (const bucket of plan.buckets) {
        const amount = Number(amounts[bucket.id]) || 0;
        if (amount <= 0) continue;
        const link = bucket.links.find(item => item.type === 'account');
        if (link) {
          const notes = `${planName} · ${bucket.name}${note ? ` · ${note}` : ''}`;
          if (from && Number(from) !== link.id) await send('/api/transfers', 'POST', { from_account_id: Number(from), to_account_id: link.id, amount, date, notes, source: 'wealth_plan', source_id: planId });
          else if (!from) await send('/api/transactions', 'POST', { account_id: link.id, type: 'income', amount, category: 'Savings', description: `Deposit · ${bucket.name}`, notes, date, source: 'wealth_plan', source_id: planId });
        }
        entries.push({ id: `d-${Date.now().toString(36)}-${bucket.id}`, period, bucket: bucket.id, amount, date, note: note || undefined });
      }
      if (!entries.length) throw new Error('Enter at least one amount.');
      await onLogged(entries);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not log it.'); setBusy(false); }
  };
  return <Sheet advanced={advanced} title={`Log a deposit · ${label}`} onClose={onClose}>
    <p className="text-xs text-slate-500">For linked accounts this records the money in FinGent too. Others go in this plan's history.</p>
    <div className="mt-3 space-y-2">{plan.buckets.map(bucket => <label key={bucket.id} className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-center gap-2 text-sm font-bold"><span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: bucket.color }} /><span className="truncate">{bucket.name}</span></span><input type="number" inputMode="decimal" value={amounts[bucket.id] ?? ''} onChange={event => setAmounts(value => ({ ...value, [bucket.id]: event.target.value }))} className={input} placeholder="0" /></label>)}</div>
    <label className="mt-3 block text-xs font-bold text-slate-500">Taken from<select value={from} onChange={event => setFrom(event.target.value)} className={`${input} mt-1`}><option value="">New money (not from another account)</option>{accounts.filter(account => !['card', 'credit'].includes(String(account.type).toLowerCase())).map(account => <option key={account.id} value={account.id}>{account.name} · {peso(account.balance)}</option>)}</select></label>
    <div className="mt-3 grid grid-cols-[1fr_1fr] gap-2"><label className="text-xs font-bold text-slate-500">Date<input type="date" value={date} onChange={event => setDate(event.target.value)} className={`${input} mt-1`} /></label><label className="text-xs font-bold text-slate-500">Note<input value={note} onChange={event => setNote(event.target.value)} className={`${input} mt-1`} placeholder="Optional" /></label></div>
    {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
    <div className="mt-4 flex justify-end gap-2"><button onClick={onClose} className={secondary}>Cancel</button><button disabled={busy} onClick={submit} className={primary}><Sparkles size={15} /> Log it</button></div>
  </Sheet>;
}
