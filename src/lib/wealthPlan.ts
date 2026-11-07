// Wealth plans: multi-account savings and investing plans with projections,
// scenarios, what-ifs, milestones, and actual-vs-plan tracking from the
// user's real accounts. Pure functions shared by the screens and tests.
import { endOfDayBalances, interestMode, interestRates, interestTaxRate, isCashFlow, localDate, parseList } from './sharedRules';

export type Scenario = 'conservative' | 'balanced' | 'aggressive';
export const SCENARIOS: Scenario[] = ['conservative', 'balanced', 'aggressive'];
export type BucketKind = 'etf' | 'stock' | 'crypto' | 'bank' | 'time_deposit' | 'cash' | 'other';
export type LinkMode = 'whole' | 'percent' | 'amount';
export type BucketLink = { type: 'account' | 'holding'; id: number; mode: LinkMode; value: number; since?: string };
export type Contribution = { mode: 'fixed'; amount: number } | { mode: 'percent'; percent: number; accounts?: number[]; categories?: string[]; flows?: number[] };
export type Bucket = {
  id: string; name: string; kind: BucketKind; color: string; startBalance: number; contribution: Contribution;
  rates: Record<Scenario, number>; taxRate: number; promo?: { months: number; ratePa: number; tax: number; onStart: boolean } | null;
  deployEvery: number; links: BucketLink[]; note?: string;
};
export type Extra = { id: string; name: string; months?: number[]; every?: number; startAt?: number; amounts: Record<string, number> };
export type Injection = { id: string; name: string; period: number; amounts: Record<string, number> };
export type DepositEntry = { id: string; period: number; bucket: string; amount: number; date?: string; note?: string };
export type WealthPlan = {
  version: 1; start: string; periods: number; breaks: number[]; breakMode: 'skip' | 'pause'; yearStartMonth: number; yearLabel: string;
  buckets: Bucket[]; extras: Extra[]; injections: Injection[]; milestones: number[]; milestoneBuckets: string[]; inflation: number;
  depositLog: DepositEntry[]; overrides: Record<string, Record<string, number>>;
};
export type WhatIf = { returnDelta?: number; crash?: { period: number; drop: number }; pause?: { from: number; count: number }; extraMonthly?: { bucket: string; amount: number }; stopAfter?: number; bonus?: { period: number; bucket: string; amount: number } };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const num = (value: unknown) => Number(value) || 0;
const round2 = (value: number) => Math.round(value * 100) / 100;
export const MARKET_KINDS: BucketKind[] = ['etf', 'stock', 'crypto', 'other'];
export const KIND_LABELS: Record<BucketKind, string> = { etf: 'ETF / index fund', stock: 'Stocks', crypto: 'Crypto', bank: 'Bank savings', time_deposit: 'Time deposit', cash: 'Cash', other: 'Other' };
export const BUCKET_COLORS = ['#4d8eff', '#22c3a0', '#a78bfa', '#fb923c', '#f472b6', '#facc15', '#38bdf8', '#94a3b8'];
export const DEFAULT_MILESTONES = [40000, 50000, 60000, 70000, 75000, 80000, 90000, 100000, 110000, 120000, 125000, 130000, 140000, 150000, 160000, 170000, 175000, 180000, 190000, 200000, 210000, 220000, 225000, 230000, 240000, 250000];
export const MAJOR_MILESTONES = new Set([50000, 75000, 100000, 125000, 150000, 175000, 200000, 225000, 250000, 500000, 1000000]);

/** Starting rates (per year) for each kind of bucket; every bucket can change them. */
export function defaultRates(kind: BucketKind): Record<Scenario, number> {
  switch (kind) {
    case 'etf': case 'stock': return { conservative: 0.04, balanced: 0.08, aggressive: 0.12 };
    case 'crypto': return { conservative: -0.25, balanced: 0.05, aggressive: 0.4 };
    case 'bank': return { conservative: 0.03, balanced: 0.03, aggressive: 0.03 };
    case 'time_deposit': return { conservative: 0.045, balanced: 0.045, aggressive: 0.045 };
    case 'cash': return { conservative: 0, balanced: 0, aggressive: 0 };
    default: return { conservative: 0.03, balanced: 0.06, aggressive: 0.09 };
  }
}
export const defaultTax = (kind: BucketKind) => kind === 'bank' || kind === 'time_deposit' ? 0.2 : 0;

