import { useId, useRef, type ElementType, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';

export type SegmentedOption<T extends string> = { value: T; label: string; icon?: ElementType; tone?: 'rose' | 'emerald'; disabled?: boolean };

const TONES = {
  rose: { basic: 'bg-rose-50 text-rose-600 ring-1 ring-rose-100', advanced: 'bg-rose-500/20 text-rose-300' },
  emerald: { basic: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100', advanced: 'bg-emerald-500/20 text-emerald-300' },
};

/**
 * A row of choices with a pill that slides to the selected one. Labels never
 * wrap; when space runs out the row scrolls sideways. Arrow keys move the choice.
 */
export function Segmented<T extends string>({ options, value, onChange, label, size = 'md', fill = true, className = '' }: {
  options: SegmentedOption<T>[]; value: T; onChange: (value: T) => void; label: string;
  size?: 'sm' | 'md'; fill?: boolean; className?: string;
}) {
  const advanced = useStore(state => state.themeMode) === 'advanced';
  const pillId = `segment-${useId()}`;
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.filter(option => !option.disabled);

  const move = (event: KeyboardEvent, current: T) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!step || !enabled.length) return;
    event.preventDefault();
    const at = enabled.findIndex(option => option.value === current);
    const next = enabled[(at + step + enabled.length) % enabled.length];
    onChange(next.value);
    buttons.current[options.indexOf(next)]?.focus();
  };

  return <div role="radiogroup" aria-label={label} className={`hide-scrollbar flex gap-1 overflow-x-auto rounded-xl p-1 ${advanced ? 'bg-slate-900/70' : 'bg-slate-100'} ${className}`}>
    {options.map((option, index) => {
      const active = option.value === value;
      const Icon = option.icon;
      const pill = option.tone ? TONES[option.tone][advanced ? 'advanced' : 'basic'] : advanced ? 'bg-violet-600 text-white' : 'bg-white text-slate-900 shadow-sm';
      return <button
        key={option.value}
        ref={element => { buttons.current[index] = element; }}
        type="button"
        role="radio"
        aria-checked={active}
        tabIndex={active ? 0 : -1}
        disabled={option.disabled}
        onClick={() => onChange(option.value)}
        onKeyDown={event => move(event, option.value)}
        className={`relative shrink-0 whitespace-nowrap rounded-lg font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${fill ? 'flex-1' : ''} ${size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'} ${active ? (option.tone ? '' : advanced ? 'text-white' : 'text-slate-900') : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
      >
        {active && <motion.span layoutId={pillId} className={`absolute inset-0 rounded-lg ${pill}`} transition={{ type: 'spring', stiffness: 520, damping: 38 }} />}
        <span className={`relative z-10 flex items-center justify-center gap-1.5 ${active && option.tone ? TONES[option.tone][advanced ? 'advanced' : 'basic'].split(' ').filter(name => name.startsWith('text-')).join(' ') : ''}`}>{Icon && <Icon size={size === 'sm' ? 13 : 15} />}{option.label}</span>
      </button>;
    })}
  </div>;
}
