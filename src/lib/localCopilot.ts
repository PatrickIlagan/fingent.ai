export type CopilotAction = { label: string; tab: string };

export type CopilotReply = {
  text: string;
  actions?: CopilotAction[];
  navigateNow?: string;
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

export function runLocalCopilot(message: string): CopilotReply {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  const route = matchedRoute(trimmed);

  if (/(\u20B1|\$|\bphp\b|\bpeso\b)\s*[\d,]+|\b(?:balance|salary|income|expense|debt)\b[^.]{0,24}\b\d[\d,]*/i.test(trimmed)) {
    return {
      text: 'Please keep financial amounts and client details out of the copilot. I do not need them to guide you, and nothing is sent anywhere. Ask a general workflow question instead, such as "where do I record an expense?"'
    };
  }

  if (/\b(privacy|private|data|secure|security)\b/.test(lower)) {
    return {
      text: 'This copilot runs only in your browser. It does not read accounts, transactions, investments, invoices, balances, or any other client records. It has no API key, no server request, and no external connection.'
    };
  }

  if (/\b(what can you do|help|commands|how do you work)\b/.test(lower)) {
    return {
      text: 'I can guide you through FinGent and take you to the right workspace. Ask me to open Accounts, Investments, Plans, Career, Freelancing, Business Operations, Taxes, Calendar, Categories, Personal Space, or Settings. I can also explain where to record a transaction, create an invoice, add a task, or export a report without seeing your data.',
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
    text: 'I am FinGent\'s local navigation copilot. I can guide you without accessing your records. Try "open career", "where do I create an invoice?", "take me to taxes", or "how do I export a report?".'
  };
}
