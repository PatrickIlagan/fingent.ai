import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';
import { addMonth, businessMetrics, categoryAliasGroup, dueOccurrences, FALLBACK_FX_RATES, formatTicker, FX_RATES_URL, isAutopayLiability, isIsoDate, legacyIncomeFlowNote, legacyLiabilityNote, liabilityAfterPayment, liabilityCategory, ratesFromFrankfurter, resolveCategoryAlias } from './sharedRules';

type JsonRecord = Record<string, unknown>;

const DATABASE = 'fingent_mobile';
const originalFetch = window.fetch.bind(window);
let database: SQLiteDBConnection | null = null;
let databaseMode: 'secret' | 'encryption' = 'secret';

const collections: Record<string, string> = {
  '/api/accounts': 'accounts',
  '/api/goals': 'goals',
  '/api/transactions': 'transactions',
  '/api/categories': 'categories',
  '/api/career/tasks': 'career_tasks',
  '/api/personal/notes': 'personal_notes',
  '/api/personal/routines': 'personal_routines',
  '/api/portfolios': 'portfolios',
  '/api/calendar_events': 'calendar_events',
  '/api/liabilities': 'liabilities',
  '/api/income_flows': 'income_flows',
  '/api/budget_presets': 'budget_presets',
  '/api/budgets': 'budgets',
  '/api/businesses': 'businesses',
  '/api/business_deals': 'business_deals',
  '/api/freelance_businesses': 'freelance_businesses',
  '/api/freelancing/services': 'freelancing_services',
  '/api/freelancing/invoices': 'freelancing_invoices',
  '/api/freelancing/time_logs': 'freelancing_time_logs',
};

const syncTableCollections: Record<string, string> = {
  accounts: 'accounts', transactions: 'transactions', categories: 'categories', goals: 'goals', portfolios: 'portfolios', portfolio_transactions: 'portfolio_transactions', liabilities: 'liabilities', career: 'career_profile', career_tasks: 'career_tasks', personal_notes: 'personal_notes', personal_routines: 'personal_routines', calendar_events: 'calendar_events', income_flows: 'income_flows', budget_presets: 'budget_presets', budgets: 'budgets', businesses: 'businesses', business_deals: 'business_deals', business_items: 'business_items', business_transactions: 'business_transactions', freelance_businesses: 'freelance_businesses', freelancing_services: 'freelancing_services', freelancing_invoices: 'freelancing_invoices', freelancing_time_logs: 'freelancing_time_logs',
};

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

const today = () => new Date().toISOString().slice(0, 10);
const number = (value: unknown) => Number(value) || 0;
const isActive = (record: JsonRecord) => record.active !== 0 && record.active !== false;

async function getJson(url: string) {
  try {
    const response = await CapacitorHttp.get({ url, connectTimeout: 8000, readTimeout: 8000 });
    if (response.status !== 200) return null;
    return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  } catch {
    return null;
  }
}

/** Live crypto price from Coinbase's public spot API (e.g. BTC-USD). Only the symbol leaves the device. */
async function cryptoQuote(symbol: string) {
  const data = await getJson(`https://api.coinbase.com/v2/prices/${encodeURIComponent(symbol)}/spot`);
  const price = Number(data?.data?.amount);
  return price > 0 ? { price, currency: String(data.data.currency || 'USD') } : null;
}

let lastRates: Record<string, number> = FALLBACK_FX_RATES;

async function getDatabase() {
  if (database) return database;
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const existing = await sqlite.isConnection(DATABASE, false);
  database = existing.result
    ? await sqlite.retrieveConnection(DATABASE, false)
    : await sqlite.createConnection(DATABASE, true, databaseMode, 1, false);
  await database.open();
  await database.execute(`
    CREATE TABLE IF NOT EXISTS mobile_records (
      collection TEXT NOT NULL,
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS mobile_records_collection ON mobile_records (collection, id);
    CREATE TABLE IF NOT EXISTS mobile_records_v2 (
      collection TEXT NOT NULL,
      id INTEGER NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (collection, id)
    );
    INSERT OR IGNORE INTO mobile_records_v2 (collection, id, payload, updated_at)
      SELECT collection, id, payload, updated_at FROM mobile_records;
    CREATE TABLE IF NOT EXISTS mobile_routine_logs (
      routine_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      PRIMARY KEY (routine_id, date)
    );
  `);
  return database;
}

async function list(collection: string): Promise<JsonRecord[]> {
  const db = await getDatabase();
  const result = await db.query('SELECT id, payload, updated_at FROM mobile_records_v2 WHERE collection = ? ORDER BY id DESC', [collection]);
  return (result.values ?? []).map((row: any) => ({ ...JSON.parse(row.payload), id: row.id, updated_at: row.updated_at }));
}

async function find(collection: string, id: string | number) {
  const db = await getDatabase();
  const result = await db.query('SELECT id, payload, updated_at FROM mobile_records_v2 WHERE collection = ? AND id = ?', [collection, Number(id)]);
  const row: any = result.values?.[0];
  return row ? { ...JSON.parse(row.payload), id: row.id, updated_at: row.updated_at } as JsonRecord : null;
}

async function insert(collection: string, payload: JsonRecord) {
  const db = await getDatabase();
  const timestamp = new Date().toISOString();
  const next = await db.query('SELECT COALESCE(MAX(id), 0) + 1 AS id FROM mobile_records_v2 WHERE collection = ?', [collection]);
  const id = Number(next.values?.[0]?.id ?? 1);
  await db.run('INSERT INTO mobile_records_v2 (collection, id, payload, updated_at) VALUES (?, ?, ?, ?)', [collection, id, JSON.stringify(payload), timestamp]);
  return id;
}

async function replace(collection: string, id: string | number, payload: JsonRecord) {
  const db = await getDatabase();
  await db.run('UPDATE mobile_records_v2 SET payload = ?, updated_at = ? WHERE collection = ? AND id = ?', [JSON.stringify(payload), new Date().toISOString(), collection, Number(id)]);
}

