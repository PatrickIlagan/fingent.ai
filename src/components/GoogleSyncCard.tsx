import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Cloud, CloudOff, KeyRound, Laptop, RefreshCw, Smartphone } from 'lucide-react';
import { useStore } from '../store/useStore';
import { canUseGoogle, connectGoogle, disconnectGoogle, getSyncState, isGoogleConnected, onSyncEvent, restoreFromDrive, setAutoSync, syncNow, type SyncState } from '../lib/driveSync';

const ago = (iso: string | null) => {
  if (!iso) return '';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/** Settings: connect Google, automatic sync, and manual restore for backups with another password. */
export function GoogleSyncCard() {
  const advanced = useStore(state => state.themeMode) === 'advanced';
  const [state, setState] = useState<SyncState | null>(null);
  const [busy, setBusy] = useState<'' | 'connect' | 'sync' | 'disconnect' | 'restore'>('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [showRestore, setShowRestore] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const refresh = () => getSyncState().then(setState).catch(reason => setError(reason instanceof Error ? reason.message : 'Could not read sync status.'));

  useEffect(() => { void refresh(); return onSyncEvent(event => {
    if (event.status === 'error') { setError(event.message || 'Sync failed.'); if (/different password/.test(event.message || '')) setShowRestore(true); }
    if (['pushed', 'pulled', 'idle'].includes(event.status)) { setError(''); void refresh(); }
  }); }, []);

  const run = async (kind: typeof busy, work: () => Promise<unknown>, done?: string) => {
    setBusy(kind); setError(''); setNote('');
    try { await work(); if (done) setNote(done); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Something went wrong.'); }
    finally { setBusy(''); void refresh(); }
  };

  const panel = advanced ? 'border-slate-700 bg-slate-900/50' : 'border-slate-100 bg-slate-50';
  const primary = `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${advanced ? 'bg-violet-600 hover:bg-violet-700' : 'bg-emerald-600 hover:bg-emerald-700'}`;
  const secondary = `inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${advanced ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`;
  if (!state) return <div className={`rounded-2xl border p-5 ${panel}`}><p className="text-sm text-slate-500">Checking sync…</p></div>;
  const connected = isGoogleConnected(state);
  const available = canUseGoogle(state);
  const DeviceIcon = Capacitor.isNativePlatform() ? Smartphone : Laptop;

  return <div className={`rounded-2xl border p-5 ${panel}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h4 className="flex items-center gap-2 font-bold">{connected ? <Cloud size={18} className={advanced ? 'text-violet-300' : 'text-emerald-600'} /> : <CloudOff size={18} className="text-slate-400" />} Google sync</h4>
        <p className="mt-1 text-sm text-slate-500">{connected
          ? (state.last_synced_at ? `Last synced ${ago(state.last_synced_at)}${state.last_synced_device ? ` from ${state.last_synced_device}` : ''}.` : 'Connected. The first sync runs now.')
          : 'Keep your computer and phone in step through your Google account.'}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><DeviceIcon size={13} /> This device: {state.device_name}</p>
      </div>
      {connected
        ? <div className="flex flex-wrap gap-2"><button disabled={!!busy} onClick={() => run('sync', () => syncNow({ interactive: true }), 'Up to date.')} className={primary}><RefreshCw size={15} className={busy === 'sync' ? 'animate-spin' : ''} /> Sync now</button><button disabled={!!busy} onClick={() => run('disconnect', disconnectGoogle, 'Disconnected. Your data stays on this device.')} className={secondary}>Disconnect</button></div>
        : <button disabled={!!busy || !available} onClick={() => run('connect', async () => { await connectGoogle(); await syncNow({ interactive: true }); })} className={primary}>{busy === 'connect' ? <RefreshCw size={15} className="animate-spin" /> : <Cloud size={15} />} {busy === 'connect' ? 'Finish in your browser…' : 'Connect Google'}</button>}
    </div>

    {connected && <label className="mt-4 flex items-center justify-between gap-3 text-sm"><span><span className="font-bold">Sync automatically</span><span className="block text-xs text-slate-500">When you unlock, and about 20 seconds after each change.</span></span>
      <button type="button" role="switch" aria-checked={state.auto} aria-label="Sync automatically" onClick={() => run('', () => setAutoSync(!state.auto))} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${state.auto ? (advanced ? 'bg-violet-600' : 'bg-emerald-500') : (advanced ? 'bg-slate-600' : 'bg-slate-300')}`}><span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${state.auto ? 'translate-x-5' : ''}`} /></button>
    </label>}

    <p className="mt-4 text-xs leading-relaxed text-slate-500">Everything is encrypted on this device with your <strong>app password</strong> (AES-256-GCM) before it's uploaded to a private Drive folder only FinGent can open. Use the same app password on every device. If both devices change before syncing, FinGent asks which copy to keep.</p>
    {!available && <p className={`mt-3 rounded-xl p-3 text-xs ${advanced ? 'bg-amber-500/10 text-amber-200' : 'bg-amber-50 text-amber-900'}`}>Google sign-in isn't set up in this build yet. The developer adds a Google OAuth client (see “Google sync” in the README).</p>}
    {note && <p className={`mt-3 text-sm ${advanced ? 'text-violet-300' : 'text-emerald-700'}`}>{note}</p>}
    {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}

    {connected && <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
      <button onClick={() => setShowRestore(value => !value)} className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">{showRestore ? 'Hide' : 'Restore a backup made with a different password'}</button>
      {showRestore && <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input type="password" autoComplete="off" value={restorePassword} onChange={event => setRestorePassword(event.target.value)} placeholder="That backup's password" className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none ${advanced ? 'border-slate-700 bg-slate-900 focus:border-violet-500' : 'border-slate-200 bg-white focus:border-emerald-500'}`} />
        <button disabled={!!busy || !restorePassword} onClick={() => run('restore', async () => { await restoreFromDrive(restorePassword); setRestorePassword(''); setShowRestore(false); }, 'Restored. It will be re-encrypted with this app password on the next sync.')} className={secondary}><KeyRound size={15} /> Restore</button>
      </div>}
      {showRestore && <p className="mt-2 text-[11px] text-slate-500">This replaces the data on this device with the Drive copy.</p>}
    </div>}
  </div>;
}
