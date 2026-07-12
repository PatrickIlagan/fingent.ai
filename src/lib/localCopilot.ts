export type CopilotAction = { label: string; tab: string };

export type TransactionDraft = {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  accountHint: string;
  description: string;
  redactedCommand: string;
};

export type CopilotReply = {
  text: string;
  actions?: CopilotAction[];
  navigateNow?: string;
  transaction?: TransactionDraft;
};

const routes = [
  { terms: ['account', 'bank', 'cash', 'transaction', 'expense'], tab: 'accounts', label: 'Open Accounts' },
  { terms: ['investment', 'portfolio', 'stock', 'crypto'], tab: 'investments', label: 'Open Investments' },
  { terms: ['liability', 'debt', 'loan', 'credit card', 'bill'], tab: 'liabilities', label: 'Open Liabilities' },
  { terms: ['budget', 'goal', 'plan', 'saving'], tab: 'plans', label: 'Open Plans' },
  { terms: ['calendar', 'event', 'schedule'], tab: 'calendar', label: 'Open Calendar' },
  { terms: ['career', 'job', 'interview', 'skill', 'upskill', 'task'], tab: 'career', label: 'Open Career' },
  { terms: ['freelance', 'client', 'contract', 'invoice', 'time log', 'timer'], tab: 'freelancing', label: 'Open Freelancing' },
  { terms: ['business', 'venture', 'store', 'saas', 'agency', 'pipeline'], tab: 'business', label: 'Open Business Operations' },
  { terms: ['tax', 'bir', 'sss', 'philhealth', 'pag-ibig'], tab: 'taxes', label: 'Open Taxes' },
  { terms: ['category', 'categories'], tab: 'categories', label: 'Open Categories' },
  { terms: ['note', 'routine', 'personal'], tab: 'personal', label: 'Open Personal Space' },
  { terms: ['setting', 'backup', 'export', 'import', 'theme'], tab: 'settings', label: 'Open Settings' }
];

const directNavigation = /\b(open|go to|take me to|show me|navigate to)\b/i;

const workflows = [
  { terms: ['invoice'], text: 'To create an invoice, open Freelancing, choose the relevant service, then use its Invoices tab. Add the client and line items there; the copilot never sees those details.', tab: 'freelancing', label: 'Open Freelancing' },
  { terms: ['time log', 'timer', 'track time'], text: 'To track time, open Freelancing and select the relevant service. Start a timer or add a completed time log, then optionally link it to a contract yourself.', tab: 'freelancing', label: 'Open Freelancing' },
  { terms: ['record an expense', 'add expense', 'log expense'], text: 'To record an expense, open Accounts and use New Transaction. Choose the account, category, date, and amount directly in the form; the copilot never reads that information.', tab: 'accounts', label: 'Open Accounts' },
  { terms: ['create a budget', 'add budget'], text: 'To create a budget, open Plans and use the budget workspace to set a month, total, and category allocations yourself.', tab: 'plans', label: 'Open Plans' },
  { terms: ['add task', 'create task', 'to-do', 'todo'], text: 'To add a career task, open Career and use the tasks workspace. You can set a due date and priority there.', tab: 'career', label: 'Open Career' },
  { terms: ['add event', 'schedule meeting', 'create event'], text: 'To schedule an event or meeting, open Calendar and use the new-event control. Career events can also be created from the Career calendar.', tab: 'calendar', label: 'Open Calendar' }
];

function matchedRoute(message: string) {
  const normalized = message.toLowerCase();
  return routes.find(route => route.terms.some(term => normalized.includes(term)));
}

function titleCase(value: string) {
  return value.split(/\s+/).filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

function cleanPhrase(value: string) {
  return value.replace(/\b(?:from|using|via|with)\b.*$/i, '').replace(/[,.!?]+$/g, '').trim();
}

function parseTransactionCommand(message: string): TransactionDraft | null {
  const normalized = message.trim();
  const intent = /\b(spent|spend|paid|pay|bought|purchase|expense)\b/i.test(normalized) ? 'expense'
    : /\b(earned|receive|received|income|salary|got paid)\b/i.test(normalized) ? 'income'
      : null;
  if (!intent) return null;
  const amountMatch = normalized.match(/(?:\u20B1|php|pesos?|\$)?\s*(\d[\d,]*(?:\.\d{1,2})?)/i);
  if (!amountMatch) return null;
  const amount = Number(amountMatch[1].replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const accountMatch = normalized.match(/\b(?:from|using|via|with)\s+([^,.!?]+)/i) || normalized.match(/,\s*([^,.!?]+)\s*$/);
  const accountHint = accountMatch ? cleanPhrase(accountMatch[1]) : '';
  const reasonMatch = normalized.match(/\b(?:on|for)\s+(.+?)(?:\s*(?:,|\bfrom\b|\busing\b|\bvia\b|\bwith\b)|$)/i);
  const category = titleCase(cleanPhrase(reasonMatch?.[1] || (intent === 'income' ? 'Income' : 'General')) || (intent === 'income' ? 'Income' : 'General'));
  const description = category === 'General' || category === 'Income' ? '' : category;

  return {
    type: intent,
    amount,
    category,
    accountHint,
    description,
    redactedCommand: 'Action: ' + intent.toUpperCase() + ' [AMOUNT] ' + (accountHint ? 'from [ACCOUNT] ' : '') + 'for [REASON].'
  };
}

export function runLocalCopilot(message: string): CopilotReply {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  const route = matchedRoute(trimmed);

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
      text: 'I can guide you through FinGent, open the right workspace, and prepare a local transaction from plain language. Try “I spent 500 on groceries, cash” or “I received 25000 salary via BDO.” I will always ask for an explicit save before recording anything.',
      actions: routes.slice(0, 6).map(({ label, tab }) => ({ label, tab }))
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
