import { useEffect, useState } from 'react';
import { CloudDownload, CloudUpload } from 'lucide-react';
import { useStore } from '../store/useStore';
import { onSyncEvent, syncNow, type SyncEvent } from '../lib/driveSync';
import { celebrate } from './Celebrations';
import { Dialog, dialogPrimary, dialogSecondary } from './RecordDialogs';

const when = (iso?: string) => iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

/** App-wide sync feedback: a note when another device's data arrives, and the choice when both devices changed. */
export function SyncStatus() {
  const advanced = useStore(state => state.themeMode) === 'advanced';
  const [conflict, setConflict] = useState<SyncEvent | null>(null);
  const [working, setWorking] = useState<'local' | 'remote' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => onSyncEvent(event => {
    if (event.status === 'conflict') setConflict(event);
    if (event.status === 'pulled') celebrate({ kind: 'success', title: 'Synced', message: event.remoteDevice ? `Updated with changes from ${event.remoteDevice}` : 'Updated from Google Drive' });
  }), []);

  if (!conflict) return null;
  const choose = async (resolve: 'local' | 'remote') => {
    setWorking(resolve); setError('');
    try { await syncNow({ resolve }); setConflict(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Sync failed.'); }
    finally { setWorking(null); }
  };
  return <Dialog advanced={advanced} title="Both devices changed" onClose={() => setConflict(null)}>
    <p className="text-sm text-slate-500">This device and {conflict.remoteDevice || 'another device'} both changed data since they last synced. Choose which copy to keep; the other one is replaced.</p>
    <div className="mt-4 space-y-2">
      <button disabled={working !== null} onClick={() => choose('local')} className={`flex w-full items-center gap-3 ${dialogPrimary(advanced)}`}><CloudUpload size={18} /><span className="text-left">{working === 'local' ? 'Uploading…' : 'Keep this device’s data'}</span></button>
      <button disabled={working !== null} onClick={() => choose('remote')} className={`flex w-full items-center gap-3 ${dialogSecondary(advanced)}`}><CloudDownload size={18} /><span className="text-left">{working === 'remote' ? 'Downloading…' : `Use the copy from ${conflict.remoteDevice || 'Google Drive'}${conflict.remoteTime ? ` (${when(conflict.remoteTime)})` : ''}`}</span></button>
    </div>
    {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}
    <p className="mt-3 text-[11px] text-slate-500">Not sure? Close this and export a backup from Settings first. Sync waits until you choose.</p>
  </Dialog>;
}