let idCounter = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter += 1).toString(36)}`;

export function newBucket(kind: BucketKind, name: string, index = 0): Bucket {
  return { id: newId('b'), name, kind, color: BUCKET_COLORS[index % BUCKET_COLORS.length], startBalance: 0, contribution: { mode: 'fixed', amount: 0 }, rates: defaultRates(kind), taxRate: defaultTax(kind), promo: null, deployEvery: 1, links: [] };
}

export function blankPlan(start = localDate().slice(0, 7)): WealthPlan {
  return { version: 1, start, periods: 36, breaks: [], breakMode: 'pause', yearStartMonth: 1, yearLabel: 'Year', buckets: [newBucket('etf', 'Index fund', 0), newBucket('bank', 'Savings', 2)], extras: [], injections: [], milestones: [50000, 100000, 250000, 500000, 1000000], milestoneBuckets: [], inflation: 0.04, depositLog: [], overrides: {} };
}

/** Reads a stored plan, filling anything missing so older or imported plans always work. */
export function normalizePlan(input: unknown): WealthPlan {
  const raw = (typeof input === 'string' ? (() => { try { return JSON.parse(input); } catch { return {}; } })() : input ?? {}) as Partial<WealthPlan>;
  const base = blankPlan();
  const buckets = (Array.isArray(raw.buckets) ? raw.buckets : base.buckets).map((bucket, index) => {
    const kind = (bucket.kind ?? 'other') as BucketKind;
    const contribution = bucket.contribution && (bucket.contribution as Contribution).mode === 'percent' ? bucket.contribution : { mode: 'fixed' as const, amount: num((bucket.contribution as { amount?: number } | undefined)?.amount) };
    return { ...newBucket(kind, bucket.name ?? `Bucket ${index + 1}`, index), ...bucket, contribution, rates: { ...defaultRates(kind), ...(bucket.rates ?? {}) }, links: Array.isArray(bucket.links) ? bucket.links : [], deployEvery: Math.max(1, Math.round(num(bucket.deployEvery) || 1)) } as Bucket;
  });
  return {
    ...base, ...raw,
    version: 1,
    start: /^\d{4}-\d{2}$/.test(String(raw.start)) ? String(raw.start) : base.start,
    periods: Math.max(1, Math.min(600, Math.round(num(raw.periods) || base.periods))),
    breaks: Array.isArray(raw.breaks) ? raw.breaks.map(Number).filter(month => month >= 1 && month <= 12) : [],
    breakMode: raw.breakMode === 'skip' ? 'skip' : 'pause',
    yearStartMonth: Math.min(12, Math.max(1, Math.round(num(raw.yearStartMonth) || 1))),
    yearLabel: String(raw.yearLabel || 'Year'),
    buckets,
    extras: Array.isArray(raw.extras) ? raw.extras : [],
    injections: Array.isArray(raw.injections) ? raw.injections : [],
    milestones: (Array.isArray(raw.milestones) ? raw.milestones : base.milestones).map(Number).filter(value => value > 0).sort((a, b) => a - b),
    milestoneBuckets: Array.isArray(raw.milestoneBuckets) ? raw.milestoneBuckets.filter(id => buckets.some(bucket => bucket.id === id)) : [],
    inflation: raw.inflation === undefined ? base.inflation : Math.max(0, num(raw.inflation)),
    depositLog: Array.isArray(raw.depositLog) ? raw.depositLog : [],
    overrides: raw.overrides && typeof raw.overrides === 'object' ? raw.overrides : {},
  };
}

// ---- Timeline ------------------------------------------------------------------

export type Period = { index: number; month: string; label: string; calendarMonth: number; year: number; group: number; groupLabel: string; isBreak: boolean; afterSkip: boolean };

/** The plan's months in order. In skip mode, break months don't exist; in pause mode they exist without deposits. */
export function timeline(plan: WealthPlan): Period[] {
  const out: Period[] = [];
  let [year, month] = plan.start.split('-').map(Number);
  let group = 1;
  let skipped = false;
  for (let guard = 0; out.length < plan.periods && guard < 1200; guard += 1) {
    if (out.length > 0 && month === plan.yearStartMonth) group += 1;
    const isBreak = plan.breaks.includes(month);
    if (isBreak && plan.breakMode === 'skip') skipped = true;
    else {
      out.push({ index: out.length + 1, month: `${year}-${pad(month)}`, label: `${MONTHS[month - 1]} '${String(year).slice(2)}`, calendarMonth: month, year, group, groupLabel: `${plan.yearLabel}${group}`, isBreak, afterSkip: skipped });
      skipped = false;
    }
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  return out;
}

/** The plan period for a date (the next one if that month is skipped), 0 before the plan starts. */
export function periodFor(plan: WealthPlan, date = localDate()) {
  const month = date.slice(0, 7);
  const periods = timeline(plan);
  if (!periods.length || month < periods[0].month) return 0;
  const found = periods.find(period => period.month >= month);
  return found ? found.index : periods.length;
}

