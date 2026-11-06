// On-device suggestions: short, actionable tips worked out only from the data on
// this device. Nothing here calls a network service. At most three per page,
// most important first.
import { daysBetween, dueInterest, goalProgress, interestMode, interestRates, isCardAccount, isCashFlow, localDate, monthlyInterestEstimate, parseList, shiftDate } from './sharedRules';

export type SuggestionPage = 'home' | 'accounts' | 'liabilities' | 'plans' | 'investments' | 'calendar' | 'career' | 'business' | 'freelancing';
export type Suggestion = { id: string; tone: 'tip' | 'warn' | 'good'; text: string; action?: { label: string; tab: string; goalId?: number } };
export type SuggestionData = {
  accounts?: any[]; transactions?: any[]; goals?: any[]; liabilities?: any[]; portfolios?: any[]; incomeFlows?: any[];
  career?: any; careerTasks?: any[]; invoices?: any[]; timeLogs?: any[]; services?: any[]; businesses?: any[];
};

/** Which API lists each page's suggestions need. */
export const SUGGESTION_SOURCES: Record<SuggestionPage, (keyof SuggestionData)[]> = {
  home: ['accounts', 'transactions', 'liabilities', 'goals'],
  accounts: ['accounts', 'transactions'],
  liabilities: ['liabilities', 'accounts'],
  plans: ['goals', 'accounts'],
  investments: ['portfolios'],
  calendar: ['liabilities', 'incomeFlows', 'accounts'],
  career: ['career', 'careerTasks'],
  business: ['businesses'],
  freelancing: ['invoices', 'timeLogs', 'services'],
};

