import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, LockKeyhole, Send, Trash2, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { runLocalCopilot, type CopilotAction, type InvestmentDraft, type OperationDraft, type TransactionDraft, type TransferDraft } from '../lib/localCopilot';
import { getByokGuidance, shouldUseByokGuidance } from '../lib/byokAssistant';

export function ChatSheet({ isOpen, onClose, onNavigate }: { isOpen: boolean; onClose: () => void; onNavigate: (tab: string) => void }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const { themeMode, triggerRefresh } = useStore();
  const isAdvanced = themeMode === 'advanced';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    window.setTimeout(async () => {
      const reply = runLocalCopilot(userMsg);
      const accountOptions = reply.transaction ? await getAccountOptions(reply.transaction.accountHint) : undefined;
      const byokGuidance = shouldUseByokGuidance(reply) ? await getByokGuidance(reply).catch(() => null) : null;
      setMessages(prev => [...prev, { role: 'agent', text: reply.text, actions: reply.actions, transaction: reply.transaction, operation: reply.operation, investment: reply.investment, transfer: reply.transfer, accountOptions, byokGuidance }]);
      if (reply.navigateNow) { onNavigate(reply.navigateNow); onClose(); }
      setIsTyping(false);
    }, 220);
  };

  const saveTransaction = async (draft: TransactionDraft, account: AccountOption) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: account.id,
          type: draft.type,
          amount: draft.amount,
          category: draft.category,
          description: draft.description || 'Added through FinGent Copilot',
          notes: 'Added locally through FinGent Copilot after user confirmation.',
          date: draft.date
        })
      });
      if (!response.ok) throw new Error('Unable to save the transaction.');
      setMessages(prev => [...prev, { role: 'agent', text: 'Saved locally: ' + draft.type + ' in ' + account.name + '. Your dashboard and categories have been updated.' }]);
      triggerRefresh();
    } catch (error) {
      setMessages(prev => [...prev, { role: 'agent', text: error instanceof Error ? error.message : 'Unable to save the transaction.' }]);
    }
  };

  const saveOperation = async (operation: OperationDraft) => {
    const endpoint = {
      account: '/api/accounts',
      liability: '/api/liabilities',
      'income-flow': '/api/income_flows',
      'calendar-event': '/api/calendar_events',
      'career-task': '/api/career/tasks',
      note: '/api/personal/notes',
      routine: '/api/personal/routines',
      category: '/api/categories',
      goal: '/api/goals',
      budget: '/api/budgets'
    }[operation.kind];
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(operation.payload) });
      if (!response.ok) throw new Error('Unable to save this ' + operation.kind.replace('-', ' ') + '.');
      setMessages(prev => [...prev, { role: 'agent', text: 'Saved locally: ' + operation.label + '.' }]);
      triggerRefresh();
    } catch (error) {
      setMessages(prev => [...prev, { role: 'agent', text: error instanceof Error ? error.message : 'Unable to save this action.' }]);
    }
  };

  const saveInvestment = async (investment: InvestmentDraft) => {
    try {
      const response = await fetch('/api/copilot/investments/buy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(investment) });
      if (!response.ok) throw new Error('Unable to save this investment.');
      const saved = await response.json();
      const shareText = saved.shares ? ' Recorded ' + Number(saved.shares).toLocaleString(undefined, { maximumFractionDigits: 6 }) + ' shares at ' + Number(saved.price).toLocaleString(undefined, { maximumFractionDigits: 4 }) + ' USD.' : '';
      setMessages(prev => [...prev, { role: 'agent', text: 'Saved locally: ' + investment.ticker + (saved.created ? ' was added to Investments' : ' was added to the existing position') + ' on ' + investment.date + '.' + shareText }]);
      triggerRefresh();
    } catch (error) {
      setMessages(prev => [...prev, { role: 'agent', text: error instanceof Error ? error.message : 'Unable to save this investment.' }]);
    }
  };

  const saveTransfer = async (transfer: TransferDraft) => {
    try {
      const response = await fetch('/api/copilot/transfers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(transfer) });
      const saved = await response.json();
      if (!response.ok) throw new Error(saved.error || 'Unable to save this transfer.');
      setMessages(prev => [...prev, { role: 'agent', text: 'Saved locally: transfer from ' + saved.from + ' to ' + saved.to + ' on ' + transfer.date + '.' }]);
      triggerRefresh();
    } catch (error) {
      setMessages(prev => [...prev, { role: 'agent', text: error instanceof Error ? error.message : 'Unable to save this transfer.' }]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed bottom-0 left-0 right-0 h-[80vh] rounded-t-3xl md:w-[400px] md:right-8 md:bottom-28 md:left-auto md:rounded-3xl md:h-[600px] md:shadow-2xl z-50 flex flex-col ${
              isAdvanced ? 'bg-slate-900 border-t md:border border-slate-700 text-white' : 'bg-white border-t md:border border-slate-200 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div><h2 className="font-bold text-lg">FinGent Copilot</h2><p className="mt-0.5 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><LockKeyhole size={12} /> Chats stay local · BYOK never receives chat text</p></div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && <button onClick={() => setMessages([])} aria-label="Clear local chat" title="Clear local chat" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><Trash2 size={18} /></button>}
                <button onClick={onClose} aria-label="Close copilot" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-slate-500 dark:text-slate-400 mt-10">
                  <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>I can guide you and prepare local actions without sending your chat or records anywhere.</p>
                  <p className="mt-2 text-xs">Try “I spent 500 on groceries, cash” or “open career”.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl p-3 ${
                    m.role === 'user' 
                      ? (isAdvanced ? 'bg-violet-600 text-white' : 'bg-emerald-500 text-white')
                      : (isAdvanced ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800')
                  }`}>
                    {m.text}
                  </div>
                  {m.actions?.length > 0 && <div className="mt-2 flex max-w-[95%] flex-wrap gap-2">{m.actions.map((action: CopilotAction) => <button key={action.tab} onClick={() => { onNavigate(action.tab); onClose(); }} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${isAdvanced ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}>{action.label}</button>)}</div>}
                  {m.byokGuidance && <div className={`mt-2 max-w-[95%] rounded-xl border p-3 text-sm ${isAdvanced ? 'border-violet-500/30 bg-violet-500/10 text-violet-100' : 'border-violet-200 bg-violet-50 text-violet-950'}`}><p className="text-[11px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-300">BYOK guidance · generic intent only, no chat shared</p><p className="mt-1 whitespace-pre-wrap">{m.byokGuidance}</p></div>}
                  {m.transaction && <div className={`mt-3 max-w-[95%] rounded-xl border p-3 text-left ${isAdvanced ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50'}`}><p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Private action draft</p><p className="mt-1 text-sm font-bold">{m.transaction.type === 'expense' ? 'Expense' : 'Income'} · PHP {m.transaction.amount.toLocaleString()} · {m.transaction.category}</p><p className="mt-1 text-xs text-slate-500">Date: {m.transaction.date} · External-AI-safe envelope: {m.transaction.redactedCommand}</p>{m.accountOptions?.length ? <div className="mt-3 flex flex-wrap gap-2">{m.accountOptions.map(account => <button key={account.id} onClick={() => saveTransaction(m.transaction!, account)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">Save with {account.name}</button>)}</div> : <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">No matching local account was found. Add or select an account in Accounts first.</p>}</div>}
                  {m.operation && <div className={`mt-3 max-w-[95%] rounded-xl border p-3 text-left ${isAdvanced ? 'border-violet-500/30 bg-violet-500/10' : 'border-violet-200 bg-violet-50'}`}><p className="text-xs font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">Private action draft</p><p className="mt-1 text-sm font-bold">{m.operation.label}</p><p className="mt-1 text-xs text-slate-500">External-AI-safe envelope: {m.operation.redactedCommand}</p><button onClick={() => saveOperation(m.operation!)} className="mt-3 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700">Save locally</button></div>}
                  {m.investment && <div className={`mt-3 max-w-[95%] rounded-xl border p-3 text-left ${isAdvanced ? 'border-sky-500/30 bg-sky-500/10' : 'border-sky-200 bg-sky-50'}`}><p className="text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-300">Private investment draft</p><p className="mt-1 text-sm font-bold">{m.investment.ticker} · {m.investment.type} · USD {m.investment.invested.toLocaleString()}</p><p className="mt-1 text-xs text-slate-500">{m.investment.shares ? m.investment.shares + ' shares' : 'Share count will be auto-calculated from the current price when saved.'} Date: {m.investment.date}</p><p className="mt-1 text-xs text-slate-500">External-AI-safe envelope: {m.investment.redactedCommand}</p><button onClick={() => saveInvestment(m.investment!)} className="mt-3 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-700">Save investment locally</button></div>}
                  {m.transfer && <div className={`mt-3 max-w-[95%] rounded-xl border p-3 text-left ${isAdvanced ? 'border-amber-500/30 bg-amber-500/10' : 'border-amber-200 bg-amber-50'}`}><p className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Private transfer draft</p><p className="mt-1 text-sm font-bold">PHP {m.transfer.amount.toLocaleString()} · {m.transfer.fromHint} to {m.transfer.toHint}</p><p className="mt-1 text-xs text-slate-500">Date: {m.transfer.date} · External-AI-safe envelope: {m.transfer.redactedCommand}</p><button onClick={() => saveTransfer(m.transfer!)} className="mt-3 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700">Save transfer locally</button></div>}
                </div>
              ))}
              {isTyping && (
                <div className="flex items-center space-x-2 text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-75" />
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-150" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={`p-4 border-t ${isAdvanced ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="e.g. I spent 500 on groceries, cash"
                  className={`flex-1 rounded-full px-4 py-3 outline-none ${
                    isAdvanced ? 'bg-slate-800 text-white placeholder-slate-400' : 'bg-slate-100 text-slate-900 placeholder-slate-500'
                  }`}
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className={`p-3 rounded-full ${
                    isAdvanced ? 'bg-violet-600 text-white' : 'bg-emerald-500 text-white'
                  } disabled:opacity-50`}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

type AccountOption = { id: number; name: string };
type ChatMessage = { role: 'user' | 'agent'; text: string; actions?: CopilotAction[]; transaction?: TransactionDraft; operation?: OperationDraft; investment?: InvestmentDraft; transfer?: TransferDraft; accountOptions?: AccountOption[]; byokGuidance?: string | null };

async function getAccountOptions(hint: string): Promise<AccountOption[]> {
  try {
    const response = await fetch('/api/copilot/accounts');
    if (!response.ok) return [];
    const accounts = await response.json() as AccountOption[];
    const normalizedHint = hint.toLowerCase().trim();
    if (!normalizedHint) return accounts.slice(0, 5);
    const exact = accounts.filter(account => account.name.toLowerCase() === normalizedHint);
    if (exact.length) return exact;
    return accounts.filter(account => account.name.toLowerCase().includes(normalizedHint) || normalizedHint.includes(account.name.toLowerCase())).slice(0, 5);
  } catch {
    return [];
  }
}