export const extraApplies = (extra: Extra, period: Period) => Array.isArray(extra.months) && extra.months.length
  ? extra.months.includes(period.calendarMonth)
  : num(extra.every) > 0 && period.index >= num(extra.startAt || 1) && (period.index - num(extra.startAt || 1)) % num(extra.every) === 0;

// ---- Income for percent contributions ---------------------------------------------

export type IncomeData = { transactions: any[]; incomeFlows: any[] };

/** Matching income per month, and the monthly amount to project with. */
export function incomeBasis(contribution: Contribution, data: IncomeData, today = localDate()) {
  if (contribution.mode !== 'percent') return { byMonth: {} as Record<string, number>, projected: 0 };
  const matches = (tx: any) => tx.type === 'income' && isCashFlow(tx) && tx.source !== 'interest' && tx.source !== 'income_rule'
    && (!contribution.flows?.length || (tx.source === 'income_flow' && contribution.flows.includes(Number(tx.source_id))))
    && (!contribution.accounts?.length || contribution.accounts.includes(Number(tx.account_id)))
    && (!contribution.categories?.length || contribution.categories.map(c => c.toLowerCase()).includes(String(tx.category || '').toLowerCase()));
  const byMonth: Record<string, number> = {};
  for (const tx of data.transactions) if (matches(tx)) { const month = String(tx.date).slice(0, 7); byMonth[month] = (byMonth[month] || 0) + num(tx.amount); }
  const flows = data.incomeFlows.filter(flow => (flow.is_recurring === true || num(flow.is_recurring) === 1) && (!contribution.flows?.length || contribution.flows.includes(Number(flow.id))) && (!contribution.accounts?.length || contribution.accounts.includes(Number(flow.account_id))) && (!contribution.categories?.length || contribution.categories.map(c => c.toLowerCase()).includes(String(flow.category || 'income').toLowerCase())));
  let projected = flows.reduce((sum, flow) => sum + num(flow.amount), 0);
  if (!projected) {
    const recent = [1, 2, 3].map(back => { const [y, m] = today.slice(0, 7).split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 - back, 1)); return byMonth[d.toISOString().slice(0, 7)] || 0; }).filter(value => value > 0);
    projected = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  }
  return { byMonth, projected };
}

// ---- Simulation ----------------------------------------------------------------------

export type Row = {
  index: number; month: string; label: string; group: number; groupLabel: string; isBreak: boolean; afterSkip: boolean;
  deposits: Record<string, number>; balances: Record<string, number>; principal: Record<string, number>;
  extraNames: string[]; injectionNames: string[]; injectionTotal: number;
  depositTotal: number; total: number; milestoneTotal: number; principalTotal: number; growthTotal: number; hits: number[];
};
export type SimOptions = { whatIf?: WhatIf; income?: Record<string, ReturnType<typeof incomeBasis>>; from?: { period: number; balances: Record<string, number> }; actualIncomeUntil?: string };

/** Planned deposit for one bucket in one period (regular + extras + injections, and what-ifs). */
export function plannedDeposit(plan: WealthPlan, bucket: Bucket, period: Period, options: SimOptions = {}) {
  const what = options.whatIf ?? {};
  const paused = period.isBreak || (what.pause && period.index >= what.pause.from && period.index < what.pause.from + what.pause.count) || (what.stopAfter && period.index > what.stopAfter);
  let amount = 0;
  if (!paused) {
    if (bucket.contribution.mode === 'fixed') amount += num(bucket.contribution.amount);
    else {
      const basis = options.income?.[bucket.id];
      const actual = basis && options.actualIncomeUntil && period.month <= options.actualIncomeUntil ? basis.byMonth[period.month] : undefined;
      amount += (num(bucket.contribution.percent) / 100) * (actual ?? basis?.projected ?? 0);
    }
    for (const extra of plan.extras) if (extraApplies(extra, period)) amount += num(extra.amounts?.[bucket.id]);
    if (what.extraMonthly && what.extraMonthly.bucket === bucket.id) amount += num(what.extraMonthly.amount);
  }
  for (const injection of plan.injections) if (num(injection.period) === period.index) amount += num(injection.amounts?.[bucket.id]);
  if (what.bonus && what.bonus.period === period.index && what.bonus.bucket === bucket.id) amount += num(what.bonus.amount);
  return round2(amount);
}

