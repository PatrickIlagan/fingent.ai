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
export type GoalEntry = { id: number; date: string; amount: number; type: 'contribution' | 'withdrawal' | 'autosave' | 'skipped' | 'interest'; account_id?: number | null; account?: string; to_account_id?: number; to_account?: string; reason?: string };
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

// ---------------------------------------------------------------------------
// Interest. An account earns its base rate (or a higher rate once the balance
// reaches a tier), plus any promo or mission boost on the first `interest_cap`
// pesos until `interest_boost_until`. Banks withhold a 20% final tax by
// default. Daily credits post one entry per day, like Maya; monthly credits
// post on `interest_day` from the daily balances since the last credit.
// `interest_last_date` is the last day whose interest has been accounted for.
// ---------------------------------------------------------------------------
export type InterestMode = 'auto' | 'remind' | 'fixed' | 'off';
export type InterestTier = { from: number; rate_pa: number };
export type InterestPosting = { date: string; gross: number; tax: number; net: number; balanceBefore: number; description: string; notes: string };
type InterestAccount = AccountRecord & Record<string, unknown>;
type BalanceEntry = { account_id?: unknown; date?: unknown; type?: unknown; amount?: unknown };

export const DEFAULT_INTEREST_TAX = 0.2;
const INTEREST_MODES: InterestMode[] = ['auto', 'remind', 'fixed', 'off'];
const MAX_INTEREST_CATCH_UP_DAYS = 400;
const toNumber = (value: unknown) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; };
const round2 = (value: number) => Math.round(value * 100) / 100;
const pesos2 = (value: number) => '₱' + value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** The date `days` days after (or before, if negative) a YYYY-MM-DD date. */
export function shiftDate(date: string, days: number) {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function interestMode(account: InterestAccount): InterestMode {
  const mode = String(account.interest_mode ?? '') as InterestMode;
  if (INTEREST_MODES.includes(mode)) return mode;
  return toNumber(account.interest_rate_pa) > 0 ? 'auto' : 'off';
}
export const interestFrequency = (account: InterestAccount) => account.interest_frequency === 'monthly' ? 'monthly' as const : 'daily' as const;
export const interestTaxRate = (account: InterestAccount) => account.interest_tax_rate == null || account.interest_tax_rate === '' ? DEFAULT_INTEREST_TAX : Math.min(1, Math.max(0, toNumber(account.interest_tax_rate)));
/** Day of the month monthly interest is credited; 31 means the last day of each month. */
export const interestDay = (account: InterestAccount) => { const day = Math.round(toNumber(account.interest_day)); return day >= 1 && day <= 31 ? day : 31; };
export const interestTiers = (account: InterestAccount) => parseList<InterestTier>(account.interest_tiers)
  .map(tier => ({ from: toNumber(tier.from), rate_pa: toNumber(tier.rate_pa) }))
  .filter(tier => tier.from > 0 && tier.rate_pa >= 0)
  .sort((a, b) => a.from - b.from);

/** Annual rates that apply to a balance on a date; `effective` blends the base and the boosted part. */
export function interestRates(account: InterestAccount, balance: number, date: string) {
  const amount = Math.max(0, balance);
  if (isCardAccount(account) || amount <= 0 || amount < toNumber(account.interest_min_balance)) return { base: 0, boost: 0, boosted: 0, effective: 0 };
  const tier = interestTiers(account).filter(item => amount >= item.from).pop();
  const base = tier ? tier.rate_pa : Math.max(0, toNumber(account.interest_rate_pa));
  const until = String(account.interest_boost_until || '');
  const boost = toNumber(account.interest_boost_pa) > 0 && (!isIsoDate(until) || date <= until) ? toNumber(account.interest_boost_pa) : 0;
  const cap = toNumber(account.interest_cap);
  const boosted = boost ? (cap > 0 ? Math.min(amount, cap) : amount) : 0;
  return { base, boost, boosted, effective: (amount * base + boosted * boost) / amount };
}

/** Gross, tax, and net interest (unrounded) for some days on a balance. */
export function interestOn(account: InterestAccount, balance: number, date: string, days = 1) {
  const gross = Math.max(0, balance) * interestRates(account, balance, date).effective * days / 365;
  const tax = gross * interestTaxRate(account);
  return { gross, tax, net: gross - tax };
}

/** Rough net interest over the next month at today's balance. */
export function monthlyInterestEstimate(account: InterestAccount, today = localDate()) {
  const mode = interestMode(account);
  if (mode === 'off' || isCardAccount(account)) return 0;
  if (mode === 'fixed') return toNumber(account.interest_fixed_amount);
  return interestOn(account, toNumber(account.balance), today, 30.44).net;
}

/** Balance at the end of each day from `from` to `to`, worked back from today's balance using later transactions. */
export function endOfDayBalances(currentBalance: number, transactions: BalanceEntry[], from: string, to: string) {
  const changes = new Map<string, number>();
  let afterTo = 0;
  for (const transaction of transactions) {
    const date = String(transaction.date || '').slice(0, 10);
    const signed = (transaction.type === 'income' ? 1 : -1) * toNumber(transaction.amount);
    if (date > to) afterTo += signed;
    else changes.set(date, (changes.get(date) || 0) + signed);
  }
  const balances = new Map<string, number>();
  let balance = currentBalance - afterTo;
  for (let day = to; day >= from; day = shiftDate(day, -1)) {
    balances.set(day, balance);
    balance -= changes.get(day) || 0;
  }
  return balances;
}

/** Monthly credit dates after `after`, up to and including `until` (the day is clamped to each month's length). */
export function interestCreditDates(day: number, after: string, until: string) {
  const dates: string[] = [];
  let [year, month] = after.split('-').map(Number);
  for (let guard = 0; guard < 400; guard += 1) {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const date = `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
    if (date > until) break;
    if (date > after) dates.push(date);
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  return dates;
}

/**
 * Interest owed to an account since `interest_last_date`: entries to post
 * (automatic or fixed), or a reminder with the estimate (remind mode).
 * `lastDate` is what `interest_last_date` should become.
 */
export function dueInterest(account: InterestAccount, transactions: BalanceEntry[], today = localDate()) {
  const mode = interestMode(account);
  const yesterday = shiftDate(today, -1);
  const storedLast = String(account.interest_last_date || '').slice(0, 10);
  const last = isIsoDate(storedLast) ? storedLast : null;
  const result = { postings: [] as InterestPosting[], lastDate: last ?? yesterday, reminder: null as null | { date: string; from: string; gross: number; tax: number; net: number } };
  if (mode === 'off' || !last || isCardAccount(account)) return result;
  const earliest = shiftDate(today, -MAX_INTEREST_CATCH_UP_DAYS);
  const start = last < earliest ? earliest : last;
  if (start >= today) return result;
  const own = transactions.filter(transaction => transaction.account_id == null || Number(transaction.account_id) === Number(account.id));
  const balances = endOfDayBalances(toNumber(account.balance), own, shiftDate(start, 1), today);
  const taxRate = interestTaxRate(account);
  let added = 0;
  const balanceOn = (date: string) => (balances.get(date) ?? toNumber(account.balance)) + added;
  const entry = (date: string, gross: number, label: string): InterestPosting => {
    const grossAmount = round2(gross);
    const tax = round2(grossAmount * taxRate);
    return { date, gross: grossAmount, tax, net: round2(grossAmount - tax), balanceBefore: balanceOn(date), description: 'Interest', notes: tax > 0 ? `${label} · gross ${pesos2(grossAmount)} · tax ${pesos2(tax)}` : label };
  };

  if (mode === 'auto' && interestFrequency(account) === 'daily') {
    // Each finished day is credited the next morning.
    for (let day = shiftDate(start, 1); day <= yesterday; day = shiftDate(day, 1)) {
      const posting = entry(shiftDate(day, 1), interestOn(account, balanceOn(day), day).gross, 'Daily interest');
      if (posting.net >= 0.01) { result.postings.push(posting); added += posting.net; }
    }
    result.lastDate = yesterday > last ? yesterday : last;
    return result;
  }

  const credits = interestCreditDates(interestDay(account), start, today);
  let from = shiftDate(start, 1);
  let reminder = { gross: 0, tax: 0, net: 0 };
  for (const date of credits) {
    if (mode === 'fixed') {
      const net = round2(toNumber(account.interest_fixed_amount));
      if (net >= 0.01) { result.postings.push({ date, gross: net, tax: 0, net, balanceBefore: balanceOn(date), description: 'Interest', notes: 'Fixed monthly interest' }); added += net; }
    } else {
      let gross = 0;
      for (let day = from; day <= date; day = shiftDate(day, 1)) gross += interestOn(account, balanceOn(day), day).gross;
      const posting = entry(date, gross, 'Monthly interest');
      if (mode === 'auto') { if (posting.net >= 0.01) { result.postings.push(posting); added += posting.net; } }
      else reminder = { gross: round2(reminder.gross + posting.gross), tax: round2(reminder.tax + posting.tax), net: round2(reminder.net + posting.net) };
    }
    from = shiftDate(date, 1);
  }
  if (mode === 'remind') {
    if (credits.length) result.reminder = { date: credits[credits.length - 1], from: shiftDate(start, 1), ...reminder };
    return result;
  }
  if (credits.length) result.lastDate = credits[credits.length - 1];
  return result;
}

type GoalState = GoalRecord & { sources?: unknown; transactions?: unknown };

/**
 * Grows each goal's fixed savings in an account by its share of newly credited
 * interest (whole-account goals already follow the balance). Daily credits add
 * to one "Interest" history line per goal, account, and month.
 */
export function shareInterestWithGoals(goals: GoalState[], account: AccountRecord, postings: { date: string; net: number; balanceBefore: number }[]) {
  const changed = new Map<number, { id: number; saved: number; sources: GoalSource[]; transactions: GoalEntry[] }>();
  for (const posting of postings) {
    if (!(posting.balanceBefore > 0) || !(posting.net > 0)) continue;
    for (const goal of goals) {
      const state = changed.get(Number(goal.id)) ?? { id: Number(goal.id), saved: toNumber(goal.saved), sources: parseList<GoalSource>(goal.sources), transactions: parseList<GoalEntry>(goal.transactions) };
      const part = state.sources.find(source => source.mode !== 'whole' && Number(source.account_id) === Number(account.id));
      if (!part || !(toNumber(part.amount) > 0)) continue;
      const share = round2(posting.net * Math.min(1, toNumber(part.amount) / posting.balanceBefore));
      if (share < 0.01) continue;
      state.sources = state.sources.map(source => source === part ? { ...source, amount: round2(toNumber(source.amount) + share) } : source);
      state.saved = round2(state.saved + share);
      const month = posting.date.slice(0, 7);
      const line = state.transactions.find(item => item.type === 'interest' && Number(item.account_id) === Number(account.id) && String(item.date).slice(0, 7) === month);
      state.transactions = line
        ? state.transactions.map(item => item === line ? { ...item, amount: round2(toNumber(item.amount) + share), date: posting.date > item.date ? posting.date : item.date } : item)
        : [{ id: entryId(), date: posting.date, amount: share, type: 'interest', account_id: Number(account.id), account: String(account.name) }, ...state.transactions];
      changed.set(state.id, state);
    }
  }
  return [...changed.values()];
}

export const INTEREST_FIELDS = ['interest_rate_pa', 'interest_tiers', 'interest_min_balance', 'interest_boost_pa', 'interest_boost_until', 'interest_cap', 'interest_frequency', 'interest_day', 'interest_mode', 'interest_fixed_amount', 'interest_tax_rate', 'interest_last_date'] as const;

/**
 * Cleans interest settings from the account form, keeping stored values for
 * fields not sent. Interest restarts from today when it's switched on or its
 * mode or frequency changes, so nothing is back-dated.
 */
export function interestSettings(input: Record<string, unknown>, existing: Record<string, unknown> | null, today = localDate()) {
  const pick = (key: string) => input[key] !== undefined ? input[key] : existing?.[key];
  const optional = (key: string) => { const value = pick(key); return value === '' || value == null ? null : Math.max(0, toNumber(value)); };
  const rate = Math.max(0, toNumber(pick('interest_rate_pa')));
  const modeValue = String(pick('interest_mode') ?? '') as InterestMode;
  const mode: InterestMode = INTEREST_MODES.includes(modeValue) ? modeValue : rate > 0 ? 'auto' : 'off';
  const until = String(pick('interest_boost_until') ?? '');
  const day = Math.round(toNumber(pick('interest_day')));
  const tax = pick('interest_tax_rate');
  const settings = {
    interest_rate_pa: rate,
    interest_tiers: JSON.stringify(interestTiers({ interest_tiers: pick('interest_tiers') })),
    interest_min_balance: optional('interest_min_balance'),
    interest_boost_pa: optional('interest_boost_pa'),
    interest_boost_until: isIsoDate(until) ? until : null,
    interest_cap: optional('interest_cap'),
    interest_frequency: pick('interest_frequency') === 'monthly' ? 'monthly' : 'daily',
    interest_day: day >= 1 && day <= 31 ? day : null,
    interest_mode: mode,
    interest_fixed_amount: optional('interest_fixed_amount'),
    interest_tax_rate: tax === '' || tax == null ? DEFAULT_INTEREST_TAX : Math.min(1, Math.max(0, toNumber(tax))),
    interest_last_date: isIsoDate(String(existing?.interest_last_date || '')) ? String(existing?.interest_last_date) : null as string | null,
  };
  const restarted = !existing || mode !== interestMode(existing) || settings.interest_frequency !== interestFrequency(existing) || !settings.interest_last_date;
  if (restarted) settings.interest_last_date = shiftDate(today, -1);
  return settings;
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
