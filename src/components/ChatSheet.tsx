import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, X } from 'lucide-react';
import { useStore } from '../store/useStore';

export function ChatSheet({ isOpen, onClose }: any) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let systemLogs: string[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\\n\\n').filter(Boolean);
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'log') {
                systemLogs.push(data.message);
                // We can show logs inline or just update a status
              } else if (data.type === 'done') {
                setMessages(prev => [...prev, { role: 'agent', text: data.data.text, logs: systemLogs }]);
                if (data.data.requires_refresh) {
                  triggerRefresh();
                }
              }
            } catch(e) {}
          }
        }
      }
    } catch(e) {
      setMessages(prev => [...prev, { role: 'agent', text: "Sorry, I encountered an error." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleMicClick = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in this browser.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + ' ' + transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
    };

    recognition.start();
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
              <h2 className="font-bold text-lg">FinGent AI</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-slate-500 dark:text-slate-400 mt-10">
                  <BotIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>How can I help you manage your wealth today?</p>
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
                  {m.logs && m.logs.length > 0 && (
                    <div className="mt-2 text-xs font-mono text-slate-400">
                      {m.logs.map((l: string, idx: number) => <div key={idx}>{l}</div>)}
                    </div>
                  )}
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
                <button onClick={handleMicClick} className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-500">
                  <Mic size={20} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Ask FinGent..."
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

function BotIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}