const peso = (value: number) => '₱' + Math.round(value).toLocaleString('en-PH');
const num = (value: unknown) => Number(value) || 0;
const isoDay = (value: unknown) => { const text = String(value || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null; };
const liquid = (accounts: any[]) => accounts.filter(account => !isCardAccount(account) && account.type !== 'Investments');

/** The next due date of a bill: its stored date, or this/next month's day for day-of-month entries. */
function nextDue(liability: any, today: string) {
  const date = isoDay(liability.date);
  if (date) return date;
  const day = parseInt(String(liability.date || ''), 10);
  if (!(day >= 1 && day <= 31)) return null;
  const [year, month] = today.split('-').map(Number);
  const make = (y: number, m: number) => { const last = new Date(Date.UTC(y, m, 0)).getUTCDate(); return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`; };
  const thisMonth = make(year, month);
  return thisMonth >= today ? thisMonth : make(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1);
}
const unpaid = (liability: any) => !/^paid$/i.test(String(liability.status || '')) && num(liability.amount) > 0;

function spendingByCategory(transactions: any[], from: string, to: string) {
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    const date = isoDay(transaction.date);
    if (!date || date < from || date > to || transaction.type !== 'expense' || !isCashFlow(transaction)) continue;
    const category = String(transaction.category || 'Expenses');
    totals.set(category, (totals.get(category) || 0) + num(transaction.amount));
  }
  return totals;
}

function billSuggestions(data: SuggestionData, today: string): Suggestion[] {
  const out: Suggestion[] = [];
  const bills = (data.liabilities || []).filter(unpaid).map(item => ({ item, due: nextDue(item, today) })).filter(entry => entry.due);
  const overdue = bills.filter(entry => entry.due! < today && !entry.item.is_recurring);
  if (overdue.length) out.push({ id: `overdue-${overdue.length}`, tone: 'warn', text: `${overdue.length} bill${overdue.length === 1 ? ' is' : 's are'} past due (${peso(overdue.reduce((sum, entry) => sum + num(entry.item.amount), 0))}). Pay or update ${overdue.length === 1 ? 'it' : 'them'} so your plan stays accurate.`, action: { label: 'Review bills', tab: 'liabilities' } });
  const soon = bills.filter(entry => entry.due! >= today && daysBetween(today, entry.due!) <= 3);
  if (soon.length) {
    const first = soon.sort((a, b) => a.due!.localeCompare(b.due!))[0];
    const days = daysBetween(today, first.due!);
    out.push({ id: `soon-${first.item.id}-${first.due}`, tone: 'tip', text: soon.length === 1 ? `${first.item.name} (${peso(num(first.item.amount))}) is due ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}.` : `${soon.length} bills totalling ${peso(soon.reduce((sum, entry) => sum + num(entry.item.amount), 0))} are due in the next 3 days.`, action: { label: 'See bills', tab: 'liabilities' } });
  }
  return out;
}

function home(data: SuggestionData, today: string): Suggestion[] {
  const out = billSuggestions(data, today);
  const transactions = data.transactions || [];
  // Category spending: this month so far vs. the same days last month.
  const monthStart = `${today.slice(0, 7)}-01`;
  const dayOfMonth = Number(today.slice(8, 10));
  const lastMonthStart = shiftDate(monthStart, -1).slice(0, 7) + '-01';
  const lastMonthSameDay = shiftDate(lastMonthStart, dayOfMonth - 1);
  const now = spendingByCategory(transactions, monthStart, today);
  const before = spendingByCategory(transactions, lastMonthStart, lastMonthSameDay < monthStart ? lastMonthSameDay : shiftDate(monthStart, -1));
  const jumps = [...now.entries()].map(([category, amount]) => ({ category, amount, previous: before.get(category) || 0 }))
    .filter(entry => entry.previous >= 500 && entry.amount >= entry.previous * 1.4 && entry.amount - entry.previous >= 1000)
    .sort((a, b) => (b.amount - b.previous) - (a.amount - a.previous));
  if (jumps[0]) out.push({ id: `jump-${jumps[0].category}-${today.slice(0, 7)}`, tone: 'warn', text: `${jumps[0].category} spending is ${peso(jumps[0].amount)} so far, ${Math.round((jumps[0].amount / jumps[0].previous - 1) * 100)}% more than this point last month.`, action: { label: 'Open accounts', tab: 'accounts' } });
  // Money running low before the next bills.
  const cash = liquid(data.accounts || []).reduce((sum, account) => sum + num(account.balance), 0);
  const nextTwoWeeks = (data.liabilities || []).filter(unpaid).map(item => ({ item, due: nextDue(item, today) })).filter(entry => entry.due && entry.due >= today && daysBetween(today, entry.due) <= 14).reduce((sum, entry) => sum + num(entry.item.amount), 0);
  if (nextTwoWeeks > 0 && cash < nextTwoWeeks) out.push({ id: `low-${today}`, tone: 'warn', text: `Bills in the next two weeks (${peso(nextTwoWeeks)}) are more than your cash on hand (${peso(cash)}).`, action: { label: 'See bills', tab: 'liabilities' } });
  if (!out.length) {
    const behind = (data.goals || []).map(goal => ({ goal, pace: goalProgress(goal, data.accounts || [], today) })).find(entry => entry.pace.status === 'behind');
    if (behind) out.push({ id: `goal-behind-${behind.goal.id}`, tone: 'tip', text: `${behind.goal.name} is ${peso(behind.pace.behindBy)} behind pace. About ${peso(behind.pace.requiredMonthly)} a month gets it back on track.`, action: { label: 'Open goal', tab: 'plans', goalId: behind.goal.id } });
  }
  return out;
}

function accounts(data: SuggestionData, today: string): Suggestion[] {
  const out: Suggestion[] = [];
  const list = liquid(data.accounts || []);
  for (const account of list) {
    if (interestMode(account) !== 'remind') continue;
    const { reminder } = dueInterest(account, (data.transactions || []).filter(transaction => transaction.account_id === account.id), today);
    if (reminder && reminder.net >= 1) { out.push({ id: `interest-due-${account.id}-${reminder.date}`, tone: 'tip', text: `${account.name}: interest of about ${peso(reminder.net)} should have arrived. Add the exact amount from your bank.`, action: { label: 'Open accounts', tab: 'accounts' } }); break; }
  }
  for (const account of list) {
    const until = isoDay(account.interest_boost_until);
    if (num(account.interest_boost_pa) > 0 && until && until >= today && daysBetween(today, until) <= 14) { out.push({ id: `boost-${account.id}-${until}`, tone: 'warn', text: `The interest boost on ${account.name} ends ${daysBetween(today, until) === 0 ? 'today' : `in ${daysBetween(today, until)} days`}. Renew it, or your rate drops to ${(num(account.interest_rate_pa) * 100).toFixed(2)}%.`, action: { label: 'Open accounts', tab: 'accounts' } }); break; }
  }
  // Idle cash earning nothing while another account pays interest.
  const best = list.map(account => ({ account, rate: interestMode(account) === 'off' ? 0 : interestRates(account, Math.max(num(account.balance), 50000), today).effective })).sort((a, b) => b.rate - a.rate)[0];
  const idle = list.filter(account => interestMode(account) === 'off' && num(account.balance) >= 20000).sort((a, b) => num(b.balance) - num(a.balance))[0];
  if (idle && best && best.rate >= 0.02 && best.account.id !== idle.account_id && best.account.id !== idle.id) {
    const yearly = num(idle.balance) * 0.5 * best.rate * 0.8;
    out.push({ id: `idle-${idle.id}-${best.account.id}`, tone: 'tip', text: `${idle.name} holds ${peso(num(idle.balance))} earning no interest. Moving half to ${best.account.name} (${(best.rate * 100).toFixed(2)}% p.a.) would earn about ${peso(yearly)} a year after tax.`, action: { label: 'Open accounts', tab: 'accounts' } });
  } else if (!list.some(account => interestMode(account) !== 'off') && list.some(account => num(account.balance) >= 10000)) {
    out.push({ id: 'no-interest', tone: 'tip', text: 'None of your accounts earn interest yet. Digital banks pay 3% p.a. or more; add yours from the bank list to track it automatically.', action: { label: 'Add account', tab: 'accounts' } });
  }
  const cards = (data.accounts || []).filter(account => isCardAccount(account) && num(account.credit_limit) > 0);
  const used = cards.reduce((sum, account) => sum + Math.max(0, -num(account.balance)), 0);
  const limit = cards.reduce((sum, account) => sum + num(account.credit_limit), 0);
  if (limit > 0 && used / limit > 0.3) out.push({ id: `utilization-${Math.round(used / limit * 10)}`, tone: 'warn', text: `Your cards are ${Math.round(used / limit * 100)}% used. Keeping it under 30% looks better to lenders.`, action: { label: 'See cards', tab: 'accounts-card' } });
  const earning = list.filter(account => interestMode(account) !== 'off');
  if (out.length < 3 && earning.length) {
    const monthly = earning.reduce((sum, account) => sum + monthlyInterestEstimate(account, today), 0);
    if (monthly >= 1) out.push({ id: `interest-total-${today.slice(0, 7)}`, tone: 'good', text: `Your savings earn about ${peso(monthly)} a month in interest after tax.` });
  }
  return out;
}

function liabilities(data: SuggestionData, today: string): Suggestion[] {
  const out = billSuggestions(data, today);
  const loans = (data.liabilities || []).filter(item => num(item.remaining_amount) > 0 && num(item.amount) > 0);
  if (loans.length) {
    const months = Math.max(...loans.map(item => Math.ceil(num(item.remaining_amount) / num(item.amount))));
    const finish = new Date(`${today}T00:00:00`); finish.setMonth(finish.getMonth() + months);
    out.push({ id: `payoff-${months}`, tone: 'good', text: `At your current payments, you'll be clear of installments around ${finish.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}.` });
  }
  const manual = (data.liabilities || []).filter(item => item.is_recurring && !item.account_id && item.type !== 'Credits');
  if (manual.length) out.push({ id: `autopay-${manual.length}`, tone: 'tip', text: `${manual.length} recurring bill${manual.length === 1 ? ' isn’t' : 's aren’t'} linked to an account. Link ${manual.length === 1 ? 'it' : 'them'} so payments are recorded automatically.`, action: { label: 'Review bills', tab: 'liabilities' } });
  return out;
}

