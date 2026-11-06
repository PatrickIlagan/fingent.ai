import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ChevronLeft, ChevronRight, Zap, Droplet, ArrowDownToLine, ArrowUpRight, ArrowDownRight, X, Calendar as CalendarIcon, Wallet, Plus, StickyNote, Filter, Pin, Target, PiggyBank } from 'lucide-react';
import { GoalBuilder } from '../components/GoalBuilder';
import { celebrate } from '../components/Celebrations';

export function Calendar({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { themeMode, setFocusGoalId } = useStore();
  const isAdvanced = themeMode === 'advanced';

  const [currentDate, setCurrentDate] = useState(() => { const today = new Date(); return new Date(today.getFullYear(), today.getMonth(), 1); });
  const [accountList, setAccountList] = useState<any[]>([]);
  const [dayMenu, setDayMenu] = useState<string | null>(null);
  const [goalDate, setGoalDate] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('all');
  
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [newNote, setNewNote] = useState({ name: '', date: '', type: 'note', amount: '' });

  const fetchEvents = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      
      const [liabilities, accounts, calendarEvents, incomeFlows, transactions, goals] = await Promise.all(
        ['/api/liabilities', '/api/accounts', '/api/calendar_events', '/api/income_flows', '/api/transactions', '/api/goals'].map(path => fetch(path).then(response => response.json()).catch(() => []))
      );
      setAccountList(Array.isArray(accounts) ? accounts : []);

      const formattedEvents: any[] = [];
      
      (Array.isArray(liabilities) ? liabilities : []).forEach((d: any) => {
         let dateStr = `${year}-${month}-15`;
         
         if (d.date) {
            if (d.date.includes('-')) {
               // It's a YYYY-MM-DD format
               if (d.is_recurring) {
                  // Only take the day part for recurring
                  const day = d.date.split('-')[2];
                  dateStr = `${year}-${month}-${day}`;
               } else {
                  // Specific date
                  dateStr = d.date;
               }
            } else {
               let dayStr = '15';
               if (d.date.includes('th')) dayStr = d.date.split('th')[0];
               else if (d.date.includes('st')) dayStr = d.date.split('st')[0];
               else if (d.date.includes('nd')) dayStr = d.date.split('nd')[0];
               else if (d.date.includes('rd')) dayStr = d.date.split('rd')[0];
               else if (!isNaN(parseInt(d.date))) dayStr = d.date;
               
               dateStr = `${year}-${month}-${dayStr.padStart(2, '0')}`;
            }
         }
         formattedEvents.push({
           id: `l-${d.id}`,
           date: dateStr,
           type: 'bill',
           name: d.name,
           amount: d.amount,
           icon: d.type === 'Bills' ? Zap : d.type === 'Debts' ? Wallet : Droplet,
           color: d.type === 'Bills' ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/20' : 'text-rose-500 bg-rose-50 dark:bg-rose-500/20',
           provider: d.provider || d.merchant || 'Unknown'
         });
      });
      
      // A recurring flow's first occurrence is already a saved calendar entry.
      const savedIncome = new Set((Array.isArray(calendarEvents) ? calendarEvents : []).filter((event: any) => event.source === 'income_flow').map((event: any) => `${event.name}|${event.date}`));
      (Array.isArray(incomeFlows) ? incomeFlows : []).forEach((flow: any) => {
         if (flow.is_recurring) {
            const day = String(flow.date).includes('-') ? String(flow.date).split('-')[2] : String(flow.date).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            if (savedIncome.has(`${flow.name}|${dateStr}`)) return;
            formattedEvents.push({
              id: `inc-${flow.id}`,
              date: dateStr,
              type: 'inflow',
              name: flow.name,
              amount: flow.amount,
              icon: ArrowDownToLine,
              color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/20',
              provider: 'Income Flow'
            });
         }
      });

      (Array.isArray(accounts) ? accounts : []).forEach((acc: any) => {
        if (acc.type === 'Card' && acc.statement_date && acc.due_date) {
            let stmtDay = acc.statement_date.toString();
            if (stmtDay.includes('-')) stmtDay = stmtDay.split('-')[2];
            
            let dueDay = acc.due_date.toString();
            if (dueDay.includes('-')) dueDay = dueDay.split('-')[2];

            // Calculate statement balance: transactions up to the next statement date
            let stmtDateString = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${stmtDay.padStart(2, '0')}`;
            const stmtDateObj = new Date(stmtDateString);
            
            let txAfter = 0;
            (acc.transactions || []).forEach((tx: any) => {
               if (new Date(tx.date) > stmtDateObj) {
                  txAfter += (tx.type === 'income' ? tx.amount : -tx.amount);
               }
            });
            
            const balanceAsOfStmt = acc.balance - txAfter;
            const amountOwed = balanceAsOfStmt < 0 ? Math.abs(balanceAsOfStmt) : 0;

            formattedEvents.push({
              id: `stmt-${acc.id}`,
              date: stmtDateString,
              type: 'note',
              name: `${acc.name} Statement`,
              amount: 0,
              icon: CalendarIcon,
              color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/20',
              provider: 'Credit Card'
            });

            // Due date is usually next month after statement, but for display let's put it on the calendar's current month due date or next month depending.
            // Actually, we can just log it on the `dueDay` of the current view month.
            let dueDateString = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${dueDay.padStart(2, '0')}`;

            // If due day is less than statement day, the due date for THIS statement is NEXT month.
            // But we just place the event on the calendar's due date for visibility.
            
            formattedEvents.push({
              id: `due-${acc.id}`,
              date: dueDateString,
              type: 'bill',
              name: `${acc.name} Due`,
              amount: amountOwed,
              icon: Wallet,
              color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/20',
              provider: 'Credit Card'
            });
        } else {
           if (acc.type === 'Card' && acc.statement_date) {
               let stmtDay = acc.statement_date.toString();
               if (stmtDay.includes('-')) stmtDay = stmtDay.split('-')[2];
               formattedEvents.push({
                 id: `stmt-${acc.id}`,
                 date: `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${stmtDay.padStart(2, '0')}`,
                 type: 'note',
                 name: `${acc.name} Statement`,
                 amount: 0,
                 icon: CalendarIcon,
                 color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/20',
                 provider: 'Credit Card'
               });
           }
           if (acc.type === 'Card' && acc.due_date) {
               let dueDay = acc.due_date.toString();
               if (dueDay.includes('-')) dueDay = dueDay.split('-')[2];
               formattedEvents.push({
                 id: `due-${acc.id}`,
                 date: `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${dueDay.padStart(2, '0')}`,
                 type: 'bill',
                 name: `${acc.name} Due`,
                 amount: 0,
                 icon: Wallet,
                 color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/20',
                 provider: 'Credit Card'
               });
           }
        }
      });

      (Array.isArray(calendarEvents) ? calendarEvents : []).forEach((ce: any) => {
        formattedEvents.push({
          id: `c-${ce.id}`,
          date: ce.date,
          type: ce.type,
          name: ce.name,
          amount: ce.amount || 0,
          icon: ce.type === 'income' ? ArrowDownToLine : ce.type === 'pin' ? Pin : StickyNote,
          color: ce.type === 'income' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/20' : ce.type === 'pin' ? 'text-violet-500 bg-violet-50 dark:bg-violet-500/20' : 'text-blue-500 bg-blue-50 dark:bg-blue-500/20'
        });
      });

      // Recorded transactions for this month. Ones created by bills, income, or goals
      // already appear through those schedules, so they aren't shown twice.
      (Array.isArray(transactions) ? transactions : []).forEach((tx: any) => {
        const date = String(tx.date || '').slice(0, 10);
        if (!date.startsWith(`${year}-${month}`) || ['income_flow', 'liability', 'goal'].includes(tx.source)) return;
        formattedEvents.push({
          id: `t-${tx.id}`,
          date,
          type: tx.type === 'income' ? 'inflow' : 'transaction',
          name: tx.description || tx.category || 'Transaction',
          amount: Number(tx.amount) || 0,
          icon: tx.type === 'income' ? ArrowDownRight : ArrowUpRight,
          color: tx.type === 'income' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/20' : 'text-slate-500 bg-slate-50 dark:bg-slate-500/20',
          source: tx.account_name
        });
      });

      // Goal target dates and upcoming auto-save days.
      (Array.isArray(goals) ? goals : []).forEach((goal: any) => {
        const target = String(goal.date || '').slice(0, 10);
        if (target.startsWith(`${year}-${month}`)) formattedEvents.push({ id: `g-${goal.id}`, goalId: goal.id, date: target, type: 'goal', name: `${goal.name} target`, amount: Number(goal.target) || 0, icon: Target, color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/20', provider: 'Goal' });
        const autosave = String(goal.autosave_date || '');
        if (Number(goal.autosave_amount) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(autosave) && `${year}-${month}` >= autosave.slice(0, 7)) {
          const lastDay = new Date(year, Number(month), 0).getDate();
          const day = String(Math.min(Number(autosave.slice(8, 10)), lastDay)).padStart(2, '0');
          const isNext = autosave.slice(0, 7) === `${year}-${month}`;
          const amount = isNext && Number(goal.autosave_next_amount) > 0 ? Number(goal.autosave_next_amount) : Number(goal.autosave_amount);
          formattedEvents.push({ id: `ga-${goal.id}`, goalId: goal.id, date: `${year}-${month}-${day}`, type: 'goal', name: `Auto-save · ${goal.name}`, amount, icon: PiggyBank, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/20', provider: 'Goal auto-save' });
        }
      });

      setEvents(formattedEvents);
    } catch(err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const handleAddNote = async () => {
    if (!newNote.name || !newNote.date) return;
    try {
      await fetch('/api/calendar_events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote)
      });
      celebrate({ kind: 'success', title: newNote.type === 'pin' ? 'Date pinned' : 'Added to calendar', message: newNote.name });
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
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    let dayEvents = events.filter(e => e.date === dateStr);
    if (filter !== 'all') {
      if (filter === 'transactions') dayEvents = dayEvents.filter(e => e.type === 'transaction' || e.type === 'inflow');
      else if (filter === 'bills') dayEvents = dayEvents.filter(e => e.type === 'bill');
      else if (filter === 'notes') dayEvents = dayEvents.filter(e => e.type === 'note' || e.type === 'pin');
      else if (filter === 'goals') dayEvents = dayEvents.filter(e => e.type === 'goal');
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
     else if (filter === 'goals') filteredUpcoming = filteredUpcoming.filter(e => e.type === 'goal');
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CalendarIcon size={24} /> Calendar
        </h2>
        
        <div className="flex gap-2 flex-wrap">
          <div className={`flex rounded-xl p-1 text-sm font-bold ${isAdvanced ? 'bg-slate-900' : 'bg-slate-100'}`}>
             {['all', 'bills', 'transactions', 'goals', 'notes'].map(f => (
               <button 
                 key={f}
                 onClick={() => setFilter(f)}
                 className={`px-3 py-1.5 rounded-lg transition-colors capitalize ${filter === f ? (isAdvanced ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-500'}`}
               >
                 {f}
               </button>
             ))}
          </div>
          <button 
            onClick={() => setIsAddNoteOpen(true)}
            className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2 ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
          >
            <Plus size={16} /> Add Note
          </button>
        </div>
      </div>

      <div className={`rounded-3xl p-4 sm:p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <select 
              value={month} 
              onChange={(e) => setCurrentDate(new Date(year, parseInt(e.target.value), 1))}
              className={`text-xl font-bold bg-transparent outline-none cursor-pointer appearance-none ${isAdvanced ? 'text-white' : 'text-slate-800'}`}
            >
              {monthNames.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select 
              value={year}
              onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), month, 1))}
              className={`text-xl font-bold bg-transparent outline-none cursor-pointer appearance-none ${isAdvanced ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'}`}
            >
              {Array.from({ length: 10 }).map((_, i) => {
                const y = 2024 + i;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={prevMonth} className={`p-2 rounded-xl transition-colors ${isAdvanced ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>
              <ChevronLeft size={20} />
            </button>
            <button onClick={nextMonth} className={`p-2 rounded-xl transition-colors ${isAdvanced ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>
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
              return <div key={`empty-${i}`} className="p-2 md:p-4 rounded-xl opacity-0"></div>;
            }

            const dayEvents = getEventsForDay(day);
            const dayDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

            return (
              <div
                key={day}
                role="button"
                tabIndex={0}
                aria-label={`Add something on ${dayDate}`}
                onClick={() => setDayMenu(dayDate)}
                onKeyDown={(event) => { if (event.key === 'Enter') setDayMenu(dayDate); }}
                className={`min-h-[80px] p-2 md:p-3 rounded-xl border flex flex-col cursor-pointer transition-colors ${
                  isToday 
                    ? (isAdvanced ? 'border-violet-500 bg-violet-500/10' : 'border-emerald-500 bg-emerald-50') 
                    : (isAdvanced ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-100 hover:bg-slate-50')
                }`}
              >
                <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? (isAdvanced ? 'bg-violet-500 text-white' : 'bg-emerald-500 text-white') : ''}`}>
                  {day}
                </span>
                
                <div className="mt-1 flex flex-col gap-1 flex-1">
                  {dayEvents.map(ev => (
                    <div 
                      key={ev.id} 
                      onClick={(event) => { event.stopPropagation(); setSelectedEvent(ev); }}
                      className={`text-[10px] sm:text-xs px-1.5 py-1 rounded-md cursor-pointer truncate font-medium flex items-center gap-1 ${ev.color}`}
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
              className={`rounded-2xl p-4 shadow-sm border cursor-pointer transition-transform hover:-translate-y-1 ${isAdvanced ? 'bg-slate-800 border-slate-700 hover:border-violet-500' : 'bg-white border-slate-100 hover:border-emerald-300'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ev.color}`}>
                  <ev.icon size={20} />
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-lg ${ev.color}`}>
                  {ev.type}
                </span>
              </div>
              <p className="font-bold">{ev.name}</p>
              <div className="flex justify-between items-end mt-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">{ev.date}</p>
                {ev.amount ? (
                  <p className={`font-bold ${ev.type === 'inflow' ? 'text-emerald-500' : ev.type === 'transaction' ? 'text-slate-500' : 'text-rose-500'}`}>
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
            className={`w-full max-w-sm rounded-3xl shadow-xl flex flex-col p-6 ${isAdvanced ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-white border border-slate-100'}`}
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
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none font-medium appearance-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} 
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
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none font-medium ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`} 
                    placeholder="e.g. Pay Car Insurance" 
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Date</label>
                  <input 
                    type="date" 
                    value={newNote.date}
                    onChange={(e) => setNewNote({ ...newNote, date: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none font-medium ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`} 
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Amount (Optional)</label>
                  <input 
                    type="number" 
                    value={newNote.amount}
                    onChange={(e) => setNewNote({ ...newNote, amount: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none font-medium ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`} 
                    placeholder="₱0.00" 
                  />
               </div>
            </div>

            <button 
              onClick={handleAddNote}
              disabled={!newNote.name || !newNote.date}
              className={`w-full mt-8 py-4 rounded-xl font-bold transition-transform shadow-lg hover:scale-105 ${
                (!newNote.name || !newNote.date) 
                ? 'opacity-50 cursor-not-allowed bg-slate-300 text-slate-500' 
                : (isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white')
              }`}
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
            className={`w-full max-w-sm rounded-3xl shadow-xl flex flex-col p-6 overflow-hidden ${isAdvanced ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-white border border-slate-100'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedEvent.color}`}>
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
              <div className={`p-6 rounded-2xl mb-6 text-center ${isAdvanced ? 'bg-slate-900' : 'bg-slate-50'}`}>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {selectedEvent.type === 'inflow' ? 'Expected Amount' : selectedEvent.type === 'transaction' ? 'Transaction Amount' : 'Amount'}
                </p>
                <h1 className={`text-4xl font-extrabold tracking-tight ${selectedEvent.type === 'inflow' ? 'text-emerald-500' : selectedEvent.type === 'transaction' ? 'text-slate-700 dark:text-slate-300' : 'text-rose-500'}`}>
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

            {selectedEvent.goalId && (
              <button onClick={() => { setFocusGoalId(selectedEvent.goalId); setSelectedEvent(null); onNavigate?.('plans-goals'); }} className={`w-full mb-3 py-3 rounded-xl font-bold transition-colors ${isAdvanced ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}>Open goal</button>
            )}
            {String(selectedEvent.id).startsWith('c-') && ['note', 'pin'].includes(selectedEvent.type) && (
              <button onClick={async () => { const response = await fetch(`/api/calendar_events/${String(selectedEvent.id).slice(2)}`, { method: 'DELETE' }); if (response.ok) { setSelectedEvent(null); fetchEvents(); } }} className="w-full mb-3 py-3 rounded-xl font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10">Delete {selectedEvent.type}</button>
            )}
            <button
              onClick={() => setSelectedEvent(null)}
              className={`w-full py-4 rounded-xl font-bold transition-colors ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {dayMenu && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => setDayMenu(null)}>
          <div role="dialog" aria-modal="true" aria-label={`Add on ${dayMenu}`} onClick={event => event.stopPropagation()} className={`w-full max-w-sm rounded-3xl p-6 shadow-xl ${isAdvanced ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-white border border-slate-100'}`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold">Add on {new Date(`${dayMenu}T00:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</h3>
              <button onClick={() => setDayMenu(null)} aria-label="Close" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="space-y-2">
              {([
                ['goal', Target, 'Goal target', 'Set a savings goal due on this day'],
                ['note', StickyNote, 'Note', 'A reminder on the calendar'],
                ['pin', Pin, 'Pin', 'Mark an important date'],
              ] as const).map(([kind, Icon, title, text]) => (
                <button key={kind} onClick={() => { if (kind === 'goal') setGoalDate(dayMenu); else { setNewNote({ name: '', date: dayMenu, type: kind, amount: '' }); setIsAddNoteOpen(true); } setDayMenu(null); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-colors ${isAdvanced ? 'bg-slate-900/60 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'}`}>
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${kind === 'note' ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/20' : 'text-violet-500 bg-violet-50 dark:bg-violet-500/20'}`}><Icon size={18} /></span>
                  <span><span className="block font-bold">{title}</span><span className="block text-xs text-slate-500">{text}</span></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {goalDate && <GoalBuilder advanced={isAdvanced} accounts={accountList} defaultDate={goalDate} onSaved={() => { setGoalDate(null); fetchEvents(); }} onClose={() => setGoalDate(null)} />}
    </div>
  );
}
