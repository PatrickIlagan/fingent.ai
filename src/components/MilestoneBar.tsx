import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { MILESTONES, milestonePoints } from '../lib/rewards';

/**
 * A goal progress bar with 25 / 50 / 75% ticks. Ticks whose points were
 * earned glow; the bar itself fills in on first view.
 */
export function MilestoneBar({ goalId, percent, fill, height = 'h-3', className = '' }: { goalId: number; percent: number; fill: string; height?: string; className?: string }) {
  const reached = useStore(state => state.rewards?.milestones?.[goalId] ?? []) as number[];
  const hidden = useStore(state => state.hiddenTabs.includes('rewards'));
  const value = Math.max(0, Math.min(100, Number(percent) || 0));
  return <div className={`relative ${className}`}>
    <div className={`${height} w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700`}>
      <div className={`h-full rounded-full transition-all duration-1000 ${fill}`} style={{ width: `${value}%` }} />
    </div>
    {!hidden && [25, 50, 75].map(threshold => {
      const earned = reached.includes(threshold);
      return <span key={threshold} className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${threshold}%` }}>
        {earned
          ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.6 }} className="block h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.35)]" />
          : <span className={`block h-1.5 w-1.5 rounded-full ${value >= threshold ? 'bg-white/80' : 'bg-slate-300 dark:bg-slate-500'}`} />}
      </span>;
    })}
  </div>;
}

/** The four milestones for a goal and their points, for goal detail. */
export function MilestoneChips({ goalId, target, baseline }: { goalId: number; target: number; baseline: number | null | undefined }) {
  const reached = useStore(state => state.rewards?.milestones?.[goalId] ?? []) as number[];
  const hidden = useStore(state => state.hiddenTabs.includes('rewards'));
  if (hidden) return null;
  return <div className="mb-5">
    <p className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500"><Sparkles size={13} className="text-amber-500" /> Ipon milestones</p>
    <div className="grid grid-cols-4 gap-2">
      {MILESTONES.map(threshold => {
        const earned = reached.includes(threshold);
        const counted = baseline === null || baseline === undefined || threshold > Number(baseline);
        const points = milestonePoints(target, threshold);
        return <div key={threshold} className={`rounded-xl px-2 py-2 text-center ${earned ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30' : 'bg-slate-50 text-slate-500 dark:bg-slate-900/50'}`}>
          <p className="text-sm font-black">{threshold}%</p>
          <p className="text-[10px] font-bold">{!counted ? 'Already there' : points ? `${earned ? '✓ ' : ''}+${points}` : '—'}</p>
        </div>;
      })}
    </div>
  </div>;
}
