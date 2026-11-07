import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore, type RewardsSnapshot } from '../store/useStore';
import { DATA_CHANGED } from '../lib/changeWatcher';
import { itemById, STAGES } from '../lib/rewardsCatalog';
import { celebrate } from './Celebrations';
import { Pet } from './Pet';

const SEEN_KEY = 'fingent-rewards-seen';
const STAGE_KEY = 'fingent-pet-stage';
const REFRESH = 'fingent-rewards-refresh';
const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } };

/** Asks the watcher to reload points now (after buying, equipping, or starting a challenge). */
export const refreshRewards = () => window.dispatchEvent(new Event(REFRESH));

/** Pet props from a rewards summary, optionally with a previewed item swapped in. */
export function petLook(rewards: RewardsSnapshot, preview: Partial<Record<string, string | null>> = {}) {
  const equipped = { ...rewards.equipped, ...preview } as Record<string, string | null | undefined>;
  return { color: itemById(equipped.color)?.value ?? '#fff3e4', hat: equipped.hat ?? undefined, face: equipped.face ?? undefined, neck: equipped.neck ?? undefined, eyes: equipped.eyes ?? undefined, pattern: equipped.pattern ?? undefined, equipped };
}

/**
 * Keeps the Ipon summary fresh: shortly after any change it checks for new
 * points, shows a toast for each award, and marks hatching and growing up.
 */
export function RewardsWatcher() {
  const { setRewards, hiddenTabs } = useStore();
  const hidden = hiddenTabs.includes('rewards');
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;
  const [moment, setMoment] = useState<null | { kind: 'hatch' | 'grow'; stage: number }>(null);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    const load = async () => {
      const response = await fetch('/api/rewards', { cache: 'no-store' }).catch(() => null);
      if (!active || !response?.ok) return;
      const data = await response.json() as RewardsSnapshot & { new_events?: { points: number; label: string }[] };
      setRewards(data);
      const newest = data.events.reduce((latest, event) => String(event.created_at || '') > latest ? String(event.created_at) : latest, '');
      const seen = read(SEEN_KEY);
      const fresh = (seen ? data.events.filter(event => String(event.created_at || '') > seen) : data.new_events ?? []).filter(event => event.points > 0);
      if (newest) write(SEEN_KEY, newest);
      if (hiddenRef.current) return;
      fresh.slice(0, 3).forEach(event => celebrate({ kind: 'points', title: `+${event.points} points`, message: event.label }));
      if (fresh.length > 3) celebrate({ kind: 'points', title: `+${fresh.slice(3).reduce((sum, event) => sum + event.points, 0)} more points`, message: `${fresh.length - 3} more rewards` });
      const lastStage = Number(read(STAGE_KEY) ?? -1);
      if (data.index >= 1 && !data.hatched_at) setMoment({ kind: 'hatch', stage: data.index });
      else if (lastStage >= 1 && data.index > lastStage) setMoment({ kind: 'grow', stage: data.index });
      write(STAGE_KEY, String(data.index));
    };
    const soon = () => { window.clearTimeout(timer); timer = window.setTimeout(() => void load(), 900); };
    const now = () => { window.clearTimeout(timer); void load(); };
    void load();
    window.addEventListener(DATA_CHANGED, soon);
    window.addEventListener(REFRESH, now);
    return () => { active = false; window.clearTimeout(timer); window.removeEventListener(DATA_CHANGED, soon); window.removeEventListener(REFRESH, now); };
  }, [setRewards]);

  return <AnimatePresence>{moment && !hidden && <PetMoment key={moment.kind + moment.stage} moment={moment} onClose={() => setMoment(null)} />}</AnimatePresence>;
}

function PetMoment({ moment, onClose }: { moment: { kind: 'hatch' | 'grow'; stage: number }; onClose: () => void; key?: string }) {
  const { rewards, themeMode } = useStore();
  const advanced = themeMode === 'advanced';
  const [hatched, setHatched] = useState(moment.kind === 'grow');
  const [name, setName] = useState(rewards?.pet_name || 'Mochi');
  const [saving, setSaving] = useState(false);
  const [cheer, setCheer] = useState(0);
  useEffect(() => { if (moment.kind !== 'hatch') { setCheer(1); return; } const timer = window.setTimeout(() => { setHatched(true); setCheer(1); }, 1600); return () => window.clearTimeout(timer); }, [moment.kind]);
  if (!rewards) return null;
  const look = petLook(rewards);
  const finish = async () => {
    if (moment.kind === 'hatch') {
      setSaving(true);
      await fetch('/api/rewards/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pet_name: name.trim() || 'Mochi', hatched: true }) }).catch(() => null);
      refreshRewards();
    }
    onClose();
  };
  return <motion.div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-6 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.div role="dialog" aria-modal="true" aria-label={moment.kind === 'hatch' ? 'Your egg is hatching' : 'Your pet grew'} initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }} className={`w-full max-w-sm rounded-[2rem] p-6 text-center shadow-2xl ${advanced ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}>
      <div className="mx-auto flex h-48 items-end justify-center">
        <Pet stage={hatched ? moment.stage : 0} hatchProgress={1} mood="happy" color={look.color} hat={look.hat} face={look.face} neck={look.neck} eyes={look.eyes} pattern={look.pattern} size={180} cheer={cheer} />
      </div>
      {moment.kind === 'hatch'
        ? <>
          <h2 className="mt-2 text-2xl font-black">{hatched ? 'Hello there!' : 'Your egg is hatching…'}</h2>
          <p className="mt-1 text-sm text-slate-500">{hatched ? 'Your saving buddy is here. Give it a name.' : 'All that saving paid off.'}</p>
          {hatched && <>
            <input autoFocus value={name} maxLength={24} onChange={event => setName(event.target.value)} aria-label="Pet name" className={`mt-4 w-full rounded-xl border px-4 py-3 text-center text-lg font-bold outline-none ${advanced ? 'border-slate-600 bg-slate-900 focus:border-violet-500' : 'border-slate-200 bg-slate-50 focus:border-emerald-500'}`} />
            <button disabled={saving} onClick={finish} className={`mt-3 w-full rounded-xl py-3 font-bold text-white ${advanced ? 'bg-violet-600 hover:bg-violet-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}>Say hi to {name.trim() || 'Mochi'}</button>
          </>}
        </>
        : <>
          <h2 className="mt-2 text-2xl font-black">{rewards.pet_name} grew!</h2>
          <p className="mt-1 text-sm text-slate-500">Now a {STAGES[moment.stage]?.name}. New items unlocked in the shop.</p>
          <button onClick={finish} className={`mt-4 w-full rounded-xl py-3 font-bold text-white ${advanced ? 'bg-violet-600 hover:bg-violet-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}>Yay!</button>
        </>}
    </motion.div>
  </motion.div>;
}
