// Income rules: take a percent (or a fixed amount) of every income you log,
// for tithes, paying yourself first, taxes and the like. A rule either keeps a
// running count you give later, or acts on its own: spending it, moving it to
// other accounts, or adding it to accounts. Shared by both backends and the UI.
import { isCashFlow, parseList } from './sharedRules';

export type RuleAction = 'counter' | 'deduct' | 'transfer' | 'add';
export type RuleTarget = { account_id: number; share: number };
export type IncomeRule = {
  id: number; name: string; mode: 'percent' | 'amount'; percent: number; amount: number;
  categories: string[]; accounts: number[]; include_interest: boolean;
  action: RuleAction; targets: RuleTarget[]; category: string; start_date: string; active: boolean;
};
export type RuleMove =
  | { type: 'income' | 'expense'; account_id: number; amount: number; category: string; description: string }
  | { type: 'transfer'; from: number; to: number; amount: number; description: string };
export type IncomeLike = { id?: unknown; account_id?: unknown; type?: unknown; amount?: unknown; category?: unknown; description?: unknown; date?: unknown; source?: unknown };

export const RULE_ACTIONS: Record<RuleAction, { label: string; short: string; help: string }> = {
  counter: { label: 'Count it, give later', short: 'Counter', help: 'Adds up what you owe. Tap Give when you hand it over.' },
  deduct: { label: 'Spend it right away', short: 'Spend', help: 'Records it as spending from the account the income landed in (or the ones you pick).' },
  transfer: { label: 'Move it to accounts', short: 'Move', help: 'Moves it from the account the income landed in to one or more accounts.' },
  add: { label: 'Add it to accounts', short: 'Add', help: 'Adds it as money in to the accounts you pick, like a bonus envelope.' },
};

export const RULE_PRESETS: { key: string; name: string; percent: number; action: RuleAction; category: string; blurb: string }[] = [
  { key: 'tithe', name: 'Tithe', percent: 10, action: 'counter', category: 'Tithes', blurb: '10% of every income, given when you go to church.' },
  { key: 'pay-yourself', name: 'Pay yourself first', percent: 20, action: 'transfer', category: 'Savings', blurb: '20% moved to savings the moment income arrives.' },
  { key: 'taxes', name: 'Taxes', percent: 8, action: 'counter', category: 'Taxes', blurb: '8% of freelance or business income kept for BIR payments.' },
  { key: 'charity', name: 'Giving', percent: 5, action: 'counter', category: 'Charity', blurb: '5% for family, friends or causes you support.' },
];

const num = (value: unknown) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; };
const round2 = (value: number) => Math.round(value * 100) / 100;
const lower = (value: unknown) => String(value ?? '').trim().toLowerCase();
const truthy = (value: unknown) => value === true || value === 1 || value === '1' || value === 'true';
const ACTIONS: RuleAction[] = ['counter', 'deduct', 'transfer', 'add'];
/** Sources that are never income for a rule: its own entries, goal moves, trades and plan deposits. */
const NOT_INCOME_SOURCES = ['income_rule', 'goal', 'portfolio', 'wealth_plan'];

/** A stored rule row (JSON columns as text) as a usable rule. */
export function normalizeRule(row: any): IncomeRule {
  return {
    id: Number(row?.id) || 0,
    name: String(row?.name || 'Rule'),
    mode: row?.mode === 'amount' ? 'amount' : 'percent',
    percent: Math.max(0, num(row?.percent)),
    amount: Math.max(0, num(row?.amount)),
    categories: parseList<string>(row?.categories).map(String).filter(Boolean),
    accounts: parseList<number>(row?.accounts).map(Number).filter(Boolean),
    include_interest: truthy(row?.include_interest),
    action: ACTIONS.includes(row?.action) ? row.action : 'counter',
    targets: parseList<RuleTarget>(row?.targets).map(target => ({ account_id: Number(target.account_id), share: Math.max(0, num(target.share)) })).filter(target => target.account_id),
    category: String(row?.category || ''),
    start_date: String(row?.start_date || ''),
    active: row?.active === undefined || row?.active === null ? true : truthy(row.active),
  };
}

/** Checks and cleans a rule from the app, ready to store; JSON columns become text. */
export function ruleRecord(input: any, accounts: { id?: unknown }[]): { error: string } | Record<string, unknown> {
  const rule = normalizeRule(input);
  const name = rule.name.trim().slice(0, 60);
  if (!String(input?.name || '').trim()) return { error: 'Give the rule a name.' };
  if (rule.mode === 'percent' && (rule.percent <= 0 || rule.percent > 100)) return { error: 'Use a percent from 0.1 to 100.' };
  if (rule.mode === 'amount' && rule.amount <= 0) return { error: 'Enter an amount above zero.' };
  const known = new Set(accounts.map(account => Number(account.id)));
  const targets = rule.targets.filter(target => known.has(target.account_id) && target.share > 0);
  if ((rule.action === 'transfer' || rule.action === 'add') && !targets.length) return { error: 'Pick at least one account to send it to.' };
  if (rule.start_date && !/^\d{4}-\d{2}-\d{2}$/.test(rule.start_date)) return { error: 'Use a valid start date.' };
  return {
    name, mode: rule.mode, percent: rule.mode === 'percent' ? rule.percent : 0, amount: rule.mode === 'amount' ? rule.amount : 0,
    categories: JSON.stringify(rule.categories), accounts: JSON.stringify(rule.accounts.filter(id => known.has(id))), include_interest: rule.include_interest ? 1 : 0,
    action: rule.action, targets: JSON.stringify(targets), category: rule.category.trim().slice(0, 40), start_date: rule.start_date || null, active: rule.active ? 1 : 0,
  };
}