function plans(data: SuggestionData, today: string): Suggestion[] {
  const out: Suggestion[] = [];
  const paced = (data.goals || []).map(goal => ({ goal, pace: goalProgress(goal, data.accounts || [], today) }));
  const behind = paced.filter(entry => entry.pace.status === 'behind').sort((a, b) => b.pace.behindBy - a.pace.behindBy);
  if (behind[0]) out.push({ id: `behind-${behind[0].goal.id}`, tone: 'warn', text: `${behind[0].goal.name} is ${peso(behind[0].pace.behindBy)} behind. Saving ${peso(behind[0].pace.requiredMonthly / 4.345)} a week reaches it on time.`, action: { label: 'Open goal', tab: 'plans', goalId: behind[0].goal.id } });
  const noAutosave = behind.find(entry => !(num(entry.goal.autosave_amount) > 0));
  if (noAutosave) out.push({ id: `autosave-${noAutosave.goal.id}`, tone: 'tip', text: `Turn on auto-save for ${noAutosave.goal.name} (${peso(noAutosave.pace.requiredMonthly)} a month) so it keeps pace without you remembering.`, action: { label: 'Set auto-save', tab: 'plans', goalId: noAutosave.goal.id } });
  const close = paced.filter(entry => entry.pace.status !== 'complete' && entry.pace.percent >= 85).sort((a, b) => b.pace.percent - a.pace.percent)[0];
  if (close) out.push({ id: `close-${close.goal.id}`, tone: 'good', text: `${close.goal.name} is ${Math.round(close.pace.percent)}% there; ${peso(close.pace.remaining)} to go.`, action: { label: 'Open goal', tab: 'plans', goalId: close.goal.id } });
  // Fixed goal savings in an account that earns nothing, while another earns interest.
  const accountsList = data.accounts || [];
  // Accounts already counted in full toward a goal can't hold another goal's savings.
  const wholeIds = new Set((data.goals || []).flatMap(goal => parseList<any>(goal.sources).filter(source => source.mode === 'whole').map(source => Number(source.account_id))));
  const earning = accountsList.filter(account => !isCardAccount(account) && interestMode(account) !== 'off' && !wholeIds.has(Number(account.id))).sort((a, b) => num(b.interest_rate_pa) - num(a.interest_rate_pa))[0];
  if (earning && out.length < 3) {
    for (const { goal } of paced) {
      const idle = parseList<any>(goal.sources).find(source => source.mode !== 'whole' && num(source.amount) >= 5000 && interestMode(accountsList.find(account => account.id === source.account_id) || {}) === 'off');
      if (idle) { out.push({ id: `goal-interest-${goal.id}-${idle.account_id}`, tone: 'tip', text: `${peso(num(idle.amount))} for ${goal.name} sits in ${idle.name}, which earns no interest. Keeping it in ${earning.name} would grow the goal too.`, action: { label: 'Open goal', tab: 'plans', goalId: goal.id } }); break; }
    }
  }
  return out;
}

