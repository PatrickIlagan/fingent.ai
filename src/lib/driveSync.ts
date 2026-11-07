import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from './firebase';
import { useStore } from '../store/useStore';
import { DATA_CHANGED, watchChanges } from './changeWatcher';

// Cross-device sync through the user's own Google Drive. Everything is
// encrypted on this device (AES-256-GCM, key from the app password via PBKDF2)
// before upload, into Drive's private app-data folder that only FinGent sees.
// One encrypted snapshot holds every table; devices take turns replacing it.

const BACKUP_NAME = 'fingent-sync-v1.enc';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const PUSH_DELAY_MS = 20_000;
const encoder = new TextEncoder(); const decoder = new TextDecoder();
const join = (...parts: Uint8Array[]) => { const out = new Uint8Array(parts.reduce((size, part) => size + part.length, 0)); let offset = 0; for (const part of parts) { out.set(part, offset); offset += part.length; } return out; };
async function keyFor(password: string, salt: Uint8Array, iterations: number) { const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
async function encrypt(snapshot: unknown, password: string) { const salt = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12)); const payload = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFor(password, salt, 600000), encoder.encode(JSON.stringify(snapshot)))); return join(encoder.encode('FGSYNC2'), salt, iv, payload); }
async function decrypt(payload: ArrayBuffer, password: string) {
  const data = new Uint8Array(payload);
  const version = decoder.decode(data.slice(0, 7));
  if (version !== 'FGSYNC1' && version !== 'FGSYNC2') throw new Error('This file is not a FinGent sync backup.');
  const iterations = version === 'FGSYNC2' ? 600000 : 250000;
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.slice(23, 35) }, await keyFor(password, data.slice(7, 23), iterations), data.slice(35));
    return JSON.parse(decoder.decode(plain));
  } catch {
    throw Object.assign(new Error('The copy in Google Drive was encrypted with a different password. Use the same app password on every device, or restore it below with its password.'), { code: 'wrong-password' });
  }
}

export type SyncState = {
  data_version: number; synced_version: number; remote_modified: string | null; auto: boolean;
  google_connected: boolean; google_provider: 'desktop' | 'native' | 'none';
  last_synced_at: string | null; last_synced_device: string | null; device_id: string; device_name: string;
};
type RemoteFile = { id: string; modifiedTime: string; appProperties?: Record<string, string> };
export type SyncEvent = { status: 'syncing' | 'pushed' | 'pulled' | 'idle' | 'error' | 'conflict'; message?: string; remoteDevice?: string; remoteTime?: string };

let sessionPassword: string | null = null;
let listeningForChanges = false;
let memoryToken: { value: string; expires: number } | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let running: Promise<unknown> | null = null;
const listeners = new Set<(event: SyncEvent) => void>();
export function onSyncEvent(listener: (event: SyncEvent) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
const emit = (event: SyncEvent) => listeners.forEach(listener => listener(event));
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, { cache: 'no-store', referrerPolicy: 'no-referrer', ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error || 'Request failed.'), { status: response.status });
  return body;
}
export const getSyncState = (): Promise<SyncState> => api('/api/system/sync/state');
const saveSyncState = (patch: Record<string, unknown>): Promise<SyncState> => api('/api/system/sync/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });

/** How this device signs in: the desktop app's own browser flow, native sign-in on phones, or the Firebase pop-up in a plain browser. */
function signInKind(state: SyncState): 'desktop' | 'native' | 'web' | null {
  if (Capacitor.isNativePlatform()) return 'native';
  if (state.google_provider === 'desktop') return 'desktop';
  return isFirebaseConfigured ? 'web' : null;
}
export const canUseGoogle = (state: SyncState) => signInKind(state) !== null;
export const isGoogleConnected = (state: SyncState) => state.google_connected || Boolean(memoryToken && memoryToken.expires > Date.now());

async function accessToken(state: SyncState, interactive: boolean): Promise<string | null> {
  const kind = signInKind(state);
  if (kind === 'desktop') {
    try { return (await api('/api/system/google/token')).access_token; }
    catch (error: any) { if (error.status === 409) return null; throw error; }
  }
  if (memoryToken && memoryToken.expires > Date.now()) return memoryToken.value;
  if (!interactive) return null;
  let value: string | undefined;
  if (kind === 'native') value = (await FirebaseAuthentication.signInWithGoogle({ scopes: [DRIVE_SCOPE] })).credential?.accessToken;
  else if (kind === 'web' && auth) value = GoogleAuthProvider.credentialFromResult(await signInWithPopup(auth, googleProvider))?.accessToken;
  else throw new Error('Google sign-in is not set up for this build yet. See "Google sync" in the README.');
  if (!value) throw new Error('Google sign-in did not allow access to Drive.');
  // Phone and browser tokens last about an hour and are kept in memory only.
  memoryToken = { value, expires: Date.now() + 55 * 60_000 };
  return value;
}

export async function connectGoogle(): Promise<SyncState> {
  const state = await getSyncState();
  if (signInKind(state) === 'desktop') {
    const { url } = await api('/api/system/google/start');
    window.open(url, '_blank', 'noopener'); // the desktop app hands this to the system browser
    for (let attempt = 0; attempt < 300; attempt += 1) {
      await wait(1000);
      const next = await getSyncState();
      if (next.google_connected) return next;
    }
    throw new Error('Google sign-in did not finish. Try again.');
  }
  await accessToken(state, true);
  return saveSyncState({ google_connected: true });
}

export async function disconnectGoogle() {
  memoryToken = null;
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
  const state = await getSyncState();
  if (signInKind(state) === 'desktop') await api('/api/system/google/disconnect', { method: 'POST' });
  else {
    if (Capacitor.isNativePlatform()) await FirebaseAuthentication.signOut().catch(() => undefined);
    await saveSyncState({ google_connected: false });
  }
}

export const setAutoSync = (auto: boolean) => saveSyncState({ auto });

async function remoteFile(token: string): Promise<RemoteFile | null> {
  const query = new URLSearchParams({ q: `name='${BACKUP_NAME}' and trashed=false`, spaces: 'appDataFolder', fields: 'files(id,modifiedTime,appProperties)' });
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${query}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!response.ok) throw new Error('Could not reach your Google Drive app folder.');
  return (await response.json()).files?.[0] ?? null;
}

