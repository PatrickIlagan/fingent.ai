export type CopilotAction = { label: string; tab: string };

export type TransactionDraft = {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  accountHint: string;
  description: string;
  date: string;
  redactedCommand: string;
};

export type OperationDraft = {
  kind: 'account' | 'liability' | 'income-flow' | 'calendar-event' | 'career-task' | 'note' | 'routine' | 'category' | 'goal' | 'budget';
  label: string;
  tab: string;
  payload: Record<string, unknown>;
  redactedCommand: string;
};

export type InvestmentDraft = {
  type: 'Stocks' | 'Cryptos';
  name: string;
  ticker: string;
  invested: number;
  current_value: number;
  shares: number | null;
  avg_price: number | null;
  currency: 'USD' | 'PHP';
  platform: string;
  date: string;
  redactedCommand: string;
};

export type TransferDraft = {
  amount: number;
  fromHint: string;
  toHint: string;
  date: string;
  redactedCommand: string;
};

export type CopilotReply = {
  text: string;
  actions?: CopilotAction[];
  navigateNow?: string;
  transaction?: TransactionDraft;
  operation?: OperationDraft;
  investment?: InvestmentDraft;
  transfer?: TransferDraft;
};

const routes = [
  { terms: ['home', 'main dashboard', 'overview'], tab: 'home', label: 'Open Home' },
  { terms: ['cash account', 'cash'], tab: 'accounts-cash', label: 'Open Cash Accounts' },
  { terms: ['digital account', 'gcash', 'maya', 'digital wallet'], tab: 'accounts-digital', label: 'Open Digital Accounts' },
  { terms: ['bank account', 'banking'], tab: 'accounts-bank', label: 'Open Bank Accounts' },
  { terms: ['card account', 'credit card account'], tab: 'accounts-card', label: 'Open Card Accounts' },
  { terms: ['account', 'bank', 'transaction', 'expense'], tab: 'accounts', label: 'Open Accounts' },
  { terms: ['quick expense', 'quick expenses'], tab: 'liabilities-quick expenses', label: 'Open Quick Expenses' },
  { terms: ['installment', 'installments'], tab: 'liabilities-installments', label: 'Open Installments' },
  { terms: ['credit', 'credits'], tab: 'liabilities-credits', label: 'Open Credits' },
  { terms: ['debt', 'debts', 'loan'], tab: 'liabilities-debts', label: 'Open Debts' },
  { terms: ['bill', 'bills'], tab: 'liabilities-bills', label: 'Open Bills' },
  { terms: ['liability', 'credit card', 'utang'], tab: 'liabilities', label: 'Open Liabilities' },
  { terms: ['budget', 'budgets'], tab: 'plans-budget', label: 'Open Budgets' },
  { terms: ['goal', 'goals', 'saving goal'], tab: 'plans-goals', label: 'Open Goals' },
  { terms: ['plan', 'saving'], tab: 'plans', label: 'Open Plans' },
  { terms: ['calendar', 'event', 'schedule', 'kalendaryo'], tab: 'calendar', label: 'Open Calendar' },
  { terms: ['real estate'], tab: 'investments-real estate', label: 'Open Real Estate' },
  { terms: ['stock', 'stocks'], tab: 'investments-stocks', label: 'Open Stocks' },
  { terms: ['crypto', 'cryptos'], tab: 'investments-cryptos', label: 'Open Crypto' },
  { terms: ['investment', 'portfolio', 'pamumuhunan'], tab: 'investments', label: 'Open Investments' },
  { terms: ['career calendar', 'interview calendar'], tab: 'career-calendar', label: 'Open Career Calendar' },
  { terms: ['career task', 'career tasks', 'to-do', 'todo'], tab: 'career-tasks', label: 'Open Career Tasks' },
  { terms: ['upskilling', 'course', 'learning'], tab: 'career-upskilling', label: 'Open Upskilling' },
  { terms: ['career income', 'salary progression'], tab: 'career-income', label: 'Open Career Income' },
  { terms: ['career', 'job', 'interview', 'skill', 'upskill', 'task', 'karera', 'trabaho'], tab: 'career', label: 'Open Career' },
  { terms: ['business cash flow', 'business finance'], tab: 'business-finance', label: 'Open Business Cash Flow' },
  { terms: ['business operations', 'marketing', 'supply', 'product support'], tab: 'business-operations', label: 'Open Business Operations' },
  { terms: ['business sales', 'pipeline', 'proposal', 'acquisition'], tab: 'business-sales', label: 'Open Business Sales' },
  { terms: ['business records', 'catalogue', 'catalog', 'subscriptions', 'clients'], tab: 'business-records', label: 'Open Business Records' },
  { terms: ['business', 'venture', 'store', 'saas', 'agency', 'negosyo'], tab: 'business', label: 'Open Business Operations' },
  { terms: ['freelance time', 'time log', 'timer'], tab: 'freelance-time', label: 'Open Freelance Time Logs' },
  { terms: ['freelance invoice', 'invoice'], tab: 'freelance-invoices', label: 'Open Freelance Invoices' },
  { terms: ['freelance contract', 'contract'], tab: 'freelance-contracts', label: 'Open Freelance Contracts' },
  { terms: ['freelance dashboard', 'service dashboard'], tab: 'freelance-dashboard', label: 'Open Freelance Dashboard' },
  { terms: ['freelance', 'client'], tab: 'freelancing', label: 'Open Freelancing' },
  { terms: ['tax', 'bir', 'sss', 'philhealth', 'pag-ibig', 'buwis'], tab: 'taxes', label: 'Open Taxes' },
  { terms: ['category', 'categories'], tab: 'categories', label: 'Open Categories' },
  { terms: ['personal notes', 'note', 'notes'], tab: 'personal-notes', label: 'Open Personal Notes' },
  { terms: ['personal routines', 'routine', 'routines'], tab: 'personal-routines', label: 'Open Personal Routines' },
  { terms: ['personal'], tab: 'personal', label: 'Open Personal Space' },
  { terms: ['setting', 'backup', 'export', 'import', 'theme'], tab: 'settings', label: 'Open Settings' }
];

