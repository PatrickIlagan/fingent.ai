import { useState } from 'react';
import { BadgePercent, ChevronDown, Edit2, Plus, Sparkles, X } from 'lucide-react';
import { DEFAULT_INTEREST_TAX, dueInterest, interestDay, interestFrequency, interestMode, interestRates, interestTiers, localDate, monthlyInterestEstimate, shiftDate } from '../lib/sharedRules';
import { findProduct } from '../lib/institutions';
import { Dialog, dialogField, dialogPrimary, dialogSecondary } from './RecordDialogs';

// ---- Form values (rates as percentages, everything as text) ----------------

export type InterestForm = {
  interest_rate_pa: string; interest_mode: string; interest_frequency: string; interest_day: string;
  interest_min_balance: string; interest_tax_rate: string; interest_tiers: { from: string; rate_pa: string }[];
  interest_boost_pa: string; interest_cap: string; interest_boost_until: string; interest_fixed_amount: string;
  preset_id?: string;
};

export const blankInterestForm = (): InterestForm => ({ interest_rate_pa: '', interest_mode: 'off', interest_frequency: 'daily', interest_day: '', interest_min_balance: '', interest_tax_rate: '20', interest_tiers: [], interest_boost_pa: '', interest_cap: '', interest_boost_until: '', interest_fixed_amount: '' });

const toPercent = (value: unknown) => value == null || value === '' ? '' : String(Math.round(Number(value) * 100000) / 1000);
const fromPercent = (value: string) => value.trim() === '' ? '' : Number(value) / 100;
const textOf = (value: unknown) => value == null || value === '' ? '' : String(value);

export function interestFormFromAccount(account: any): InterestForm {
  return {
    interest_rate_pa: toPercent(account.interest_rate_pa || ''),
    interest_mode: interestMode(account),
    interest_frequency: interestFrequency(account),
    interest_day: textOf(account.interest_day),
    interest_min_balance: textOf(account.interest_min_balance),
    interest_tax_rate: toPercent(account.interest_tax_rate ?? DEFAULT_INTEREST_TAX),
    interest_tiers: interestTiers(account).map(tier => ({ from: String(tier.from), rate_pa: toPercent(tier.rate_pa) })),
    interest_boost_pa: toPercent(account.interest_boost_pa || ''),
    interest_cap: textOf(account.interest_cap),
    interest_boost_until: textOf(account.interest_boost_until),
    interest_fixed_amount: textOf(account.interest_fixed_amount),
  };
}

/** What the API expects: rates as fractions, blanks as ''. Cards and cash never earn interest. */
export function interestPayload(form: InterestForm, accountType: string) {
  const earns = accountType === 'Bank' || accountType === 'Digital';
  return {
    interest_mode: earns ? form.interest_mode : 'off',
    interest_rate_pa: earns ? Number(fromPercent(form.interest_rate_pa)) || 0 : 0,
    interest_frequency: form.interest_frequency,
    interest_day: form.interest_day ? Number(form.interest_day) : '',
    interest_min_balance: form.interest_min_balance,
    interest_tax_rate: fromPercent(form.interest_tax_rate),
    interest_tiers: form.interest_tiers.filter(tier => Number(tier.from) > 0 && tier.rate_pa !== '').map(tier => ({ from: Number(tier.from), rate_pa: Number(fromPercent(tier.rate_pa)) })),
    interest_boost_pa: fromPercent(form.interest_boost_pa),
    interest_cap: form.interest_cap,
    interest_boost_until: form.interest_boost_until,
    interest_fixed_amount: form.interest_fixed_amount,
  };
}

const pct = (value: number) => `${(value * 100).toFixed(2).replace(/\.?0+$/, '')}%`;
const peso = (value: number, decimals = 2) => '₱' + value.toLocaleString('en-PH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const MODES = [
  { id: 'auto', label: 'Automatic', help: 'Adds interest for you on schedule.' },
  { id: 'remind', label: 'Remind me', help: 'Shows what’s due; you confirm the real amount.' },
  { id: 'fixed', label: 'Fixed amount', help: 'Adds the same amount every month.' },
  { id: 'off', label: 'Off', help: 'This account doesn’t earn interest.' },
];

