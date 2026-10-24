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

export function formatTicker(ticker: string, type: string) {
  if (!ticker) return ticker;
  let t = ticker.toUpperCase().trim();
  if (type === "Cryptos" && !t.includes("-")) {
    t = t + "-USD";
  }
  return t;
}

type BusinessRecord = { type?: unknown; status?: unknown; value?: unknown; amount?: unknown; date?: unknown; description?: unknown };

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
