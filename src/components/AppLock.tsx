import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { LOCKED_EVENT, createAppLock, hasAppLock, lockApp, verifyAppLock } from '../lib/appLock';
import { Logo } from './Logo';
import { endSyncSession } from '../lib/driveSync';
import { useStore } from '../store/useStore';

const DESKTOP_IDLE_LOCK_MS = 10 * 60 * 1000;
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];

export function AppLock({ children, onUnlock }: { children: ReactNode; onUnlock: (password: string) => Promise<void> }) {
  const accentColor = useStore(state => state.accentColor);
  const [mode, setMode] = useState<'checking' | 'setup' | 'unlock' | 'unlocked'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let active = true;
    void hasAppLock()
      .then(configured => { if (active) setMode(configured ? 'unlock' : 'setup'); })
      .catch(reason => { if (active) { setError(reason instanceof Error ? reason.message : 'Could not verify app protection.'); setMode('setup'); } });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const relockWhenHidden = () => {
      if (document.visibilityState === 'hidden' && mode === 'unlocked') {
        setPassword('');
        setConfirm('');
        setError('');
        setMode('unlock');
      }
    };
    document.addEventListener('visibilitychange', relockWhenHidden);
    return () => document.removeEventListener('visibilitychange', relockWhenHidden);
  }, [mode]);
  useEffect(() => {
    // Desktop windows stay open for long periods, so lock after inactivity
    // or when the local server reports that the session has ended.
    if (Capacitor.isNativePlatform() || mode !== 'unlocked') return;
    const relock = () => {
      setPassword('');
      setConfirm('');
      setError('');
      setMode('unlock');
    };
    let lastActivity = Date.now();
    const markActive = () => { lastActivity = Date.now(); };
    const idleCheck = window.setInterval(() => {
      if (Date.now() - lastActivity < DESKTOP_IDLE_LOCK_MS) return;
      void lockApp();
      relock();
    }, 30_000);
    ACTIVITY_EVENTS.forEach(name => window.addEventListener(name, markActive, { passive: true }));
    window.addEventListener(LOCKED_EVENT, relock);
    return () => {
      window.clearInterval(idleCheck);
      ACTIVITY_EVENTS.forEach(name => window.removeEventListener(name, markActive));
      window.removeEventListener(LOCKED_EVENT, relock);
    };
  }, [mode]);
  // Leaving the unlocked state sends any pending sync, then forgets the password.
  useEffect(() => { if (mode === 'unlock') void endSyncSession(); }, [mode]);
  if (mode === 'checking') return null;
  if (mode === 'unlocked') return <>{children}</>;

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setWorking(true);
    try {
      if (mode === 'setup') {
        if (password !== confirm) throw new Error('Passwords do not match.');
        await createAppLock(password);
      } else if (!(await verifyAppLock(password))) throw new Error('Incorrect password.');
      await onUnlock(password);
      setPassword(''); setConfirm(''); setMode('unlocked');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not unlock FinGent.'); }
    finally { setWorking(false); }
  };

  if (mode === 'checking') return children;
  return <main className="min-h-screen bg-slate-950 px-5 py-10 text-white flex items-center justify-center"><form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-7 shadow-2xl"><div className="relative mb-6 w-fit"><Logo accent={accentColor} size={52} /><span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-900 bg-slate-800 text-emerald-300"><LockKeyhole size={12} /></span></div><h1 className="text-2xl font-black">{mode === 'setup' ? 'Protect FinGent' : 'Unlock FinGent'}</h1><p className="mt-2 text-sm leading-6 text-slate-400">{mode === 'setup' ? 'Create a password before accessing your financial dashboard. It is never stored—only a salted verifier stays on this device.' : 'Enter your app password before FinGent loads any dashboard or financial data.'}</p><label className="mt-6 block text-sm font-bold">App password<input autoFocus type="password" autoComplete={mode === 'setup' ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-500" /></label>{mode === 'setup' && <label className="mt-4 block text-sm font-bold">Confirm password<input type="password" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-500" /></label>}{error && <p className="mt-4 text-sm text-rose-300">{error}</p>}<button disabled={working} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-bold hover:bg-emerald-500 disabled:opacity-60"><ShieldCheck size={18} />{working ? 'Checking…' : mode === 'setup' ? 'Create app password' : 'Unlock'}</button></form></main>;
}