async function remove(collection: string, id: string | number) {
  const db = await getDatabase();
  await db.run('DELETE FROM mobile_records_v2 WHERE collection = ? AND id = ?', [collection, Number(id)]);
}

async function exportSyncSnapshot() {
  const tables: Record<string, JsonRecord[]> = {};
  for (const [table, collection] of Object.entries(syncTableCollections)) {
    tables[table] = (await list(collection)).map(({ updated_at, ...row }) => row);
  }
  const db = await getDatabase();
  const routineLogs = await db.query('SELECT routine_id, date FROM mobile_routine_logs');
  tables.personal_routine_logs = (routineLogs.values ?? []) as JsonRecord[];
  return { format: 'FINGENT_SYNC_V1', exportedAt: new Date().toISOString(), tables };
}

async function importSyncSnapshot(snapshot: any) {
  if (!snapshot || snapshot.format !== 'FINGENT_SYNC_V1' || typeof snapshot.tables !== 'object') throw new Error('This is not a FinGent sync backup.');
  const db = await getDatabase();
  await db.execute('DELETE FROM mobile_records_v2; DELETE FROM mobile_routine_logs;');
  for (const [table, collection] of Object.entries(syncTableCollections)) {
    const records = Array.isArray(snapshot.tables[table]) ? snapshot.tables[table] : [];
    for (const raw of records) {
      const row = raw as JsonRecord;
      const id = Number(row.id);
      if (!Number.isInteger(id) || id <= 0) continue;
      const { id: _id, ...payload } = row;
      await db.run('INSERT OR REPLACE INTO mobile_records_v2 (collection, id, payload, updated_at) VALUES (?, ?, ?, ?)', [collection, id, JSON.stringify(payload), new Date().toISOString()]);
    }
  }
  for (const row of Array.isArray(snapshot.tables.personal_routine_logs) ? snapshot.tables.personal_routine_logs : []) {
    await db.run('INSERT OR REPLACE INTO mobile_routine_logs (routine_id, date) VALUES (?, ?)', [Number(row.routine_id), String(row.date)]);
  }
}

function byBusiness(records: JsonRecord[], businessId: string | null) {
  return businessId ? records.filter((record) => String(record.business_id) === businessId) : records;
}

async function ensureCategory(name: unknown, type: 'income' | 'expense') {
  const normalized = String(name ?? '').trim();
  if (!normalized) return;
  const existing = (await list('categories')).find((item) => String(item.name).toLowerCase() === normalized.toLowerCase());
  if (existing) {
    if (existing.type !== type && existing.type !== 'both') await replace('categories', existing.id as number, { ...existing, type: 'both', active: 1 });
    return;
  }
  await insert('categories', { name: normalized, type, active: 1 });
}

async function resolveCategory(value: unknown) {
  const supplied = String(value ?? 'Uncategorized').trim() || 'Uncategorized';
  if (!categoryAliasGroup(supplied)) return supplied;
  return resolveCategoryAlias(supplied, (await list('categories')).filter(isActive).map((item) => String(item.name)));
}

// Like the server, categories used on past transactions appear in Categories unless archived.
async function backfillCategories(transactions: JsonRecord[]) {
  const used = new Map<string, { name: string; types: Set<string> }>();
  for (const transaction of transactions) {
    const name = String(transaction.category ?? '').trim();
    if (!name) continue;
    const entry = used.get(name.toLowerCase()) ?? { name, types: new Set<string>() };
    entry.types.add(transaction.type === 'income' ? 'income' : 'expense');
    used.set(name.toLowerCase(), entry);
  }
  const categories = await list('categories');
  for (const [key, entry] of used) {
    const type = entry.types.size > 1 ? 'both' : [...entry.types][0];
    const existing = categories.find((item) => String(item.name).toLowerCase() === key);
    if (!existing) await insert('categories', { name: entry.name, type, active: 1 });
    else if (isActive(existing) && existing.type !== type && existing.type !== 'both') await replace('categories', existing.id as number, { ...existing, type: 'both' });
  }
}

async function adjustBalance(accountId: unknown, amount: unknown, type: unknown, reverse = false) {
  const account = await find('accounts', Number(accountId));
  if (!account) return;
  const sign = String(type).toLowerCase() === 'income' ? 1 : -1;
  await replace('accounts', account.id as number, { ...account, balance: number(account.balance) + number(amount) * sign * (reverse ? -1 : 1) });
}

type AccountEntry = { account_id: unknown; type: 'income' | 'expense'; amount: number; category: string; description: string; notes?: string; date: string; source?: string | null; source_id?: number | null };

/** Changes an account balance and records the matching transaction, linked to the record that caused it. */
async function recordAccountTransaction(entry: AccountEntry) {
  await adjustBalance(entry.account_id, entry.amount, entry.type);
  const id = await insert('transactions', { ...entry, account_id: Number(entry.account_id), notes: entry.notes || '', source: entry.source ?? null, source_id: entry.source_id ?? null });
  await ensureCategory(entry.category, entry.type);
  return id;
}

async function recordTransfer(from: JsonRecord, to: JsonRecord, amount: number, date: string, notes: string, source: string | null = null, sourceId: number | null = null) {
  await recordAccountTransaction({ account_id: from.id, type: 'expense', amount, category: 'Transfer', description: `Transfer to ${to.name}`, notes, date, source, source_id: sourceId });
  await recordAccountTransaction({ account_id: to.id, type: 'income', amount, category: 'Transfer', description: `Transfer from ${from.name}`, notes, date, source, source_id: sourceId });
}

async function linkedTransactions(source: string, sourceId: unknown, legacyNote: string, transactions?: JsonRecord[]) {
  return (transactions ?? await list('transactions')).filter((transaction) => transaction.source
    ? transaction.source === source && Number(transaction.source_id) === Number(sourceId)
    : transaction.notes === legacyNote);
}

/** Deletes transactions and restores the account balances they changed. */
async function removeTransactions(transactions: JsonRecord[]) {
  for (const transaction of transactions) {
    await adjustBalance(transaction.account_id, transaction.amount, transaction.type, true);
    await remove('transactions', transaction.id as number);
  }
}