const directNavigation = /\b(open|go to|take me to|show me|navigate to|buksan|pumunta|puntahan|ipakita|dalhin ako)\b/i;

const workflows = [
  { terms: ['monthly review', 'month end', 'month-end', 'financial review', 'reconcile'], text: 'For a local monthly review, check Accounts for recorded transactions, Plans for budgets and goals, Taxes for obligations, and use the statement export when you are ready. No external AI is needed for this workflow.', tab: 'home', label: 'Open Home' },
  { terms: ['statement', 'account report', 'export report', 'export excel', 'export pdf'], text: 'You can export a formatted local statement or workbook from Settings. The workbook includes the dashboard data and charts, while the PDF is designed as a readable statement rather than a screen print.', tab: 'settings', label: 'Open Settings' },
  { terms: ['expense breakdown', 'spending breakdown', 'where did my money go', 'spending review'], text: 'Open Accounts to review transactions and category totals, then use the dashboard or Excel export for a visual breakdown. Your financial records stay local.', tab: 'accounts', label: 'Open Accounts' },
  { terms: ['invoice'], text: 'To create an invoice, open Freelancing, choose the relevant service, then use its Invoices tab. Add the client and line items there; details remain local in FinGent.', tab: 'freelancing', label: 'Open Freelancing' },
  { terms: ['time log', 'timer', 'track time'], text: 'To track time, open Freelancing and select the relevant service. Start a timer or add a completed time log, then optionally link it to a contract yourself.', tab: 'freelancing', label: 'Open Freelancing' },
  { terms: ['record an expense', 'add expense', 'log expense'], text: 'You can say “I spent 500 on groceries, cash” to create a private transaction draft, or open Accounts to use the full transaction form.', tab: 'accounts', label: 'Open Accounts' },
  { terms: ['create a budget', 'add budget'], text: 'To create a budget, open Plans and use the budget workspace to set a month, total, and category allocations yourself.', tab: 'plans', label: 'Open Plans' },
  { terms: ['add task', 'create task', 'to-do', 'todo'], text: 'To add a career task, open Career and use the tasks workspace. You can set a due date and priority there.', tab: 'career', label: 'Open Career' },
  { terms: ['add event', 'schedule meeting', 'create event'], text: 'To schedule an event or meeting, open Calendar and use the new-event control. Career events can also be created from the Career calendar.', tab: 'calendar', label: 'Open Calendar' }
];

