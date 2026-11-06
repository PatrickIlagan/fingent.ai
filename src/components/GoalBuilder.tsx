import { useState } from 'react';
import { Car, Check, ChevronRight, Home, Laptop, Plane, ShieldAlert, Target } from 'lucide-react';
import { daysBetween, isCardAccount, localDate } from '../lib/sharedRules';
import { Dialog, dialogField, dialogPrimary, dialogSecondary } from './RecordDialogs';
import { celebrate } from './Celebrations';

export const GOAL_ICONS = { Target, Plane, Laptop, ShieldAlert, Car, Home } as const;
const COLORS = ['emerald', 'blue', 'violet', 'amber', 'rose', 'fuchsia'] as const;
const SWATCH: Record<string, string> = { emerald: 'bg-emerald-500', blue: 'bg-blue-500', violet: 'bg-violet-500', amber: 'bg-amber-500', rose: 'bg-rose-500', fuchsia: 'bg-fuchsia-500' };

export function GoalIcon({ name, className = 'w-5 h-5' }: { name?: string; className?: string }) {
  const Icon = GOAL_ICONS[name as keyof typeof GOAL_ICONS] ?? Target;
  return <Icon className={className} />;
}

export const peso = (value: number) => '₱' + Math.round(Number(value) || 0).toLocaleString('en-PH');

/** Short pace text from `goalProgress` (src/lib/sharedRules.ts). */
export function paceLabel(progress: { status: string; remaining: number; behindBy: number }) {
  switch (progress.status) {
    case 'complete': return 'Goal reached';
    case 'overdue': return `Past target date · ${peso(progress.remaining)} to go`;
    case 'ahead': return 'Ahead of pace';
    case 'on-track': return 'On track';
    default: return `Behind by ${peso(progress.behindBy)}`;
  }
}

export const paceTone = (status: string) => status === 'behind' || status === 'overdue'
  ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';

const pad = (value: number) => String(value).padStart(2, '0');
const monthsFromNow = (months: number) => { const date = new Date(); date.setMonth(date.getMonth() + months); return localDate(date); };
const nextChristmas = () => { const today = localDate(); const year = Number(today.slice(0, 4)); return today > `${year}-12-25` ? `${year + 1}-12-25` : `${year}-12-25`; };

/** The next date on or after today that falls on `day` (clamped to short months). */
export function nextDateForDay(day: number, today = localDate()) {
  const [year, month] = today.split('-').map(Number);
  const onDay = (y: number, m: number) => `${y}-${pad(m)}-${pad(Math.min(day, new Date(y, m, 0).getDate()))}`;
  const thisMonth = onDay(year, month);
  return thisMonth >= today ? thisMonth : month === 12 ? onDay(year + 1, 1) : onDay(year, month + 1);
}

const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

type Link = { mode: 'off' | 'part' | 'whole'; amount: string };

/**
 * Create or edit a goal: target, date, the accounts holding its savings, and an
 * optional monthly auto-save. Opened from Plans and from a tapped calendar day.
 */
