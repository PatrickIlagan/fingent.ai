import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { genericFacts, SUGGESTION_SOURCES, suggestionsFor, type Suggestion, type SuggestionData, type SuggestionPage } from '../lib/suggestions';
import { getGeminiTip } from '../lib/byokAssistant';

const ENDPOINTS: Record<keyof SuggestionData, string> = {
  accounts: '/api/accounts', transactions: '/api/transactions', goals: '/api/goals', liabilities: '/api/liabilities',
  portfolios: '/api/portfolios', incomeFlows: '/api/income_flows', career: '/api/career', careerTasks: '/api/career/tasks',
  invoices: '/api/freelancing/invoices', timeLogs: '/api/freelancing/time_logs', services: '/api/freelancing/services', businesses: '/api/businesses',
};

/**
 * A compact card of up to three tips for the page, worked out on this device.
 * Tips can be dismissed (remembered here) and their buttons jump to the right
 * place. Hidden when AI features or suggestions are switched off in Settings.
 */
export function Suggestions({ page, onNavigate, className = '' }: { page: SuggestionPage; onNavigate?: (tab: string) => void; className?: string }) {
  const { themeMode, shouldRefresh, aiEnabled, suggestionsEnabled, geminiSuggestions, dismissedSuggestions, dismissSuggestion, setFocusGoalId } = useStore();
  const advanced = themeMode === 'advanced';
  const [items, setItems] = useState<Suggestion[]>([]);
  const [geminiTip, setGeminiTip] = useState<string | null>(null);
  const on = aiEnabled && suggestionsEnabled;

  useEffect(() => {
    if (!on) return;
    let active = true;
    const keys = SUGGESTION_SOURCES[page];
    Promise.all(keys.map(key => fetch(ENDPOINTS[key]).then(response => response.ok ? response.json() : null).catch(() => null)))
      .then(results => {
        if (!active) return;
        const data: SuggestionData = {};
        keys.forEach((key, index) => { (data as any)[key] = results[index] ?? (key === 'career' ? {} : []); });
        const next = suggestionsFor(page, data);
        setItems(next);
        if (geminiSuggestions) getGeminiTip(page, genericFacts(next)).then(tip => { if (active) setGeminiTip(tip); });
        else setGeminiTip(null);
      });
    return () => { active = false; };
  }, [page, on, shouldRefresh, geminiSuggestions]);

  const visible = items.filter(item => !dismissedSuggestions.includes(item.id));
  if (!on || (!visible.length && !geminiTip)) return null;

  const toneDot = (tone: Suggestion['tone']) => tone === 'warn' ? 'bg-amber-400' : tone === 'good' ? 'bg-emerald-400' : advanced ? 'bg-violet-400' : 'bg-sky-400';
  const go = (item: Suggestion) => {
    if (!item.action || !onNavigate) return;
    if (item.action.goalId) setFocusGoalId(item.action.goalId);
    onNavigate(item.action.tab);
  };

  return <section aria-label="Suggestions" className={`rounded-3xl border px-4 py-3.5 shadow-sm ${advanced ? 'border-violet-500/20 bg-slate-800/80' : 'border-emerald-100 bg-white/80'} ${className}`}>
    <p className={`mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] ${advanced ? 'text-violet-300' : 'text-emerald-700'}`}><Sparkles size={13} /> Suggestions</p>
    <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
      <AnimatePresence initial={false}>
        {visible.map(item => <motion.li key={item.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }} transition={{ duration: 0.22 }} className="flex items-start gap-2.5 py-2">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneDot(item.tone)}`} />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug text-slate-700 dark:text-slate-200">{item.text}</p>
            {item.action && onNavigate && <button onClick={() => go(item)} className={`mt-1 inline-flex items-center gap-1 text-xs font-bold ${advanced ? 'text-violet-300 hover:text-violet-200' : 'text-emerald-700 hover:text-emerald-800'}`}>{item.action.label} <ArrowRight size={12} /></button>}
          </div>
          <button aria-label="Dismiss suggestion" onClick={() => dismissSuggestion(item.id)} className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"><X size={14} /></button>
        </motion.li>)}
      </AnimatePresence>
      {geminiTip && <li className="flex items-start gap-2.5 py-2">
        <Sparkles size={13} className={`mt-1 shrink-0 ${advanced ? 'text-violet-300' : 'text-emerald-600'}`} />
        <p className="text-sm leading-snug text-slate-600 dark:text-slate-300">{geminiTip} <span className="text-[11px] text-slate-400">· Gemini</span></p>
      </li>}
    </ul>
  </section>;
}
