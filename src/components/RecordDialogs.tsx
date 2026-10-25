import { ReactNode, useState } from 'react';
import { X } from 'lucide-react';

export type AccountOption = { id: number; name: string; type: string; balance?: number };

const card = (advanced: boolean) => advanced ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-100 text-slate-900';
const field = (advanced: boolean) => `w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${advanced ? 'bg-slate-900 border-slate-700 focus:border-violet-500' : 'bg-slate-50 border-slate-200 focus:border-emerald-500'}`;
const primary = (advanced: boolean) => `rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60 ${advanced ? 'bg-violet-600 hover:bg-violet-700' : 'bg-emerald-600 hover:bg-emerald-700'}`;
const secondary = (advanced: boolean) => `rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-60 ${advanced ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`;

function Dialog({ advanced, title, onClose, children }: { advanced: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={onClose}>
    <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()} className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${card(advanced)}`}>
      <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-xl font-bold">{title}</h3><button aria-label="Close" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} /></button></div>
      {children}
    </div>
  </div>;
}

/**
 * Asks which account money moves through. With `noneLabel`, the user can also
 * choose to record nothing; a `defaultAccountId` of null preselects that choice.
 */
export function AccountChoiceDialog({ advanced, title, message, accounts, defaultAccountId, accountLabel, noneLabel, confirmLabel, onConfirm, onClose }: {
  advanced: boolean; title: string; message: ReactNode; accounts: AccountOption[]; defaultAccountId?: number | null;
  accountLabel: string; noneLabel?: string; confirmLabel: string; onConfirm: (accountId: number | null) => Promise<void>; onClose: () => void;
}) {
  const initial = defaultAccountId === null && noneLabel ? ''
    : defaultAccountId && accounts.some(account => account.id === defaultAccountId) ? String(defaultAccountId)
    : accounts[0] ? String(accounts[0].id) : '';
  const [accountId, setAccountId] = useState(initial);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const confirm = async () => {
    setWorking(true); setError('');
    try { await onConfirm(accountId ? Number(accountId) : null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save this change.'); setWorking(false); }
  };
  return <Dialog advanced={advanced} title={title} onClose={onClose}>
    <div className="text-sm text-slate-500 dark:text-slate-400">{message}</div>
    <label className="mt-4 block text-sm font-bold">{accountLabel}
      <select value={accountId} onChange={event => setAccountId(event.target.value)} className={`${field(advanced)} mt-1.5`}>
        {accounts.map(account => <option key={account.id} value={account.id}>{account.name} · {account.type} · ₱{Number(account.balance || 0).toLocaleString()}</option>)}
        {noneLabel && <option value="">{noneLabel}</option>}
      </select>
    </label>
    {!accounts.length && !noneLabel && <p className="mt-3 text-sm text-slate-500">Add an account first.</p>}
    {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}
    <div className="mt-6 flex justify-end gap-2"><button onClick={onClose} disabled={working} className={secondary(advanced)}>Cancel</button><button onClick={confirm} disabled={working || (!accountId && !noneLabel)} className={primary(advanced)}>{working ? 'Saving…' : confirmLabel}</button></div>
  </Dialog>;
}

/** Deletes a record, optionally undoing the transactions it created. */
export function DeleteRecordDialog({ advanced, title, message, linkedCount, onDelete, onClose }: {
  advanced: boolean; title: string; message: ReactNode; linkedCount: number; onDelete: (undo: boolean) => Promise<void>; onClose: () => void;
}) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const remove = async (undo: boolean) => {
    setWorking(true); setError('');
    try { await onDelete(undo); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete this record.'); setWorking(false); }
  };
  const plural = linkedCount === 1 ? 'transaction' : 'transactions';
  const them = linkedCount === 1 ? 'it' : 'them';
  return <Dialog advanced={advanced} title={title} onClose={onClose}>
    <div className="text-sm text-slate-500 dark:text-slate-400">{message}</div>
    {linkedCount > 0 && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">It created {linkedCount} account {plural}. Undo {them} if this record was a mistake; keep {them} if the money really moved.</p>}
    {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}
    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
      <button onClick={onClose} disabled={working} className={secondary(advanced)}>Cancel</button>
      {linkedCount > 0 && <button onClick={() => remove(false)} disabled={working} className={secondary(advanced)}>Delete, keep {plural}</button>}
      <button onClick={() => remove(linkedCount > 0)} disabled={working} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60">{linkedCount > 0 ? `Delete and undo ${linkedCount} ${plural}` : 'Delete'}</button>
    </div>
  </Dialog>;
}