/** Projects every bucket month by month for a scenario. */
export function simulate(plan: WealthPlan, scenario: Scenario = 'balanced', options: SimOptions = {}): Row[] {
  const periods = timeline(plan);
  const what = options.whatIf ?? {};
  const state = new Map(plan.buckets.map(bucket => [bucket.id, { invested: num(bucket.startBalance), pending: 0, principal: num(bucket.startBalance) }]));
  const counted = plan.milestoneBuckets.length ? plan.milestoneBuckets : plan.buckets.map(bucket => bucket.id);
  const reached = new Set<number>();
  const rows: Row[] = [];
  let depositTotal = 0;
  for (const period of periods) {
    const fromHere = options.from && period.index === options.from.period;
    if (fromHere) for (const bucket of plan.buckets) { const s = state.get(bucket.id)!; s.invested = num(options.from!.balances[bucket.id]); s.pending = 0; }
    const deposits: Record<string, number> = {}; const balances: Record<string, number> = {}; const principal: Record<string, number> = {};
    for (const bucket of plan.buckets) {
      const s = state.get(bucket.id)!;
      const skipGrowth = options.from && period.index < options.from.period;
      if (!skipGrowth && !fromHere) {
        const market = MARKET_KINDS.includes(bucket.kind);
        const rate = (bucket.rates[scenario] ?? 0) + (market ? num(what.returnDelta) : 0);
        if (bucket.promo && period.index <= num(bucket.promo.months)) s.invested += (bucket.promo.onStart ? num(bucket.startBalance) : s.invested) * (num(bucket.promo.ratePa) / 12) * (1 - num(bucket.promo.tax));
        else s.invested *= 1 + (rate * (1 - num(bucket.taxRate))) / 12;
        if (market && what.crash && what.crash.period === period.index) s.invested *= 1 - num(what.crash.drop);
      }
      const deposit = fromHere ? 0 : plannedDeposit(plan, bucket, period, options);
      deposits[bucket.id] = deposit;
      s.principal += deposit;
      if (bucket.deployEvery <= 1) s.invested += deposit;
      else { s.pending += deposit; if (period.index % bucket.deployEvery === 0) { s.invested += s.pending; s.pending = 0; } }
      balances[bucket.id] = round2(s.invested + s.pending);
      principal[bucket.id] = round2(s.principal);
    }
    const periodDeposits = Object.values(deposits).reduce((a, b) => a + b, 0);
    depositTotal += periodDeposits;
    const total = round2(Object.values(balances).reduce((a, b) => a + b, 0));
    const principalTotal = round2(Object.values(principal).reduce((a, b) => a + b, 0));
    const milestoneTotal = round2(counted.reduce((sum, id) => sum + (balances[id] ?? 0), 0));
    const hits = plan.milestones.filter(value => !reached.has(value) && milestoneTotal >= value);
    hits.forEach(value => reached.add(value));
    const injections = plan.injections.filter(injection => num(injection.period) === period.index);
    rows.push({
      index: period.index, month: period.month, label: period.label, group: period.group, groupLabel: period.groupLabel, isBreak: period.isBreak, afterSkip: period.afterSkip,
      deposits, balances, principal,
      extraNames: period.isBreak ? [] : plan.extras.filter(extra => extraApplies(extra, period)).map(extra => extra.name),
      injectionNames: injections.map(injection => injection.name || 'One-time deposit'),
      injectionTotal: round2(injections.reduce((sum, injection) => sum + Object.values(injection.amounts || {}).reduce((a, b) => a + num(b), 0), 0)),
      depositTotal: round2(depositTotal), total, milestoneTotal, principalTotal, growthTotal: round2(total - principalTotal), hits,
    });
  }
  return rows;
}

/** When each milestone is first reached. */
export const milestoneDates = (rows: Row[]) => Object.fromEntries(rows.flatMap(row => row.hits.map(value => [value, row])));

/** Today's money: a future amount divided by inflation since the plan started. */
export const inTodaysMoney = (amount: number, periodsFromNow: number, inflation: number) => amount / Math.pow(1 + inflation, Math.max(0, periodsFromNow) / 12);

// ---- Actuals from linked accounts -----------------------------------------------------

export type ActualData = { accounts: any[]; transactions: any[]; portfolios: any[]; incomeFlows?: any[]; toPhp?: (amount: number, currency: string) => number };

const accountOf = (data: ActualData, id: number) => data.accounts.find(account => Number(account.id) === Number(id));
const holdingOf = (data: ActualData, id: number) => data.portfolios.find(holding => Number(holding.id) === Number(id));
const share = (link: BucketLink, balance: number) => link.mode === 'whole' ? balance : link.mode === 'percent' ? balance * num(link.value) / 100 : Math.min(num(link.value), balance);

/** The part of a linked account or holding that belongs to this plan, right now. */
export function linkBalance(link: BucketLink, data: ActualData) {
  if (link.type === 'account') { const account = accountOf(data, link.id); return account ? share(link, Math.max(0, num(account.balance))) : 0; }
  const holding = holdingOf(data, link.id);
  if (!holding) return 0;
  const value = data.toPhp ? data.toPhp(num(holding.current_value), String(holding.currency || 'USD')) : num(holding.current_value);
  return share(link, Math.max(0, value));
}