// Same rules as the server: recurring deposits and auto-paid bills post on each
// due date and roll forward; older records without source links only roll forward.
async function postDueRecurring() {
  const now = today();
  const transactions = await list('transactions');
  const recurring = [
    ...(await list('income_flows')).filter((row) => row.is_recurring === true || Number(row.is_recurring) === 1).map((row) => ({ row, kind: 'income_flow', collection: 'income_flows' })),
    ...(await list('liabilities')).filter(isAutopayLiability).map((row) => ({ row, kind: 'liability', collection: 'liabilities' })),
  ];
  for (const { row, kind, collection } of recurring) {
    if (!isIsoDate(row.date)) continue;
    const { due, next } = dueOccurrences(String(row.date), now);
    if (!due.length) continue;
    const notes = kind === 'income_flow' ? legacyIncomeFlowNote(row.id) : legacyLiabilityNote(row.type, row.id);
    const linked = await linkedTransactions(kind, row.id, notes, transactions);
    const account = row.account_id ? await find('accounts', Number(row.account_id)) : null;
    if (account && linked.some((transaction) => transaction.source === kind)) {
      for (const date of due) {
        if (linked.some((transaction) => transaction.date === date)) continue;
        await recordAccountTransaction(kind === 'income_flow'
          ? { account_id: account.id, type: 'income', amount: number(row.amount), category: String(row.category || 'Income'), description: String(row.name), notes, date, source: kind, source_id: Number(row.id) }
          : { account_id: account.id, type: 'expense', amount: number(row.amount), category: liabilityCategory(row.type), description: String(row.name), notes, date, source: kind, source_id: Number(row.id) });
      }
    }
    await replace(collection, row.id as number, { ...row, date: next });
  }
}

let recurringCheckedOn = '';
let recurringRun: Promise<void> | null = null;

/** Runs the recurring catch-up at most once a day; concurrent requests share one run. */
function ensureRecurringPosted() {
  const day = today();
  if (recurringCheckedOn === day) return Promise.resolve();
  recurringRun ??= (async () => {
    await postDueRecurring();
    recurringCheckedOn = day;
  })().finally(() => { recurringRun = null; });
  return recurringRun;
}

async function recalculateFreelanceHours(serviceId: unknown) {
  if (!serviceId) return;
  const service = await find('freelancing_services', Number(serviceId));
  if (!service) return;
  const seconds = (await list('freelancing_time_logs'))
    .filter((log) => Number(log.service_id) === Number(serviceId))
    .reduce((sum, log) => sum + number(log.seconds), 0);
  await replace('freelancing_services', service.id as number, { ...service, hours_logged: seconds / 3600 });
}

async function copilotTransfer(body: JsonRecord) {
  const amount = number(body.amount);
  if (amount <= 0) return json({ error: 'A positive transfer amount is required.' }, 400);
  const accounts = await list('accounts');
  const match = (hint: unknown) => {
    const normalized = String(hint ?? '').trim().toLowerCase();
    const matches = accounts.filter((account) => String(account.name).toLowerCase() === normalized || String(account.name).toLowerCase().includes(normalized) || normalized.includes(String(account.name).toLowerCase()));
    return matches.length === 1 ? matches[0] : null;
  };
  const from = match(body.fromHint);
  const to = match(body.toHint);
  if (!from || !to || from.id === to.id) return json({ error: 'Could not uniquely match two different local accounts. Use their exact names.' }, 400);
  await recordTransfer(from, to, amount, String(body.date || today()), 'Added locally through FinGent Copilot after user confirmation.');
  return json({ success: true, from: from.name, to: to.name });
}

async function copilotInvestment(body: JsonRecord) {
  const invested = number(body.invested);
  const type = body.type === 'Cryptos' ? 'Cryptos' : 'Stocks';
  const ticker = formatTicker(String(body.ticker ?? ''), type);
  let price = number(body.avg_price);
  // Crypto prices are available online; stock purchases still need an explicit price on mobile.
  if (!price && ticker && type === 'Cryptos') price = (await cryptoQuote(ticker))?.price ?? 0;
  const shares = number(body.shares) || (price ? invested / price : 0);
  if (!ticker || invested <= 0 || !shares || !price) return json({ error: type === 'Cryptos' ? 'Current price was unavailable. Add the amount and price, then try again.' : 'Stock purchases on mobile need the share count and price.' }, 400);
  const existing = (await list('portfolios')).find((item) => formatTicker(String(item.ticker ?? ''), type) === ticker && item.type === type);
  const date = body.date || today();
  if (existing) {
    await portfolioTransaction(String(existing.id), { type: 'Buy', shares, price, date });
    return json({ id: existing.id, created: false, shares, price, date });
  }
  const id = await insert('portfolios', { type, name: body.name || ticker, ticker, invested: shares * price, current_value: shares * price, shares, avg_price: price, current_price: price, currency: body.currency || 'USD', platform: body.platform || '' });
  await insert('portfolio_transactions', { portfolio_id: id, type: 'Buy', shares, price, date });
  return json({ id, created: true, shares, price, date });
}

async function transactionResponse(method: string, path: string, body: JsonRecord) {
  const id = path.split('/').pop()!;
  if (method === 'POST') {
    const category = await resolveCategory(body.category);
    await adjustBalance(body.account_id, body.amount, body.type);
    await ensureCategory(category, body.type === 'income' ? 'income' : 'expense');
    return json({ id: await insert('transactions', { ...body, category, notes: body.notes ?? '', date: body.date || today() }) });
  }
  const previous = await find('transactions', id);
  if (!previous) return json({ error: 'Transaction not found.' }, 404);
  if (method === 'PUT') {
    await adjustBalance(previous.account_id, previous.amount, previous.type, true);
    const category = await resolveCategory(body.category);
    await adjustBalance(body.account_id, body.amount, body.type);
    await ensureCategory(category, body.type === 'income' ? 'income' : 'expense');
    await replace('transactions', id, { ...previous, ...body, category, notes: body.notes ?? '', date: body.date || today() });
    return json({ success: true });
  }
  await adjustBalance(previous.account_id, previous.amount, previous.type, true);
  await remove('transactions', id);
  return json({ success: true });
}

