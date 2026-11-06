import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Trophy } from 'lucide-react';
import { useStore } from '../store/useStore';

type Celebration = { id: number; title: string; message?: string; kind: 'success' | 'goal' };
const EVENT = 'fingent-celebrate';
const CELEBRATED_GOALS = 'fingent-celebrated-goals';

/** Shows a success toast; `kind: 'goal'` adds a confetti burst. */
export function celebrate(celebration: Omit<Celebration, 'id'>) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: celebration }));
}

/** Celebrates each goal the first time it is seen complete on this device, including ones finished by auto-save. */
export function celebrateCompletedGoals(goals: { id: number; name: string; progress?: { status?: string } }[]) {
  let seen: number[] = [];
  try { seen = JSON.parse(localStorage.getItem(CELEBRATED_GOALS) || '[]'); } catch { /* storage unavailable */ }
  const fresh = goals.filter(goal => goal.progress?.status === 'complete' && !seen.includes(goal.id));
  if (!fresh.length) return;
  fresh.forEach(goal => celebrate({ kind: 'goal', title: 'Goal reached! 🎉', message: goal.name }));
  try { localStorage.setItem(CELEBRATED_GOALS, JSON.stringify([...seen, ...fresh.map(goal => goal.id)])); } catch { /* storage unavailable */ }
}

const CONFETTI_COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#0ea5e9', '#14b8a6'];

function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 36 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 36 + Math.random() * 0.4;
    const distance = 120 + Math.random() * 160;
    return {
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
      x: Math.cos(angle) * distance,
      rise: Math.sin(angle) * distance - 80,
      rotate: Math.random() * 720 - 360,
      size: 6 + Math.random() * 6,
      round: index % 3 === 0,
      delay: Math.random() * 0.12,
      duration: 1.4 + Math.random() * 0.8,
    };
  }), []);
  return <div className="pointer-events-none fixed inset-0 z-[65] overflow-hidden">
    {pieces.map((piece, index) => (
      <motion.span key={index} className="absolute left-1/2 top-[38%]" style={{ width: piece.size, height: piece.round ? piece.size : piece.size * 0.45, background: piece.color, borderRadius: piece.round ? 999 : 2 }}
        initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
        animate={{ x: piece.x, y: [0, piece.rise, piece.rise + 260], opacity: [1, 1, 0], rotate: piece.rotate, scale: 1 }}
        transition={{ duration: piece.duration, delay: piece.delay, ease: 'easeOut', times: [0, 0.35, 1] }} />
    ))}
  </div>;
}

/** Toasts and confetti for things worth celebrating. Mounted once in App. */
export function Celebrations() {
  const [items, setItems] = useState<Celebration[]>([]);
  const reduceMotion = useReducedMotion();
  const advanced = useStore(state => state.themeMode === 'advanced');

  useEffect(() => {
    const onCelebrate = (event: Event) => {
      const item: Celebration = { id: Date.now() + Math.random(), ...(event as CustomEvent<Omit<Celebration, 'id'>>).detail };
      setItems(current => [...current.slice(-2), item]);
      window.setTimeout(() => setItems(current => current.filter(entry => entry.id !== item.id)), item.kind === 'goal' ? 4200 : 2600);
    };
    window.addEventListener(EVENT, onCelebrate);
    return () => window.removeEventListener(EVENT, onCelebrate);
  }, []);

  return <>
    <div className="pointer-events-none fixed inset-x-0 top-[calc(4.75rem+env(safe-area-inset-top))] z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map(item => (
          <motion.div key={item.id} layout
            initial={{ opacity: 0, y: -28, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur ${advanced ? 'border-slate-700 bg-slate-800/95 text-white' : 'border-emerald-100 bg-white/95 text-slate-900'}`}>
            <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 16, delay: 0.08 }}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${item.kind === 'goal' ? 'bg-gradient-to-br from-amber-400 to-rose-500' : 'bg-gradient-to-br from-emerald-400 to-teal-500'}`}>
              {item.kind === 'goal' ? <Trophy size={18} /> : <Check size={18} strokeWidth={3} />}
            </motion.span>
            <div className="min-w-0">
              <p className="font-bold leading-tight">{item.title}</p>
              {item.message && <p className="truncate text-sm text-slate-500 dark:text-slate-400">{item.message}</p>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
    {!reduceMotion && <AnimatePresence>{items.filter(item => item.kind === 'goal').map(item => <Confetti key={item.id} />)}</AnimatePresence>}
  </>;
}