/** Money that came into a linked account or holding in a month, counted by the plan's share. Interest is growth, not a deposit. */
export function linkInflow(link: BucketLink, data: ActualData, month: string, linkedNames: string[] = []) {
  if (link.mode === 'amount') return 0;
  if (link.since && month < link.since.slice(0, 7)) return 0;
  const portion = link.mode === 'whole' ? 1 : num(link.value) / 100;
  if (link.type === 'account') {
    const total = data.transactions.filter(tx => Number(tx.account_id) === Number(link.id) && tx.type === 'income' && String(tx.date).slice(0, 7) === month && (!link.since || String(tx.date) >= link.since)
      && tx.source !== 'interest' && tx.source !== 'wealth_plan' && String(tx.category).toLowerCase() !== 'interest' && String(tx.category).toLowerCase() !== 'adjustment'
      && !(String(tx.category).toLowerCase() === 'transfer' && linkedNames.some(name => String(tx.description) === `Transfer from ${name}`)))
      .reduce((sum, tx) => sum + num(tx.amount), 0);
    return total * portion;
  }
  const holding = holdingOf(data, link.id);
  if (!holding) return 0;
  const bought = (Array.isArray(holding.history) ? holding.history : []).filter((item: any) => String(item.type).toLowerCase() === 'buy' && String(item.date).slice(0, 7) === month && (!link.since || String(item.date) >= link.since)).reduce((sum: number, item: any) => sum + num(item.amount) * num(item.price), 0);
  return (data.toPhp ? data.toPhp(bought, String(holding.currency || 'USD')) : bought) * portion;
}

/** End-of-month balance of a linked account, worked back from today's balance (holdings only have today's value). */
function linkBalanceAt(link: BucketLink, data: ActualData, month: string, today: string) {
  if (link.type !== 'account') return month >= today.slice(0, 7) ? linkBalance(link, data) : null;
  const account = accountOf(data, link.id);
  if (!account) return 0;
  const [y, m] = month.split('-').map(Number);
  const monthEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  if (monthEnd >= today) return share(link, Math.max(0, num(account.balance)));
  const balances = endOfDayBalances(num(account.balance), data.transactions.filter(tx => Number(tx.account_id) === Number(link.id)), monthEnd, monthEnd);
  return share(link, Math.max(0, balances.get(monthEnd) ?? num(account.balance)));
}

export type BucketActual = { bucket: string; balance: number; source: 'override' | 'linked' | 'logged'; deposits: Record<number, number> };

/**
 * What actually happened: each bucket's deposits per period (deposit log plus
 * money arriving in linked accounts) and its balance now.
 */
export function planActuals(plan: WealthPlan, data: ActualData, today = localDate()) {
  const periods = timeline(plan);
  const current = periodFor(plan, today);
  const linkedNames = plan.buckets.flatMap(bucket => bucket.links.filter(link => link.type === 'account').map(link => String(accountOf(data, link.id)?.name ?? '')));
  const buckets: BucketActual[] = plan.buckets.map(bucket => {
    const deposits: Record<number, number> = {};
    for (const entry of plan.depositLog) if (entry.bucket === bucket.id) deposits[entry.period] = round2((deposits[entry.period] || 0) + num(entry.amount));
    for (const period of periods) {
      if (period.index > Math.max(current, 0)) break;
      const linked = bucket.links.reduce((sum, link) => sum + linkInflow(link, data, period.month, linkedNames), 0);
      if (linked) deposits[period.index] = round2((deposits[period.index] || 0) + linked);
    }
    const override = current > 0 ? plan.overrides[String(current)]?.[bucket.id] : undefined;
    let balance: number; let source: BucketActual['source'];
    if (override !== undefined) { balance = num(override); source = 'override'; }
    else if (bucket.links.length) { balance = round2(bucket.links.reduce((sum, link) => sum + linkBalance(link, data), 0)); source = 'linked'; }
    else {
      const latest = Object.keys(plan.overrides).map(Number).filter(index => index <= current && plan.overrides[String(index)]?.[bucket.id] !== undefined).sort((a, b) => b - a)[0];
      const startAt = latest ?? 0;
      const base = latest ? num(plan.overrides[String(latest)][bucket.id]) : num(bucket.startBalance);
      balance = round2(base + Object.entries(deposits).filter(([index]) => Number(index) > startAt && Number(index) <= current).reduce((sum, [, amount]) => sum + amount, 0));
      source = 'logged';
    }
    return { bucket: bucket.id, balance, source, deposits };
  });
  return { current, buckets };
}