// ---- Account form section ----------------------------------------------------

export function InterestFields({ advanced, form, onChange }: { advanced: boolean; form: InterestForm; onChange: (patch: Partial<InterestForm>) => void }) {
  const [more, setMore] = useState(Boolean(form.interest_min_balance || form.interest_tiers.length || form.interest_boost_pa || form.interest_boost_until));
  const preset = form.preset_id ? findProduct(form.preset_id) : null;
  const boost = preset?.product.interest?.boost;
  const input = `w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm outline-none ${advanced ? 'bg-slate-900 border-slate-700 focus:border-violet-500' : 'bg-slate-50 border-slate-200 focus:border-emerald-500'}`;
  const label = 'block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1';
  const segment = (active: boolean) => `rounded-lg px-2 py-2 text-xs font-bold transition-colors ${active ? (advanced ? 'bg-violet-600 text-white' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`;
  const on = form.interest_mode !== 'off';

  return <div className={`space-y-3 rounded-2xl border p-3.5 ${advanced ? 'border-slate-700 bg-slate-900/40' : 'border-slate-100 bg-slate-50/60'}`}>
    <div className="flex items-center gap-2 text-sm font-bold"><BadgePercent size={16} className={advanced ? 'text-violet-300' : 'text-emerald-600'} /> Earns interest</div>
    <div className={`grid grid-cols-4 gap-1 rounded-xl p-1 ${advanced ? 'bg-slate-800' : 'bg-slate-100'}`}>
      {MODES.map(mode => <button type="button" key={mode.id} onClick={() => onChange({ interest_mode: mode.id })} className={segment(form.interest_mode === mode.id)}>{mode.label}</button>)}
    </div>
    <p className="text-[11px] text-slate-500">{MODES.find(mode => mode.id === form.interest_mode)?.help}</p>

    {on && form.interest_mode === 'fixed' && <div className="grid grid-cols-[1fr_1fr] gap-3">
      <div><label className={label}>Each month</label><input type="number" min="0" step="0.01" inputMode="decimal" value={form.interest_fixed_amount} onChange={event => onChange({ interest_fixed_amount: event.target.value })} className={input} placeholder="₱ after tax" /></div>
      <div><label className={label}>Day of month</label><input type="number" min="1" max="31" value={form.interest_day} onChange={event => onChange({ interest_day: event.target.value })} className={input} placeholder="31 = month end" /></div>
    </div>}

    {on && form.interest_mode !== 'fixed' && <>
      <div className="grid grid-cols-[1fr_1fr] gap-3">
        <div><label className={label}>Rate (% p.a.)</label><input type="number" min="0" step="0.01" inputMode="decimal" value={form.interest_rate_pa} onChange={event => onChange({ interest_rate_pa: event.target.value })} className={input} placeholder="e.g. 3.25" /></div>
        <div><label className={label}>Tax withheld (%)</label><input type="number" min="0" max="100" step="0.1" inputMode="decimal" value={form.interest_tax_rate} onChange={event => onChange({ interest_tax_rate: event.target.value })} className={input} placeholder="20" /></div>
      </div>
      <div className="grid grid-cols-[1fr_1fr] gap-3">
        <div><label className={label}>Credited</label>
          <div className={`grid grid-cols-[1fr_1fr] gap-1 rounded-xl p-1 ${advanced ? 'bg-slate-800' : 'bg-slate-100'}`}>
            {['daily', 'monthly'].map(frequency => <button type="button" key={frequency} onClick={() => onChange({ interest_frequency: frequency })} className={segment(form.interest_frequency === frequency)}>{frequency === 'daily' ? 'Daily' : 'Monthly'}</button>)}
          </div>
        </div>
        {(form.interest_frequency === 'monthly' || form.interest_mode === 'remind') && <div><label className={label}>{form.interest_mode === 'remind' ? 'Remind on day' : 'Credit day'}</label><input type="number" min="1" max="31" value={form.interest_day} onChange={event => onChange({ interest_day: event.target.value })} className={input} placeholder="31 = month end" /></div>}
      </div>

      {boost && <div className={`rounded-xl p-3 text-xs ${advanced ? 'bg-violet-500/10 text-violet-200' : 'bg-emerald-50 text-emerald-800'}`}>
        <p className="flex items-start gap-1.5"><Sparkles size={14} className="mt-0.5 shrink-0" /><span>{boost.how}</span></p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => { setMore(true); onChange({ interest_boost_pa: toPercent(boost.max_pa), interest_cap: boost.cap ? String(boost.cap) : form.interest_cap, interest_boost_until: boost.until ?? form.interest_boost_until }); }} className={`rounded-lg px-2.5 py-1 font-bold ${advanced ? 'bg-violet-600 text-white' : 'bg-emerald-600 text-white'}`}>I get the full boost (+{pct(boost.max_pa)})</button>
          <button type="button" onClick={() => setMore(true)} className="rounded-lg px-2.5 py-1 font-bold underline-offset-2 hover:underline">Enter my boost</button>
        </div>
      </div>}

      <button type="button" onClick={() => setMore(value => !value)} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"><ChevronDown size={14} className={`transition-transform ${more ? 'rotate-180' : ''}`} /> Boosts, tiers, and minimum balance</button>
      {more && <div className="space-y-3">
        <div className="grid grid-cols-[1fr_1fr] gap-3">
          <div><label className={label}>Boost (+% p.a.)</label><input type="number" min="0" step="0.01" inputMode="decimal" value={form.interest_boost_pa} onChange={event => onChange({ interest_boost_pa: event.target.value })} className={input} placeholder="e.g. 12" /></div>
          <div><label className={label}>Boost cap (₱)</label><input type="number" min="0" inputMode="decimal" value={form.interest_cap} onChange={event => onChange({ interest_cap: event.target.value })} className={input} placeholder="No limit" /></div>
        </div>
        <div className="grid grid-cols-[1fr_1fr] gap-3">
          <div><label className={label}>Boost ends</label><input type="date" value={form.interest_boost_until} onChange={event => onChange({ interest_boost_until: event.target.value })} className={input} /></div>
          <div><label className={label}>Min. balance (₱)</label><input type="number" min="0" inputMode="decimal" value={form.interest_min_balance} onChange={event => onChange({ interest_min_balance: event.target.value })} className={input} placeholder="None" /></div>
        </div>
        <div>
          <label className={label}>Higher rate from a balance</label>
          {form.interest_tiers.map((tier, index) => <div key={index} className="mb-2 grid grid-cols-[1fr_1fr_auto] items-center gap-2">
            <input type="number" min="0" inputMode="decimal" value={tier.from} onChange={event => onChange({ interest_tiers: form.interest_tiers.map((item, at) => at === index ? { ...item, from: event.target.value } : item) })} className={input} placeholder="From ₱" aria-label="Tier starts at" />
            <input type="number" min="0" step="0.01" inputMode="decimal" value={tier.rate_pa} onChange={event => onChange({ interest_tiers: form.interest_tiers.map((item, at) => at === index ? { ...item, rate_pa: event.target.value } : item) })} className={input} placeholder="% p.a." aria-label="Tier rate" />
            <button type="button" aria-label="Remove tier" onClick={() => onChange({ interest_tiers: form.interest_tiers.filter((_, at) => at !== index) })} className="rounded-lg p-2 text-slate-400 hover:text-rose-500"><X size={15} /></button>
          </div>)}
          <button type="button" onClick={() => onChange({ interest_tiers: [...form.interest_tiers, { from: '', rate_pa: '' }] })} className={`text-xs font-bold ${advanced ? 'text-violet-300' : 'text-emerald-700'}`}>+ Add a tier</button>
        </div>
      </div>}
    </>}
  </div>;
}

