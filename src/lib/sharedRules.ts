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

type BusinessRecord ={ type?: unknown; status?: unknown; value?: unknown; amount?: unknown; date?: unknown; description?: unknown };

/** Monthly value and customer count shown on each venture card. */
export function businessMetrics(businessType: unknown, transactions: BusinessRecord[], items: BusinessRecord[], thisMonth = new Date().toISOString().slice(0, 7)) {
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