/** Actual net worth at the end of each past period (for the graph), from linked accounts and typed balances. */
export function actualHistory(plan: WealthPlan, data: ActualData, today = localDate()) {
  const current = periodFor(plan, today);
  const actuals = planActuals(plan, data, today);
  // A past month is left off when a linked investment has no history for it, rather than drawn too low.
  return timeline(plan).filter(period => period.index <= current).flatMap(period => {
    let total = 0;
    let known = true;
    for (const bucket of plan.buckets) {
      const typed = plan.overrides[String(period.index)]?.[bucket.id];
      if (typed !== undefined) { total += num(typed); continue; }
      if (period.index === current) { total += actuals.buckets.find(item => item.bucket === bucket.id)?.balance ?? 0; continue; }
      if (bucket.links.length) { for (const link of bucket.links) { const value = linkBalanceAt(link, data, period.month, today); if (value === null) known = false; else total += value; } }
      else total += num(bucket.startBalance) + Object.entries(actuals.buckets.find(item => item.bucket === bucket.id)?.deposits ?? {}).filter(([index]) => Number(index) <= period.index).reduce((sum, [, amount]) => sum + amount, 0);
    }
    return known ? [{ index: period.index, label: period.label, total: round2(total) }] : [];
  });
}

/** The milestone total the plan expects by the end of last period (this one is still in progress). */
export function planSoFar(plan: WealthPlan, rows: Row[], current: number) {
  if (current > 1) return rows[current - 2]?.milestoneTotal ?? 0;
  const counted = plan.milestoneBuckets.length ? plan.milestoneBuckets : plan.buckets.map(bucket => bucket.id);
  return plan.buckets.filter(bucket => counted.includes(bucket.id)).reduce((sum, bucket) => sum + num(bucket.startBalance), 0);
}

/** This period's plan vs actual for one bucket, with carryover credit like the old tracker. */
export function periodProgress(plan: WealthPlan, rows: Row[], actual: BucketActual, period: number) {
  let planned = 0; let deposited = 0;
  for (const row of rows) if (row.index < period) planned += row.deposits[actual.bucket] ?? 0;
  for (const [index, amount] of Object.entries(actual.deposits)) if (Number(index) < period) deposited += amount;
  const thisPlan = rows.find(row => row.index === period)?.deposits[actual.bucket] ?? 0;
  const carryover = Math.max(0, round2(deposited - planned));
  const adjusted = Math.max(0, round2(thisPlan - carryover));
  const depositedNow = round2(actual.deposits[period] ?? 0);
  const status = thisPlan <= 0 && depositedNow <= 0 ? 'none' : carryover >= thisPlan || depositedNow + carryover >= thisPlan - 0.005 ? 'cleared' : depositedNow > 0 ? 'partial' : 'missed';
  return { thisPlan, carryover, adjusted, deposited: depositedNow, status: status as 'none' | 'cleared' | 'partial' | 'missed' };
}

/** From today's actual balances forward, following the plan's deposits. */
export function trajectory(plan: WealthPlan, data: ActualData, scenario: Scenario = 'balanced', options: SimOptions = {}, today = localDate()) {
  const actuals = planActuals(plan, data, today);
  if (actuals.current < 1) return simulate(plan, scenario, options);
  return simulate(plan, scenario, { ...options, from: { period: actuals.current, balances: Object.fromEntries(actuals.buckets.map(item => [item.bucket, item.balance])) } });
}

// ---- Sharing accounts across plans and goals -----------------------------------------

export type Allocation = { account_id: number; name: string; balance: number; owners: { owner: string; kind: 'plan' | 'goal'; mode: LinkMode | 'part'; value: number; amount: number }[]; percent: number; fixed: number; whole: string | null; unassigned: number; problems: string[] };

