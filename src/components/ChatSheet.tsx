import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, LockKeyhole, Send, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { runLocalCopilot, type CopilotAction, type TransactionDraft } from '../lib/localCopilot';

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
      setMessages(prev => [...prev, { role: 'agent', text: reply.text, actions: reply.actions, transaction: reply.transaction, accountOptions }]);
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
          date: new Date().toISOString()
        })
      });
      if (!response.ok) throw new Error('Unable to save the transaction.');
      setMessages(prev => [...prev, { role: 'agent', text: 'Saved locally: ' + draft.type + ' in ' + account.name + '. Your dashboard and categories have been updated.' }]);
      triggerRefresh();
    } catch (error) {
      setMessages(prev => [...prev, { role: 'agent', text: error instanceof Error ? error.message : 'Unable to save the transaction.' }]);
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
              <div><h2 className="font-bold text-lg">FinGent Copilot</h2><p className="mt-0.5 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><LockKeyhole size={12} /> Local processing · no external AI</p></div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-slate-500 dark:text-slate-400 mt-10">
                  <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>I can guide you and prepare local actions without sending your records anywhere.</p>
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
                  {m.transaction && <div className={`mt-3 max-w-[95%] rounded-xl border p-3 text-left ${isAdvanced ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50'}`}><p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Private action draft</p><p className="mt-1 text-sm font-bold">{m.transaction.type === 'expense' ? 'Expense' : 'Income'} · PHP {m.transaction.amount.toLocaleString()} · {m.transaction.category}</p><p className="mt-1 text-xs text-slate-500">External-AI-safe envelope: {m.transaction.redactedCommand}</p>{m.accountOptions?.length ? <div className="mt-3 flex flex-wrap gap-2">{m.accountOptions.map(account => <button key={account.id} onClick={() => saveTransaction(m.transaction!, account)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">Save with {account.name}</button>)}</div> : <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">No matching local account was found. Add or select an account in Accounts first.</p>}</div>}
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
type ChatMessage = { role: 'user' | 'agent'; text: string; actions?: CopilotAction[]; transaction?: TransactionDraft; accountOptions?: AccountOption[] };

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
