// Ipon rewards: points for real saving progress, a pet that grows with them,
// and challenges sized from the user's own income and spending. Pure functions,
// shared by the desktop server and the phone backend like sharedRules.ts.
//
// Points live in a ledger of events, each with a unique ref_key, so an award is
// only ever given once, however often (or on however many devices) checks run.
import { daysBetween, goalProgress, interestMode, isCashFlow, localDate, monthlyInterestEstimate, parseList, shiftDate, type GoalEntry } from './sharedRules';
import { DEFAULT_EQUIPPED, ITEMS, OPTIONAL_SLOTS, PLACED_SLOTS, STAGES, itemById, type ItemSlot } from './rewardsCatalog';
import { checkLayout, readLayout } from './roomLayout';

export type RewardEvent = { id?: number; ref_key: string; kind: string; points: number; label: string; date: string; created_at?: string };
export type RewardChallenge = { id: number; template: string; title: string; params: any; goal_id: number | null; started_at: string; ends_at: string | null; status: string; completed_at: string | null };
export type RewardProfile = { pet_name?: string | null; equipped?: unknown; hatched_at?: string | null; created_at?: string | null };
export type RewardData = {
  goals: any[]; accounts: any[]; transactions: any[]; incomeFlows: any[]; budgets: any[];
  challenges: RewardChallenge[]; events: RewardEvent[]; profile: RewardProfile; syncConnected?: boolean;
};
type Award = Omit<RewardEvent, 'id' | 'created_at'>;