// ---- Account detail card -------------------------------------------------------

export function InterestCard({ advanced, account, onAdd, onSetUp, onEditTransaction }: {
  advanced: boolean; account: any;
  onAdd: (defaults: { amount?: number; gross?: number; date?: string; coversUntil?: string; title: string }) => void;
  onSetUp: () => void; onEditTransaction: (transaction: any) => void;
}) {
  const today = localDate();
  const mode = interestMode(account);
  const transactions: any[] = account.transactions || [];
  const interestEntries = transactions.filter(transaction => transaction.type === 'income' && (transaction.source === 'interest' || String(transaction.category).toLowerCase() === 'interest')).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const sum = (prefix: string) => interestEntries.filter(entry => String(entry.date).startsWith(prefix)).reduce((total, entry) => total + Number(entry.amount || 0), 0);
  const card = `rounded-3xl border p-5 shadow-sm ${advanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`;
  const accent = advanced ? 'text-violet-300' : 'text-emerald-600';

  if (mode === 'off') {
    if (!['Bank', 'Digital'].includes(account.type)) return null;
    return <div className={`${card} flex items-center justify-between gap-3`}>
      <div className="flex items-center gap-3"><BadgePercent size={20} className="shrink-0 text-slate-400" /><p className="text-sm text-slate-500">Does this account earn interest? Set the rate and FinGent adds it for you.</p></div>
      <button onClick={onSetUp} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${advanced ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>Set up</button>
    </div>;
  }

  const rates = interestRates(account, Number(account.balance) || 0, today);
  const estimate = monthlyInterestEstimate(account, today);
  const { reminder } = dueInterest(account, transactions, today);
  const until = String(account.interest_boost_until || '');
  const boostEndsSoon = Number(account.interest_boost_pa) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(until) && until >= today && until <= shiftDate(today, 14);
  const boostEnded = Number(account.interest_boost_pa) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(until) && until < today;
  const minimum = Number(account.interest_min_balance) || 0;
  const schedule = mode === 'fixed' ? `Fixed, on day ${interestDay(account) === 31 ? 'end of month' : interestDay(account)}` : `${mode === 'remind' ? 'Reminder' : 'Automatic'} · credited ${interestFrequency(account) === 'daily' && mode === 'auto' ? 'daily' : 'monthly'}`;

  return <div className={card}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="flex items-center gap-2 font-bold"><BadgePercent size={18} className={accent} /> Interest</h3>
        <p className="mt-0.5 text-xs text-slate-500">{schedule}</p>
      </div>
      <button onClick={() => onAdd({ title: 'Add interest' })} className={`flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold ${advanced ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}><Plus size={14} /> Add</button>
    </div>

    {reminder && reminder.net >= 0.01 && <div className={`mt-4 flex items-center justify-between gap-3 rounded-2xl p-3 ${advanced ? 'bg-amber-500/10 text-amber-200' : 'bg-amber-50 text-amber-900'}`}>
      <p className="text-sm"><span className="font-bold">Interest due ≈ {peso(reminder.net)}</span><span className="block text-xs opacity-80">Since {reminder.from}, after tax. Check your bank for the exact amount.</span></p>
      <button onClick={() => onAdd({ title: 'Interest received', amount: reminder.net, gross: reminder.gross, date: reminder.date, coversUntil: reminder.date })} className="shrink-0 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600">Add</button>
    </div>}

    <div className="mt-4 grid grid-cols-3 gap-2">
      <div className={`rounded-2xl p-3 ${advanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}><p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-500">{mode === 'fixed' ? 'Monthly' : 'Rate now'}</p><p className="mt-1 truncate text-base font-black">{mode === 'fixed' ? peso(estimate, 0) : pct(rates.effective)}</p></div>
      <div className={`rounded-2xl p-3 ${advanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}><p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-500">This month</p><p className={`mt-1 truncate text-base font-black ${accent}`}>{peso(sum(today.slice(0, 7)))}</p></div>
      <div className={`rounded-2xl p-3 ${advanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}><p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-500">This year</p><p className="mt-1 truncate text-base font-black">{peso(sum(today.slice(0, 4)), 0)}</p></div>
    </div>
    {mode !== 'fixed' && <p className="mt-3 text-xs text-slate-500">
      About {peso(estimate)} a month after {Math.round((account.interest_tax_rate ?? DEFAULT_INTEREST_TAX) * 100)}% tax at today’s balance{rates.boost > 0 ? `, including a +${pct(rates.boost)} boost${Number(account.interest_cap) > 0 ? ` on the first ${peso(Number(account.interest_cap), 0)}` : ''}` : ''}.
      {minimum > 0 && (Number(account.balance) || 0) < minimum ? ` Earns nothing below ${peso(minimum, 0)}.` : ''}
    </p>}
    {boostEndsSoon && <p className={`mt-2 text-xs font-bold ${advanced ? 'text-amber-300' : 'text-amber-700'}`}>Your boost ends on {until}. Renew it or update the rate after.</p>}
    {boostEnded && <p className="mt-2 text-xs font-bold text-slate-500">Your boost ended on {until}; interest now uses the base rate.</p>}

    {interestEntries.length > 0 && <div className="mt-4">
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">Recent interest</p>
      <div className="space-y-1">
        {interestEntries.slice(0, 4).map(entry => <div key={entry.id} className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${advanced ? 'bg-slate-900/40' : 'bg-slate-50'}`}>
          <span className="min-w-0"><span className="block text-sm font-semibold">{new Date(`${entry.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>{entry.notes && <span className="block truncate text-[11px] text-slate-500">{entry.notes}</span>}</span>
          <span className="flex shrink-0 items-center gap-1"><span className={`text-sm font-bold ${accent}`}>+{peso(Number(entry.amount))}</span><button aria-label="Edit interest entry" onClick={() => onEditTransaction(entry)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"><Edit2 size={13} /></button></span>
        </div>)}
      </div>
    </div>}
  </div>;
}

// ---- Add interest ------------------------------------------------------------------

export function AddInterestDialog({ advanced, title, defaults, onSave, onClose }: {
  advanced: boolean; title: string;
  defaults: { amount?: number; gross?: number; date?: string };
  onSave: (values: { amount: number; gross?: number; date: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(defaults.amount ? defaults.amount.toFixed(2) : '');
  const [gross, setGross] = useState(defaults.gross ? defaults.gross.toFixed(2) : '');
  const [date, setDate] = useState(defaults.date || localDate());
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const save = async () => {
    if (!(Number(amount) > 0)) return setError('Enter the interest you received.');
    setWorking(true); setError('');
    try { await onSave({ amount: Number(amount), gross: Number(gross) > Number(amount) ? Number(gross) : undefined, date }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not add interest.'); setWorking(false); }
  };
  return <Dialog advanced={advanced} title={title} onClose={onClose}>
    <p className="text-sm text-slate-500">Enter what your bank credited, after tax. It's added to this account's balance{' '}and to goal savings kept here.</p>
    <label className="mt-4 block text-sm font-bold">Received (after tax)
      <span className="relative mt-1.5 block"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400">₱</span><input autoFocus type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} className={`${dialogField(advanced)} pl-7 font-bold`} /></span>
    </label>
    <div className="mt-3 grid grid-cols-[1fr_1fr] gap-3">
      <label className="block text-sm font-bold">Before tax <span className="font-normal text-slate-500">(optional)</span><input type="number" min="0" step="0.01" inputMode="decimal" value={gross} onChange={event => setGross(event.target.value)} className={`${dialogField(advanced)} mt-1.5`} /></label>
      <label className="block text-sm font-bold">Date<input type="date" value={date} onChange={event => setDate(event.target.value)} className={`${dialogField(advanced)} mt-1.5`} /></label>
    </div>
    {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}
    <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className={dialogSecondary(advanced)}>Cancel</button><button disabled={working} onClick={save} className={dialogPrimary(advanced)}>{working ? 'Adding…' : 'Add interest'}</button></div>
  </Dialog>;
}
