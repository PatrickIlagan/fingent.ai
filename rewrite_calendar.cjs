const fs = require('fs');

const content = `import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ChevronLeft, ChevronRight, Zap, Droplet, ArrowDownToLine, ArrowUpRight, ArrowDownRight, X, Calendar as CalendarIcon, Wallet, Plus, StickyNote, Filter, Pin } from 'lucide-react';

export function Calendar() {
  const { themeMode } = useStore();
  const isAdvanced = themeMode === 'advanced';

  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // Default to July 2026
  const [events, setEvents] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('all');
  
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [newNote, setNewNote] = useState({ name: '', date: '', type: 'note', amount: '' });

  const fetchEvents = async () => {
    try {
      const [liabilitiesRes, accountsRes, calendarEventsRes] = await Promise.all([
        fetch('/api/liabilities'),
        fetch('/api/accounts'),
        fetch('/api/calendar_events')
      ]);
      const [liabilities, accounts, calendarEvents] = await Promise.all([
        liabilitiesRes.json(),
        accountsRes.json(),
        calendarEventsRes.json()
      ]);

      const formattedEvents: any[] = [];
      
      liabilities.forEach((d: any) => {
         let dateStr = '2026-07-15';
         if (d.date && d.date.includes('th')) {
            const day = d.date.split('th')[0];
            dateStr = \`2026-07-\${day.padStart(2, '0')}\`;
         }
         formattedEvents.push({
           id: \`l-\${d.id}\`,
           date: dateStr,
           type: 'bill',
           name: d.name,
           amount: d.amount,
           icon: d.type === 'Bills' ? Zap : d.type === 'Debts' ? Wallet : Droplet,
           color: d.type === 'Bills' ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/20' : 'text-rose-500 bg-rose-50 dark:bg-rose-500/20',
           provider: d.provider || d.merchant || 'Unknown'
         });
      });

      accounts.forEach((acc: any) => {
        if (acc.transactions) {
          try {
            const txs = typeof acc.transactions === 'string' ? JSON.parse(acc.transactions) : acc.transactions;
            txs.forEach((tx: any) => {
               formattedEvents.push({
                 id: \`t-\${tx.id}\`,
                 date: tx.date.split('T')[0],
                 type: tx.type === 'income' ? 'inflow' : 'transaction',
                 name: tx.title || tx.description || 'Transaction',
                 amount: tx.amount,
                 icon: tx.type === 'income' ? ArrowDownRight : ArrowUpRight,
                 color: tx.type === 'income' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/20' : 'text-slate-500 bg-slate-50 dark:bg-slate-500/20',
                 source: acc.name
               });
            });
          } catch(e) {}
        }
      });

      calendarEvents.forEach((ce: any) => {
        formattedEvents.push({
          id: \`c-\${ce.id}\`,
          date: ce.date,
          type: ce.type,
          name: ce.name,
          amount: ce.amount || 0,
          icon: ce.type === 'pin' ? Pin : StickyNote,
          color: ce.type === 'pin' ? 'text-violet-500 bg-violet-50 dark:bg-violet-500/20' : 'text-blue-500 bg-blue-50 dark:bg-blue-500/20'
        });
      });

      setEvents(formattedEvents);
    } catch(err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const handleAddNote = async () => {
    if (!newNote.name || !newNote.date) return;
    try {
      await fetch('/api/calendar_events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote)
      });
      setIsAddNoteOpen(false);
      setNewNote({ name: '', date: '', type: 'note', amount: '' });
      fetchEvents();
    } catch(err) { console.error(err); }
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const getEventsForDay = (day: number) => {
    const dateStr = \`\${year}-\${String(month + 1).padStart(2, '0')}-\${String(day).padStart(2, '0')}\`;
    let dayEvents = events.filter(e => e.date === dateStr);
    if (filter !== 'all') {
      if (filter === 'transactions') dayEvents = dayEvents.filter(e => e.type === 'transaction' || e.type === 'inflow');
      else if (filter === 'bills') dayEvents = dayEvents.filter(e => e.type === 'bill');
      else if (filter === 'notes') dayEvents = dayEvents.filter(e => e.type === 'note' || e.type === 'pin');
    }
    return dayEvents;
  };

  let filteredUpcoming = events.filter(e => {
    const eventDate = new Date(e.date);
    return eventDate >= new Date(year, month, 1) && eventDate <= new Date(year, month, daysInMonth);
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (filter !== 'all') {
     if (filter === 'transactions') filteredUpcoming = filteredUpcoming.filter(e => e.type === 'transaction' || e.type === 'inflow');
     else if (filter === 'bills') filteredUpcoming = filteredUpcoming.filter(e => e.type === 'bill');
     else if (filter === 'notes') filteredUpcoming = filteredUpcoming.filter(e => e.type === 'note' || e.type === 'pin');
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CalendarIcon size={24} /> Calendar
        </h2>
        
        <div className="flex gap-2 flex-wrap">
          <div className={\`flex rounded-xl p-1 text-sm font-bold \${isAdvanced ? 'bg-slate-900' : 'bg-slate-100'}\`}>
             {['all', 'bills', 'transactions', 'notes'].map(f => (
               <button 
                 key={f}
                 onClick={() => setFilter(f)}
                 className={\`px-3 py-1.5 rounded-lg transition-colors capitalize \${filter === f ? (isAdvanced ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-500'}\`}
               >
                 {f}
               </button>
             ))}
          </div>
          <button 
            onClick={() => setIsAddNoteOpen(true)}
            className={\`px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2 \${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}\`}
          >
            <Plus size={16} /> Add Note
          </button>
        </div>
      </div>

      <div className={\`rounded-3xl p-4 sm:p-6 shadow-sm border \${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}\`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <select 
              value={month} 
              onChange={(e) => setCurrentDate(new Date(year, parseInt(e.target.value), 1))}
              className={\`text-xl font-bold bg-transparent outline-none cursor-pointer appearance-none \${isAdvanced ? 'text-white' : 'text-slate-800'}\`}
            >
              {monthNames.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select 
              value={year}
              onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), month, 1))}
              className={\`text-xl font-bold bg-transparent outline-none cursor-pointer appearance-none \${isAdvanced ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'}\`}
            >
              {Array.from({ length: 10 }).map((_, i) => {
                const y = 2024 + i;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={prevMonth} className={\`p-2 rounded-xl transition-colors \${isAdvanced ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}\`}>
              <ChevronLeft size={20} />
            </button>
            <button onClick={nextMonth} className={\`p-2 rounded-xl transition-colors \${isAdvanced ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}\`}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-sm mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="font-bold text-slate-400 py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day, i) => {
            if (day === null) {
              return <div key={\`empty-\${i}\`} className="p-2 md:p-4 rounded-xl opacity-0"></div>;
            }

            const dayEvents = getEventsForDay(day);
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

            return (
              <div 
                key={day} 
                className={\`min-h-[80px] p-2 md:p-3 rounded-xl border flex flex-col transition-colors \${
                  isToday 
                    ? (isAdvanced ? 'border-violet-500 bg-violet-500/10' : 'border-emerald-500 bg-emerald-50') 
                    : (isAdvanced ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-100 hover:bg-slate-50')
                }\`}
              >
                <span className={\`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full \${isToday ? (isAdvanced ? 'bg-violet-500 text-white' : 'bg-emerald-500 text-white') : ''}\`}>
                  {day}
                </span>
                
                <div className="mt-1 flex flex-col gap-1 flex-1">
                  {dayEvents.map(ev => (
                    <div 
                      key={ev.id} 
                      onClick={() => setSelectedEvent(ev)}
                      className={\`text-[10px] sm:text-xs px-1.5 py-1 rounded-md cursor-pointer truncate font-medium flex items-center gap-1 \${ev.color}\`}
                    >
                      <ev.icon size={10} className="shrink-0" />
                      <span className="truncate hidden md:inline">{ev.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <CalendarIcon size={18} /> Upcoming This Month
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredUpcoming.map((ev) => (
            <div 
              key={ev.id} 
              onClick={() => setSelectedEvent(ev)}
              className={\`rounded-2xl p-4 shadow-sm border cursor-pointer transition-transform hover:-translate-y-1 \${isAdvanced ? 'bg-slate-800 border-slate-700 hover:border-violet-500' : 'bg-white border-slate-100 hover:border-emerald-300'}\`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className={\`w-10 h-10 rounded-xl flex items-center justify-center \${ev.color}\`}>
                  <ev.icon size={20} />
                </div>
                <span className={\`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-lg \${ev.color}\`}>
                  {ev.type}
                </span>
              </div>
              <p className="font-bold">{ev.name}</p>
              <div className="flex justify-between items-end mt-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">{ev.date}</p>
                {ev.amount ? (
                  <p className={\`font-bold \${ev.type === 'inflow' ? 'text-emerald-500' : ev.type === 'transaction' ? 'text-slate-500' : 'text-rose-500'}\`}>
                    {ev.type === 'inflow' ? '+' : ev.type === 'transaction' ? '-' : ''}₱{ev.amount.toLocaleString()}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
          {filteredUpcoming.length === 0 && (
             <div className="col-span-full p-8 text-center text-slate-500 border border-dashed rounded-3xl border-slate-300 dark:border-slate-700">
               No events for this month.
             </div>
          )}
        </div>
      </div>

      {isAddNoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAddNoteOpen(false)}>
          <div 
            className={\`w-full max-w-sm rounded-3xl shadow-xl flex flex-col p-6 \${isAdvanced ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-white border border-slate-100'}\`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Add Note or Pin</h3>
              <button onClick={() => setIsAddNoteOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Type</label>
                  <select 
                    value={newNote.type}
                    onChange={(e) => setNewNote({ ...newNote, type: e.target.value })}
                    className={\`w-full px-4 py-3 rounded-xl text-sm outline-none font-medium appearance-none \${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}\`} 
                  >
                    <option value="note">Note</option>
                    <option value="pin">Pin (Highlight)</option>
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Name/Description</label>
                  <input 
                    type="text" 
                    value={newNote.name}
                    onChange={(e) => setNewNote({ ...newNote, name: e.target.value })}
                    className={\`w-full px-4 py-3 rounded-xl text-sm outline-none font-medium \${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}\`} 
                    placeholder="e.g. Pay Car Insurance" 
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Date</label>
                  <input 
                    type="date" 
                    value={newNote.date}
                    onChange={(e) => setNewNote({ ...newNote, date: e.target.value })}
                    className={\`w-full px-4 py-3 rounded-xl text-sm outline-none font-medium \${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}\`} 
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Amount (Optional)</label>
                  <input 
                    type="number" 
                    value={newNote.amount}
                    onChange={(e) => setNewNote({ ...newNote, amount: e.target.value })}
                    className={\`w-full px-4 py-3 rounded-xl text-sm outline-none font-medium \${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}\`} 
                    placeholder="₱0.00" 
                  />
               </div>
            </div>

            <button 
              onClick={handleAddNote}
              disabled={!newNote.name || !newNote.date}
              className={\`w-full mt-8 py-4 rounded-xl font-bold transition-transform shadow-lg hover:scale-105 \${
                (!newNote.name || !newNote.date) 
                ? 'opacity-50 cursor-not-allowed bg-slate-300 text-slate-500' 
                : (isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white')
              }\`}
            >
              Add to Calendar
            </button>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
          <div 
            className={\`w-full max-w-sm rounded-3xl shadow-xl flex flex-col p-6 overflow-hidden \${isAdvanced ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-white border border-slate-100'}\`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className={\`w-14 h-14 rounded-2xl flex items-center justify-center \${selectedEvent.color}\`}>
                  <selectedEvent.icon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedEvent.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{selectedEvent.type}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
            </div>
            
            {selectedEvent.amount ? (
              <div className={\`p-6 rounded-2xl mb-6 text-center \${isAdvanced ? 'bg-slate-900' : 'bg-slate-50'}\`}>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {selectedEvent.type === 'inflow' ? 'Expected Amount' : selectedEvent.type === 'transaction' ? 'Transaction Amount' : 'Amount'}
                </p>
                <h1 className={\`text-4xl font-extrabold tracking-tight \${selectedEvent.type === 'inflow' ? 'text-emerald-500' : selectedEvent.type === 'transaction' ? 'text-slate-700 dark:text-slate-300' : 'text-rose-500'}\`}>
                  ₱{selectedEvent.amount.toLocaleString()}
                </h1>
              </div>
            ) : null}

            <div className="space-y-4 mb-6">
              <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Date</span>
                <span className="font-medium">{selectedEvent.date}</span>
              </div>
              {selectedEvent.provider && (
                <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">Provider</span>
                  <span className="font-medium">{selectedEvent.provider}</span>
                </div>
              )}
              {selectedEvent.source && (
                <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">Source</span>
                  <span className="font-medium">{selectedEvent.source}</span>
                </div>
              )}
            </div>

            <button 
              onClick={() => setSelectedEvent(null)}
              className={\`w-full py-4 rounded-xl font-bold transition-colors \${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}\`}
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
`

fs.writeFileSync('src/pages/Calendar.tsx', content);
console.log('Calendar written');