function investments(data: SuggestionData): Suggestion[] {
  const holdings = (data.portfolios || []).filter(item => num(item.current_value) > 0);
  const total = holdings.reduce((sum, item) => sum + num(item.current_value), 0);
  const out: Suggestion[] = [];
  const top = holdings.sort((a, b) => num(b.current_value) - num(a.current_value))[0];
  if (top && holdings.length > 1 && num(top.current_value) / total > 0.6) out.push({ id: `concentration-${top.id}`, tone: 'warn', text: `${top.name} is ${Math.round(num(top.current_value) / total * 100)}% of your portfolio. Spreading out lowers the hit if it drops.` });
  const losers = holdings.filter(item => num(item.invested) > 0 && num(item.current_value) < num(item.invested) * 0.8);
  if (losers.length) out.push({ id: `down-${losers.length}`, tone: 'tip', text: `${losers.length} holding${losers.length === 1 ? ' is' : 's are'} down more than 20%. Review whether ${losers.length === 1 ? 'it still fits' : 'they still fit'} your plan.` });
  const types = new Set(holdings.map(item => item.type));
  if (holdings.length >= 3 && types.size === 1) out.push({ id: `one-type-${[...types][0]}`, tone: 'tip', text: `Everything you hold is ${String([...types][0]).toLowerCase()}. Consider other asset types for balance.` });
  return out;
}

