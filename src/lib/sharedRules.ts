// Business rules used by both the desktop server (server.ts) and the on-device
// mobile API (mobileApi.ts). Keep them here so every platform behaves the same.

// Category families keep English, Tagalog, and Taglish labels in one budget/reporting bucket.
// The user's existing preferred category label is preserved whenever possible.
export const CATEGORY_ALIAS_GROUPS = [
  { canonical: 'Food', aliases: ['food', 'pagkain', 'food & dining', 'dining', 'groceries', 'grocery'] },
  { canonical: 'Transport', aliases: ['transport', 'transportation', 'pamasahe', 'commute'] },
  { canonical: 'Housing', aliases: ['housing', 'bahay', 'rent', 'upa'] },
  { canonical: 'Utilities', aliases: ['utilities', 'utility', 'kuryente', 'tubig', 'internet', 'load'] },
  { canonical: 'Health', aliases: ['health', 'kalusugan', 'gamot', 'medical'] },
  { canonical: 'Education', aliases: ['education', 'edukasyon', 'tuition', 'school', 'paaralan'] },
  { canonical: 'Entertainment', aliases: ['entertainment', 'aliwan', 'sine', 'laro'] },
  { canonical: 'Shopping', aliases: ['shopping', 'pamimili', 'clothing', 'damit'] }
];

export function normalizedCategoryName(value: string) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function categoryAliasGroup(value: string) {
  const normalized = normalizedCategoryName(value);
  return CATEGORY_ALIAS_GROUPS.find(item => item.aliases.includes(normalized)) || null;
}

/** Picks the stored label for a supplied category from the user's active category names. */
export function resolveCategoryAlias(value: string, activeCategoryNames: string[]) {
  const supplied = String(value || '').trim();
  const group = categoryAliasGroup(supplied);
  if (!group) return supplied;
  const existing = activeCategoryNames.filter(name => group.aliases.includes(normalizedCategoryName(name)));
  const canonical = existing.find(name => normalizedCategoryName(name) === normalizedCategoryName(group.canonical));
  return canonical || existing[0] || group.canonical;
}

// European Central Bank reference rates via Frankfurter: free, keyless, and includes PHP.
export const FX_RATES_URL = 'https://api.frankfurter.dev/v1/latest?from=USD&symbols=PHP,EUR,GBP';
// Used only until the first successful refresh (rates as of October 2026).
export const FALLBACK_FX_RATES = { PHP: 63.6, EUR: 0.89, GBP: 0.75, USD: 1 };

/** Units of each currency per US dollar, or null if the response is unusable. */
export function ratesFromFrankfurter(data: any) {
  const rates = data?.rates;
  const PHP = Number(rates?.PHP), EUR = Number(rates?.EUR), GBP = Number(rates?.GBP);
  return PHP > 0 && EUR > 0 && GBP > 0 ? { PHP, EUR, GBP, USD: 1 } : null;
}

export function formatTicker(ticker: string, type: string) {
  if (!ticker) return ticker;
  let t = ticker.toUpperCase().trim();
  if (type === "Cryptos" && !t.includes("-")) {
    t = t + "-USD";
  }
  return t;
}

export const isIsoDate = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''));
const isTrue = (value: unknown) => value === true || Number(value) === 1;