/** Real income a rule can take from: not transfers, adjustments, trades, goal moves, rule entries or plan deposits. */
export function isRuleIncome(tx: IncomeLike, includeInterest = false) {
  if (lower(tx.type) !== 'income' || !isCashFlow(tx as { category?: unknown; source?: unknown })) return false;
  if (NOT_INCOME_SOURCES.includes(String(tx.source ?? ''))) return false;
  const interest = tx.source === 'interest' || lower(tx.category) === 'interest';
  return includeInterest || !interest;
}

export function ruleMatches(rule: IncomeRule, tx: IncomeLike) {
  if (!rule.active || !isRuleIncome(tx, rule.include_interest)) return false;
  const date = String(tx.date ?? '').slice(0, 10);
  if (rule.start_date && date < rule.start_date) return false;
  if (rule.categories.length && !rule.categories.map(lower).includes(lower(tx.category))) return false;
  if (rule.accounts.length && !rule.accounts.includes(Number(tx.account_id))) return false;
  return true;
}

export function ruleAmount(rule: IncomeRule, tx: IncomeLike) {
  const income = Math.max(0, num(tx.amount));
  return round2(rule.mode === 'amount' ? Math.min(rule.amount, income) : income * rule.percent / 100);
}

/** Splits an amount by shares (any scale); cents left over go to the last one so it adds up exactly. */
export function splitByShares(total: number, targets: RuleTarget[]) {
  const usable = targets.filter(target => target.share > 0);
  const sum = usable.reduce((acc, target) => acc + target.share, 0);
  if (!usable.length || sum <= 0) return [];
  let left = round2(total);
  return usable.map((target, index) => {
    const amount = index === usable.length - 1 ? left : round2(total * target.share / sum);
    left = round2(left - amount);
    return { account_id: target.account_id, amount };
  }).filter(part => part.amount > 0);
}

/** The money movements a rule makes for one income (none for a counter). */
export function ruleMoves(rule: IncomeRule, tx: IncomeLike, amount: number): RuleMove[] {
  if (amount <= 0 || rule.action === 'counter') return [];
  const from = Number(tx.account_id);
  const what = String(tx.description || tx.category || 'income');
  const part = rule.mode === 'percent' ? `${Number(rule.percent.toFixed(2))}% of ${what}` : `from ${what}`;
  const description = `${rule.name} · ${part}`;
  if (rule.action === 'deduct') {
    const parts = rule.targets.length ? splitByShares(amount, rule.targets) : [{ account_id: from, amount }];
    return parts.map(item => ({ type: 'expense' as const, account_id: item.account_id, amount: item.amount, category: rule.category || rule.name, description }));
  }
  if (rule.action === 'transfer') return splitByShares(amount, rule.targets).filter(item => item.account_id !== from).map(item => ({ type: 'transfer' as const, from, to: item.account_id, amount: item.amount, description }));
  return splitByShares(amount, rule.targets).map(item => ({ type: 'income' as const, account_id: item.account_id, amount: item.amount, category: rule.category || 'Savings', description }));
}

export type RuleEntry = { id: number; rule_id: number; kind: 'accrual' | 'give'; source_tx_id: number | null; amount: number; date: string; tx_ids: number[]; note: string };
export const normalizeEntry = (row: any): RuleEntry => ({ id: Number(row?.id) || 0, rule_id: Number(row?.rule_id) || 0, kind: row?.kind === 'give' ? 'give' : 'accrual', source_tx_id: row?.source_tx_id == null ? null : Number(row.source_tx_id), amount: num(row?.amount), date: String(row?.date || ''), tx_ids: parseList<number>(row?.tx_ids).map(Number).filter(Boolean), note: String(row?.note || '') });

/** Totals for one rule: counted, given, still owed (counters), and this month's amount. */
export function ruleTotals(ruleId: number, entries: RuleEntry[], month: string) {
  const mine = entries.filter(entry => entry.rule_id === ruleId);
  const counted = round2(mine.filter(entry => entry.kind === 'accrual').reduce((sum, entry) => sum + entry.amount, 0));
  const given = round2(mine.filter(entry => entry.kind === 'give').reduce((sum, entry) => sum + entry.amount, 0));
  const thisMonth = round2(mine.filter(entry => entry.kind === 'accrual' && entry.date.startsWith(month)).reduce((sum, entry) => sum + entry.amount, 0));
  return { counted, given, owed: round2(Math.max(0, counted - given)), this_month: thisMonth, entries: mine.filter(entry => entry.kind === 'accrual').length };
}