function matchedRoute(message: string) {
  const normalized = message.toLowerCase();
  return routes
    .flatMap(route => route.terms.filter(term => normalized.includes(term)).map(term => ({ route, score: term.length })))
    .sort((left, right) => right.score - left.score)[0]?.route;
}

function titleCase(value: string) {
  return value.split(/\s+/).filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function dateFromMessage(message: string) {
  const iso = message.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) return iso[1] + '-' + iso[2].padStart(2, '0') + '-' + iso[3].padStart(2, '0');
  if (/\b(?:yesterday|kahapon)\b/i.test(message)) {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().slice(0, 10);
  }
  if (/\b(?:tomorrow|bukas)\b/i.test(message)) {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  }
  return today();
}

function cleanPhrase(value: string) {
  return value.replace(/\b(?:from|using|via|with|through|gamit(?:\s+ang)?|mula(?:\s+sa)?)\b.*$/i, '').replace(/\b(?:my|ang)\s+/i, '').replace(/\b(?:today|yesterday|tomorrow|ngayon|kahapon|bukas)\b/ig, '').replace(/[,.!?]+$/g, '').trim();
}

function inferExpenseCategory(value: string) {
  const normalized = value.toLowerCase();
  const categories: Array<[RegExp, string]> = [
    [/\b(food|meal|breakfast|lunch|dinner|snack|grocer\w*|restaurant|cafe|coffee|delivery|pagkain|ulam|tanghalian|hapunan|almusal|meryenda|kape)\b/, 'Food'],
    [/\b(transport|commute|fare|fuel|gas|gasoline|parking|grab|taxi|bus|train|pamasahe|biyahe|gasolina)\b/, 'Transport'],
    [/\b(rent|housing|mortgage|upa|bahay)\b/, 'Housing'],
    [/\b(electric|electricity|water|internet|wifi|mobile|phone|utility|utilities|kuryente|tubig|load)\b/, 'Utilities'],
    [/\b(doctor|medical|medicine|pharmacy|hospital|health|gamot|ospital|doktor)\b/, 'Health'],
    [/\b(course|tuition|book|education|school|training|paaralan|eskwela|kurso)\b/, 'Education'],
    [/\b(movie|game|concert|netflix|spotify|entertainment|sine|laro)\b/, 'Entertainment'],
    [/\b(clothes|clothing|shopping|shop|store|damit|pamimili)\b/, 'Shopping']
  ];
  return categories.find(([pattern]) => pattern.test(normalized))?.[1] || titleCase(value);
}

function transactionAccountHint(message: string, intent: TransactionDraft['type']) {
  const destination = intent === 'income'
    ? message.match(/\b(?:to|into|sa|papunta\s+sa|pumasok\s+sa)\s+(?:my\s+)?([^,.!?]+)/i)
    : null;
  const account = destination
    || message.match(/\b(?:from|using|via|with|through|gamit(?:\s+ang)?)\s+(?:my\s+)?([^,.!?]+)/i)
    || message.match(/\b(?:paid|paying)\s+(?:by|with)\s+(?:my\s+)?([^,.!?]+)/i)
    || message.match(/\bused\s+(?:my\s+)?(.+?)\s+to\s+(?:buy|pay|purchase|order)\b/i)
    || message.match(/,\s*(?:my\s+)?([^,.!?]+)\s*$/);
  return account ? cleanPhrase(account[1]) : '';
}

