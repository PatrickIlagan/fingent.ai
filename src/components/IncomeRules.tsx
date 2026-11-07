import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, CircleMinus, CirclePlus, HandHeart, Hash, History, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { DATA_CHANGED } from '../lib/changeWatcher';
import { localDate } from '../lib/sharedRules';
import { RULE_ACTIONS, RULE_PRESETS, type IncomeRule, type RuleAction, type RuleEntry, type RuleTarget } from '../lib/incomeRules';
import { Segmented } from './Segmented';
import { celebrate } from './Celebrations';

export type RuleWithTotals = IncomeRule & { counted: number; given: number; owed: number; this_month: number; entries: number };
const peso = (value: number) => '₱' + (Math.round(value * 100) / 100).toLocaleString('en-PH', { maximumFractionDigits: 2 });
const ACTION_ICONS: Record<RuleAction, typeof Hash> = { counter: Hash, deduct: CircleMinus, transfer: ArrowRightLeft, add: CirclePlus };
const isCard = (account: any) => ['card', 'credit'].includes(String(account?.type).toLowerCase());

async function send(path: string, method: string, body?: unknown) {
  const response = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Something went wrong.');
  return result;
}

/** Rules with their totals, plus accounts and income categories, kept fresh as data changes. */
function useRulesData() {
  const [rules, setRules] = useState<RuleWithTotals[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    const get = (path: string) => fetch(path).then(response => response.ok ? response.json() : null).catch(() => null);
    const [ruleData, accountData, categoryData] = await Promise.all([get('/api/income-rules'), get('/api/accounts'), get('/api/categories')]);
    setRules(Array.isArray(ruleData?.rules) ? ruleData.rules : []);
    setAccounts(Array.isArray(accountData) ? accountData : []);
    setCategories((Array.isArray(categoryData) ? categoryData : []).filter((item: any) => item.type === 'income').map((item: any) => String(item.name)));
    setLoaded(true);
  }, []);
  useEffect(() => {
    void load();
    let timer = 0;
    const soon = () => { window.clearTimeout(timer); timer = window.setTimeout(() => void load(), 500); };
    window.addEventListener(DATA_CHANGED, soon);
    return () => { window.clearTimeout(timer); window.removeEventListener(DATA_CHANGED, soon); };
  }, [load]);
  return { rules, accounts, categories, loaded, reload: load };
}

