import { useMemo, useState } from 'react';
import { ChevronRight, Search, X, Plus, Banknote } from 'lucide-react';
import { CATALOG_AS_OF, headlineRate, KIND_FILTERS, searchInstitutions, type Institution, type InstitutionKind, type Product } from '../lib/institutions';

const percent = (value: number) => `${(value * 100).toFixed(value * 100 < 1 ? 4 : 2).replace(/0+$/, '').replace(/\.$/, '')}%`;

function Badge({ institution, size = 'md' }: { institution: Pick<Institution, 'initials' | 'color'>; size?: 'md' | 'sm' }) {
  const box = size === 'sm' ? 'h-8 w-8 text-[10px]' : 'h-11 w-11 text-xs';
  return <span className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-black tracking-tight text-white shadow-sm ${box} ${institution.color}`}>{institution.initials}</span>;
}

/**
 * Pick where a new account lives, like choosing a bank for an InstaPay transfer:
 * search or filter the list, tap a bank or wallet, then the product.
 */
export function InstitutionPicker({ advanced, defaultKind = 'all', onPick, onOther, onClose }: {
  advanced: boolean;
  defaultKind?: 'all' | InstitutionKind;
  onPick: (institution: Institution, product: Product) => void;
  onOther: (type?: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | InstitutionKind>(defaultKind);
  const [openId, setOpenId] = useState<string | null>(null);
  const results = useMemo(() => searchInstitutions(query, kind), [query, kind]);
  const surface = advanced ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-100 text-slate-900';
  const row = advanced ? 'hover:bg-slate-700/60' : 'hover:bg-slate-50';
  const chip = (active: boolean) => `shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${active ? (advanced ? 'bg-violet-600 text-white' : 'bg-slate-900 text-white') : (advanced ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`;

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
    <div role="dialog" aria-modal="true" aria-label="Add account" onMouseDown={event => event.stopPropagation()} className={`flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl border shadow-2xl sm:max-h-[85vh] sm:rounded-3xl ${surface}`}>
      <div className="shrink-0 p-5 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div><h3 className="text-xl font-bold">Add account</h3><p className="mt-0.5 text-xs text-slate-500">Pick your bank or wallet. You can change anything after.</p></div>
          <button aria-label="Close" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} /></button>
        </div>
        <label className={`mt-4 flex items-center gap-2 rounded-xl border px-3 ${advanced ? 'border-slate-700 bg-slate-900 focus-within:border-violet-500' : 'border-slate-200 bg-slate-50 focus-within:border-emerald-500'}`}>
          <Search size={16} className="shrink-0 text-slate-400" />
          <input autoFocus value={query} onChange={event => { setQuery(event.target.value); setOpenId(null); }} placeholder="Search banks and wallets" aria-label="Search banks and wallets" className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none" />
          {query && <button aria-label="Clear search" onClick={() => setQuery('')} className="rounded p-1 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
        </label>
        <div className="hide-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          {KIND_FILTERS.map(filter => <button key={filter.id} onClick={() => { setKind(filter.id); setOpenId(null); }} className={chip(kind === filter.id)}>{filter.label}</button>)}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        {results.map(institution => {
          const open = openId === institution.id || (results.length === 1 && openId === null);
          const best = Math.max(0, ...institution.products.map(headlineRate));
          return <div key={institution.id} className="py-0.5">
            <button onClick={() => institution.products.length === 1 ? onPick(institution, institution.products[0]) : setOpenId(open ? '' : institution.id)} className={`flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left ${row}`}>
              <Badge institution={institution} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{institution.name}</span>
                <span className="block truncate text-xs text-slate-500">{institution.products.length === 1 ? institution.products[0].name : `${institution.products.length} accounts`}{best > 0 ? ` · up to ${percent(best)} p.a.` : ''}</span>
              </span>
              <ChevronRight size={16} className={`shrink-0 text-slate-400 transition-transform ${open && institution.products.length > 1 ? 'rotate-90' : ''}`} />
            </button>
            {open && institution.products.length > 1 && <div className={`mb-1 ml-8 mt-0.5 space-y-0.5 border-l pl-3 ${advanced ? 'border-slate-700' : 'border-slate-200'}`}>
              {institution.products.map(product => {
                const rate = headlineRate(product);
                return <button key={product.id} onClick={() => onPick(institution, product)} className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left ${row}`}>
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold">{product.name}</span><span className="block truncate text-[11px] text-slate-500">{product.type === 'Card' ? 'Credit card' : product.type === 'Digital' ? 'E-wallet' : product.purpose || 'Account'}{product.verify ? ' · check rate' : ''}</span></span>
                  <span className={`shrink-0 text-xs font-bold ${rate > 0 ? (advanced ? 'text-violet-300' : 'text-emerald-600') : 'text-slate-400'}`}>{product.type === 'Card' ? '' : rate > 0 ? `${product.interest?.boost || (product.interest?.tiers?.length ?? 0) > 0 ? 'up to ' : ''}${percent(rate)}` : 'No interest'}</span>
                </button>;
              })}
            </div>}
          </div>;
        })}
        {!results.length && <p className="px-3 py-6 text-center text-sm text-slate-500">No match for “{query}”. Add it yourself below.</p>}
      </div>

      <div className={`shrink-0 space-y-2 border-t p-4 ${advanced ? 'border-slate-700' : 'border-slate-100'}`}>
        <div className="grid grid-cols-[1fr_1fr] gap-2">
          <button onClick={() => onOther()} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold ${advanced ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}><Plus size={15} /> Other / not listed</button>
          <button onClick={() => onOther('Cash')} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold ${advanced ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}><Banknote size={15} /> Cash on hand</button>
        </div>
        <p className="text-center text-[11px] text-slate-500">Rates as of {CATALOG_AS_OF}, before tax. Check your bank, as rates change.</p>
      </div>
    </div>
  </div>;
}

export { Badge as InstitutionBadge };