async function upload(token: string, existing: RemoteFile | null, password: string, state: SyncState): Promise<RemoteFile> {
  const snapshotResponse = await fetch('/api/system/sync/export', { cache: 'no-store', referrerPolicy: 'no-referrer' });
  if (!snapshotResponse.ok) throw new Error('Could not prepare this device’s data for sync.');
  const { themeMode, accentColor, hiddenTabs } = useStore.getState();
  const payload = { ...(await snapshotResponse.json()), device: { id: state.device_id, name: state.device_name }, preferences: { themeMode, accentColor, hiddenTabs } };
  const metadata: Record<string, unknown> = { name: BACKUP_NAME, appProperties: { product: 'FinGent', format: 'FGSYNC2', deviceId: state.device_id, device: state.device_name.slice(0, 60) } };
  if (!existing) metadata.parents = ['appDataFolder'];
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([await encrypt(payload, password)], { type: 'application/octet-stream' }), BACKUP_NAME);
  const target = existing ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}` : 'https://www.googleapis.com/upload/drive/v3/files';
  const response = await fetch(`${target}?uploadType=multipart&fields=id,modifiedTime,appProperties`, { method: existing ? 'PATCH' : 'POST', headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-store' }, body: form, referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new Error('Uploading to Google Drive failed.');
  return response.json();
}

async function download(token: string, file: RemoteFile, password: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!response.ok) throw new Error('Downloading from Google Drive failed.');
  return decrypt(await response.arrayBuffer(), password);
}

async function importSnapshot(snapshot: any) {
  const { device, preferences, ...data } = snapshot;
  await api('/api/system/sync/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (preferences && typeof preferences === 'object') {
    const store = useStore.getState();
    useStore.setState({
      themeMode: preferences.themeMode === 'advanced' ? 'advanced' : preferences.themeMode === 'basic' ? 'basic' : store.themeMode,
      accentColor: ['emerald', 'ocean', 'violet', 'sunset', 'mango', 'sakura', 'matcha', 'midnight'].includes(preferences.accentColor) ? preferences.accentColor : store.accentColor,
      hiddenTabs: Array.isArray(preferences.hiddenTabs) ? preferences.hiddenTabs.filter((tab: unknown) => typeof tab === 'string') : store.hiddenTabs,
    });
  }
  return device?.name as string | undefined;
}

/** What to do with this device's data and the copy in Drive. */
export function syncDecision({ hasRemote, remoteChanged, localChanged }: { hasRemote: boolean; remoteChanged: boolean; localChanged: boolean }): 'push' | 'pull' | 'conflict' | 'idle' {
  if (!hasRemote) return 'push';
  if (remoteChanged && localChanged) return 'conflict';
  if (remoteChanged) return 'pull';
  if (localChanged) return 'push';
  return 'idle';
}

function exclusive<T>(work: () => Promise<T>): Promise<T> {
  const next = (running ?? Promise.resolve()).catch(() => undefined).then(work);
  const settled: Promise<unknown> = next.catch(() => undefined).finally(() => { if (running === settled) running = null; });
  running = settled;
  return next;
}

/**
 * Brings this device and Drive in line. `resolve` settles a conflict:
 * 'local' keeps this device's data (and replaces the Drive copy), 'remote' takes the Drive copy.
 */
export function syncNow({ interactive = false, resolve }: { interactive?: boolean; resolve?: 'local' | 'remote' } = {}) {
  return exclusive(async () => {
    const password = sessionPassword;
    if (!password) throw new Error('Unlock FinGent to sync.');
    const state = await getSyncState();
    const token = await accessToken(state, interactive);
    if (!token) { emit({ status: 'idle' }); return 'signed-out' as const; }
    emit({ status: 'syncing' });
    const remote = await remoteFile(token);
    const remoteChanged = Boolean(remote) && remote!.modifiedTime !== state.remote_modified && remote!.appProperties?.deviceId !== state.device_id;
    const localChanged = state.data_version > state.synced_version;
    const action = resolve === 'local' ? 'push' : resolve === 'remote' && remote ? 'pull' : syncDecision({ hasRemote: Boolean(remote), remoteChanged, localChanged });
    if (action === 'conflict') {
      emit({ status: 'conflict', remoteDevice: remote!.appProperties?.device, remoteTime: remote!.modifiedTime });
      return 'conflict' as const;
    }
    const now = new Date().toISOString();
    if (action === 'push') {
      const version = state.data_version;
      const file = await upload(token, remote, password, state);
      await saveSyncState({ synced_version: version, remote_modified: file.modifiedTime, last_synced_at: now, last_synced_device: state.device_name });
      emit({ status: 'pushed' });
      return 'pushed' as const;
    }
    if (action === 'pull') {
      const snapshot = await download(token, remote!, password);
      const device = await importSnapshot(snapshot);
      await saveSyncState({ synced_version: 'current', remote_modified: remote!.modifiedTime, last_synced_at: now, last_synced_device: remote!.appProperties?.device || device || null });
      useStore.getState().triggerRefresh();
      emit({ status: 'pulled', remoteDevice: remote!.appProperties?.device || device });
      return 'pulled' as const;
    }
    emit({ status: 'idle' });
    return 'idle' as const;
  });
}

const fail = (error: unknown) => emit({ status: 'error', message: error instanceof Error ? error.message : 'Sync failed.' });

async function autoSync(interactive: boolean) {
  const state = await getSyncState().catch(() => null);
  if (!state || !state.auto || !isGoogleConnected(state)) return;
  await syncNow({ interactive }).catch(fail);
}

/** Pushes changes about 20 seconds after the last one. */
export function schedulePush() {
  if (!sessionPassword) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { pushTimer = null; void autoSync(false); }, PUSH_DELAY_MS);
}

/** Called after unlock: keeps the app password in memory (only) for encryption and syncs once. */
export function startSyncSession(password: string) {
  sessionPassword = password;
  watchChanges();
  if (!listeningForChanges) { window.addEventListener(DATA_CHANGED, () => schedulePush()); listeningForChanges = true; }
  // Let the dashboard load first. On phones this may show the Google account sheet.
  setTimeout(() => { void autoSync(Capacitor.isNativePlatform()); }, 1200);
}

/** Called on lock: sends any pending change, then forgets the password and token. */
export async function endSyncSession() {
  if (pushTimer && sessionPassword) {
    clearTimeout(pushTimer);
    pushTimer = null;
    await autoSync(false);
  }
  sessionPassword = null;
  memoryToken = null;
}

/** Restores the Drive copy using a different password (an older backup, or one made before the app password changed). */
export async function restoreFromDrive(password: string) {
  if (!password) throw new Error('Enter that backup’s password first.');
  return exclusive(async () => {
    const state = await getSyncState();
    const token = await accessToken(state, true);
    if (!token) throw new Error('Connect Google first.');
    const file = await remoteFile(token);
    if (!file) throw new Error('No FinGent backup was found in this Google account.');
    const device = await importSnapshot(await download(token, file, password));
    // Marked as unsynced, so the next sync re-uploads it encrypted with this device's app password.
    await saveSyncState({ synced_version: -1, remote_modified: file.modifiedTime, last_synced_at: new Date().toISOString(), last_synced_device: file.appProperties?.device || device || null });
    useStore.getState().triggerRefresh();
  }).then(() => { void autoSync(false); });
}
