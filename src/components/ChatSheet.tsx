import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, LockKeyhole, Send, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { runLocalCopilot, type CopilotAction } from '../lib/localCopilot';

export function ChatSheet({ isOpen, onClose, onNavigate }: { isOpen: boolean; onClose: () => void; onNavigate: (tab: string) => void }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const { themeMode } = useStore();
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

    window.setTimeout(() => {
      const reply = runLocalCopilot(userMsg);
      setMessages(prev => [...prev, { role: 'agent', text: reply.text, actions: reply.actions }]);
      if (reply.navigateNow) { onNavigate(reply.navigateNow); onClose(); }
      setIsTyping(false);
    }, 220);
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
              <div><h2 className="font-bold text-lg">FinGent Copilot</h2><p className="mt-0.5 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><LockKeyhole size={12} /> Local only · no financial data access</p></div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-slate-500 dark:text-slate-400 mt-10">
                  <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>I can guide you around FinGent without reading your financial records.</p>
                  <p className="mt-2 text-xs">Try “open career” or “where do I create an invoice?”</p>
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
                  placeholder="Ask for guidance, not data..."
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
