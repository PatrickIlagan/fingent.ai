import { Capacitor } from '@capacitor/core';

const LOCK_KEY = 'fingent-app-lock-v1';
const ITERATIONS = 600000;

type LockVerifier = { version: 1; salt: string; verifier: string };

const encoder = new TextEncoder();

function encode(bytes: Uint8Array) {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

function decode(value: string) {
  const text = atob(value);
  return Uint8Array.from(text, (char) => char.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, material, 256));
}

function stored() {
  try {
    const candidate = JSON.parse(localStorage.getItem(LOCK_KEY) || 'null');
    return candidate?.version === 1 && typeof candidate.salt === 'string' && typeof candidate.verifier === 'string' ? candidate as LockVerifier : null;
  } catch { return null; }
}

async function desktopLockRequest(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, cache: 'no-store', referrerPolicy: 'no-referrer' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Could not verify the app password.');
  return body;
}

export async function hasAppLock() {
  if (Capacitor.isNativePlatform()) return Boolean(stored());
  const body = await desktopLockRequest('/api/system/lock/status');
  return Boolean(body.configured);
}

export async function createAppLock(password: string) {
  if (password.length < 12) throw new Error('Use at least 12 characters for the app password.');
  if (!Capacitor.isNativePlatform()) {
    await desktopLockRequest('/api/system/lock/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    return;
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const verifier: LockVerifier = { version: 1, salt: encode(salt), verifier: encode(await derive(password, salt)) };
  localStorage.setItem(LOCK_KEY, JSON.stringify(verifier));
}

export async function verifyAppLock(password: string) {
  if (!Capacitor.isNativePlatform()) {
    try {
      await desktopLockRequest('/api/system/lock/unlock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      return true;
    } catch {
      return false;
    }
  }
  const lock = stored();
  if (!lock) return false;
  const actual = await derive(password, decode(lock.salt));
  const expected = decode(lock.verifier);
  let difference = actual.length ^ expected.length;
  for (let index = 0; index < Math.max(actual.length, expected.length); index += 1) difference |= (actual[index] ?? 0) ^ (expected[index] ?? 0);
  return difference === 0;
}

export const LOCKED_EVENT = 'fingent-locked';

/** Desktop: closes the local database and ends the server session. */
export async function lockApp() {
  if (Capacitor.isNativePlatform()) return;
  await fetch('/api/system/lock', { method: 'POST', cache: 'no-store', referrerPolicy: 'no-referrer' }).catch(() => undefined);
}

/** Desktop: return to the lock screen if the local server reports that its session ended. */
export function installLockedResponseGuard() {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);
    if (response.status === 401 && response.headers.get('X-FinGent-Locked')) window.dispatchEvent(new Event(LOCKED_EVENT));
    return response;
  };
}

export async function changeAppLock(currentPassword: string, nextPassword: string) {
  if (!Capacitor.isNativePlatform()) throw new Error('Changing the desktop app password is not available yet.');
  if (!(await verifyAppLock(currentPassword))) throw new Error('Your current app password is incorrect.');
  await createAppLock(nextPassword);
}