function parseTransactionCommand(message: string): TransactionDraft | null {
  const normalized = message.trim();
  const isExpense = /\b(spent|spend|paid|pay|bought|buy|purchase|purchased|charged|charge|ordered|order|expense|cash out|gumastos|nagastos|bumili|binili|nagbayad|bayad|umorder)\b/i.test(normalized)
    || (/\bused\b/i.test(normalized) && /\b(?:for|to\s+(?:buy|pay)|at)\b/i.test(normalized));
  const intent = isExpense ? 'expense'
    : /\b(earned|receive|received|income|salary|got paid|made|sold|sale|deposited|deposit|credited|credit|kumita|nakatanggap|natanggap|sweldo|sahod|binayaran ako)\b/i.test(normalized) ? 'income'
      : null;
  if (!intent) return null;
  const amountMatch = normalized.match(/(?:\u20B1|php|pesos?|\$)?\s*(\d[\d,]*(?:\.\d{1,2})?)/i);
  if (!amountMatch) return null;
  const amount = Number(amountMatch[1].replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const accountHint = transactionAccountHint(normalized, intent);
  const reasonMatch = normalized.match(/\b(?:on|for|sa|para\s+sa)\s+(.+?)(?:\s*(?:,|\bfrom\b|\busing\b|\bvia\b|\bwith\b|\bgamit\b|\bmula\b)|$)/i);
  // Covers natural purchase wording such as "bought food for 400 pesos".
  // Prefer the item before the amount over the generic "for <...>" phrase.
  const purchaseReason = intent === 'expense'
    ? normalized.match(/\b(?:bought|buy|purchase(?:d)?|ordered|order)\s+(.+?)\s+(?:for|worth)\s+(?:(?:\u20B1|php|pesos?)?\s*\d)/i)?.[1]
      || normalized.match(/\b(?:bumili|binili|umorder)\s+(?:ako\s+)?ng\s+(.+?)\s+(?:na|ng|sa\s+halagang)\s+(?:(?:\u20B1|php|pesos?)?\s*\d)/i)?.[1]
    : undefined;
  const leadingReason = normalized.match(/^(?:for|on|para\s+sa)\s+(.+?)[,;:-]\s*(?:i\s+)?(?:spent|paid|bought|purchased|ordered|gumastos|nagbayad|bumili)\b/i)?.[1];
  const paidToReason = intent === 'expense'
    ? normalized.match(/\b(?:paid|pay)\s+(?:(?:\u20B1|php|pesos?)?\s*\d[\d,]*(?:\.\d{1,2})?)\s+to\s+(.+?)(?:\s+(?:from|using|via|with|through)|$)/i)?.[1]
    : undefined;
  const reasonIsIncomeDestination = intent === 'income' && Boolean(reasonMatch?.[1] && accountHint && cleanPhrase(reasonMatch[1]).toLowerCase() === accountHint.toLowerCase());
  const rawReason = cleanPhrase(purchaseReason || leadingReason || paidToReason || (reasonIsIncomeDestination ? undefined : reasonMatch?.[1]) || (intent === 'income' ? 'Income' : 'General')).replace(/\b(?:today|yesterday|tomorrow|ngayon|kahapon|bukas)\b/ig, '').trim() || (intent === 'income' ? 'Income' : 'General');
  const category = intent === 'expense' ? inferExpenseCategory(rawReason) : titleCase(rawReason);
  const description = category === 'General' || category === 'Income' ? '' : category;

  return {
    type: intent,
    amount,
    category,
    accountHint,
    description,
    date: dateFromMessage(normalized),
    redactedCommand: 'Action: ' + intent.toUpperCase() + ' [AMOUNT] ' + (accountHint ? 'from [ACCOUNT] ' : '') + 'for [REASON].'
  };
}

function amountFrom(value: string) {
  const match = value.match(/(?:\u20B1|php|pesos?|\$)?\s*(\d[\d,]*(?:\.\d{1,2})?)/i);
  const amount = match ? Number(match[1].replace(/,/g, '')) : 0;
  return Number.isFinite(amount) ? amount : 0;
}

function parseInvestmentCommand(message: string): InvestmentDraft | null {
  if (!/\b(bought|buy|purchased|purchase|invested|invest|added|add|put|bumili|binili|nag-invest)\b/i.test(message)) return null;
  const tickerMatch = message.match(/\b(?:on|of|in|into|ng|sa)\s+(?:shares?\s+of\s+)?([a-z][a-z0-9.-]{0,9})\b/i);
  if (!tickerMatch) return null;
  const ticker = tickerMatch[1].toUpperCase();
  if (['CASH', 'FOOD', 'GROCERIES', 'THIS', 'THAT', 'IT'].includes(ticker)) return null;
  const shareMatch = message.match(/\b(\d+(?:\.\d+)?)\s+shares?\b/i);
  const priceMatch = message.match(/\b(?:at|@)\s*(?:\$|usd\s*)?(\d[\d,]*(?:\.\d{1,2})?)/i);
  const isUsd = /\b(?:usd|dollars?)\b|\$/i.test(message) || Boolean(priceMatch);
  const shares = shareMatch ? Number(shareMatch[1]) : null;
  const avgPrice = priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : shares ? amountFrom(message) / shares : null;
  const amount = shares && avgPrice ? shares * avgPrice : amountFrom(message);
  if (!isUsd || amount <= 0) return null;
  const isCrypto = /\b(?:crypto|bitcoin|ethereum|btc|eth|sol)\b/i.test(message) || ['BTC', 'ETH', 'SOL'].includes(ticker);
  return {
    type: isCrypto ? 'Cryptos' : 'Stocks',
    name: ticker,
    ticker,
    invested: amount,
    current_value: amount,
    shares,
    avg_price: avgPrice,
    currency: 'USD',
    platform: '',
    date: dateFromMessage(message),
    redactedCommand: 'Action: CREATE [INVESTMENT] ticker [TICKER], amount [AMOUNT], currency [CURRENCY].'
  };
}

function parseTransferCommand(message: string): TransferDraft | null {
  if (!/\b(?:transfer|move|send|cash\s?-?in|top\s?-?up|ilipat|maglipat|lipat|lagyan)\b/i.test(message)) return null;
  const topUp = message.match(/\b(?:top\s?-?up|cash\s?-?in)\s+(?:my\s+)?(.+?)\s+(?:with|for)\s+(.+?)(?:\s+from\s+(.+))?$/i)
    || message.match(/\b(?:lagyan|lagyan\s+ko)\s+(?:ang\s+)?(.+?)\s+ng\s+(.+?)(?:\s+mula(?:\s+sa)?\s+(.+))?$/i);
  const amount = topUp ? amountFrom(topUp[2]) : amountFrom(message);
  const fromMatch = message.match(/\b(?:from|mula(?:\s+sa)?)\s+(.+?)(?:\s+to\s+|\s+into\s+|\s+papunta|$)/i);
  const toMatch = message.match(/\b(?:to|into|papunta(?:ng|\s+sa)?|sa)\s+(.+?)(?:\s+(?:from|mula)\s+|$)/i);
  const fromHint = cleanPhrase(topUp?.[3] || fromMatch?.[1] || '');
  const toHint = cleanPhrase(topUp?.[1] || toMatch?.[1] || '');
  if (!amount || !fromHint || !toHint) return null;
  return { amount, fromHint, toHint, date: dateFromMessage(message), redactedCommand: 'Action: TRANSFER [AMOUNT] from [SOURCE ACCOUNT] to [DESTINATION ACCOUNT].' };
}

function operation(kind: OperationDraft['kind'], label: string, tab: string, payload: Record<string, unknown>): OperationDraft {
  return { kind, label, tab, payload, redactedCommand: 'Action: CREATE [' + kind.toUpperCase() + '] using [PRIVATE FIELDS].' };
}

function parseOperationCommand(message: string): OperationDraft | null {
  const trimmed = message.trim();
  const account = trimmed.match(/^(?:add|create)\s+(?:an?\s+)?(cash|bank|digital(?: wallet)?|card|credit card)\s+account\s+(.+?)(?:\s+(?:with|balance)\s+(.+))?$/i);
  if (account) {
    const type = account[1].toLowerCase().includes('digital') ? 'Digital' : account[1].toLowerCase().includes('card') ? 'Card' : titleCase(account[1]);
    return operation('account', 'Account: ' + account[2], 'accounts', { name: account[2], type, balance: amountFrom(account[3] || ''), interest_rate_pa: 0, image_logo_name: '', color: '', purpose: '', credit_limit: null, statement_date: null, due_date: null });
  }

  const liability = trimmed.match(/^(?:add|create)\s+(?:an?\s+)?(bill|debt|credit|installment|quick expense)\s+(.+?)\s+(?:for|amount|of)\s+(.+?)(?:\s+(?:due|on)\s+(\d{4}-\d{2}-\d{2}))?$/i);
  if (liability) {
    const typeMap: Record<string, string> = { bill: 'Bills', debt: 'Debts', credit: 'Credits', installment: 'Installments', 'quick expense': 'Quick Expenses' };
    const amount = amountFrom(liability[3]);
    if (amount > 0) return operation('liability', titleCase(liability[1]) + ': ' + liability[2], 'liabilities-' + typeMap[liability[1].toLowerCase()].toLowerCase(), { name: liability[2], type: typeMap[liability[1].toLowerCase()], amount, date: liability[4] || today(), provider: '', status: 'Unpaid', card_name: '', total_amount: amount, remaining_amount: amount, total_months: 0, current_month: 0, merchant: '', paid_using: '', is_recurring: false });
  }

  const incomeFlow = trimmed.match(/^(?:add|create|set)\s+(?:an?\s+)?income flow\s+(.+?)\s+(?:for|amount|of)\s+(.+)$/i);
  if (incomeFlow) {
    const amount = amountFrom(incomeFlow[2]);
    if (amount > 0) return operation('income-flow', 'Income flow: ' + incomeFlow[1], 'plans', { name: incomeFlow[1], amount, date: today(), is_recurring: /recurring|monthly|weekly/i.test(trimmed), budget_preset_id: null, account_id: null, category: 'Income' });
  }

  const task = trimmed.match(/^(?:add|create|remind me about)\s+(?:a\s+)?(?:career\s+)?task\s+(.+?)(?:\s+due\s+(\d{4}-\d{2}-\d{2}))?$/i);
  if (task) return operation('career-task', 'Career task: ' + task[1], 'career-tasks', { title: task[1], due_date: task[2] || today(), priority: 'Medium', notes: '' });

  const event = trimmed.match(/^(?:add|create|schedule)\s+(?:an?\s+)?(?:event|meeting|interview)\s+(.+?)(?:\s+(?:on|for)\s+(\d{4}-\d{2}-\d{2}))?$/i);
  if (event) return operation('calendar-event', 'Calendar event: ' + event[1], 'calendar', { name: event[1], type: 'general', amount: null, date: event[2] || today(), color: 'blue', icon: 'Calendar', provider: 'Local Copilot', source: 'copilot' });

  const note = trimmed.match(/^(?:add|create|save)\s+(?:a\s+)?note\s+([^:]+)(?::\s*(.+))?$/i);
  if (note) return operation('note', 'Note: ' + note[1].trim(), 'personal-notes', { title: note[1].trim(), body: note[2]?.trim() || '' });

  const routine = trimmed.match(/^(?:add|create)\s+(?:a\s+)?routine\s+(.+?)(?:\s+(daily|weekdays|weekly))?$/i);
  if (routine) return operation('routine', 'Routine: ' + routine[1], 'personal-routines', { name: routine[1], frequency: titleCase(routine[2] || 'Daily') });

  const category = trimmed.match(/^(?:add|create)\s+(?:an?\s+)?(?:income |expense )?category\s+(.+?)(?:\s+as\s+(income|expense))?$/i);
  if (category) return operation('category', 'Category: ' + category[1], 'categories', { name: category[1], type: (category[2] || (/income category/i.test(trimmed) ? 'income' : 'expense')).toLowerCase() });

  const goal = trimmed.match(/^(?:add|create)\s+(?:a\s+)?goal\s+(.+?)\s+(?:target|for)\s+(.+)$/i);
  if (goal) {
    const target = amountFrom(goal[2]);
    if (target > 0) return operation('goal', 'Goal: ' + goal[1], 'plans-goals', { name: goal[1], target, saved: 0, date: null, color: 'emerald', icon: 'Target', sources: [], transactions: [] });
  }

  const budget = trimmed.match(/^(?:add|create)\s+(?:a\s+)?budget\s+(.+?)\s+(?:amount|for|of)\s+(.+)$/i);
  if (budget) {
    const total = amountFrom(budget[2]);
    if (total > 0) return operation('budget', 'Budget: ' + budget[1], 'plans-budget', { name: budget[1], total_amount: total, categories: [], month: new Date().toISOString().slice(0, 7) });
  }

  return null;
}

export function runLocalCopilot(message: string): CopilotReply {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  const route = matchedRoute(trimmed);

  const investment = parseInvestmentCommand(trimmed);
  if (investment) {
    return {
      text: 'I prepared a private ' + investment.type.toLowerCase().replace(/s$/, '') + ' purchase draft for ' + investment.ticker + '. I interpreted the amount as a USD total investment' + (investment.shares ? ' across ' + investment.shares + ' shares' : '') + '. Review it, then explicitly save it.',
      investment
    };
  }

  const transfer = parseTransferCommand(trimmed);
  if (transfer) {
    return {
      text: 'I prepared a private transfer draft from “' + transfer.fromHint + '” to “' + transfer.toHint + '”. Review it, then explicitly save it.',
      transfer
    };
  }

  const operationDraft = parseOperationCommand(trimmed);
  if (operationDraft) {
    return {
      text: 'I prepared a local ' + operationDraft.kind.replace('-', ' ') + ' draft. Review it, then explicitly save it. Private fields stay inside FinGent.',
      operation: operationDraft
    };
  }

  const transaction = parseTransactionCommand(trimmed);
  if (transaction) {
    const accountText = transaction.accountHint ? ' from “' + transaction.accountHint + '”' : '';
    return {
      text: 'I prepared a local ' + transaction.type + ' draft for ' + transaction.category + accountText + '. Review it, then explicitly save it. Your details stay in FinGent and are never sent to an AI service.',
      transaction
    };
  }

  if (/\b(privacy|private|data|secure|security)\b/.test(lower)) {
    return {
      text: 'This agent resolves commands and saves records locally in FinGent. It has no API key and sends no data to an external AI service. If an AI provider is added later, it will receive only a redacted command such as “Action: EXPENSE [AMOUNT] from [ACCOUNT] for [REASON].”'
    };
  }

  if (/\b(what can you do|help|commands|how do you work)\b/.test(lower)) {
    return {
      text: 'I can open every FinGent workspace and sidebar sub-tab: for example “open stocks”, “open career tasks”, “open business cash flow”, “open freelance invoices”, or “open personal notes”. I can prepare local drafts for money records: “I spent 500 on groceries, cash”, “transfer 500 from Cash to BDO”, “I bought 3 shares of AAPL at 100 dollars”, “create cash account Wallet with 1500”, “add bill Internet for 1800”, and “create income flow Retainer for 25000 monthly”. I also handle tasks, events, notes, routines, categories, goals, and budgets. Every write needs an explicit Save locally click.',
      actions: [
        { label: 'Open Home', tab: 'home' },
        { label: 'Open Accounts', tab: 'accounts' },
        { label: 'Open Career Tasks', tab: 'career-tasks' },
        { label: 'Open Calendar', tab: 'calendar' },
        { label: 'Open Freelancing', tab: 'freelancing' },
        { label: 'Open Business', tab: 'business' }
      ]
    };
  }

  if (route && directNavigation.test(trimmed)) {
    return {
      text: 'Opening ' + route.label.replace('Open ', '') + '.',
      actions: [{ label: route.label, tab: route.tab }],
      navigateNow: route.tab
    };
  }

  const workflow = workflows.find(item => item.terms.some(term => lower.includes(term)));
  if (workflow) {
    return {
      text: workflow.text,
      actions: [{ label: workflow.label, tab: workflow.tab }],
      navigateNow: directNavigation.test(trimmed) ? workflow.tab : undefined
    };
  }

  if (route) {
    const action = { label: route.label, tab: route.tab };
    const actionHint = /\b(add|create|record|log|new|track)\b/.test(lower)
      ? ' Once there, use the New or Add button to enter the details yourself.'
      : '';
    return {
      text: 'I can take you to ' + route.label.replace('Open ', '') + '.' + actionHint + ' I do not inspect or handle the details you enter.',
      actions: [action],
      navigateNow: directNavigation.test(trimmed) ? route.tab : undefined
    };
  }

  if (/\b(spend|spending|income|money|balance|worth|net worth)\b/.test(lower)) {
    return {
      text: 'For privacy, I cannot view or calculate from your financial records. You can review your own figures in Accounts, Plans, or the dashboard; I can take you to the relevant workspace if you tell me which one.',
      actions: [
        { label: 'Open Accounts', tab: 'accounts' },
        { label: 'Open Plans', tab: 'plans' }
      ]
    };
  }

  return {
    text: 'I am FinGent\'s local copilot. I can guide you, open workspaces, and prepare a transaction for your approval. Try “I spent 500 on groceries, cash”, “open career”, or “where do I create an invoice?”.'
  };
}
