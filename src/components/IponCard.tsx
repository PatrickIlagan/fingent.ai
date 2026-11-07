import { motion } from 'framer-motion';
import { ChevronRight, Flame, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Pet } from './Pet';
import { petLook } from './RewardsWatcher';

const MOOD = { happy: 'is happy', content: 'is doing fine', sleepy: 'is sleepy' };

/** Home: the pet, points, and how close it is to growing. Opens Ipon. */
export function IponCard({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { rewards, hiddenTabs, themeMode } = useStore();
  if (!rewards || hiddenTabs.includes('rewards')) return null;
  const advanced = themeMode === 'advanced';
  const look = petLook(rewards);
  const egg = rewards.index === 0;
  return <motion.button whileTap={{ scale: 0.98 }} onClick={() => onNavigate?.('rewards')} className={`flex w-full items-center gap-3 rounded-3xl border p-3 pr-4 text-left shadow-sm ${advanced ? 'border-slate-700 bg-slate-800' : 'border-amber-100 bg-gradient-to-r from-amber-50 via-white to-pink-50'}`}>
    <span className="shrink-0"><Pet stage={rewards.index} mood={rewards.mood} color={look.color} hat={look.hat} face={look.face} neck={look.neck} eyes={look.eyes} pattern={look.pattern} size={64} interactive={false} hatchProgress={egg ? rewards.progress : 0} /></span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-black">{egg ? 'Your egg is waiting' : `${rewards.pet_name} ${MOOD[rewards.mood]}`}</span>
      <span className="mt-0.5 flex items-center gap-2 text-xs font-bold text-slate-500">
        <span className="flex items-center gap-1 text-amber-600"><Sparkles size={12} /> {rewards.balance.toLocaleString()} pts</span>
        {rewards.streak > 0 && <span className="flex items-center gap-1 text-orange-600"><Flame size={12} /> {rewards.streak} wk</span>}
        {rewards.next && <span className="truncate">{rewards.toNext.toLocaleString()} to {egg ? 'hatch' : rewards.next.name}</span>}
      </span>
      {rewards.next && <span className={`mt-1.5 block h-1.5 overflow-hidden rounded-full ${advanced ? 'bg-slate-700' : 'bg-white'}`}><motion.span className="block h-full rounded-full bg-gradient-to-r from-amber-300 via-pink-400 to-violet-500" initial={{ width: 0 }} animate={{ width: `${Math.max(4, rewards.progress * 100)}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} /></span>}
    </span>
    <ChevronRight size={18} className="shrink-0 text-slate-400" />
  </motion.button>;
}