/** How each account is split between wealth plans and goals, and anything over-allocated. */
export function accountAllocation(plans: { name: string; plan: WealthPlan }[], goals: any[], accounts: any[]): Allocation[] {
  return accounts.filter(account => !['card', 'credit'].includes(String(account.type).toLowerCase())).map(account => {
    const balance = Math.max(0, num(account.balance));
    const owners: Allocation['owners'] = [];
    for (const { name, plan } of plans) for (const bucket of plan.buckets) for (const link of bucket.links) if (link.type === 'account' && Number(link.id) === Number(account.id)) owners.push({ owner: `${name} · ${bucket.name}`, kind: 'plan', mode: link.mode, value: num(link.value), amount: share(link, balance) });
    for (const goal of goals) for (const source of parseList<any>(goal.sources)) if (Number(source.account_id) === Number(account.id)) owners.push({ owner: String(goal.name), kind: 'goal', mode: source.mode === 'whole' ? 'whole' : 'part', value: num(source.amount), amount: source.mode === 'whole' ? balance : num(source.amount) });
    const wholeOwners = owners.filter(owner => owner.mode === 'whole');
    const percent = owners.filter(owner => owner.mode === 'percent').reduce((sum, owner) => sum + owner.value, 0);
    const fixed = owners.filter(owner => owner.mode === 'amount' || owner.mode === 'part').reduce((sum, owner) => sum + owner.value, 0);
    const problems: string[] = [];
    if (wholeOwners.length && owners.length > 1) problems.push(`${wholeOwners[0].owner} counts the whole account, but others use it too.`);
    if (percent > 100.0001) problems.push(`Shares add up to ${Math.round(percent)}%.`);
    if (balance * percent / 100 + fixed > balance + 0.005 && !wholeOwners.length) problems.push(`More is assigned than the ₱${Math.round(balance).toLocaleString('en-PH')} it holds.`);
    const used = wholeOwners.length ? balance : Math.min(balance, balance * percent / 100 + fixed);
    return { account_id: Number(account.id), name: String(account.name), balance, owners, percent, fixed, whole: wholeOwners[0]?.owner ?? null, unassigned: round2(Math.max(0, balance - used)), problems };
  }).filter(item => item.owners.length);
}

/** Problems with one plan's links against every other plan and goal, checked before saving. */
export function linkProblems(planName: string, plan: WealthPlan, others: { name: string; plan: WealthPlan }[], goals: any[], accounts: any[]) {
  const all = accountAllocation([...others, { name: planName, plan }], goals, accounts);
  const mine = new Set(plan.buckets.flatMap(bucket => bucket.links.filter(link => link.type === 'account').map(link => Number(link.id))));
  return all.filter(item => mine.has(item.account_id) && item.problems.length).map(item => `${item.name}: ${item.problems.join(' ')}`);
}

/** A savings account's own yearly rate and tax (from its interest settings), so a bucket linked to it can use them. */
export function accountRate(account: any, today = localDate()) {
  if (!account || ['off', 'fixed'].includes(interestMode(account))) return null;
  const rate = interestRates(account, Math.max(num(account.balance), num(account.interest_min_balance), 1), today).base;
  return rate > 0 ? { rate, tax: interestTaxRate(account) } : null;
}

// ---- Quick calculator ----------------------------------------------------------------

export function compound(principal: number, monthly: number, years: number, rate: number, inflation: number) {
  const monthlyRate = rate / 12;
  return Array.from({ length: Math.max(0, Math.round(years)) + 1 }, (_, year) => {
    const months = year * 12;
    const growth = monthlyRate ? Math.pow(1 + monthlyRate, months) : 1;
    const value = principal * growth + (monthlyRate ? monthly * (growth - 1) / monthlyRate : monthly * months);
    const deposited = principal + monthly * months;
    return { year, value: round2(value), real: round2(value / Math.pow(1 + inflation, year)), deposited: round2(deposited), growth: round2(value - deposited) };
  });
}

// ---- Templates ---------------------------------------------------------------------

export type TemplateId = 'school' | 'emergency' | 'invest' | 'purchase' | 'percent' | 'blank';
export type TemplateOptions = { start?: string; monthlyExpenses?: number; target?: number; today?: string };
export const PLAN_TEMPLATES: { id: TemplateId; name: string; blurb: string; needs?: 'expenses' | 'target' }[] = [
  { id: 'school', name: 'School-year savings', blurb: 'Aug–Jun school years with the summer skipped, allowance or scholarship months, an index fund, a time deposit and savings.' },
  { id: 'emergency', name: 'Emergency fund', blurb: 'Build 3–6 months of your spending in a high-interest savings account within a year.', needs: 'expenses' },
  { id: 'invest', name: 'Long-term investing', blurb: 'Ten years of monthly investing across an index fund, stocks, some crypto and a cash buffer.' },
  { id: 'purchase', name: 'Big purchase', blurb: 'Save for a house, car, wedding or trip by a set date, split between a time deposit and savings.', needs: 'target' },
  { id: 'percent', name: 'Pay yourself first', blurb: 'Put a percent of every income you log into savings and investments, so it grows with your pay.' },
  { id: 'blank', name: 'Start from scratch', blurb: 'An empty plan with one investment and one savings account. Add what you need.' },
];

const roundTo = (value: number, step: number) => Math.max(step, Math.ceil(value / step) * step);
const addMonths = (month: string, count: number) => { const [y, m] = month.split('-').map(Number); const at = y * 12 + m - 1 + count; return `${Math.floor(at / 12)}-${String((at % 12) + 1).padStart(2, '0')}`; };

