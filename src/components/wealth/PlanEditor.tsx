import { useState, type ReactNode } from 'react';
import { ChevronDown, Plus, Trash2, Link2, AlertTriangle } from 'lucide-react';
import { BUCKET_COLORS, KIND_LABELS, accountRate, defaultRates, defaultTax, newBucket, newId, timeline, type Bucket, type BucketKind, type BucketLink, type WealthPlan } from '../../lib/wealthPlan';
import { Segmented } from '../Segmented';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pct = (value: number) => String(Math.round(value * 100000) / 1000);

/** Every part of a plan, editable, with the projection updating live outside. */
export function PlanEditor({ advanced, name, plan, onName, onChange, accounts, portfolios, incomeFlows, problems }: {
  advanced: boolean; name: string; plan: WealthPlan; onName: (name: string) => void; onChange: (plan: WealthPlan) => void;
  accounts: any[]; portfolios: any[]; incomeFlows: any[]; problems: string[];
}) {
  const input = `w-full min-w-0 rounded-xl border px-3 py-2 text-sm outline-none ${advanced ? 'bg-slate-900 border-slate-700 focus:border-violet-500' : 'bg-white border-slate-200 focus:border-emerald-500'}`;
  const label = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500';
  const card = `rounded-2xl border p-3.5 ${advanced ? 'border-slate-700 bg-slate-900/40' : 'border-slate-100 bg-slate-50/70'}`;
  const chip = (active: boolean) => `rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${active ? (advanced ? 'bg-violet-600 text-white' : 'bg-slate-900 text-white') : (advanced ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500 border border-slate-200')}`;
  const periods = timeline(plan);
  const set = (patch: Partial<WealthPlan>) => onChange({ ...plan, ...patch });
  const setBucket = (id: string, patch: Partial<Bucket>) => set({ buckets: plan.buckets.map(bucket => bucket.id === id ? { ...bucket, ...patch } : bucket) });
  const amountsRow = (amounts: Record<string, number>, update: (amounts: Record<string, number>) => void) => <div className="grid grid-cols-[1fr_1fr] gap-2 sm:grid-cols-4">{plan.buckets.map(bucket => <label key={bucket.id} className="text-[11px] font-bold text-slate-500"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: bucket.color }} />{bucket.name}</span><input type="number" inputMode="decimal" value={amounts[bucket.id] ?? ''} onChange={event => update({ ...amounts, [bucket.id]: Number(event.target.value) || 0 })} className={`${input} mt-1`} placeholder="0" /></label>)}</div>;

  return <div className="space-y-4">
    {problems.length > 0 && <div className={`rounded-2xl p-3 text-sm ${advanced ? 'bg-amber-500/10 text-amber-200' : 'bg-amber-50 text-amber-900'}`}>{problems.map(problem => <p key={problem} className="flex items-start gap-2"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{problem}</p>)}</div>}

    <Section title="Plan basics" advanced={advanced} open>
      <div className="grid grid-cols-[1fr_1fr] gap-3">
        <label className="col-span-2"><span className={label}>Name</span><input value={name} onChange={event => onName(event.target.value)} className={input} /></label>
        <label><span className={label}>Starts</span><input type="month" value={plan.start} onChange={event => event.target.value && set({ start: event.target.value })} className={input} /></label>
        <label><span className={label}>Months</span><input type="number" min="1" max="600" value={plan.periods} onChange={event => set({ periods: Math.max(1, Math.min(600, Number(event.target.value) || 1)) })} className={input} /></label>
        <label><span className={label}>Year starts in</span><select value={plan.yearStartMonth} onChange={event => set({ yearStartMonth: Number(event.target.value) })} className={input}>{MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label>
        <label><span className={label}>Year label</span><input value={plan.yearLabel} onChange={event => set({ yearLabel: event.target.value.slice(0, 8) })} className={input} placeholder="SY" /></label>
        <label><span className={label}>Inflation (% a year)</span><input type="number" step="0.1" value={pct(plan.inflation)} onChange={event => set({ inflation: (Number(event.target.value) || 0) / 100 })} className={input} /></label>
      </div>
      <div className="mt-3"><span className={label}>Break months (no deposits)</span><div className="flex flex-wrap gap-1.5">{MONTHS.map((month, index) => <button type="button" key={month} onClick={() => set({ breaks: plan.breaks.includes(index + 1) ? plan.breaks.filter(item => item !== index + 1) : [...plan.breaks, index + 1] })} className={chip(plan.breaks.includes(index + 1))}>{month}</button>)}</div></div>
      {plan.breaks.length > 0 && <div className="mt-3"><Segmented label="Break months" size="sm" value={plan.breakMode} onChange={mode => set({ breakMode: mode })} options={[{ value: 'pause', label: 'Pause deposits, keep growing' }, { value: 'skip', label: 'Skip the month' }]} /></div>}
      <p className="mt-2 text-[11px] text-slate-500">{periods.length ? `${periods[0].label} to ${periods[periods.length - 1].label}` : ''}</p>
    </Section>

    <Section title="Accounts and investments" advanced={advanced} open>
      <div className="space-y-3">
        {plan.buckets.map((bucket, index) => <div key={bucket.id} className={card}>
          <div className="flex items-center gap-2">
            <input value={bucket.name} onChange={event => setBucket(bucket.id, { name: event.target.value })} className={`${input} font-bold`} aria-label="Bucket name" />
            <button type="button" aria-label={`Remove ${bucket.name}`} onClick={() => set({ buckets: plan.buckets.filter(item => item.id !== bucket.id), milestoneBuckets: plan.milestoneBuckets.filter(id => id !== bucket.id) })} className="rounded-lg p-2 text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">{BUCKET_COLORS.map(color => <button type="button" key={color} aria-label="Color" onClick={() => setBucket(bucket.id, { color })} className={`h-5 w-5 rounded-full ${bucket.color === color ? 'ring-2 ring-offset-1 ring-slate-500' : ''}`} style={{ background: color }} />)}</div>
          <div className="mt-3 grid grid-cols-[1fr_1fr] gap-3">
            <label><span className={label}>Type</span><select value={bucket.kind} onChange={event => { const kind = event.target.value as BucketKind; setBucket(bucket.id, { kind, rates: defaultRates(kind), taxRate: defaultTax(kind) }); }} className={input}>{Object.entries(KIND_LABELS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
            <label><span className={label}>Starting balance</span><input type="number" inputMode="decimal" value={bucket.startBalance || ''} onChange={event => setBucket(bucket.id, { startBalance: Number(event.target.value) || 0 })} className={input} placeholder="0" /></label>
          </div>
          <div className="mt-3"><span className={label}>Each month</span>
            <Segmented label="Contribution" size="sm" value={bucket.contribution.mode} onChange={mode => setBucket(bucket.id, { contribution: mode === 'fixed' ? { mode: 'fixed', amount: 0 } : { mode: 'percent', percent: 10, flows: [], accounts: [] } })} options={[{ value: 'fixed', label: 'Fixed amount' }, { value: 'percent', label: '% of income' }]} />
            {bucket.contribution.mode === 'fixed'
              ? <input type="number" inputMode="decimal" value={bucket.contribution.amount || ''} onChange={event => setBucket(bucket.id, { contribution: { mode: 'fixed', amount: Number(event.target.value) || 0 } })} className={`${input} mt-2`} placeholder="₱ per month" />
              : (() => { const contribution = bucket.contribution; return <div className="mt-2 space-y-2">
                <input type="number" step="0.5" value={contribution.percent} onChange={event => setBucket(bucket.id, { contribution: { ...contribution, percent: Number(event.target.value) || 0 } })} className={input} placeholder="% of income" />
                <p className="text-[11px] text-slate-500">Of which income? Leave all off to use every income.</p>
                <div className="flex flex-wrap gap-1.5">
                  {incomeFlows.filter(flow => flow.is_recurring === true || Number(flow.is_recurring) === 1).map(flow => { const on = contribution.flows?.includes(Number(flow.id)); return <button type="button" key={`f${flow.id}`} onClick={() => setBucket(bucket.id, { contribution: { ...contribution, flows: on ? (contribution.flows ?? []).filter(id => id !== Number(flow.id)) : [...(contribution.flows ?? []), Number(flow.id)] } })} className={chip(Boolean(on))}>{flow.name}</button>; })}
                  {accounts.map(account => { const on = contribution.accounts?.includes(Number(account.id)); return <button type="button" key={`a${account.id}`} onClick={() => setBucket(bucket.id, { contribution: { ...contribution, accounts: on ? (contribution.accounts ?? []).filter(id => id !== Number(account.id)) : [...(contribution.accounts ?? []), Number(account.id)] } })} className={chip(Boolean(on))}>Into {account.name}</button>; })}
                </div>
              </div>; })()}
          </div>
          <div className="mt-3"><span className={label}>Growth per year: conservative / balanced / aggressive (%)</span>
            <div className="grid grid-cols-3 gap-2">{(['conservative', 'balanced', 'aggressive'] as const).map(scenario => <input key={scenario} type="number" step="0.1" aria-label={`${scenario} rate`} value={pct(bucket.rates[scenario])} onChange={event => setBucket(bucket.id, { rates: { ...bucket.rates, [scenario]: (Number(event.target.value) || 0) / 100 } })} className={input} />)}</div>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_1fr] gap-3">
            <label><span className={label}>Tax on growth (%)</span><input type="number" step="1" value={pct(bucket.taxRate)} onChange={event => setBucket(bucket.id, { taxRate: (Number(event.target.value) || 0) / 100 })} className={input} /></label>
            <label><span className={label}>Invest deposits every</span><select value={bucket.deployEvery} onChange={event => setBucket(bucket.id, { deployEvery: Number(event.target.value) })} className={input}>{[1, 2, 3, 6].map(months => <option key={months} value={months}>{months === 1 ? 'month' : `${months} months`}</option>)}</select></label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-500"><input type="checkbox" checked={Boolean(bucket.promo)} onChange={event => setBucket(bucket.id, { promo: event.target.checked ? { months: 1, ratePa: 0.1, tax: 0.2, onStart: true } : null })} /> Promo rate at the start</label>
          {bucket.promo && <div className="mt-2 grid grid-cols-3 gap-2">
            <label className="text-[11px] font-bold text-slate-500">Months<input type="number" min="1" value={bucket.promo.months} onChange={event => setBucket(bucket.id, { promo: { ...bucket.promo!, months: Number(event.target.value) || 1 } })} className={`${input} mt-1`} /></label>
            <label className="text-[11px] font-bold text-slate-500">Rate %<input type="number" step="0.1" value={pct(bucket.promo.ratePa)} onChange={event => setBucket(bucket.id, { promo: { ...bucket.promo!, ratePa: (Number(event.target.value) || 0) / 100 } })} className={`${input} mt-1`} /></label>
            <label className="text-[11px] font-bold text-slate-500">Tax %<input type="number" step="1" value={pct(bucket.promo.tax)} onChange={event => setBucket(bucket.id, { promo: { ...bucket.promo!, tax: (Number(event.target.value) || 0) / 100 } })} className={`${input} mt-1`} /></label>
          </div>}
          <div className="mt-3"><span className={`${label} flex items-center gap-1`}><Link2 size={12} /> Linked to your accounts</span>
            <p className="mb-2 text-[11px] text-slate-500">Money arriving in a linked account (salary, freelance, business, transfers) counts as an actual deposit. Interest counts as growth.</p>
            {bucket.links.map((link, linkIndex) => <div key={linkIndex} className="mb-2 grid grid-cols-[1.4fr_1fr_0.9fr_auto] items-center gap-1.5">
              <select value={`${link.type}:${link.id}`} onChange={event => { const [type, id] = event.target.value.split(':'); setBucket(bucket.id, { links: bucket.links.map((item, at) => at === linkIndex ? { ...item, type: type as BucketLink['type'], id: Number(id) } : item) }); }} className={input} aria-label="Linked account">
                <optgroup label="Accounts">{accounts.map(account => <option key={`a${account.id}`} value={`account:${account.id}`}>{account.name}</option>)}</optgroup>
                {portfolios.length > 0 && <optgroup label="Investments">{portfolios.map(holding => <option key={`h${holding.id}`} value={`holding:${holding.id}`}>{holding.ticker || holding.name}</option>)}</optgroup>}
              </select>
              <select value={link.mode} onChange={event => setBucket(bucket.id, { links: bucket.links.map((item, at) => at === linkIndex ? { ...item, mode: event.target.value as BucketLink['mode'], value: event.target.value === 'percent' ? 50 : event.target.value === 'amount' ? 10000 : 100 } : item) })} className={input} aria-label="How much"><option value="whole">Whole</option><option value="percent">Percent</option><option value="amount">Fixed ₱</option></select>
              <input type="number" disabled={link.mode === 'whole'} value={link.mode === 'whole' ? '' : link.value} onChange={event => setBucket(bucket.id, { links: bucket.links.map((item, at) => at === linkIndex ? { ...item, value: Number(event.target.value) || 0 } : item) })} className={input} placeholder={link.mode === 'percent' ? '%' : link.mode === 'amount' ? '₱' : 'all'} aria-label="Share" />
              <button type="button" aria-label="Remove link" onClick={() => setBucket(bucket.id, { links: bucket.links.filter((_, at) => at !== linkIndex) })} className="rounded-lg p-2 text-slate-400 hover:text-rose-500"><Trash2 size={15} /></button>
            </div>)}
            {(bucket.kind === 'bank' || bucket.kind === 'time_deposit' || bucket.kind === 'cash') && (() => { const linked = bucket.links.filter(link => link.type === 'account').map(link => accounts.find(account => Number(account.id) === link.id)).find(account => accountRate(account)); const found = linked ? accountRate(linked) : null; return found && (Math.abs(found.rate - bucket.rates.balanced) > 0.00001 || Math.abs(found.tax - bucket.taxRate) > 0.00001) ? <button type="button" onClick={() => setBucket(bucket.id, { rates: { conservative: found.rate, balanced: found.rate, aggressive: found.rate }, taxRate: found.tax })} className={`mb-2 block text-xs font-bold ${advanced ? 'text-sky-300' : 'text-sky-700'}`}>Use {linked.name}'s rate: {pct(found.rate)}% a year, {pct(found.tax)}% tax</button> : null; })()}
            <button type="button" disabled={!accounts.length && !portfolios.length} onClick={() => { const first = accounts[0] ? { type: 'account' as const, id: Number(accounts[0].id) } : { type: 'holding' as const, id: Number(portfolios[0].id) }; setBucket(bucket.id, { links: [...bucket.links, { ...first, mode: 'whole', value: 100, since: new Date().toISOString().slice(0, 10) }] }); }} className={`text-xs font-bold ${advanced ? 'text-violet-300' : 'text-emerald-700'}`}>+ Link an account or investment</button>
          </div>
        </div>)}
        <div className="flex flex-wrap gap-2">{(['etf', 'stock', 'crypto', 'bank', 'time_deposit', 'cash'] as BucketKind[]).map(kind => <button type="button" key={kind} onClick={() => set({ buckets: [...plan.buckets, newBucket(kind, KIND_LABELS[kind], plan.buckets.length)] })} className={chip(false)}><Plus size={12} className="mr-0.5 inline" />{KIND_LABELS[kind]}</button>)}</div>
      </div>
    </Section>

    <Section title="Extra deposits that repeat (e.g. scholarships, bonuses)" advanced={advanced}>
      <div className="space-y-3">
        {plan.extras.map(extra => <div key={extra.id} className={card}>
          <div className="flex items-center gap-2"><input value={extra.name} onChange={event => set({ extras: plan.extras.map(item => item.id === extra.id ? { ...item, name: event.target.value } : item) })} className={`${input} font-bold`} /><button type="button" aria-label="Remove" onClick={() => set({ extras: plan.extras.filter(item => item.id !== extra.id) })} className="rounded-lg p-2 text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button></div>
          <p className="mt-2 text-[11px] font-bold text-slate-500">Every year in</p>
          <div className="mt-1 flex flex-wrap gap-1.5">{MONTHS.map((month, index) => { const on = extra.months?.includes(index + 1); return <button type="button" key={month} onClick={() => set({ extras: plan.extras.map(item => item.id === extra.id ? { ...item, months: on ? (item.months ?? []).filter(value => value !== index + 1) : [...(item.months ?? []), index + 1] } : item) })} className={chip(Boolean(on))}>{month}</button>; })}</div>
          <div className="mt-3">{amountsRow(extra.amounts, amounts => set({ extras: plan.extras.map(item => item.id === extra.id ? { ...item, amounts } : item) }))}</div>
        </div>)}
        <button type="button" onClick={() => set({ extras: [...plan.extras, { id: newId('x'), name: 'Bonus', months: [12], amounts: {} }] })} className={chip(false)}><Plus size={12} className="mr-0.5 inline" />Add a repeating extra</button>
      </div>
    </Section>

    <Section title="One-time deposits" advanced={advanced}>
      <div className="space-y-3">
        {plan.injections.map(injection => <div key={injection.id} className={card}>
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
            <input value={injection.name} onChange={event => set({ injections: plan.injections.map(item => item.id === injection.id ? { ...item, name: event.target.value } : item) })} className={`${input} font-bold`} />
            <select value={injection.period} onChange={event => set({ injections: plan.injections.map(item => item.id === injection.id ? { ...item, period: Number(event.target.value) } : item) })} className={input} aria-label="Month">{periods.map(period => <option key={period.index} value={period.index}>{period.label}</option>)}</select>
            <button type="button" aria-label="Remove" onClick={() => set({ injections: plan.injections.filter(item => item.id !== injection.id) })} className="rounded-lg p-2 text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
          </div>
          <div className="mt-3">{amountsRow(injection.amounts, amounts => set({ injections: plan.injections.map(item => item.id === injection.id ? { ...item, amounts } : item) }))}</div>
        </div>)}
        <button type="button" onClick={() => set({ injections: [...plan.injections, { id: newId('i'), name: 'One-time deposit', period: Math.min(plan.periods, 6), amounts: {} }] })} className={chip(false)}><Plus size={12} className="mr-0.5 inline" />Add a one-time deposit</button>
      </div>
    </Section>

    <Section title="Milestones" advanced={advanced}>
      <label><span className={label}>Amounts (₱, separated by commas)</span><input defaultValue={plan.milestones.join(', ')} onBlur={event => set({ milestones: event.target.value.split(/[,\s]+/).map(value => Number(value.replace(/[^\d.]/g, ''))).filter(value => value > 0).sort((a, b) => a - b) })} className={input} /></label>
      <p className="mt-3 text-[11px] font-bold text-slate-500">Counted toward milestones</p>
      <div className="mt-1 flex flex-wrap gap-1.5">{plan.buckets.map(bucket => { const on = !plan.milestoneBuckets.length || plan.milestoneBuckets.includes(bucket.id); return <button type="button" key={bucket.id} onClick={() => { const current = plan.milestoneBuckets.length ? plan.milestoneBuckets : plan.buckets.map(item => item.id); set({ milestoneBuckets: on ? current.filter(id => id !== bucket.id) : [...current, bucket.id] }); }} className={chip(on)}>{bucket.name}</button>; })}</div>
    </Section>
  </div>;
}

function Section({ title, advanced, open = false, children }: { title: string; advanced: boolean; open?: boolean; children: ReactNode }) {
  const [shown, setShown] = useState(open);
  return <section className={`rounded-3xl border p-4 ${advanced ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-white'}`}>
    <button type="button" onClick={() => setShown(value => !value)} className="flex w-full items-center justify-between gap-2 text-left font-black">{title}<ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${shown ? 'rotate-180' : ''}`} /></button>
    {shown && <div className="mt-3">{children}</div>}
  </section>;
}