const num = (value: unknown) => Number(value) || 0;
const peso = (value: number) => '₱' + Math.round(value).toLocaleString('en-PH');
const day = (value: unknown) => { const text = String(value ?? '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null; };
const monthEnd = (month: string) => { const [year, mon] = month.split('-').map(Number); return `${month}-${String(new Date(Date.UTC(year, mon, 0)).getUTCDate()).padStart(2, '0')}`; };
export function addMonths(date: string, months: number) {
  const [year, month, dayOfMonth] = date.split('-').map(Number);
  const last = new Date(Date.UTC(year, month - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1 + months, Math.min(dayOfMonth, last))).toISOString().slice(0, 10);
}
/** Monday of the week a date falls in. */
export const weekStart = (date: string) => { const [y, m, d] = date.split('-').map(Number); const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7; return shiftDate(date, 1 - weekday); };

// ---- Goal saving activity ------------------------------------------------------

/** Every goal history entry as a signed amount: added, auto-saved, and interest count up; taken out counts down. */
export function goalActivity(goals: any[]) {
  return goals.flatMap(goal => parseList<GoalEntry>(goal.transactions).map(entry => ({
    goal_id: Number(goal.id), date: day(entry.date), type: entry.type,
    amount: entry.type === 'withdrawal' ? -num(entry.amount) : entry.type === 'skipped' ? 0 : num(entry.amount),
  }))).filter((entry): entry is { goal_id: number; date: string; type: GoalEntry['type']; amount: number } => Boolean(entry.date));
}

/** Weeks (by their Monday) in which goal savings grew overall. */
export function savingWeeks(goals: any[]) {
  const totals = new Map<string, number>();
  for (const entry of goalActivity(goals)) totals.set(weekStart(entry.date), (totals.get(weekStart(entry.date)) || 0) + entry.amount);
  return new Set([...totals].filter(([, total]) => total > 0.005).map(([week]) => week));
}

/** Consecutive saving weeks up to now; this week counts once something is saved. */
export function currentStreak(weeks: Set<string>, today: string) {
  let week = weekStart(today);
  if (!weeks.has(week)) week = shiftDate(week, -7);
  let count = 0;
  while (weeks.has(week)) { count += 1; week = shiftDate(week, -7); }
  return count;
}

/** Points for crossing 25/50/75/100% of a goal, scaled by its size. Goals under ₱1,000 earn none. */
export function milestonePoints(target: number, threshold: 25 | 50 | 75 | 100) {
  const base = { 25: 10, 50: 20, 75: 30, 100: 50 }[threshold];
  const factor = target < 1000 ? 0 : target < 5000 ? 0.5 : target < 50000 ? 1 : target < 200000 ? 2 : 3;
  return Math.round(base * factor);
}
export const MILESTONES = [25, 50, 75, 100] as const;

// ---- Money context for challenges ----------------------------------------------

export function moneyContext(data: Pick<RewardData, 'transactions' | 'incomeFlows'>, today: string) {
  const months = [1, 2, 3].map(back => addMonths(`${today.slice(0, 7)}-01`, -back).slice(0, 7));
  const totals = (month: string) => {
    let income = 0; let expense = 0;
    const byCategory = new Map<string, number>();
    for (const transaction of data.transactions) {
      if (String(transaction.date || '').slice(0, 7) !== month || !isCashFlow(transaction)) continue;
      if (transaction.type === 'income') income += num(transaction.amount);
      else if (transaction.type === 'expense') { expense += num(transaction.amount); byCategory.set(String(transaction.category || 'Expenses'), (byCategory.get(String(transaction.category || 'Expenses')) || 0) + num(transaction.amount)); }
    }
    return { income, expense, byCategory };
  };
  const history = months.map(totals);
  const average = (values: number[]) => { const used = values.filter(value => value > 0); return used.length ? used.reduce((a, b) => a + b, 0) / used.length : 0; };
  const recurringIncome = data.incomeFlows.filter(flow => flow.is_recurring === true || num(flow.is_recurring) === 1).reduce((sum, flow) => sum + num(flow.amount), 0);
  const lastMonth = history[0];
  const top = [...lastMonth.byCategory].sort((a, b) => b[1] - a[1])[0];
  return {
    monthlyIncome: average(history.map(month => month.income)) || recurringIncome,
    monthlyExpenses: average(history.map(month => month.expense)),
    thisMonth: totals(today.slice(0, 7)),
    topCategory: top ? { name: top[0], amount: top[1] } : null,
    totals,
  };
}
type Context = ReturnType<typeof moneyContext> & { data: RewardData; today: string };

// ---- Challenges ----------------------------------------------------------------

type Suggestion = { template: string; score: number; title: string; why: string; points: number; params: any; ends_at: string | null; goal?: { name: string; target: number; date: string; icon: string; color: string } };
type Progress = { percent: number; label: string; steps: Award[]; outcome?: 'completed' | 'expired' };
type Template = { id: string; icon: string; suggest: (ctx: Context) => Suggestion | null; progress: (ctx: Context, challenge: RewardChallenge) => Progress };

const goalOf = (ctx: Context, challenge: RewardChallenge) => ctx.data.goals.find(goal => Number(goal.id) === Number(challenge.goal_id));
const positiveGoalSaving = (ctx: Context, from: string, to: string) => goalActivity(ctx.data.goals).filter(entry => (entry.type === 'contribution' || entry.type === 'autosave') && entry.date >= from && entry.date <= to).reduce((sum, entry) => sum + entry.amount, 0);
const roundUp = (value: number, step: number) => Math.max(step, Math.ceil(value / step) * step);
const sumTo = (n: number) => (n * (n + 1)) / 2;

const TEMPLATES: Template[] = [
  {
    id: 'emergency', icon: 'ShieldAlert',
    suggest: ctx => {
      if (ctx.monthlyExpenses <= 0) return null;
      const done = ctx.data.challenges.filter(item => item.template === 'emergency' && item.status === 'completed').map(item => num(item.params?.months));
      const months = [1, 3, 6].find(level => !done.includes(level));
      if (!months) return null;
      const target = roundUp(ctx.monthlyExpenses * months, 1000);
      const points = { 1: 150, 3: 400, 6: 800 }[months as 1 | 3 | 6];
      const hasGoal = ctx.data.goals.some(goal => /emergency/i.test(String(goal.name)));
      return { template: 'emergency', score: hasGoal ? 62 : 90, title: `Emergency fund: ${months} month${months === 1 ? '' : 's'}`, why: `${months === 1 ? 'A month' : `${months} months`} of your usual spending is about ${peso(target)}.`, points, params: { months, target, points }, ends_at: null, goal: { name: `Emergency fund (${months} mo)`, target, date: addMonths(ctx.today, months * 3), icon: 'ShieldAlert', color: 'emerald' } };
    },
    progress: (ctx, challenge) => {
      const goal = goalOf(ctx, challenge);
      if (!goal) return { percent: 0, label: 'Its goal was removed', steps: [], outcome: 'expired' };
      const pace = goalProgress(goal, ctx.data.accounts, ctx.today);
      return { percent: pace.percent / 100, label: `${peso(pace.saved)} of ${peso(pace.target)}`, steps: [], outcome: pace.status === 'complete' ? 'completed' : undefined };
    },
  },
  {
    id: 'pay-first', icon: 'Wallet',
    suggest: ctx => {
      const flows = ctx.data.incomeFlows.filter(flow => (flow.is_recurring === true || num(flow.is_recurring) === 1) && num(flow.amount) > 0).sort((a, b) => num(b.amount) - num(a.amount));
      if (!flows.length) return null;
      return { template: 'pay-first', score: 80, title: 'Pay yourself first', why: `Put 10% of each payday (about ${peso(num(flows[0].amount) * 0.1)} from ${flows[0].name}) into a goal within 3 days, 3 paydays in a row.`, points: 180, params: { percent: 0.1, needed: 3, points: 60 }, ends_at: shiftDate(ctx.today, 120) };
    },
    progress: (ctx, challenge) => {
      const recurring = new Set(ctx.data.incomeFlows.filter(flow => flow.is_recurring === true || num(flow.is_recurring) === 1).map(flow => Number(flow.id)));
      const paydays = ctx.data.transactions.filter(tx => tx.type === 'income' && tx.source === 'income_flow' && recurring.has(Number(tx.source_id)) && String(tx.date) >= challenge.started_at).sort((a, b) => String(a.date).localeCompare(String(b.date)));
      const steps: Award[] = [];
      for (const payday of paydays) {
        const saved = positiveGoalSaving(ctx, String(payday.date), shiftDate(String(payday.date), 3));
        if (saved >= num(payday.amount) * num(challenge.params?.percent || 0.1) - 0.005) steps.push({ ref_key: `challenge:${challenge.id}:payday:${payday.id}`, kind: 'challenge', points: 40, label: `Paid yourself first on ${payday.date}`, date: ctx.today });
      }
      const needed = num(challenge.params?.needed) || 3;
      const outcome = steps.length >= needed ? 'completed' : challenge.ends_at && ctx.today > challenge.ends_at ? 'expired' : undefined;
      return { percent: Math.min(1, steps.length / needed), label: `${Math.min(steps.length, needed)} of ${needed} paydays`, steps: steps.slice(0, needed), outcome };
    },
  },
  {
    id: 'ipon-52', icon: 'PiggyBank',
    suggest: ctx => {
      const step = ctx.monthlyIncome >= 60000 ? 50 : ctx.monthlyIncome >= 20000 ? 20 : 10;
      const target = step * sumTo(52);
      return { template: 'ipon-52', score: 60, title: '52-week ipon challenge', why: `Save ${peso(step)} in week 1, ${peso(step * 2)} in week 2, and so on: ${peso(target)} in a year.`, points: 1020, params: { step, target, points: 500 }, ends_at: shiftDate(ctx.today, 400), goal: { name: '52-week ipon', target, date: shiftDate(ctx.today, 364), icon: 'PiggyBank', color: 'amber' } };
    },
    progress: (ctx, challenge) => {
      const goal = goalOf(ctx, challenge);
      if (!goal) return { percent: 0, label: 'Its goal was removed', steps: [], outcome: 'expired' };
      const step = num(challenge.params?.step) || 20;
      const saved = goalProgress(goal, ctx.data.accounts, ctx.today).saved - num(challenge.params?.start_saved);
      const weeksSoFar = Math.min(52, Math.floor(daysBetween(challenge.started_at, ctx.today) / 7) + 1);
      const steps: Award[] = [];
      for (let week = 1; week <= weeksSoFar; week += 1) if (saved >= step * sumTo(week) - 0.005) steps.push({ ref_key: `challenge:${challenge.id}:week:${week}`, kind: 'challenge', points: 10, label: `52-week ipon: week ${week}`, date: ctx.today });
      const complete = steps.length >= 52;
      return { percent: Math.min(1, saved / (step * sumTo(52))), label: `Week ${weeksSoFar} · ${peso(Math.max(0, saved))} saved`, steps, outcome: complete ? 'completed' : challenge.ends_at && ctx.today > challenge.ends_at ? 'expired' : undefined };
    },
  },
  {
    id: 'save-20', icon: 'TrendingUp',
    suggest: ctx => ctx.monthlyIncome <= 0 ? null : { template: 'save-20', score: 70, title: 'Save 20% this month', why: `Keep about ${peso(ctx.monthlyIncome * 0.2)} of this month's income unspent.`, points: 100, params: { month: ctx.today.slice(0, 7), points: 100 }, ends_at: monthEnd(ctx.today.slice(0, 7)) },
    progress: (ctx, challenge) => {
      const month = String(challenge.params?.month || ctx.today.slice(0, 7));
      const { income, expense } = ctx.totals(month);
      const rate = income > 0 ? (income - expense) / income : 0;
      const over = ctx.today > monthEnd(month);
      return { percent: Math.max(0, Math.min(1, rate / 0.2)), label: `${Math.round(rate * 100)}% of income kept so far`, steps: [], outcome: over ? (rate >= 0.2 ? 'completed' : 'expired') : undefined };
    },
  },
  {
    id: 'spend-less', icon: 'TrendingDown',
    suggest: ctx => !ctx.topCategory || ctx.topCategory.amount < 1000 ? null : { template: 'spend-less', score: 72, title: `Spend less on ${ctx.topCategory.name}`, why: `You spent ${peso(ctx.topCategory.amount)} on it last month. Stay under that this month.`, points: 60, params: { category: ctx.topCategory.name, limit: ctx.topCategory.amount, month: ctx.today.slice(0, 7), points: 60 }, ends_at: monthEnd(ctx.today.slice(0, 7)) },
    progress: (ctx, challenge) => {
      const month = String(challenge.params?.month);
      const spent = ctx.totals(month).byCategory.get(String(challenge.params?.category)) || 0;
      const limit = num(challenge.params?.limit);
      const outcome = spent >= limit ? 'expired' : ctx.today > monthEnd(month) ? 'completed' : undefined;
      return { percent: Math.min(1, spent / Math.max(1, limit)), label: `${peso(spent)} of ${peso(limit)}`, steps: [], outcome };
    },
  },
  {
    id: 'no-spend-weekend', icon: 'Sofa',
    suggest: ctx => {
      const weekday = new Date(`${ctx.today}T00:00:00`).getDay();
      const saturday = weekday === 6 ? ctx.today : weekday === 0 ? shiftDate(ctx.today, -1) : shiftDate(ctx.today, 6 - weekday);
      return { template: 'no-spend-weekend', score: 50, title: 'No-spend weekend', why: `No spending on ${saturday} and ${shiftDate(saturday, 1)}, bills aside.`, points: 30, params: { saturday, points: 30 }, ends_at: shiftDate(saturday, 1) };
    },
    progress: (ctx, challenge) => {
      const saturday = String(challenge.params?.saturday);
      const sunday = shiftDate(saturday, 1);
      const spent = ctx.data.transactions.some(tx => tx.type === 'expense' && isCashFlow(tx) && tx.source !== 'liability' && (tx.date === saturday || tx.date === sunday));
      const outcome = spent ? 'expired' : ctx.today > sunday ? 'completed' : undefined;
      return { percent: ctx.today < saturday ? 0 : ctx.today === saturday ? 0.5 : 1, label: spent ? 'Something was spent' : ctx.today < saturday ? `Starts ${saturday}` : 'No spending so far', steps: [], outcome };
    },
  },
  {
    id: 'earn-interest', icon: 'BadgePercent',
    suggest: ctx => {
      const earning = ctx.data.accounts.filter(account => interestMode(account) !== 'off');
      const monthly = earning.reduce((sum, account) => sum + monthlyInterestEstimate(account, ctx.today), 0);
      return { template: 'earn-interest', score: earning.length ? (monthly < 100 ? 55 : 40) : 58, title: earning.length ? 'Earn ₱100 in interest' : 'Earn your first ₱100 in interest', why: earning.length ? 'Interest on your savings counts. Keep money where it earns.' : 'Set a rate on a savings account, or add one from the bank list.', points: 50, params: { target: 100, points: 50 }, ends_at: shiftDate(ctx.today, 180) };
    },
    progress: (ctx, challenge) => {
      const earned = ctx.data.transactions.filter(tx => tx.type === 'income' && (tx.source === 'interest' || String(tx.category).toLowerCase() === 'interest') && String(tx.date) >= challenge.started_at).reduce((sum, tx) => sum + num(tx.amount), 0);
      const target = num(challenge.params?.target) || 100;
      return { percent: Math.min(1, earned / target), label: `${peso(earned)} of ${peso(target)}`, steps: [], outcome: earned >= target ? 'completed' : challenge.ends_at && ctx.today > challenge.ends_at ? 'expired' : undefined };
    },
  },
  {
    id: 'weekly-saver', icon: 'CalendarCheck',
    suggest: ctx => {
      const amount = ctx.monthlyIncome > 0 ? roundUp(ctx.monthlyIncome * 0.05 / 4.345, 50) : 500;
      const start = weekStart(ctx.today);
      return { template: 'weekly-saver', score: 65, title: `Add ${peso(amount)} to goals this week`, why: ctx.monthlyIncome > 0 ? 'About 5% of a week’s income.' : 'A small, steady step.', points: 40, params: { amount, week_start: start, points: 40 }, ends_at: shiftDate(start, 6) };
    },
    progress: (ctx, challenge) => {
      const start = String(challenge.params?.week_start);
      const saved = positiveGoalSaving(ctx, start, shiftDate(start, 6));
      const amount = num(challenge.params?.amount);
      return { percent: Math.min(1, saved / Math.max(1, amount)), label: `${peso(saved)} of ${peso(amount)}`, steps: [], outcome: saved >= amount - 0.005 ? 'completed' : ctx.today > shiftDate(start, 6) ? 'expired' : undefined };
    },
  },
];
export const CHALLENGE_ICONS = Object.fromEntries(TEMPLATES.map(template => [template.id, template.icon]));

function context(data: RewardData, today: string): Context { return { ...moneyContext(data, today), data, today }; }

/** Up to three challenges that fit this person now, skipping ones already running. */
export function suggestChallenges(data: RewardData, today = localDate()) {
  const ctx = context(data, today);
  const active = new Set(data.challenges.filter(item => item.status === 'active').map(item => item.template));
  return TEMPLATES.filter(template => !active.has(template.id)).map(template => template.suggest(ctx)).filter((item): item is Suggestion => Boolean(item)).sort((a, b) => b.score - a.score).slice(0, 3);
}

/** What to save when a challenge starts: the challenge row, plus a goal for templates that need one. */
export function planChallengeStart(data: RewardData, template: string, today = localDate()) {
  const ctx = context(data, today);
  const definition = TEMPLATES.find(item => item.id === template);
  if (!definition) return { error: 'That challenge no longer exists.' };
  if (data.challenges.some(item => item.template === template && item.status === 'active')) return { error: 'That challenge is already running.' };
  const suggestion = definition.suggest(ctx);
  if (!suggestion) return { error: 'That challenge doesn’t fit your data yet.' };
  // An existing emergency goal is used instead of making a second one.
  const existing = template === 'emergency' ? data.goals.find(goal => /emergency/i.test(String(goal.name)) && goalProgress(goal, data.accounts, today).status !== 'complete') : null;
  return { challenge: { template, title: suggestion.title, params: suggestion.params, started_at: today, ends_at: suggestion.ends_at, status: 'active' }, goal: existing ? null : suggestion.goal ?? null, linkGoalId: existing ? Number(existing.id) : null };
}

// ---- Awards ----------------------------------------------------------------------

const FIRST_STEPS: [string, string, (data: RewardData) => boolean][] = [
  ['first:account', 'Added your first account', data => data.accounts.length > 0],
  ['first:goal', 'Set your first goal', data => data.goals.length > 0],
  ['first:budget', 'Made your first budget', data => data.budgets.length > 0],
  ['first:interest', 'Set up interest', data => data.accounts.some(account => interestMode(account) !== 'off')],
  ['first:sync', 'Connected Google sync', data => Boolean(data.syncConnected)],
  ['first:challenge', 'Started your first challenge', data => data.challenges.length > 0],
];

/**
 * Everything due right now: new awards (never already in the ledger), goal
 * baselines to record for goals that don't have one yet, and challenge results.
 */
export function evaluateRewards(data: RewardData, today = localDate()) {
  const have = new Set(data.events.map(event => event.ref_key));
  const awards: Award[] = [];
  const give = (award: Award) => { if (award.points !== 0 && !have.has(award.ref_key)) { have.add(award.ref_key); awards.push(award); } };
  const startedOn = day(data.profile.created_at) || today;

  give({ ref_key: 'welcome', kind: 'bonus', points: 30, label: 'Welcome to Ipon', date: today });
  for (const [key, label, done] of FIRST_STEPS) if (done(data)) give({ ref_key: key, kind: 'first', points: 20, label, date: today });

  // Goal milestones, only above the progress a goal had when it was created.
  const baselines: { goal_id: number; percent: number }[] = [];
  for (const goal of data.goals) {
    const pace = goalProgress(goal, data.accounts, today);
    if (goal.reward_baseline === null || goal.reward_baseline === undefined || goal.reward_baseline === '') { baselines.push({ goal_id: Number(goal.id), percent: pace.percent }); continue; }
    for (const threshold of MILESTONES) {
      if (threshold <= num(goal.reward_baseline) || pace.percent < threshold) continue;
      give({ ref_key: `goal:${goal.id}:m${threshold}`, kind: 'milestone', points: milestonePoints(pace.target, threshold), label: threshold === 100 ? `${goal.name} reached!` : `${goal.name}: ${threshold}% saved`, date: today });
    }
  }

  // Weekly saving streak, from the week rewards began.
  const weeks = [...savingWeeks(data.goals)].filter(week => week >= weekStart(startedOn)).sort();
  let run = 0; let runStart = '';
  for (const [index, week] of weeks.entries()) {
    give({ ref_key: `streak:${week}`, kind: 'streak', points: 15, label: 'Saved this week', date: week });
    run = index > 0 && weeks[index - 1] === shiftDate(week, -7) ? run + 1 : 1;
    if (run === 1) runStart = week;
    const bonus = { 4: 50, 12: 150, 26: 300, 52: 600 }[run];
    if (bonus) give({ ref_key: `streak-bonus:${runStart}:${run}`, kind: 'streak', points: bonus, label: `${run}-week saving streak!`, date: week });
  }

  // Challenges.
  const ctx = context(data, today);
  const challengeUpdates: { id: number; status: string; completed_at: string | null }[] = [];
  for (const challenge of data.challenges.filter(item => item.status === 'active')) {
    const template = TEMPLATES.find(item => item.id === challenge.template);
    if (!template) continue;
    const progress = template.progress(ctx, challenge);
    progress.steps.forEach(give);
    if (progress.outcome === 'completed') {
      give({ ref_key: `challenge:${challenge.id}:done`, kind: 'challenge', points: num(challenge.params?.points), label: `Challenge complete: ${challenge.title}`, date: today });
      challengeUpdates.push({ id: challenge.id, status: 'completed', completed_at: today });
    } else if (progress.outcome === 'expired') challengeUpdates.push({ id: challenge.id, status: 'expired', completed_at: null });
  }
  return { awards, baselines, challengeUpdates };
}

// ---- Summary, purchases, and equipment ----------------------------------------------

export const ownedItems = (events: RewardEvent[]) => new Set([...ITEMS.filter(item => item.cost === 0).map(item => item.id), ...events.filter(event => event.ref_key.startsWith('buy:')).map(event => event.ref_key.slice(4))]);

/** The stored equipment record, including the room layout. */
export const rawEquipped = (profile: RewardProfile): Record<string, unknown> => (typeof profile.equipped === 'object' && profile.equipped ? profile.equipped as Record<string, unknown> : (() => { try { const parsed = JSON.parse(String(profile.equipped || '{}')); return parsed && typeof parsed === 'object' ? parsed : {}; } catch { return {}; } })());

export function equippedItems(profile: RewardProfile, owned: Set<string>) {
  const result: Partial<Record<ItemSlot, string>> = { ...DEFAULT_EQUIPPED };
  for (const [slot, id] of Object.entries(rawEquipped(profile))) {
    if (PLACED_SLOTS.includes(slot as ItemSlot) || slot === 'layout') continue;
    if (id === null && OPTIONAL_SLOTS.includes(slot as ItemSlot)) delete result[slot as ItemSlot];
    else if (typeof id === 'string' && owned.has(id) && itemById(id)?.slot === slot) result[slot as ItemSlot] = id;
  }
  return result;
}

export function stageFor(lifetime: number) {
  let index = 0;
  STAGES.forEach((stage, at) => { if (lifetime >= stage.at) index = at; });
  const next = STAGES[index + 1] ?? null;
  return { index, stage: STAGES[index], next, toNext: next ? next.at - lifetime : 0, progress: next ? (lifetime - STAGES[index].at) / (next.at - STAGES[index].at) : 1 };
}

export function petMood(goals: any[], today: string): 'happy' | 'content' | 'sleepy' {
  const last = goalActivity(goals).filter(entry => entry.type === 'contribution' || entry.type === 'autosave').map(entry => entry.date).sort().pop();
  if (!last) return 'content';
  const days = daysBetween(last, today);
  return days <= 7 ? 'happy' : days <= 14 ? 'content' : 'sleepy';
}

/** Everything the Ipon screens show. */
export function rewardSummary(data: RewardData, today = localDate()) {
  const balance = data.events.reduce((sum, event) => sum + num(event.points), 0);
  const lifetime = data.events.filter(event => num(event.points) > 0).reduce((sum, event) => sum + num(event.points), 0);
  const owned = ownedItems(data.events);
  const ctx = context(data, today);
  const withProgress = (challenge: RewardChallenge) => { const template = TEMPLATES.find(item => item.id === challenge.template); const progress = template ? template.progress(ctx, challenge) : null; return { ...challenge, icon: template?.icon ?? 'Target', percent: progress?.percent ?? 0, progress_label: progress?.label ?? '' }; };
  return {
    balance, lifetime, ...stageFor(lifetime),
    mood: petMood(data.goals, today),
    streak: currentStreak(savingWeeks(data.goals), today),
    pet_name: data.profile.pet_name || 'Mochi',
    hatched_at: data.profile.hatched_at ?? null,
    owned: [...owned],
    equipped: equippedItems(data.profile, owned),
    layout: readLayout(rawEquipped(data.profile), owned),
    events: [...data.events].sort((a, b) => String(b.created_at || b.date).localeCompare(String(a.created_at || a.date)) || num(b.id) - num(a.id)).slice(0, 40),
    challenges: {
      active: data.challenges.filter(item => item.status === 'active').map(withProgress),
      suggested: suggestChallenges(data, today).map(item => ({ ...item, icon: TEMPLATES.find(template => template.id === item.template)?.icon ?? 'Target' })),
      finished: data.challenges.filter(item => item.status !== 'active' && item.status !== 'cancelled').slice(-6).reverse(),
    },
    milestones: Object.fromEntries(data.goals.map(goal => [goal.id, MILESTONES.filter(threshold => data.events.some(event => event.ref_key === `goal:${goal.id}:m${threshold}`))])),
  };
}

export function planPurchase(data: RewardData, itemId: string, today = localDate()) {
  const item = itemById(itemId);
  if (!item) return { error: 'That item isn’t in the shop.' };
  const owned = ownedItems(data.events);
  if (owned.has(item.id)) return { error: 'You already have it.' };
  const lifetime = data.events.filter(event => num(event.points) > 0).reduce((sum, event) => sum + num(event.points), 0);
  const stage = stageFor(lifetime);
  if ((item.stage ?? 0) > stage.index) return { error: `Unlocks when your pet is a ${STAGES[item.stage ?? 0].name}.` };
  const balance = data.events.reduce((sum, event) => sum + num(event.points), 0);
  if (balance < item.cost) return { error: `You need ${item.cost - balance} more points.` };
  return { event: { ref_key: `buy:${item.id}`, kind: 'spend', points: -item.cost, label: `Bought ${item.name}`, date: today } as Award, item };
}

export function planEquip(data: RewardData, slot: string, itemId: string | null) {
  const owned = ownedItems(data.events);
  if (PLACED_SLOTS.includes(slot as ItemSlot)) return { error: 'Arrange that in your room instead.' };
  if (itemId === null) {
    if (!OPTIONAL_SLOTS.includes(slot as ItemSlot)) return { error: 'That spot can’t be empty.' };
  } else {
    const item = itemById(itemId);
    if (!item || item.slot !== slot) return { error: 'That item doesn’t go there.' };
    if (!owned.has(item.id)) return { error: 'Buy it first.' };
  }
  return { equipped: { ...rawEquipped(data.profile), [slot]: itemId } };
}

/** Saves a new room arrangement after checking every piece is owned and fits. */
export function planLayout(data: RewardData, layout: unknown) {
  const checked = checkLayout(layout, ownedItems(data.events));
  if ('error' in checked) return checked;
  return { equipped: { ...rawEquipped(data.profile), layout: checked.layout } };
}