async function portfolioTransaction(portfolioId: string, body: JsonRecord) {
  const portfolio = await find('portfolios', portfolioId);
  if (!portfolio) return json({ error: 'Investment not found.' }, 404);
  const cashAccount = body.account_id ? await find('accounts', Number(body.account_id)) : null;
  if (body.account_id && !cashAccount) return json({ error: 'The selected account no longer exists.' }, 400);
  const shares = number(body.shares);
  const price = number(body.price);
  const currentShares = number(portfolio.shares);
  const currentInvested = number(portfolio.invested);
  const currentAverage = number(portfolio.avg_price);
  const nextShares = body.type === 'Sell' ? Math.max(0, currentShares - shares) : currentShares + shares;
  const nextInvested = body.type === 'Sell' ? Math.max(0, currentInvested - shares * currentAverage) : currentInvested + shares * price;
  const nextAverage = nextShares ? nextInvested / nextShares : 0;
  const currentPrice = number(portfolio.current_price) || price || currentAverage;
  await insert('portfolio_transactions', { portfolio_id: Number(portfolioId), type: body.type, shares, price, date: body.date || today() });
  await replace('portfolios', portfolioId, { ...portfolio, shares: nextShares, invested: nextInvested, avg_price: nextAverage, current_value: nextShares * currentPrice, current_price: currentPrice });
  // The client converts the trade into the account's pesos before sending cash_amount.
  if (cashAccount && number(body.cash_amount) > 0 && (body.type === 'Buy' || body.type === 'Sell')) {
    await recordAccountTransaction({ account_id: cashAccount.id, type: body.type === 'Buy' ? 'expense' : 'income', amount: number(body.cash_amount), category: 'Investments', description: `${body.type === 'Buy' ? 'Bought' : 'Sold'} ${portfolio.name}`, date: String(body.date || today()), source: 'portfolio', source_id: Number(portfolioId) });
  }
  return json({ success: true });
}