/** YYYY-MM-DD in the device's own time zone (UTC dates are a day behind in the Philippines before 8 a.m.). */
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Whole days from one YYYY-MM-DD date to another (negative when `to` is earlier). */
export function daysBetween(from: string, to: string) {
  const [fy, fm, fd] = from.slice(0, 10).split('-').map(Number);
  const [ty, tm, td] = to.slice(0, 10).split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

const MOVEMENT_CATEGORIES = ['transfer', 'adjustment', 'investments'];

/** True for real income or spending; moves between accounts, balance corrections, and investment trades are excluded. */
export const isCashFlow = (transaction: { category?: unknown; source?: unknown }) =>
  !MOVEMENT_CATEGORIES.includes(String(transaction.category || '').toLowerCase()) && transaction.source !== 'goal';

/** Same day next month, clamped to that month's last day (Jan 31 → Feb 28). */
export function addMonth(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

/** Monthly occurrences from `date` up to and including `today`, plus the first one after. */
export function dueOccurrences(date: string, today: string) {
  const due: string[] = [];
  let next = date;
  while (next <= today && due.length < 120) {
    due.push(next);
    next = addMonth(next);
  }
  return { due, next };
}

// Transactions created by another record carry `source` and `source_id`. Older
// ones only have these notes, so both are checked when finding linked entries.
export const legacyLiabilityNote = (type: unknown, id: unknown) => `Linked to ${type} record #${id}.`;
export const legacyIncomeFlowNote = (id: unknown) => `Auto-deposited from income flow #${id}.`;

export const liabilityCategory = (type: unknown) => type === 'Quick Expenses' ? 'Expenses' : String(type || 'Expenses');

type LiabilityRecord = { type?: unknown; amount?: unknown; date?: unknown; is_recurring?: unknown; account_id?: unknown; total_months?: unknown; current_month?: unknown; remaining_amount?: unknown };

/** Recurring bills with a linked account are charged automatically on each due date. */
export const isAutopayLiability = (liability: LiabilityRecord) => isTrue(liability.is_recurring) && Boolean(liability.account_id) && liability.type !== 'Credits';

/** Fields to save after one payment. Recurring bills, installments, and partly paid debts roll to next month. */
export function liabilityAfterPayment(liability: LiabilityRecord) {
  const amount = Number(liability.amount) || 0;
  const remaining = Number(liability.remaining_amount) || 0;
  const nextDate = isIsoDate(liability.date) ? addMonth(String(liability.date)) : liability.date;
  const update = { status: 'Paid', date: liability.date, current_month: Number(liability.current_month) || 0, remaining_amount: remaining };
  if (liability.type === 'Installments') {
    const totalMonths = Number(liability.total_months) || 0;
    update.current_month += 1;
    update.remaining_amount = Math.max(0, remaining - amount);
    if (totalMonths && update.current_month < totalMonths) Object.assign(update, { status: 'Unpaid', date: nextDate });
  } else if (liability.type === 'Debts') {
    update.remaining_amount = Math.max(0, remaining - amount);
    if (update.remaining_amount > 0) Object.assign(update, { status: 'Unpaid', date: nextDate });
  } else if (isTrue(liability.is_recurring) && isIsoDate(liability.date)) {
    Object.assign(update, { status: 'Unpaid', date: nextDate });
  }
  return update;
}

// Goals count savings already held in accounts. `sources` lists each linked
// account: 'part' counts a fixed amount saved there, 'whole' counts the full
// balance (a dedicated pot such as a Maya Personal Goal or Tonik Stash).
// `saved` stores the fixed amounts plus anything recorded before accounts
// could be linked; whole-account balances are added when progress is read.
export type GoalSource = { account_id: number | null; name: string; amount: number; mode?: 'part' | 'whole' };
export type GoalEntry = { id: number; date: string; amount: number; type: 'contribution' | 'withdrawal' | 'autosave' | 'skipped'; account_id?: number | null; account?: string; to_account_id?: number; to_account?: string; reason?: string };
type GoalRecord = { id?: unknown; name?: unknown; target?: unknown; saved?: unknown; date?: unknown; created_at?: unknown; sources?: unknown; transactions?: unknown };
type AccountRecord = { id?: unknown; name?: unknown; type?: unknown; balance?: unknown };

export function parseList<T = any>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  try { const parsed = JSON.parse(String(value || '[]')); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

const peso = (value: number) => '₱' + Math.round(value).toLocaleString('en-PH');
/** Unique id for goal history entries, even when several are made in the same millisecond. */
export const entryId = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);
export const isCardAccount = (account: AccountRecord) => ['card', 'credit'].includes(String(account.type || '').toLowerCase());
const fixedSources = (goal: GoalRecord) => parseList<GoalSource>(goal.sources).filter(source => source.mode !== 'whole' && source.account_id != null);
const wholeSources = (goal: GoalRecord) => parseList<GoalSource>(goal.sources).filter(source => source.mode === 'whole');

/** Progress, pace, and forecast for one goal. */
export function goalProgress(goal: GoalRecord, accounts: AccountRecord[], today = localDate()) {
  const balanceOf = (id: unknown) => Math.max(0, Number(accounts.find(account => Number(account.id) === Number(id))?.balance) || 0);
  const stored = Number(goal.saved) || 0;
  const inAccounts = fixedSources(goal).reduce((sum, source) => sum + (Number(source.amount) || 0), 0);
  const wholeBalance = wholeSources(goal).reduce((sum, source) => sum + balanceOf(source.account_id), 0);
  const saved = stored + wholeBalance;
  const target = Number(goal.target) || 0;
  const remaining = Math.max(0, target - saved);
  const targetDate = isIsoDate(String(goal.date || '').slice(0, 10)) ? String(goal.date).slice(0, 10) : today;
  const daysLeft = daysBetween(today, targetDate);
  const monthsLeft = daysLeft / 30.44;
  const entries = parseList<GoalEntry>(goal.transactions);
  const start = String(goal.created_at || '').slice(0, 10) || entries.map(entry => entry.date).sort()[0] || today;
  const span = daysBetween(start, targetDate);
  const expectedByNow = span > 0 ? target * Math.min(1, Math.max(0, daysBetween(start, today) / span)) : target;
  const gap = saved - expectedByNow;
  const status = saved >= target ? 'complete'
    : daysLeft < 0 ? 'overdue'
    : gap >= -Math.max(1, target * 0.02) ? (gap > target * 0.05 ? 'ahead' : 'on-track')
    : 'behind';
  // Forecast from the last 90 days of additions, once the goal is at least two
  // weeks old. Savings counted on the day the goal was set up aren't "pace".
  const age = daysBetween(start, today);
  const windowDays = Math.min(90, age);
  const recent = entries.filter(entry => entry.date > start && daysBetween(entry.date, today) <= windowDays);
  const net = recent.reduce((sum, entry) => sum + (entry.type === 'withdrawal' ? -1 : entry.type === 'skipped' ? 0 : 1) * (Number(entry.amount) || 0), 0);
  const perDay = windowDays > 0 ? net / windowDays : 0;
  let projectedFinish: string | null = null;
  if (remaining === 0) projectedFinish = today;
  else if (age >= 14 && perDay > 0) { const finish = new Date(`${today}T00:00:00`); finish.setDate(finish.getDate() + Math.ceil(remaining / perDay)); projectedFinish = localDate(finish); }
  return {
    saved, target, remaining, inAccounts, wholeBalance,
    legacy: Math.max(0, stored - inAccounts),
    percent: target > 0 ? Math.min(100, (saved / target) * 100) : 0,
    daysLeft, monthsLeft,
    requiredMonthly: remaining / Math.max(1, monthsLeft),
    requiredDaily: remaining / Math.max(1, daysLeft),
    expectedByNow, status, behindBy: Math.max(0, -gap), projectedFinish,
  };
}

/** Per account: which goals count savings in it, and how much (whole accounts count their balance). */
export function accountGoalSavings(goals: GoalRecord[], accounts: AccountRecord[]) {
  const byAccount = new Map<number, { goal_id: number; goal_name: string; amount: number; mode: 'part' | 'whole' }[]>();
  for (const goal of goals) {
    for (const source of parseList<GoalSource>(goal.sources)) {
      if (source.account_id == null) continue;
      const accountId = Number(source.account_id);
      const account = accounts.find(item => Number(item.id) === accountId);
      if (!account) continue;
      const amount = source.mode === 'whole' ? Math.max(0, Number(account.balance) || 0) : Number(source.amount) || 0;
      byAccount.set(accountId, [...(byAccount.get(accountId) ?? []), { goal_id: Number(goal.id), goal_name: String(goal.name), amount, mode: source.mode === 'whole' ? 'whole' : 'part' }]);
    }
  }
  return byAccount;
}

type GoalChange = { error: string } | { transfer: boolean; from: AccountRecord; saveIn: AccountRecord; saved: number; sources: GoalSource[]; entry: GoalEntry };

/** Narrows a planned goal change to its error case. */
export const isGoalError = (change: object): change is { error: string } => typeof (change as { error?: unknown }).error === 'string';

/**
 * Adds money to a goal from one account, saved in the same or another account.
 * Moving between accounts is a transfer the caller records; a goal never counts
 * more than an account holds across all goals.
 */
export function planGoalContribution(goal: GoalRecord, goals: GoalRecord[], accounts: AccountRecord[], input: { amount: unknown; from_account_id: unknown; save_in_account_id?: unknown; date: string; type?: 'contribution' | 'autosave' }): GoalChange {
  const amount = Number(input.amount);
  if (!(amount > 0)) return { error: 'Enter an amount above zero.' };
  const from = accounts.find(account => Number(account.id) === Number(input.from_account_id));
  const saveIn = accounts.find(account => Number(account.id) === Number(input.save_in_account_id ?? input.from_account_id));
  if (!from || !saveIn) return { error: 'Choose accounts that still exist.' };
  if (isCardAccount(from) || isCardAccount(saveIn)) return { error: "Credit cards can't hold goal savings." };
  const moving = Number(from.id) !== Number(saveIn.id);
  if (moving && (Number(from.balance) || 0) < amount - 0.005) return { error: `${from.name} only has ${peso(Number(from.balance) || 0)}.` };
  const saveInId = Number(saveIn.id);
  const otherWhole = goals.find(other => Number(other.id) !== Number(goal.id) && wholeSources(other).some(source => Number(source.account_id) === saveInId));
  if (otherWhole) return { error: `${saveIn.name} already counts fully toward ${otherWhole.name}.` };
  const sources = parseList<GoalSource>(goal.sources);
  const saved = Number(goal.saved) || 0;
  const entry: GoalEntry = { id: entryId(), date: input.date, amount, type: input.type || 'contribution', account_id: Number(from.id), account: String(from.name), to_account_id: saveInId, to_account: String(saveIn.name) };
  // A whole-account goal already follows that account's balance, so only the transfer is needed.
  if (wholeSources(goal).some(source => Number(source.account_id) === saveInId)) {
    if (!moving) return { error: `${saveIn.name} already counts fully toward this goal. Add money to it from another account.` };
    return { transfer: true, from, saveIn, saved, sources, entry };
  }
  const balanceAfter = (Number(saveIn.balance) || 0) + (moving ? amount : 0);
  const counted = goals.flatMap(item => fixedSources(item)).filter(source => Number(source.account_id) === saveInId).reduce((sum, source) => sum + (Number(source.amount) || 0), 0);
  if (counted + amount > balanceAfter + 0.005) return { error: `${saveIn.name} has ${peso(balanceAfter)}, and ${peso(counted)} of it already counts toward your goals.` };
  const existing = sources.find(source => source.mode !== 'whole' && Number(source.account_id) === saveInId);
  const nextSources = existing
    ? sources.map(source => source === existing ? { ...source, name: String(saveIn.name), amount: (Number(source.amount) || 0) + amount } : source)
    : [...sources, { account_id: saveInId, name: String(saveIn.name), amount, mode: 'part' as const }];
  return { transfer: moving, from, saveIn, saved: saved + amount, sources: nextSources, entry };
}

/** Takes money out of a goal's savings in one account (or from savings recorded before accounts were linked). Balances don't change. */
export function planGoalWithdrawal(goal: GoalRecord, input: { amount: unknown; account_id: unknown; date: string }) {
  const amount = Number(input.amount);
  if (!(amount > 0)) return { error: 'Enter an amount above zero.' };
  const sources = parseList<GoalSource>(goal.sources);
  const saved = Number(goal.saved) || 0;
  if (input.account_id == null || input.account_id === '') {
    const legacy = saved - fixedSources(goal).reduce((sum, source) => sum + (Number(source.amount) || 0), 0);
    if (legacy < amount - 0.005) return { error: `Only ${peso(Math.max(0, legacy))} was saved before accounts were linked.` };
    return { saved: saved - amount, sources, entry: { id: entryId(), date: input.date, amount, type: 'withdrawal' as const, account_id: null, account: 'Saved before accounts were linked' } };
  }
  const part = sources.find(source => source.mode !== 'whole' && Number(source.account_id) === Number(input.account_id));
  if (!part || (Number(part.amount) || 0) < amount - 0.005) return { error: `Only ${peso(Number(part?.amount) || 0)} of this goal is saved in that account.` };
  const remaining = (Number(part.amount) || 0) - amount;
  return {
    saved: saved - amount,
    sources: remaining > 0.005 ? sources.map(source => source === part ? { ...source, amount: remaining } : source) : sources.filter(source => source !== part),
    entry: { id: entryId(), date: input.date, amount, type: 'withdrawal' as const, account_id: Number(input.account_id), account: part.name },
  };
}

/** Replaces a goal's whole-account links, keeping its fixed savings. Returns an error if an account is already spoken for. */
export function withWholeAccounts(goal: GoalRecord, goals: GoalRecord[], accounts: AccountRecord[], accountIds: unknown[]) {
  const ids = [...new Set(accountIds.map(Number).filter(Number.isFinite))];
  const linked: GoalSource[] = [];
  for (const id of ids) {
    const account = accounts.find(item => Number(item.id) === id);
    if (!account) return { error: 'A linked account no longer exists.' };
    if (isCardAccount(account)) return { error: "Credit cards can't hold goal savings." };
    const other = goals.find(item => Number(item.id) !== Number(goal.id) && parseList<GoalSource>(item.sources).some(source => Number(source.account_id) === id));
    if (other) return { error: `${account.name} already holds savings for ${other.name}.` };
    if (fixedSources(goal).some(source => Number(source.account_id) === id)) return { error: `Take this goal's fixed savings out of ${account.name} before counting the whole account.` };
    linked.push({ account_id: id, name: String(account.name), amount: 0, mode: 'whole' });
  }
  return { sources: [...parseList<GoalSource>(goal.sources).filter(source => source.mode !== 'whole'), ...linked] };
}

type BusinessRecord = { type?: unknown; status?: unknown; value?: unknown; amount?: unknown; date?: unknown; description?: unknown };

/** Monthly value and customer count shown on each venture card. */
export function businessMetrics(businessType: unknown, transactions: BusinessRecord[], items: BusinessRecord[], thisMonth = localDate().slice(0, 7)) {
  const active = (item: BusinessRecord) => item.status === 'Active';
  const total = (records: BusinessRecord[], field: 'value' | 'amount') => records.reduce((sum, record) => sum + (Number(record[field]) || 0), 0);
  if (businessType === 'Store') {
    const orders = transactions.filter(t => t.type === 'income' && String(t.date || '').startsWith(thisMonth));
    return { mrr: total(orders, 'amount'), customers: new Set(orders.map(t => t.description).filter(Boolean)).size, growth: 0 };
  }
  const itemTypes: Record<string, string[]> = { SaaS: ['user', 'subscription'], Agency: ['client'], 'Professional Services': ['client'], Creator: ['partnership'] };
  const types = itemTypes[String(businessType)];
  if (!types) return { mrr: 0, customers: 0, growth: 0 };
  const counted = items.filter(item => types.includes(String(item.type)) && active(item));
  return { mrr: total(counted, 'value'), customers: counted.length, growth: 0 };
}