function calendar(data: SuggestionData, today: string): Suggestion[] {
  const out: Suggestion[] = [];
  const weekEnd = shiftDate(today, 7);
  const bills = (data.liabilities || []).filter(unpaid).map(item => ({ item, due: nextDue(item, today) })).filter(entry => entry.due && entry.due >= today && entry.due <= weekEnd);
  const total = bills.reduce((sum, entry) => sum + num(entry.item.amount), 0);
  if (bills.length >= 2) out.push({ id: `week-${today}`, tone: 'tip', text: `${bills.length} bills (${peso(total)}) land this week. Check that the paying accounts have enough.`, action: { label: 'See bills', tab: 'liabilities' } });
  const paydays = (data.incomeFlows || []).filter(flow => flow.is_recurring && isoDay(flow.date)).map(flow => ({ flow, date: isoDay(flow.date)! })).filter(entry => entry.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  if (paydays[0]) { const days = daysBetween(today, paydays[0].date); out.push({ id: `payday-${paydays[0].flow.id}-${paydays[0].date}`, tone: 'good', text: `Next income: ${paydays[0].flow.name} (${peso(num(paydays[0].flow.amount))}) ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}.` }); }
  return out;
}

function career(data: SuggestionData, today: string): Suggestion[] {
  const out: Suggestion[] = [];
  const profile = data.career || {};
  const current = num(profile.current_salary); const target = num(profile.target_salary);
  if (!profile.target_role) out.push({ id: 'no-target', tone: 'tip', text: 'Set a target role and salary to see the gap and what to work on next.' });
  else if (target > current && current > 0) out.push({ id: `gap-${current}-${target}`, tone: 'tip', text: `${profile.target_role} pays ${peso(target - current)} more a month (${Math.round((target / current - 1) * 100)}% raise). That's ${peso((target - current) * 13)} a year with 13th-month pay.` });
  const skills = parseList<any>(profile.skills_needed).map(skill => typeof skill === 'string' ? { name: skill, completed: false } : skill);
  const open = skills.filter(skill => !skill.completed);
  if (skills.length && open.length) out.push({ id: `skills-${open.length}`, tone: 'tip', text: `${open.length} of ${skills.length} skills still to learn. Next up: ${open[0].name || open[0].title || 'your first one'}.` });
  else if (!skills.length && profile.target_role) out.push({ id: 'no-skills', tone: 'tip', text: `List the skills ${profile.target_role} needs so you can track them.` });
  const overdue = (data.careerTasks || []).filter(task => task.status !== 'Done' && isoDay(task.due_date) && isoDay(task.due_date)! < today);
  if (overdue.length) out.push({ id: `tasks-${overdue.length}`, tone: 'warn', text: `${overdue.length} career task${overdue.length === 1 ? ' is' : 's are'} overdue.` });
  return out;
}

function business(data: SuggestionData): Suggestion[] {
  const out: Suggestion[] = [];
  const active = (data.businesses || []).filter(item => item.status !== 'Archived');
  const behind = active.filter(item => num(item.target) > 0 && num(item.mrr) < num(item.target) * 0.5);
  if (behind[0]) out.push({ id: `target-${behind[0].id}`, tone: 'tip', text: `${behind[0].name} is at ${Math.round(num(behind[0].mrr) / num(behind[0].target) * 100)}% of its monthly target. Focus on the records that bring in recurring value.` });
  const noTarget = active.filter(item => !(num(item.target) > 0));
  if (noTarget.length) out.push({ id: `no-target-${noTarget.length}`, tone: 'tip', text: `Set a monthly target for ${noTarget.length === 1 ? noTarget[0].name : `${noTarget.length} ventures`} to track progress.` });
  return out;
}

function freelancing(data: SuggestionData, today: string): Suggestion[] {
  const out: Suggestion[] = [];
  const invoices = data.invoices || [];
  const overdue = invoices.filter(invoice => !/paid/i.test(String(invoice.status)) && invoice.status !== 'Draft' && isoDay(invoice.due_date) && isoDay(invoice.due_date)! < today);
  if (overdue.length) out.push({ id: `overdue-inv-${overdue.length}`, tone: 'warn', text: `${overdue.length} invoice${overdue.length === 1 ? ' is' : 's are'} overdue (${peso(overdue.reduce((sum, invoice) => sum + num(invoice.amount), 0))}). Send a reminder.`, action: { label: 'Open invoices', tab: 'freelance-invoices' } });
  const drafts = invoices.filter(invoice => invoice.status === 'Draft');
  if (drafts.length) out.push({ id: `drafts-${drafts.length}`, tone: 'tip', text: `${drafts.length} draft invoice${drafts.length === 1 ? '' : 's'} (${peso(drafts.reduce((sum, invoice) => sum + num(invoice.amount), 0))}) not sent yet.`, action: { label: 'Open invoices', tab: 'freelance-invoices' } });
  const monthStart = `${today.slice(0, 7)}-01`;
  const hours = (data.timeLogs || []).filter(log => String(log.date) >= monthStart).reduce((sum, log) => sum + num(log.seconds) / 3600, 0);
  const rate = (data.services || []).filter(service => num(service.rate) > 0).map(service => num(service.rate));
  if (hours >= 1 && rate.length) out.push({ id: `hours-${today.slice(0, 7)}-${Math.round(hours)}`, tone: 'good', text: `${hours.toFixed(1)} hours logged this month, worth about ${peso(hours * (rate.reduce((a, b) => a + b, 0) / rate.length))} at your average rate. Make sure it's invoiced.`, action: { label: 'Invoice clients', tab: 'freelance-invoices' } });
  return out;
}

export function suggestionsFor(page: SuggestionPage, data: SuggestionData, today = localDate()): Suggestion[] {
  const make = { home, accounts, liabilities, plans, investments, calendar, career, business, freelancing }[page];
  try { return make(data, today).slice(0, 3); } catch { return []; }
}

/** Generic facts behind the suggestions, with no names or amounts, for the optional Gemini tip. */
const GENERIC_FACTS: [string, string][] = [
  ['overdue-inv', 'Some client invoices are overdue.'], ['overdue', 'Some bills are past due.'], ['soon', 'Bills are due within three days.'],
  ['jump', 'Spending in one category is up sharply versus last month.'], ['low', 'Bills due in two weeks exceed cash on hand.'],
  ['goal-behind', 'A savings goal is behind pace.'], ['behind', 'A savings goal is behind pace.'], ['autosave', 'A goal that is behind has no automatic saving.'],
  ['close', 'A savings goal is over 85% complete.'], ['goal-interest', 'Goal savings sit in an account that earns no interest.'],
  ['interest-due', 'Bank interest is due to be recorded.'], ['interest-total', 'Savings accounts are earning interest.'], ['boost', 'A promotional interest rate ends soon.'],
  ['idle', 'Idle cash earns no interest while another account earns over 2% a year.'], ['no-interest', 'No account earns interest yet.'],
  ['utilization', 'Credit card utilization is above 30%.'], ['payoff', 'Installment loans are being paid down.'], ['autopay', 'Some recurring bills are not linked to an account.'],
  ['concentration', 'One holding is over 60% of the investment portfolio.'], ['down', 'Some investments are down over 20%.'], ['one-type', 'All investments are one asset type.'],
  ['week', 'Several bills land this week.'], ['payday', 'Income is arriving soon.'], ['gap', 'The target role pays more than the current one.'],
  ['no-target', 'No career target is set.'], ['skills', 'Some skills for the target role are still to learn.'], ['no-skills', 'No skills are listed for the target role.'],
  ['tasks', 'Some career tasks are overdue.'], ['target', 'A business is under half its monthly target.'], ['drafts', 'Some invoices are drafts not yet sent.'],
  ['hours', 'Billable hours were logged this month.'],
];
export function genericFacts(suggestions: Suggestion[]) {
  return [...new Set(suggestions.map(suggestion => GENERIC_FACTS.find(([prefix]) => suggestion.id === prefix || suggestion.id.startsWith(prefix + '-'))?.[1]).filter(Boolean) as string[])];
}