async function route(pathname: string, search: URLSearchParams, method: string, body: JsonRecord) {
  if (pathname === '/api/health') return json({ status: 'ok', platform: `${Capacitor.getPlatform()}-native` });
  if (method === 'GET') await ensureRecurringPosted().catch((error) => console.error('Recurring entries could not be posted.', error));
  if (pathname === '/api/system/sync/export' && method === 'GET') return json(await exportSyncSnapshot());
  if (pathname === '/api/system/sync/import' && method === 'POST') {
    await importSyncSnapshot(body);
    recurringCheckedOn = '';
    return json({ success: true });
  }
  if (pathname === '/api/transfers' && method === 'POST') {
    const amount = number(body.amount);
    const from = body.from_account_id ? await find('accounts', Number(body.from_account_id)) : null;
    const to = body.to_account_id ? await find('accounts', Number(body.to_account_id)) : null;
    if (amount <= 0) return json({ error: 'A positive transfer amount is required.' }, 400);
    if (!from || !to || from.id === to.id) return json({ error: 'Choose two different existing accounts.' }, 400);
    await recordTransfer(from, to, amount, String(body.date || today()), String(body.notes || ''));
    return json({ success: true, from: from.name, to: to.name });
  }
  const invoicePayment = pathname.match(/^\/api\/freelancing\/invoices\/(\d+)\/pay$/);
  if (invoicePayment && method === 'POST') {
    const invoice = await find('freelancing_invoices', invoicePayment[1]);
    if (!invoice) return json({ error: 'Invoice not found.' }, 404);
    if (invoice.status === 'Paid') return json({ success: true, deposited: false });
    const account = body.account_id ? await find('accounts', Number(body.account_id)) : null;
    if (body.account_id && !account) return json({ error: 'The selected account no longer exists.' }, 400);
    if (account && number(invoice.amount) > 0) {
      await recordAccountTransaction({ account_id: account.id, type: 'income', amount: number(invoice.amount), category: 'Freelance Income', description: `Invoice ${invoice.invoice_number}${invoice.client_name ? ` · ${invoice.client_name}` : ''}`, date: today(), source: 'invoice', source_id: Number(invoice.id) });
    }
    await replace('freelancing_invoices', invoicePayment[1], { ...invoice, status: 'Paid' });
    return json({ success: true, deposited: Boolean(account), account: account?.name || null });
  }
  if (pathname === '/api/wealth') {
    const accounts = await list('accounts');
    return json({ totalCash: accounts.reduce((sum, account) => sum + number(account.balance), 0), portfolios: await list('portfolios') });
  }
  if (pathname === '/api/career') {
    const current = (await list('career_profile'))[0] ?? { current_role: '', target_role: '', current_salary: 0, target_salary: 0, skills_needed: [] };
    if (method === 'GET') return json(current);
    const existing = (await list('career_profile'))[0];
    if (existing) await replace('career_profile', existing.id as number, { ...existing, ...body, skills_needed: body.skills_needed ?? [] });
    else await insert('career_profile', { ...current, ...body, skills_needed: body.skills_needed ?? [] });
    return json({ success: true });
  }
  if (pathname === '/api/copilot/accounts') return json((await list('accounts')).map(({ id, name, type }) => ({ id, name, type })).sort((a, b) => String(a.name).localeCompare(String(b.name))));
  if (pathname === '/api/copilot/transfers' && method === 'POST') return copilotTransfer(body);
  if (pathname === '/api/copilot/investments/buy' && method === 'POST') return copilotInvestment(body);
  if (pathname === '/api/rates') {
    const rates = ratesFromFrankfurter(await getJson(FX_RATES_URL));
    if (rates) lastRates = rates;
    return json(rates ?? { ...lastRates, cached: true });
  }
  if (pathname.startsWith('/api/quote/')) {
    if (search.get('type') !== 'Cryptos') return json({ error: 'Live stock prices are not available in the mobile app yet.' }, 503);
    const quote = await cryptoQuote(formatTicker(decodeURIComponent(pathname.slice('/api/quote/'.length)), 'Cryptos'));
    return quote ? json({ price: quote.price }) : json({ error: 'Live price unavailable. Check your connection or enter the price yourself.' }, 503);
  }
  if (pathname === '/api/portfolios/sync') {
    let updated = 0;
    for (const portfolio of (await list('portfolios')).filter((item) => item.type === 'Cryptos' && String(item.ticker ?? '').trim())) {
      const quote = await cryptoQuote(formatTicker(String(portfolio.ticker), 'Cryptos'));
      if (!quote) continue;
      await replace('portfolios', portfolio.id as number, { ...portfolio, current_price: quote.price, current_value: quote.price * number(portfolio.shares), currency: quote.currency });
      updated += 1;
    }
    return json({ success: true, updated, message: 'Crypto prices refresh when online. Stock prices keep their last saved values on mobile.' });
  }

  if (pathname === '/api/freelancing/overview') {
    const businesses = await list('freelance_businesses');
    const [services, invoices, logs] = await Promise.all([list('freelancing_services'), list('freelancing_invoices'), list('freelancing_time_logs')]);
    return json(businesses.map((business) => ({
      ...business,
      active_contracts: services.filter((item) => item.business_id === business.id && item.status === 'Active').length,
      invoice_count: invoices.filter((item) => item.business_id === business.id).length,
      paid_total: invoices.filter((item) => item.business_id === business.id && item.status === 'Paid').reduce((sum, item) => sum + number(item.amount), 0),
      outstanding_total: invoices.filter((item) => item.business_id === business.id && item.status !== 'Paid').reduce((sum, item) => sum + number(item.amount), 0),
      seconds_logged: logs.filter((item) => item.business_id === business.id).reduce((sum, item) => sum + number(item.seconds), 0),
    })));
  }

  const businessMatch = pathname.match(/^\/api\/businesses\/(\d+)\/(items|transactions)(?:\/(\d+))?$/);
  if (businessMatch) {
    const [, businessId, kind, id] = businessMatch;
    const collection = kind === 'items' ? 'business_items' : 'business_transactions';
    if (method === 'GET') return json((await list(collection)).filter((item) => String(item.business_id) === businessId));
    if (method === 'POST') return json({ id: await insert(collection, { ...body, business_id: Number(businessId) }) });
    if (!id) return json({ error: 'Record id is required.' }, 400);
    if (method === 'PUT') {
      const existing = await find(collection, id);
      if (!existing || String(existing.business_id) !== businessId) return json({ error: 'Record not found.' }, 404);
      await replace(collection, id, { ...existing, ...body, business_id: Number(businessId) });
      return json({ success: true });
    }
    await remove(collection, id);
    return json({ success: true });
  }

  const portfolioMatch = pathname.match(/^\/api\/portfolios\/(\d+)\/transactions$/);
  if (portfolioMatch && method === 'POST') return portfolioTransaction(portfolioMatch[1], body);

  if (pathname === '/api/accounts/accrue-interest' && method === 'POST') {
    const accounts = await list('accounts');
    let accruedCount = 0;
    for (const account of accounts) {
      const interest = (number(account.balance) * number(account.interest_rate_pa)) / 365;
      if (interest <= 0) continue;
      await adjustBalance(account.id, interest, 'income');
      await insert('transactions', { account_id: account.id, type: 'income', amount: interest, category: 'Interest', description: 'Daily Interest Payout', notes: '', date: new Date().toISOString() });
      accruedCount += 1;
    }
    return json({ success: true, accruedCount });
  }

  const liabilityPayment = pathname.match(/^\/api\/liabilities\/(\d+)\/pay$/);
  if (liabilityPayment && method === 'PUT') {
    const id = Number(liabilityPayment[1]);
    const liability = await find('liabilities', id);
    if (!liability) return json({ error: 'Liability not found.' }, 404);
    const account = body.account_id ? await find('accounts', Number(body.account_id)) : null;
    if (body.account_id && !account) return json({ error: 'The selected account no longer exists.' }, 400);
    const amount = number(liability.amount);
    const notes = legacyLiabilityNote(liability.type, id);
    if (account && amount > 0) {
      // Paying a card's due date from another account moves money onto the card.
      const card = liability.type === 'Credits' && liability.account_id && Number(liability.account_id) !== account.id ? await find('accounts', Number(liability.account_id)) : null;
      if (card) await recordTransfer(account, card, amount, today(), notes, 'liability', id);
      else await recordAccountTransaction({ account_id: account.id, type: 'expense', amount, category: liabilityCategory(liability.type), description: String(liability.name), notes, date: today(), source: 'liability', source_id: id });
    }
    const update = liabilityAfterPayment(liability);
    await replace('liabilities', id, { ...liability, ...update });
    return json({ success: true, ...update, account: account?.name || null });
  }

  const undoableDelete = pathname.match(/^\/api\/(liabilities|income_flows)\/(\d+)$/);
  if (undoableDelete && method === 'DELETE' && search.get('undo') === '1') {
    const [, collection, id] = undoableDelete;
    const record = await find(collection, id);
    if (record && collection === 'liabilities') await removeTransactions(await linkedTransactions('liability', id, legacyLiabilityNote(record.type, id)));
    if (record && collection === 'income_flows') {
      await removeTransactions(await linkedTransactions('income_flow', id, legacyIncomeFlowNote(id)));
      for (const event of await list('calendar_events')) {
        const legacyMatch = event.source_id == null && event.name === record.name && number(event.amount) === number(record.amount);
        if (event.source === 'income_flow' && (Number(event.source_id) === Number(id) || legacyMatch)) await remove('calendar_events', event.id as number);
      }
      for (const budget of await list('budgets')) {
        let plan: JsonRecord = {};
        try { plan = typeof budget.categories === 'string' ? JSON.parse(budget.categories) : (budget.categories as JsonRecord) ?? {}; } catch {}
        const legacyMatch = plan.sourceIncomeFlowId === undefined && String(budget.name).startsWith(`Auto Budget: ${record.name} (`);
        if (Number(plan.sourceIncomeFlowId) === Number(id) || legacyMatch) await remove('budgets', budget.id as number);
      }
    }
    await remove(collection, id);
    return json({ success: true });
  }

  const timeLogMatch = pathname.match(/^\/api\/freelancing\/time_logs(?:\/(\d+))?$/);
  if (timeLogMatch) {
    const id = timeLogMatch[1];
    if (method === 'GET') return json(byBusiness(await list('freelancing_time_logs'), search.get('business_id')));
    if (method === 'POST') {
      const insertedId = await insert('freelancing_time_logs', { ...body, service_id: body.service_id || null, date: body.date || today(), seconds: number(body.seconds), description: body.description || '' });
      await recalculateFreelanceHours(body.service_id);
      return json({ id: insertedId });
    }
    const existing = id ? await find('freelancing_time_logs', id) : null;
    if (!existing) return json({ error: 'Time log not found.' }, 404);
    if (method === 'PUT') {
      await replace('freelancing_time_logs', id!, { ...existing, ...body, service_id: body.service_id || null, date: body.date || today(), seconds: number(body.seconds), description: body.description || '' });
      await recalculateFreelanceHours(existing.service_id);
      await recalculateFreelanceHours(body.service_id);
      return json({ success: true });
    }
    await remove('freelancing_time_logs', id!);
    await recalculateFreelanceHours(existing.service_id);
    return json({ success: true });
  }

  if (pathname === '/api/personal/routines' || /^\/api\/personal\/routines\/\d+(?:\/check-in)?$/.test(pathname)) {
    const parts = pathname.split('/');
    const id = parts[4];
    if (pathname.endsWith('/check-in')) {
      const db = await getDatabase();
      const date = String(body.date || today());
      const found = await db.query('SELECT routine_id FROM mobile_routine_logs WHERE routine_id = ? AND date = ?', [Number(id), date]);
      if (found.values?.length) await db.run('DELETE FROM mobile_routine_logs WHERE routine_id = ? AND date = ?', [Number(id), date]);
      else await db.run('INSERT INTO mobile_routine_logs (routine_id, date) VALUES (?, ?)', [Number(id), date]);
      return json({ completed: !found.values?.length });
    }
    if (method === 'GET') {
      const db = await getDatabase();
      const weekStart = new Date(`${today()}T00:00:00Z`);
      weekStart.setUTCDate(weekStart.getUTCDate() - 6);
      const routineRows = (await list('personal_routines')).filter((item) => item.active !== 0 && item.active !== false);
      return json(await Promise.all(routineRows.map(async (item) => {
        const completed = await db.query('SELECT COUNT(*) AS count FROM mobile_routine_logs WHERE routine_id = ? AND date = ?', [item.id as number, today()]);
        const week = await db.query('SELECT COUNT(*) AS count FROM mobile_routine_logs WHERE routine_id = ? AND date >= ?', [item.id as number, weekStart.toISOString().slice(0, 10)]);
        return { ...item, completed_today: Number(completed.values?.[0]?.count ?? 0), completed_this_week: Number(week.values?.[0]?.count ?? 0) };
      })));
    }
  }

  if (pathname === '/api/transactions' || /^\/api\/transactions\/\d+$/.test(pathname)) {
    if (method === 'GET') {
      const accounts = await list('accounts');
      return json((await list('transactions')).map((transaction) => ({ ...transaction, account_name: accounts.find((account) => account.id === transaction.account_id)?.name ?? 'Deleted account' })));
    }
    return transactionResponse(method, pathname, body);
  }

  const matched = Object.entries(collections).find(([base]) => pathname === base || new RegExp(`^${base}/\\d+$`).test(pathname));
  if (!matched) return json({ error: `This feature is not available in the mobile app: ${pathname}` }, 501);
  const [base, collection] = matched;
  const id = pathname === base ? null : pathname.split('/').pop()!;

  if (method === 'GET') {
    let records = await list(collection);
    if (collection === 'transactions') {
      const accounts = await list('accounts');
      records = records.map((transaction) => ({ ...transaction, account_name: accounts.find((account) => account.id === transaction.account_id)?.name ?? 'Deleted account' }));
    }
    if (collection === 'liabilities' || collection === 'income_flows') {
      const [accounts, transactions] = await Promise.all([list('accounts'), list('transactions')]);
      const kind = collection === 'liabilities' ? 'liability' : 'income_flow';
      records = await Promise.all(records.map(async (record) => {
        const account = accounts.find((item) => Number(item.id) === Number(record.account_id));
        const note = kind === 'liability' ? legacyLiabilityNote(record.type, record.id) : legacyIncomeFlowNote(record.id);
        return { ...record, linked_account_name: account?.name ?? null, linked_account_type: account?.type ?? null, linked_transaction_count: (await linkedTransactions(kind, record.id, note, transactions)).length };
      }));
    }
    if (collection === 'businesses') {
      const [items, transactions] = await Promise.all([list('business_items'), list('business_transactions')]);
      const ownedBy = (business: JsonRecord) => (record: JsonRecord) => Number(record.business_id) === Number(business.id);
      records = records.map((business) => ({ ...business, ...businessMetrics(business.type, transactions.filter(ownedBy(business)), items.filter(ownedBy(business))) }));
    }
    if (collection === 'categories') {
      const transactions = await list('transactions');
      await backfillCategories(transactions);
      records = (await list('categories')).filter((item) => item.active !== 0 && item.active !== false).map((category) => {
        const related = transactions.filter((transaction) => String(transaction.category).toLowerCase() === String(category.name).toLowerCase());
        return { ...category, transaction_count: related.length, total_amount: related.reduce((sum, transaction) => sum + number(transaction.amount), 0), last_used: related.map((transaction) => String(transaction.date ?? '')).sort().at(-1) ?? null };
      });
    }
    if (collection.startsWith('freelancing_')) records = byBusiness(records, search.get('business_id'));
    if (collection === 'portfolios') {
      const history = await list('portfolio_transactions');
      records = records.map((portfolio) => ({ ...portfolio, history: history.filter((item) => item.portfolio_id === portfolio.id).map((item) => ({ id: item.id, date: item.date, type: item.type, amount: item.shares, price: item.price })) }));
    }
    if (collection === 'budgets') {
      const expenses = (await list('transactions')).filter(transaction => transaction.type === 'expense');
      records = records.map(record => {
        try {
          const plan = typeof record.categories === 'string' ? JSON.parse(record.categories) : record.categories;
          const currentMonth = new Date().toISOString().slice(0, 7);
          const periodExpenses = expenses.filter(transaction => plan.type === 'specific' ? (!plan.startDate || String(transaction.date) >= plan.startDate) && (!plan.endDate || String(transaction.date) <= plan.endDate) : String(transaction.date || '').startsWith(currentMonth));
          plan.groups = (Array.isArray(plan.groups) ? plan.groups : []).map((group: JsonRecord) => {
            const children = Array.isArray(group.categories) ? group.categories as JsonRecord[] : [];
            if (!children.length) {
              const matches = periodExpenses.filter(transaction => String(transaction.category).toLowerCase() === String(group.name).toLowerCase());
              return { ...group, transactions: matches, spent: matches.reduce((sum, transaction) => sum + number(transaction.amount), 0) };
            }
            const categories = children.map(category => {
              const matches = periodExpenses.filter(transaction => String(transaction.category).toLowerCase() === String(category.name).toLowerCase());
              return { ...category, transactions: matches, spent: matches.reduce((sum, transaction) => sum + number(transaction.amount), 0) };
            });
            return { ...group, categories, spent: categories.reduce((sum, category) => sum + number(category.spent), 0) };
          });
          return { ...record, categories: JSON.stringify(plan) };
        } catch { return record; }
      });
    }
    return json(records);
  }
  if (method === 'POST') {
    if (collection === 'categories') {
      await ensureCategory(body.name, body.type === 'income' ? 'income' : 'expense');
      const savedCategory = (await list('categories')).find((item) => String(item.name).toLowerCase() === String(body.name).trim().toLowerCase());
      if (savedCategory) {
        await replace('categories', savedCategory.id as number, { ...savedCategory, keywords: String(body.keywords || '').trim(), active: 1 });
        return json({ ...savedCategory, keywords: String(body.keywords || '').trim(), active: 1 });
      }
      return json({ error: 'Unable to save the category.' }, 500);
    }
    if (collection === 'budget_presets') {
      const allocations = Array.isArray(body.allocations) ? body.allocations : [];
      if (!String(body.name || '').trim() || !allocations.length) return json({ error: 'A model name and allocations are required.' }, 400);
      return json({ id: await insert(collection, { ...body, name: String(body.name).trim(), allocations: JSON.stringify(allocations) }) });
    }
    if (collection === 'budgets') return json({ id: await insert(collection, { ...body, categories: typeof body.categories === 'string' ? body.categories : JSON.stringify(body.categories) }) });
    if (collection === 'income_flows') {
      const amount = number(body.amount);
      const linkedAccount = body.account_id ? await find('accounts', Number(body.account_id)) : null;
      if (!body.name || amount <= 0 || !body.date) return json({ error: 'Name, positive amount, and date are required.' }, 400);
      if (body.account_id && !linkedAccount) return json({ error: 'The selected deposit account no longer exists.' }, 400);
      const id = await insert(collection, { ...body, amount, account_id: linkedAccount?.id || null });
      await ensureCategory(body.category ?? 'Income', 'income');
      await insert('calendar_events', { name: body.name, type: 'income', amount, date: body.date, color: 'emerald', icon: 'ArrowDown', provider: 'Manual', source: 'income_flow', source_id: id });
      if (linkedAccount) {
        await recordAccountTransaction({ account_id: linkedAccount.id, type: 'income', amount, category: String(body.category || 'Income'), description: String(body.name), notes: legacyIncomeFlowNote(id), date: String(body.date), source: 'income_flow', source_id: id });
        // The first deposit is posted, so a recurring flow's next date moves to next month.
        const saved = await find(collection, id);
        if (saved && body.is_recurring && isIsoDate(body.date)) await replace(collection, id, { ...saved, date: addMonth(String(body.date)) });
      }
      if (body.budget_preset_id) {
        const preset = await find('budget_presets', Number(body.budget_preset_id));
        if (preset) {
          const allocations = typeof preset.allocations === 'string' ? JSON.parse(preset.allocations) : preset.allocations;
          const groups = (Array.isArray(allocations) ? allocations : []).map((allocation: JsonRecord, index: number) => {
            const limit = amount * number(allocation.percentage) / 100;
            const children = Array.isArray(allocation.categories) ? allocation.categories as JsonRecord[] : [];
            return {
              id: Date.now() + index,
              name: allocation.name,
              limit,
              spent: 0,
              color: allocation.color || 'emerald',
              categories: children.map((category, childIndex) => ({ id: Date.now() + index * 100 + childIndex, name: category.name, limit: limit * number(category.percentage) / 100, spent: 0, color: category.color || allocation.color || 'emerald', transactions: [] })),
              transactions: []
            };
          });
          const plan = { id: Date.now(), sourceIncomeFlowId: id, name: `Auto Budget: ${body.name} (${preset.name})`, type: body.is_recurring ? 'recurring' : 'specific', isGrouped: true, startDate: body.date, endDate: body.date, totalLimit: amount, groups };
          await insert('budgets', { name: plan.name, total_amount: amount, categories: JSON.stringify(plan), month: body.date });
        }
      }
      if (body.is_recurring) recurringCheckedOn = '';
      return json({ id, account: linkedAccount?.name || null, budget_created: Boolean(body.budget_preset_id) });
    }
    if (collection === 'portfolios') {
      const fundingAccount = body.account_id ? await find('accounts', Number(body.account_id)) : null;
      if (body.account_id && !fundingAccount) return json({ error: 'The selected account no longer exists.' }, 400);
      const ticker = body.ticker ? formatTicker(String(body.ticker), String(body.type)) : body.ticker;
      // Like the server, a crypto holding is valued at the live price when one is available.
      const quote = ticker && body.type === 'Cryptos' ? await cryptoQuote(String(ticker)) : null;
      let shares = body.shares == null ? 0 : number(body.shares);
      let average = body.avg_price == null ? (shares ? number(body.invested) / shares : 0) : number(body.avg_price);
      let currentValue = body.current_value == null ? shares * average : number(body.current_value);
      if (quote) {
        if (body.shares == null && currentValue > 0) {
          shares = currentValue / quote.price;
          average = shares ? number(body.invested) / shares : 0;
        } else currentValue = quote.price * shares;
      }
      const date = String(body.date || today());
      const { account_id: _account, cash_amount: _cash, ...holding } = body;
      const id = await insert(collection, { ...holding, ticker, shares, avg_price: average, current_price: quote?.price ?? body.current_price ?? average, current_value: currentValue });
      if (shares && average) await insert('portfolio_transactions', { portfolio_id: id, type: 'Buy', shares, price: average, date });
      // The client converts the purchase into the account's pesos before sending cash_amount.
      if (fundingAccount && number(body.cash_amount) > 0) {
        await recordAccountTransaction({ account_id: fundingAccount.id, type: 'expense', amount: number(body.cash_amount), category: 'Investments', description: `Bought ${body.name}`, date, source: 'portfolio', source_id: id });
      }
      return json({ id, shares, avg_price: average, date, price_resolved: Boolean(quote) });
    }
    if (collection === 'liabilities') {
      const amount = number(body.amount);
      const linkedAccount = body.account_id ? await find('accounts', Number(body.account_id)) : null;
      if (!body.name || amount <= 0) return json({ error: 'A name and positive amount are required.' }, 400);
      if (body.account_id && !linkedAccount) return json({ error: 'The selected account no longer exists.' }, 400);
      if (body.type === 'Credits' && linkedAccount && !['card', 'credit'].includes(String(linkedAccount.type).toLowerCase())) return json({ error: 'Credit due dates can only be linked to a credit-card account.' }, 400);
      const id = await insert(collection, { ...body, amount, account_id: linkedAccount?.id || null });
      // Deducting at creation is the first payment, so the record moves on as if paid.
      if (linkedAccount && body.type !== 'Credits') {
        await recordAccountTransaction({ account_id: linkedAccount.id, type: 'expense', amount, category: liabilityCategory(body.type), description: String(body.name), notes: legacyLiabilityNote(body.type, id), date: isIsoDate(body.date) ? String(body.date) : today(), source: 'liability', source_id: id });
        const saved = await find(collection, id);
        if (saved) await replace(collection, id, { ...saved, ...liabilityAfterPayment(saved) });
      }
      if (body.is_recurring) recurringCheckedOn = '';
      return json({ id, account: linkedAccount?.name || null, deducted: Boolean(linkedAccount && body.type !== 'Credits') });
    }
    const insertedId = await insert(collection, { ...body, active: collection === 'categories' ? 1 : body.active });
    return json({ id: insertedId });
  }
  if (!id) return json({ error: 'Record id is required.' }, 400);
  const existing = await find(collection, id);
  if (!existing) return json({ error: 'Record not found.' }, 404);
  if (method === 'PUT') {
    if (collection === 'categories') {
      const oldName = String(existing.name);
      const nextName = String(body.name ?? oldName).trim();
      for (const tx of await list('transactions')) if (String(tx.category).toLowerCase() === oldName.toLowerCase()) await replace('transactions', tx.id as number, { ...tx, category: nextName });
      await replace(collection, id, { ...existing, ...body, name: nextName, active: 1 });
    } else await replace(collection, id, { ...existing, ...body });
    // Like the server, a manual balance change is recorded so account history still adds up.
    if (collection === 'accounts' && body.balance !== undefined && number(body.balance) !== number(existing.balance)) {
      const difference = number(body.balance) - number(existing.balance);
      await insert('transactions', { account_id: existing.id, type: difference > 0 ? 'income' : 'expense', amount: Math.abs(difference), category: 'Adjustment', description: 'Balance Adjustment', notes: '', date: new Date().toISOString() });
    }
    return json({ success: true });
  }
  if (collection === 'businesses') {
    for (const childCollection of ['business_deals', 'business_items', 'business_transactions']) {
      for (const child of await list(childCollection)) if (Number(child.business_id) === Number(existing.id)) await remove(childCollection, child.id as number);
    }
  }
  if (collection === 'accounts') {
    for (const transaction of await list('transactions')) if (transaction.account_id === existing.id) await remove('transactions', transaction.id as number);
  }
  if (collection === 'portfolios') {
    for (const transaction of await list('portfolio_transactions')) if (transaction.portfolio_id === existing.id) await remove('portfolio_transactions', transaction.id as number);
  }
  if (collection === 'freelance_businesses') {
    for (const childCollection of ['freelancing_services', 'freelancing_invoices', 'freelancing_time_logs']) {
      for (const child of await list(childCollection)) if (child.business_id === existing.id) await remove(childCollection, child.id as number);
    }
  }
  if (collection === 'categories') await replace(collection, id, { ...existing, active: 0 });
  else await remove(collection, id);
  return json({ success: true });
}

async function readBody(init?: RequestInit) {
  if (!init?.body || typeof init.body !== 'string') return {};
  try { return JSON.parse(init.body) as JsonRecord; } catch { return {}; }
}

export async function installNativeApi(passphrase: string) {
  if (!Capacitor.isNativePlatform()) return;
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const secret = await sqlite.isSecretStored();
  if (secret.result) {
    const valid = await sqlite.checkEncryptionSecret(passphrase);
    if (!valid.result) throw new Error('This password cannot unlock the encrypted mobile database.');
  } else {
    const exists = await sqlite.isDatabase(DATABASE);
    databaseMode = exists.result ? 'encryption' : 'secret';
    await sqlite.setEncryptionSecret(passphrase);
  }
  await getDatabase();
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(requestUrl, window.location.origin);
    if (!url.pathname.startsWith('/api/')) return originalFetch(input, init);
    try {
      const requestMethod = (init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase();
      return await route(url.pathname, url.searchParams, requestMethod, await readBody(init));
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'The local mobile database could not complete this request.' }, 500);
    }
  };
}