export function GoalBuilder({ advanced, accounts, goal, defaultDate, onSaved, onClose }: {
  advanced: boolean; accounts: any[]; goal?: any; defaultDate?: string; onSaved: (id: number) => void; onClose: () => void;
}) {
  const editing = Boolean(goal);
  const holdable = accounts.filter(account => !isCardAccount(account));
  const [name, setName] = useState(goal?.name || '');
  const [target, setTarget] = useState(goal?.target ? String(goal.target) : '');
  const [date, setDate] = useState(String(goal?.date || defaultDate || '').slice(0, 10));
  const [icon, setIcon] = useState(goal?.icon || 'Target');
  const [color, setColor] = useState(goal?.color || 'emerald');
  const [links, setLinks] = useState<Record<number, Link>>(() => Object.fromEntries((goal?.sources || [])
    .filter((source: any) => source.account_id != null)
    .map((source: any) => [Number(source.account_id), { mode: source.mode === 'whole' ? 'whole' : 'part', amount: String(source.amount || '') }])));
  const [autosaveOn, setAutosaveOn] = useState(Number(goal?.autosave_amount) > 0);
  const [autosaveAmount, setAutosaveAmount] = useState(goal?.autosave_amount ? String(goal.autosave_amount) : '');
  const [autosaveDay, setAutosaveDay] = useState(goal?.autosave_date ? Number(String(goal.autosave_date).slice(8, 10)) : 15);
  const [autosaveFrom, setAutosaveFrom] = useState(goal?.autosave_from_account_id ? String(goal.autosave_from_account_id) : holdable[0] ? String(holdable[0].id) : '');
  const [autosaveTo, setAutosaveTo] = useState(goal?.autosave_account_id && goal.autosave_account_id !== goal.autosave_from_account_id ? String(goal.autosave_account_id) : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const input = `w-full rounded-xl outline-none font-bold ${advanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`;
  const label = 'block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider';
  const linkEntries = Object.entries(links) as [string, Link][];
  const setLink = (id: number, change: Partial<Link>) => setLinks(current => ({ ...current, [id]: { mode: 'off', amount: '', ...current[id], ...change } }));

  // Live preview of what the goal needs per month from what's already counted.
  const today = localDate();
  const counted = editing
    ? Number(goal.progress?.saved) || 0
    : linkEntries.reduce((sum, [id, link]) => sum + (link.mode === 'part' ? Number(link.amount) || 0 : link.mode === 'whole' ? Math.max(0, Number(holdable.find(account => account.id === Number(id))?.balance) || 0) : 0), 0);
  const remaining = Math.max(0, (Number(target) || 0) - counted);
  const days = date ? daysBetween(today, date) : 0;
  const perMonth = remaining / Math.max(1, days / 30.44);

  const save = async () => {
    if (!name.trim()) return setError('Give the goal a name.');
    if (!(Number(target) > 0)) return setError('Set a target above zero.');
    if (!date) return setError('Pick a target date.');
    if (autosaveOn && (!(Number(autosaveAmount) > 0) || !autosaveFrom)) return setError('Auto-save needs an amount and an account to save from.');
    const body: Record<string, unknown> = {
      name: name.trim(), target: Number(target), date, icon, color,
      whole_account_ids: linkEntries.filter(([, link]) => link.mode === 'whole').map(([id]) => Number(id)),
    };
    if (!editing) body.starting_savings = linkEntries.filter(([, link]) => link.mode === 'part' && Number(link.amount) > 0).map(([id, link]) => ({ account_id: Number(id), amount: Number(link.amount) }));
    if (autosaveOn) {
      const keepDate = goal?.autosave_date && Number(String(goal.autosave_date).slice(8, 10)) === autosaveDay;
      Object.assign(body, { autosave_amount: Number(autosaveAmount), autosave_date: keepDate ? goal.autosave_date : nextDateForDay(autosaveDay), autosave_from_account_id: Number(autosaveFrom), autosave_account_id: Number(autosaveTo || autosaveFrom) });
    } else if (Number(goal?.autosave_amount) > 0) {
      Object.assign(body, { autosave_amount: null, autosave_next_amount: null, autosave_date: null, autosave_from_account_id: null, autosave_account_id: null });
    }
    setSaving(true); setError('');
    const response = await fetch(editing ? `/api/goals/${goal.id}` : '/api/goals', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const saved = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) return setError(saved.error || 'Could not save this goal.');
    celebrate({ kind: 'success', title: editing ? 'Goal updated' : 'Goal created', message: name.trim() });
    onSaved(editing ? goal.id : saved.id);
  };

  const chips = [['3 months', monthsFromNow(3)], ['6 months', monthsFromNow(6)], ['1 year', monthsFromNow(12)], ['Christmas', nextChristmas()]];

  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 backdrop-blur-sm" onMouseDown={onClose}>
    <div className="flex min-h-full items-start justify-center p-4 sm:p-8">
      <div role="dialog" aria-modal="true" aria-label={editing ? 'Edit goal' : 'New goal'} onMouseDown={event => event.stopPropagation()} className={`w-full max-w-2xl rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-8 ${advanced ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-100 text-slate-900'}`}>
        <div className="flex items-center gap-4">
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><ChevronRight className="w-5 h-5 rotate-180" /></button>
          <div>
            <h2 className="text-2xl font-black">{editing ? 'Edit goal' : 'New goal'}</h2>
            <p className="text-slate-500 font-medium">{editing ? 'Savings you already added stay put. Use Add to goal or Take out to change them.' : 'Pick a target and date, and tell FinGent where the savings live.'}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className={label}>Goal name</label>
            <input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Japan trip, Emergency fund" className={`${input} px-5 py-4 text-lg`} />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className={label}>Target amount</label>
              <div className="relative"><span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400">₱</span>
                <input type="number" min="0" value={target} onChange={event => setTarget(event.target.value)} placeholder="0.00" className={`${input} pl-10 pr-5 py-4 text-lg`} /></div>
            </div>
            <div>
              <label className={label}>Target date</label>
              <input type="date" min={today} value={date} onChange={event => setDate(event.target.value)} className={`${input} px-5 py-4 text-lg`} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {chips.map(([text, value]) => <button key={text} type="button" onClick={() => setDate(value)} className={`rounded-full px-3 py-1.5 text-xs font-bold border transition-colors ${date === value ? (advanced ? 'border-violet-500 bg-violet-500/20 text-violet-200' : 'border-emerald-500 bg-emerald-50 text-emerald-700') : (advanced ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50')}`}>{text}</button>)}
          </div>
          {Number(target) > 0 && date && <div className={`rounded-2xl p-4 text-sm font-bold ${advanced ? 'bg-violet-500/10 text-violet-100' : 'bg-emerald-50 text-emerald-800'}`}>
            {remaining === 0 ? 'Already covered by the savings counted below.' : `${peso(perMonth)}/month to reach ${peso(Number(target))} by ${formatDate(date)}${counted > 0 ? ` (${peso(counted)} already counted)` : ''}.`}
          </div>}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex flex-wrap gap-2">{(Object.keys(GOAL_ICONS) as string[]).map(option => <button key={option} type="button" aria-label={option} onClick={() => setIcon(option)} className={`p-3 rounded-xl transition-all ${icon === option ? (advanced ? 'bg-violet-600 text-white' : 'bg-slate-900 text-white') : (advanced ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-50 text-slate-500 hover:text-slate-900')}`}><GoalIcon name={option} /></button>)}</div>
            <div className="flex flex-wrap gap-2">{COLORS.map(option => <button key={option} type="button" aria-label={option} onClick={() => setColor(option)} className={`w-8 h-8 rounded-full ${SWATCH[option]} ${color === option ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-800 scale-110' : 'hover:scale-110'} transition-all`} />)}</div>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-700">
          <div><h3 className="font-bold text-lg">Where are the savings? <span className="text-sm font-medium text-slate-500">(optional)</span></h3>
            <p className="text-sm text-slate-500">Count part of an account, or all of it for a dedicated pot like a Maya Goal or Tonik Stash. Balances don't change.</p></div>
          {holdable.length === 0 && <p className="text-sm text-slate-500">Add a bank, digital, or cash account to link savings.</p>}
          {holdable.map(account => {
            const link = links[account.id] ?? { mode: 'off', amount: '' };
            const others = (account.goal_savings || []).filter((entry: any) => entry.goal_id !== goal?.id);
            const takenWhole = others.find((entry: any) => entry.mode === 'whole');
            const lockedPart = editing && link.mode === 'part';
            return <div key={account.id} className={`rounded-2xl border p-4 ${link.mode !== 'off' ? (advanced ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-emerald-300 bg-emerald-50/50') : (advanced ? 'border-slate-700' : 'border-slate-200')}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="font-bold">{account.name}</p><p className="text-xs text-slate-500">{account.type} · {peso(account.balance)}{others.length && !takenWhole ? ` · ${peso(others.reduce((sum: number, entry: any) => sum + entry.amount, 0))} counts toward other goals` : ''}</p></div>
                {takenWhole ? <span className="text-xs font-bold text-slate-500">Counts fully toward {takenWhole.goal_name}</span>
                  : lockedPart ? <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{peso(Number(link.amount))} saved here</span>
                  : <div className={`flex rounded-xl p-1 text-xs font-bold ${advanced ? 'bg-slate-900' : 'bg-slate-100'}`}>
                    {([['off', 'Not used'], ...(editing ? [] : [['part', 'Part of it']]), ['whole', 'All of it']] as [Link['mode'], string][]).map(([mode, text]) => <button key={mode} type="button" disabled={mode === 'whole' && others.length > 0} onClick={() => setLink(account.id, { mode })} className={`px-3 py-1.5 rounded-lg disabled:opacity-40 ${link.mode === mode ? (advanced ? 'bg-slate-700 text-white' : 'bg-white shadow-sm') : 'text-slate-500'}`}>{text}</button>)}
                  </div>}
              </div>
              {link.mode === 'part' && !lockedPart && <div className="relative mt-3"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">₱</span>
                <input type="number" min="0" value={link.amount} onChange={event => setLink(account.id, { amount: event.target.value })} placeholder="How much of it is for this goal?" className={`${input} pl-9 pr-4 py-3`} /></div>}
            </div>;
          })}
        </div>

        <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-700">
          <label className={`flex items-center justify-between p-5 rounded-2xl cursor-pointer border-2 transition-all ${autosaveOn ? (advanced ? 'border-emerald-500 bg-emerald-500/10' : 'border-emerald-500 bg-emerald-50') : (advanced ? 'border-slate-700' : 'border-slate-200')}`}>
            <div><p className="font-bold">Auto-save every month</p><p className="text-xs text-slate-500 font-medium">Adds to this goal on the same day each month. You can change or skip any month.</p></div>
            <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 ${autosaveOn ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>{autosaveOn && <Check className="w-4 h-4" />}</div>
            <input type="checkbox" className="hidden" checked={autosaveOn} onChange={event => setAutosaveOn(event.target.checked)} />
          </label>
          {autosaveOn && <div className="grid gap-4 md:grid-cols-2">
            <div><label className={label}>Amount each month</label>
              <div className="relative"><span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400">₱</span>
                <input type="number" min="0" value={autosaveAmount} onChange={event => setAutosaveAmount(event.target.value)} placeholder="0.00" className={`${input} pl-10 pr-5 py-4`} /></div></div>
            <div><label className={label}>Day of the month</label>
              <select value={autosaveDay} onChange={event => setAutosaveDay(Number(event.target.value))} className={`${input} px-5 py-4`}>
                {Array.from({ length: 31 }, (_, index) => index + 1).map(day => <option key={day} value={day}>{day}{day > 28 ? ' (or month end)' : ''}</option>)}
              </select></div>
            <div><label className={label}>Save from</label>
              <select value={autosaveFrom} onChange={event => setAutosaveFrom(event.target.value)} className={`${input} px-5 py-4`}>
                {holdable.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select></div>
            <div><label className={label}>Save in</label>
              <select value={autosaveTo} onChange={event => setAutosaveTo(event.target.value)} className={`${input} px-5 py-4`}>
                <option value="">Same account</option>
                {holdable.filter(account => String(account.id) !== autosaveFrom).map(account => <option key={account.id} value={account.id}>{account.name} (transfer)</option>)}
              </select></div>
            <p className="md:col-span-2 text-xs text-slate-500">Next auto-save: {formatDate(goal?.autosave_date && Number(String(goal.autosave_date).slice(8, 10)) === autosaveDay ? goal.autosave_date : nextDateForDay(autosaveDay))}. If the account doesn't have enough that day, the month is skipped and noted on the goal.</p>
          </div>}
        </div>

        {error && <p className="text-sm font-bold text-rose-500">{error}</p>}
        <button onClick={save} disabled={saving} className={`w-full py-5 rounded-2xl font-black text-lg shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 ${advanced ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Start saving'}</button>
      </div>
    </div>
  </div>;
}

/** Adds money to a goal from one account, saved in the same account or moved into another. */
export function AddToGoalDialog({ advanced, goal, accounts, onDone, onClose }: { advanced: boolean; goal: any; accounts: any[]; onDone: () => void; onClose: () => void }) {
  const holdable = accounts.filter(account => !isCardAccount(account));
  const whole = (goal.sources || []).filter((source: any) => source.mode === 'whole').map((source: any) => String(source.account_id));
  const [amount, setAmount] = useState('');
  const [fromId, setFromId] = useState(holdable.find(account => !whole.includes(String(account.id)))?.id ? String(holdable.find(account => !whole.includes(String(account.id)))!.id) : '');
  const [saveInId, setSaveInId] = useState(whole[0] && whole[0] !== fromId ? whole[0] : '');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const from = holdable.find(account => String(account.id) === fromId);
  const saveIn = holdable.find(account => String(account.id) === (saveInId || fromId));
  const submit = async () => {
    setWorking(true); setError('');
    const response = await fetch(`/api/goals/${goal.id}/contribute`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: Number(amount), from_account_id: Number(fromId), save_in_account_id: Number(saveInId || fromId) }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error || 'Could not add to this goal.'); setWorking(false); return; }
    celebrate({ kind: 'success', title: `${peso(Number(amount))} added`, message: `to ${goal.name}` });
    onDone();
  };
  return <Dialog advanced={advanced} title={`Add to ${goal.name}`} onClose={onClose}>
    <label className="block text-sm font-bold">Amount
      <span className="relative mt-1.5 block"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400">₱</span>
        <input autoFocus type="number" min="0" value={amount} onChange={event => setAmount(event.target.value)} className={`${dialogField(advanced)} pl-7 font-bold`} /></span>
    </label>
    <label className="mt-4 block text-sm font-bold">From
      <select value={fromId} onChange={event => setFromId(event.target.value)} className={`${dialogField(advanced)} mt-1.5`}>
        {holdable.map(account => <option key={account.id} value={account.id}>{account.name} · {peso(account.balance)}</option>)}
      </select>
    </label>
    <label className="mt-4 block text-sm font-bold">Save in
      <select value={saveInId} onChange={event => setSaveInId(event.target.value)} className={`${dialogField(advanced)} mt-1.5`}>
        <option value="">Same account</option>
        {holdable.filter(account => String(account.id) !== fromId).map(account => <option key={account.id} value={account.id}>{account.name}{whole.includes(String(account.id)) ? ' (goal account)' : ''}</option>)}
      </select>
    </label>
    {from && saveIn && <p className="mt-3 text-sm text-slate-500">{from.id === saveIn.id ? `The money stays in ${from.name}; it now counts toward ${goal.name}.` : `Records a transfer from ${from.name} to ${saveIn.name}.`}</p>}
    {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}
    <div className="mt-6 flex justify-end gap-2"><button onClick={onClose} disabled={working} className={dialogSecondary(advanced)}>Cancel</button><button onClick={submit} disabled={working || !(Number(amount) > 0) || !fromId} className={dialogPrimary(advanced)}>{working ? 'Saving…' : 'Add to goal'}</button></div>
  </Dialog>;
}