function useLook() {
  const advanced = useStore(state => state.themeMode) === 'advanced';
  return {
    advanced,
    card: `rounded-3xl border shadow-sm ${advanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`,
    input: `w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm outline-none ${advanced ? 'bg-slate-900 border-slate-700 focus:border-violet-500' : 'bg-slate-50 border-slate-200 focus:border-emerald-500'}`,
    label: 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500',
    primary: `inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${advanced ? 'bg-violet-600 hover:bg-violet-700' : 'bg-emerald-500 hover:bg-emerald-600'}`,
    secondary: `inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold ${advanced ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`,
    chip: (active: boolean) => `rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${active ? (advanced ? 'bg-violet-600 text-white' : 'bg-slate-900 text-white') : (advanced ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')}`,
  };
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { advanced } = useLook();
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
    <motion.div role="dialog" aria-modal="true" aria-label={title} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onMouseDown={event => event.stopPropagation()} className={`max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl ${advanced ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}>
      <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-lg font-black">{title}</h3><button aria-label="Close" onClick={onClose} className="rounded-lg p-2 text-slate-400"><X size={18} /></button></div>
      {children}
    </motion.div>
  </div>;
}

/** What a rule takes, in words: "10% of all income" or "₱500 from Salary". */
export function ruleSummary(rule: IncomeRule, accounts: any[]) {
  const take = rule.mode === 'percent' ? `${Number(rule.percent.toFixed(2))}%` : peso(rule.amount);
  const from = [rule.categories.length ? rule.categories.join(', ') : '', rule.accounts.length ? `into ${rule.accounts.map(id => accounts.find(account => Number(account.id) === id)?.name ?? 'an account').join(', ')}` : ''].filter(Boolean).join(' ');
  return `${take} of ${from || 'every income'}${rule.include_interest ? ' (interest too)' : ''}`;
}
const targetSummary = (rule: IncomeRule, accounts: any[]) => {
  const total = rule.targets.reduce((sum, target) => sum + target.share, 0) || 1;
  return rule.targets.map(target => `${accounts.find(account => Number(account.id) === target.account_id)?.name ?? 'Missing account'}${rule.targets.length > 1 ? ` ${Math.round(target.share / total * 100)}%` : ''}`).join(' · ');
};

/** Plans → Rules: every income rule, with Give, history and presets. */
export function IncomeRulesPage() {
  const look = useLook();
  const { rules, accounts, categories, loaded, reload } = useRulesData();
  const [editing, setEditing] = useState<Partial<IncomeRule> & { count_since?: string } | null>(null);
  const [giving, setGiving] = useState<RuleWithTotals | null>(null);
  const [history, setHistory] = useState<RuleWithTotals | null>(null);
  const usedPresets = new Set(rules.map(rule => rule.name.toLowerCase()));
  const presets = RULE_PRESETS.filter(preset => !usedPresets.has(preset.name.toLowerCase()));
  const fromPreset = (preset: (typeof RULE_PRESETS)[number]) => {
    const savings = accounts.find(account => !isCard(account) && /sav|ipon|goal|time/i.test(String(account.name)));
    setEditing({ name: preset.name, mode: 'percent', percent: preset.percent, action: preset.action, category: preset.category, targets: preset.action === 'transfer' && savings ? [{ account_id: Number(savings.id), share: 100 }] : [], start_date: localDate() });
  };
  const toggle = async (rule: RuleWithTotals) => { await send(`/api/income-rules/${rule.id}`, 'PUT', { active: !rule.active }); await reload(); };
  const removeRule = async (rule: RuleWithTotals) => {
    if (!window.confirm(`Delete "${rule.name}"? Spending and moves it already made stay in your accounts; its history is removed.`)) return;
    await send(`/api/income-rules/${rule.id}`, 'DELETE'); await reload();
  };

  return <div className="space-y-5 pb-10">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 className="text-2xl font-bold">Income rules</h2><p className="mt-1 text-slate-500 dark:text-slate-400">Take a share of every income you log, for tithes, paying yourself first, taxes or giving. Keep a running count to give later, or let FinGent move the money for you.</p></div>
      <button onClick={() => setEditing({ mode: 'percent', percent: 10, action: 'counter', start_date: localDate(), targets: [] })} className={look.primary}><Plus size={16} /> New rule</button>
    </div>

    {loaded && rules.length > 0 && <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{rules.map(rule => { const Icon = ACTION_ICONS[rule.action]; return <motion.div key={rule.id} layout className={`${look.card} p-4 ${rule.active ? '' : 'opacity-60'}`}>
      <div className="flex items-start gap-3">
        <span className={`rounded-2xl p-2.5 ${look.advanced ? 'bg-slate-900 text-violet-300' : 'bg-emerald-50 text-emerald-600'}`}><Icon size={18} /></span>
        <div className="min-w-0 flex-1"><p className="truncate font-black">{rule.name}</p><p className="text-xs text-slate-500">{ruleSummary(rule, accounts)} · {RULE_ACTIONS[rule.action].short}</p>{rule.targets.length > 0 && rule.action !== 'counter' && <p className="truncate text-xs text-slate-500">{rule.action === 'deduct' ? 'From' : 'To'} {targetSummary(rule, accounts)}</p>}</div>
        <button role="switch" aria-checked={rule.active} aria-label={rule.active ? `Pause ${rule.name}` : `Turn on ${rule.name}`} onClick={() => toggle(rule)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${rule.active ? (look.advanced ? 'bg-violet-600' : 'bg-emerald-500') : 'bg-slate-300 dark:bg-slate-600'}`}><motion.span layout className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow" style={{ left: rule.active ? 22 : 2 }} /></button>
      </div>
      {rule.action === 'counter'
        ? <div className={`mt-3 flex items-end justify-between gap-3 rounded-2xl p-3 ${look.advanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
          <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">To give</p><p className="text-2xl font-black">{peso(rule.owed)}</p><p className="text-[11px] text-slate-500">Counted {peso(rule.counted)} · given {peso(rule.given)}</p></div>
          <button disabled={rule.owed <= 0 && rule.counted <= 0} onClick={() => setGiving(rule)} className={look.primary}><HandHeart size={15} /> Give</button>
        </div>
        : <div className={`mt-3 grid grid-cols-[1fr_1fr] gap-2 rounded-2xl p-3 ${look.advanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
          <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">This month</p><p className="text-lg font-black">{peso(rule.this_month)}</p></div>
          <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">All time</p><p className="text-lg font-black">{peso(rule.counted)}</p></div>
        </div>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => setHistory(rule)} className={look.secondary}><History size={14} /> History · {rule.entries}</button>
        <button onClick={() => setEditing(rule)} className={look.secondary}><Pencil size={14} /> Edit</button>
        <button onClick={() => removeRule(rule)} aria-label={`Delete ${rule.name}`} className={`${look.secondary} text-rose-500`}><Trash2 size={14} /></button>
      </div>
    </motion.div>; })}</div>}

    {loaded && presets.length > 0 && <div className={`${look.card} p-4`}>
      <h3 className="font-black">{rules.length ? 'Add another' : 'Start with a common rule'}</h3>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{presets.map(preset => { const Icon = ACTION_ICONS[preset.action]; return <button key={preset.key} onClick={() => fromPreset(preset)} className={`flex items-start gap-3 rounded-2xl border p-3 text-left ${look.advanced ? 'border-slate-700 bg-slate-900/40 hover:border-slate-500' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}>
        <Icon size={18} className="mt-0.5 shrink-0 text-emerald-500" /><span><span className="block text-sm font-black">{preset.name} {preset.percent}% · {RULE_ACTIONS[preset.action].short}</span><span className="block text-xs text-slate-500">{preset.blurb}</span></span>
      </button>; })}</div>
    </div>}

    {editing && <RuleEditor initial={editing} accounts={accounts} categories={categories} onClose={() => setEditing(null)} onSaved={async (message) => { setEditing(null); await reload(); celebrate({ kind: 'success', title: 'Rule saved', message }); }} />}
    {giving && <GiveDialog rules={[giving]} accounts={accounts} onClose={() => setGiving(null)} onDone={async () => { setGiving(null); await reload(); }} />}
    {history && <RuleHistory rule={history} onClose={() => setHistory(null)} onChanged={reload} />}
  </div>;
}

function RuleEditor({ initial, accounts, categories, onClose, onSaved }: { initial: Partial<IncomeRule> & { count_since?: string }; accounts: any[]; categories: string[]; onClose: () => void; onSaved: (message: string) => Promise<void> }) {
  const look = useLook();
  const [rule, setRule] = useState({ name: '', mode: 'percent' as const, percent: 10, amount: 500, categories: [] as string[], accounts: [] as number[], include_interest: false, action: 'counter' as RuleAction, targets: [] as RuleTarget[], category: '', start_date: localDate(), active: true, ...initial });
  const [countSince, setCountSince] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (patch: Partial<typeof rule>) => setRule(value => ({ ...value, ...patch }));
  const usable = accounts.filter(account => !isCard(account));
  const incomeCategories = [...new Set([...categories, ...rule.categories])];
  const example = 10000;
  const take = rule.mode === 'percent' ? example * rule.percent / 100 : Math.min(rule.amount, example);
  const save = async () => {
    setBusy(true); setError('');
    try {
      const body = { ...rule, count_since: !initial.id && rule.action === 'counter' && countSince ? countSince : undefined };
      const result = initial.id ? await send(`/api/income-rules/${initial.id}`, 'PUT', body) : await send('/api/income-rules', 'POST', body);
      await onSaved(result.backfilled ? `${rule.name} · counted ${result.backfilled} past income${result.backfilled === 1 ? '' : 's'}` : rule.name);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save the rule.'); setBusy(false); }
  };
  return <Sheet title={initial.id ? 'Edit rule' : 'New income rule'} onClose={onClose}>
    <div className="space-y-4">
      <label className="block"><span className={look.label}>Name</span><input value={rule.name} onChange={event => set({ name: event.target.value })} className={look.input} placeholder="e.g. Tithe" /></label>
      <div><span className={look.label}>How much of each income</span>
        <Segmented label="Amount type" size="sm" value={rule.mode} onChange={mode => set({ mode })} options={[{ value: 'percent', label: 'Percent' }, { value: 'amount', label: 'Fixed amount' }]} />
        {rule.mode === 'percent'
          ? <div className="mt-2 flex items-center gap-2"><input type="number" step="0.5" min="0" max="100" inputMode="decimal" value={rule.percent} onChange={event => set({ percent: Number(event.target.value) || 0 })} className={look.input} aria-label="Percent" /><span className="font-black">%</span></div>
          : <input type="number" inputMode="decimal" value={rule.amount} onChange={event => set({ amount: Number(event.target.value) || 0 })} className={`${look.input} mt-2`} aria-label="Amount per income" placeholder="₱ per income" />}
      </div>
      <div><span className={look.label}>Which income</span>
        <div className="flex flex-wrap gap-1.5"><button type="button" onClick={() => set({ categories: [], accounts: [] })} className={look.chip(!rule.categories.length && !rule.accounts.length)}>All income</button>
          {incomeCategories.map(name => { const on = rule.categories.includes(name); return <button type="button" key={`c${name}`} onClick={() => set({ categories: on ? rule.categories.filter(item => item !== name) : [...rule.categories, name] })} className={look.chip(on)}>{name}</button>; })}
          {usable.map(account => { const on = rule.accounts.includes(Number(account.id)); return <button type="button" key={`a${account.id}`} onClick={() => set({ accounts: on ? rule.accounts.filter(id => id !== Number(account.id)) : [...rule.accounts, Number(account.id)] })} className={look.chip(on)}>Into {account.name}</button>; })}
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-500"><input type="checkbox" checked={rule.include_interest} onChange={event => set({ include_interest: event.target.checked })} /> Include interest earned</label>
        <p className="mt-1 text-[11px] text-slate-500">Transfers between your accounts, goal savings, investment sales and balance fixes never count.</p>
      </div>
      <div><span className={look.label}>Then</span>
        <Segmented label="What the rule does" size="sm" value={rule.action} onChange={action => set({ action, targets: action === 'counter' ? [] : rule.targets })} options={(Object.keys(RULE_ACTIONS) as RuleAction[]).map(action => ({ value: action, label: RULE_ACTIONS[action].short }))} />
        <p className="mt-1.5 text-xs text-slate-500">{RULE_ACTIONS[rule.action].label}. {RULE_ACTIONS[rule.action].help}</p>
      </div>
      {rule.action !== 'counter' && <div><span className={look.label}>{rule.action === 'deduct' ? 'Take it from (optional)' : 'Send it to'}</span>
        <div className="space-y-2">{rule.targets.map((target, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_5.5rem_auto] items-center gap-2">
          <select value={target.account_id} onChange={event => set({ targets: rule.targets.map((item, at) => at === index ? { ...item, account_id: Number(event.target.value) } : item) })} className={look.input} aria-label="Account">{usable.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
          <label className="flex items-center gap-1"><input type="number" min="0" value={target.share} onChange={event => set({ targets: rule.targets.map((item, at) => at === index ? { ...item, share: Number(event.target.value) || 0 } : item) })} className={look.input} aria-label="Share" /><span className="text-xs font-bold text-slate-500">%</span></label>
          <button type="button" aria-label="Remove account" onClick={() => set({ targets: rule.targets.filter((_, at) => at !== index) })} className="rounded-lg p-2 text-slate-400 hover:text-rose-500"><Trash2 size={15} /></button>
        </div>)}</div>
        <button type="button" disabled={!usable.length} onClick={() => { const unused = usable.find(account => !rule.targets.some(target => target.account_id === Number(account.id))) ?? usable[0]; set({ targets: [...rule.targets, { account_id: Number(unused.id), share: rule.targets.length ? 50 : 100 }] }); }} className={`mt-2 text-xs font-bold ${look.advanced ? 'text-violet-300' : 'text-emerald-700'}`}>+ {rule.targets.length ? 'Split with another account' : 'Choose an account'}</button>
        {rule.action === 'deduct' && !rule.targets.length && <p className="text-[11px] text-slate-500">Leave empty to take it from the account each income lands in.</p>}
        {rule.targets.length > 1 && <p className="text-[11px] text-slate-500">Shares are split in proportion, so 1 and 1 means half each.</p>}
      </div>}
      <div className="grid grid-cols-[1fr_1fr] gap-3">
        {rule.action !== 'transfer' && <label><span className={look.label}>{rule.action === 'add' ? 'Category' : 'Record as'}</span><input value={rule.category} onChange={event => set({ category: event.target.value })} className={look.input} placeholder={rule.action === 'add' ? 'Savings' : rule.name || 'Tithes'} /></label>}
        <label><span className={look.label}>Counts income from</span><input type="date" value={rule.start_date} onChange={event => set({ start_date: event.target.value })} className={look.input} /></label>
        {!initial.id && rule.action === 'counter' && <label className="col-span-2"><span className={look.label}>Also count income already logged since</span><input type="date" value={countSince} max={localDate()} onChange={event => setCountSince(event.target.value)} className={look.input} /><span className="mt-1 block text-[11px] text-slate-500">Optional. Adds what you'd owe from income you logged before today.</span></label>}
      </div>
      <div className={`rounded-2xl p-3 text-sm ${look.advanced ? 'bg-violet-500/10' : 'bg-emerald-50'}`}>A {peso(example)} income → <strong>{peso(take)}</strong> {rule.action === 'counter' ? 'added to what you give' : rule.action === 'deduct' ? 'recorded as spending' : rule.action === 'transfer' ? 'moved' : 'added'}{rule.action !== 'counter' && rule.targets.length ? ` (${targetSummary(rule as IncomeRule, accounts)})` : ''}.</div>
      {error && <p className="text-sm text-rose-500">{error}</p>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className={look.secondary}>Cancel</button><button disabled={busy} onClick={save} className={look.primary}>Save rule</button></div>
    </div>
  </Sheet>;
}

/** Hand over what a counter has added up: from one or more accounts, or just mark it given. */
export function GiveDialog({ rules, accounts, onClose, onDone }: { rules: RuleWithTotals[]; accounts: any[]; onClose: () => void; onDone: () => Promise<void> | void }) {
  const look = useLook();
  const usable = accounts;
  const [ruleId, setRuleId] = useState(rules[0]?.id ?? 0);
  const rule = rules.find(item => item.id === ruleId) ?? rules[0];
  const [record, setRecord] = useState(true);
  const [sources, setSources] = useState<{ account_id: number; amount: string }[]>(() => usable[0] ? [{ account_id: Number(usable[0].id), amount: String(rules[0]?.owed || '') }] : []);
  const [amount, setAmount] = useState(String(rules[0]?.owed || ''));
  const [category, setCategory] = useState(rules[0]?.category || rules[0]?.name || '');
  const [date, setDate] = useState(localDate());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const total = record ? sources.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) : Number(amount) || 0;
  const pick = (id: number) => { const next = rules.find(item => item.id === id); setRuleId(id); if (next) { setCategory(next.category || next.name); setAmount(String(next.owed || '')); setSources(value => value.length ? [{ ...value[0], amount: String(next.owed || '') }] : value); } };
  const submit = async () => {
    setBusy(true); setError('');
    try {
      await send(`/api/income-rules/${rule.id}/give`, 'POST', { sources: record ? sources.map(item => ({ account_id: item.account_id, amount: Number(item.amount) || 0 })) : [], amount: record ? undefined : Number(amount), category, date, note });
      celebrate({ kind: 'goal', title: `Gave ${peso(total)}`, message: rule.name });
      await onDone();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not record it.'); setBusy(false); }
  };
  if (!rule) return null;
  return <Sheet title={`Give · ${rule.name}`} onClose={onClose}>
    <div className="space-y-4">
      {rules.length > 1 && <div className="flex flex-wrap gap-1.5">{rules.map(item => <button key={item.id} onClick={() => pick(item.id)} className={look.chip(item.id === rule.id)}>{item.name} · {peso(item.owed)}</button>)}</div>}
      <p className="text-sm">You have <strong>{peso(rule.owed)}</strong> to give. You can give part of it, or more.</p>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={record} onChange={event => setRecord(event.target.checked)} /> Record it as spending from my accounts</label>
      {record
        ? <div className="space-y-2">{sources.map((source, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_7rem_auto] items-center gap-2">
          <select value={source.account_id} onChange={event => setSources(value => value.map((item, at) => at === index ? { ...item, account_id: Number(event.target.value) } : item))} className={look.input} aria-label="From account">{usable.map(account => <option key={account.id} value={account.id}>{account.name} · {peso(Number(account.balance) || 0)}</option>)}</select>
          <input type="number" inputMode="decimal" value={source.amount} onChange={event => setSources(value => value.map((item, at) => at === index ? { ...item, amount: event.target.value } : item))} className={look.input} aria-label="Amount" placeholder="₱" />
          <button type="button" aria-label="Remove" disabled={sources.length === 1} onClick={() => setSources(value => value.filter((_, at) => at !== index))} className="rounded-lg p-2 text-slate-400 hover:text-rose-500 disabled:opacity-30"><Trash2 size={15} /></button>
        </div>)}
          <button type="button" onClick={() => { const unused = usable.find(account => !sources.some(item => item.account_id === Number(account.id))) ?? usable[0]; if (unused) setSources(value => [...value, { account_id: Number(unused.id), amount: '' }]); }} className={`text-xs font-bold ${look.advanced ? 'text-violet-300' : 'text-emerald-700'}`}>+ From another account too</button>
        </div>
        : <label className="block"><span className={look.label}>Amount given</span><input type="number" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} className={look.input} /><span className="mt-1 block text-[11px] text-slate-500">Use this when you already logged the spending, or paid in cash you don't track.</span></label>}
      <div className="grid grid-cols-[1fr_1fr] gap-3">
        {record && <label><span className={look.label}>Category</span><input value={category} onChange={event => setCategory(event.target.value)} className={look.input} /></label>}
        <label><span className={look.label}>Date</span><input type="date" value={date} onChange={event => setDate(event.target.value)} className={look.input} /></label>
        <label className="col-span-2"><span className={look.label}>Note</span><input value={note} onChange={event => setNote(event.target.value)} className={look.input} placeholder="Optional, e.g. Sunday service" /></label>
      </div>
      {error && <p className="text-sm text-rose-500">{error}</p>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className={look.secondary}>Cancel</button><button disabled={busy || total <= 0} onClick={submit} className={look.primary}><HandHeart size={15} /> Give {peso(total)}</button></div>
    </div>
  </Sheet>;
}

function RuleHistory({ rule, onClose, onChanged }: { rule: RuleWithTotals; onClose: () => void; onChanged: () => Promise<void> }) {
  const look = useLook();
  const [entries, setEntries] = useState<(RuleEntry & { rule_name?: string })[] | null>(null);
  const load = useCallback(async () => { const result = await fetch(`/api/income-rules/entries?rule_id=${rule.id}`).then(response => response.json()).catch(() => []); setEntries(Array.isArray(result) ? result : []); }, [rule.id]);
  useEffect(() => { void load(); }, [load]);
  const drop = async (entry: RuleEntry) => {
    if (!window.confirm(entry.kind === 'give' ? `Remove this ${peso(entry.amount)} give? Any spending it recorded is removed too.` : `Stop counting this ${peso(entry.amount)}? Any spending or moves it made are undone.`)) return;
    await send(`/api/income-rules/entries/${entry.id}`, 'DELETE'); await load(); await onChanged();
  };
  return <Sheet title={`${rule.name} history`} onClose={onClose}>
    {entries === null ? <div className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" /> : entries.length === 0 ? <p className="text-sm text-slate-500">Nothing yet. It starts counting with your next income.</p>
      : <div className="divide-y divide-slate-100 dark:divide-slate-700">{entries.map(entry => <div key={entry.id} className="flex items-center gap-3 py-2.5">
        <span className={`rounded-xl p-2 ${entry.kind === 'give' ? 'bg-rose-50 text-rose-500 dark:bg-rose-500/10' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'}`}>{entry.kind === 'give' ? <HandHeart size={15} /> : <Plus size={15} />}</span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{entry.kind === 'give' ? `Gave ${peso(entry.amount)}` : `${peso(entry.amount)} from ${entry.note || 'income'}`}</p><p className="text-[11px] text-slate-500">{entry.date}{entry.kind === 'give' && entry.note ? ` · ${entry.note}` : ''}{entry.tx_ids.length ? ` · ${entry.tx_ids.length} transaction${entry.tx_ids.length === 1 ? '' : 's'}` : ''}</p></div>
        <button aria-label="Remove entry" onClick={() => drop(entry)} className="rounded-lg p-2 text-slate-400 hover:text-rose-500"><Trash2 size={15} /></button>
      </div>)}</div>}
    <div className="mt-4 flex justify-end"><button onClick={onClose} className={look.secondary}>Done</button></div>
  </Sheet>;
}

/** Home card: what counters say you have to give, with a Give button. */
export function ToGiveCard({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const look = useLook();
  const { rules, accounts, reload } = useRulesData();
  const [giving, setGiving] = useState(false);
  const owing = rules.filter(rule => rule.action === 'counter' && rule.owed > 0);
  if (!owing.length) return null;
  const total = owing.reduce((sum, rule) => sum + rule.owed, 0);
  return <div className={`${look.card} p-5`}>
    <div className="flex items-center justify-between gap-3">
      <button onClick={() => onNavigate?.('plans-rules')} className="min-w-0 text-left">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><HandHeart size={14} /> To give</p>
        <p className="mt-1 text-2xl font-black">{peso(total)}</p>
        <p className="truncate text-xs text-slate-500">{owing.map(rule => `${rule.name} ${peso(rule.owed)}`).join(' · ')}</p>
      </button>
      <button onClick={() => setGiving(true)} className={look.primary}><HandHeart size={15} /> Give</button>
    </div>
    {giving && <GiveDialog rules={owing} accounts={accounts} onClose={() => setGiving(false)} onDone={async () => { setGiving(false); await reload(); }} />}
  </div>;
}

/** Shows a short note whenever an income you log sets off a rule, from anywhere in the app. */
export function IncomeRulesWatcher() {
  const seen = useRef<number | null>(null);
  useEffect(() => {
    let active = true;
    let timer = 0;
    const baseline = async () => { const result = await fetch('/api/income-rules').then(response => response.ok ? response.json() : null).catch(() => null); if (active && result) seen.current = Number(result.latest_entry_id) || 0; };
    const check = async () => {
      if (seen.current === null) { await baseline(); return; }
      const entries = await fetch(`/api/income-rules/entries?after=${seen.current}`).then(response => response.ok ? response.json() : []).catch(() => []);
      if (!active || !Array.isArray(entries) || !entries.length) return;
      seen.current = Math.max(seen.current, ...entries.map((entry: any) => Number(entry.id) || 0));
      const byRule = new Map<string, { amount: number; action: string }>();
      for (const entry of entries) if (entry.kind === 'accrual' && entry.rule_name) { const item = byRule.get(entry.rule_name) ?? { amount: 0, action: entry.rule_action }; item.amount += Number(entry.amount) || 0; byRule.set(entry.rule_name, item); }
      for (const [name, item] of byRule) celebrate({ kind: 'success', title: item.action === 'counter' ? `${peso(item.amount)} added to ${name}` : item.action === 'transfer' ? `${peso(item.amount)} moved · ${name}` : item.action === 'deduct' ? `${peso(item.amount)} recorded · ${name}` : `${peso(item.amount)} added · ${name}`, message: item.action === 'counter' ? 'Counted for when you give.' : undefined });
    };
    void baseline();
    const soon = (event: Event) => { const path = String((event as CustomEvent).detail?.path ?? ''); if (path.startsWith('/api/income-rules')) { void baseline(); return; } window.clearTimeout(timer); timer = window.setTimeout(() => void check(), 700); };
    window.addEventListener(DATA_CHANGED, soon);
    return () => { active = false; window.clearTimeout(timer); window.removeEventListener(DATA_CHANGED, soon); };
  }, []);
  return null;
}