/** A ready-to-edit plan for common goals. Amounts are starting points the person changes in Edit. */
export function planTemplate(id: TemplateId, options: TemplateOptions = {}): { name: string; plan: WealthPlan } {
  const today = options.today ?? localDate();
  const thisMonth = today.slice(0, 7);
  const start = options.start && /^\d{4}-\d{2}$/.test(options.start) ? options.start : thisMonth;
  const base = (periods: number, buckets: Bucket[], milestones: number[]): WealthPlan => ({ ...blankPlan(start), periods, buckets, milestones, milestoneBuckets: [] });
  const bucket = (kind: BucketKind, name: string, index: number, monthly: number, extra: Partial<Bucket> = {}): Bucket => ({ ...newBucket(kind, name, index), contribution: { mode: 'fixed', amount: monthly }, ...extra });

  if (id === 'school') {
    // The school year this month belongs to (it starts in August).
    const [year, month] = thisMonth.split('-').map(Number);
    const schoolStart = options.start ?? `${month >= 8 ? year : year - 1}-08`;
    const fund = bucket('etf', 'Index fund', 0, 1700, { rates: { conservative: 0.05, balanced: 0.09, aggressive: 0.12 }, deployEvery: 2, note: 'Bought every 2 months to save on fees.' });
    const deposit = bucket('time_deposit', 'Time deposit', 1, 400, { rates: { conservative: 0.06, balanced: 0.06, aggressive: 0.06 }, taxRate: 0.2 });
    const savings = bucket('bank', 'Emergency savings', 2, 200, { note: 'A small buffer you can reach quickly.' });
    const personal = bucket('bank', 'Personal money', 3, 250, { note: 'Kept apart from the plan totals.' });
    const plan: WealthPlan = { ...base(33, [fund, deposit, savings, personal], [...DEFAULT_MILESTONES]), start: schoolStart, breaks: [7], breakMode: 'skip', yearStartMonth: 8, yearLabel: 'SY',
      extras: [{ id: newId('x'), name: 'Allowance / scholarship', months: [10, 3], amounts: { [fund.id]: 8500, [deposit.id]: 3000, [savings.id]: 1500, [personal.id]: 500 } }],
      milestoneBuckets: [fund.id, deposit.id, savings.id] };
    return { name: 'School-year savings', plan };
  }
  if (id === 'emergency') {
    const spend = Math.max(1000, num(options.monthlyExpenses) || 20000);
    const goal = roundTo(spend * 6, 1000);
    const fund = bucket('bank', 'Emergency fund', 1, roundTo(goal / 12, 100), { rates: { conservative: 0.035, balanced: 0.035, aggressive: 0.035 }, note: 'Use a high-interest digital savings account you can withdraw from any time.' });
    return { name: 'Emergency fund', plan: base(12, [fund], [roundTo(spend, 1000), roundTo(spend * 3, 1000), goal]) };
  }
  if (id === 'invest') {
    const plan = base(120, [
      bucket('etf', 'Index fund', 0, 3000),
      bucket('stock', 'Stocks', 1, 1000),
      bucket('crypto', 'Crypto', 2, 500, { note: 'Keep it small: crypto can fall a lot.' }),
      bucket('bank', 'Cash buffer', 3, 500),
    ], [100000, 250000, 500000, 1000000, 2000000]);
    return { name: 'Long-term investing', plan };
  }
  if (id === 'purchase') {
    const target = Math.max(1000, num(options.target) || 300000);
    const periods = 36;
    const monthly = target / periods;
    const deposit = bucket('time_deposit', 'Time deposit', 1, roundTo(monthly * 0.6, 100), { rates: { conservative: 0.055, balanced: 0.055, aggressive: 0.055 } });
    const savings = bucket('bank', 'Savings', 2, roundTo(monthly * 0.4, 100));
    return { name: 'Big purchase', plan: { ...base(periods, [deposit, savings], [0.25, 0.5, 0.75, 1].map(part => roundTo(target * part, 1000))), extras: [], injections: [] } };
  }
  if (id === 'percent') {
    const invest = { ...bucket('etf', 'Investments', 0, 0), contribution: { mode: 'percent' as const, percent: 10 } };
    const save = { ...bucket('bank', 'Savings', 2, 0), contribution: { mode: 'percent' as const, percent: 10 } };
    return { name: 'Pay yourself first', plan: base(24, [invest, save], [25000, 50000, 100000, 250000, 500000]) };
  }
  return { name: 'My plan', plan: blankPlan(start) };
}

/** The end month (YYYY-MM) of a plan, counting skipped months. */
export const planEnd = (plan: WealthPlan) => timeline(plan).at(-1)?.month ?? addMonths(plan.start, plan.periods - 1);
