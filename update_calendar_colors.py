import re

with open("src/pages/Calendar.tsx", "r") as f:
    content = f.read()

target = """      (Array.isArray(calendarEvents) ? calendarEvents : []).forEach((ce: any) => {
        formattedEvents.push({
          id: `c-${ce.id}`,
          date: ce.date,
          type: ce.type,
          name: ce.name,
          amount: ce.amount || 0,
          icon: ce.type === 'pin' ? Pin : StickyNote,
          color: ce.type === 'pin' ? 'text-violet-500 bg-violet-50 dark:bg-violet-500/20' : 'text-blue-500 bg-blue-50 dark:bg-blue-500/20'
        });
      });"""

new_code = """      (Array.isArray(calendarEvents) ? calendarEvents : []).forEach((ce: any) => {
        formattedEvents.push({
          id: `c-${ce.id}`,
          date: ce.date,
          type: ce.type,
          name: ce.name,
          amount: ce.amount || 0,
          icon: ce.type === 'income' ? ArrowDownToLine : ce.type === 'pin' ? Pin : StickyNote,
          color: ce.type === 'income' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/20' : ce.type === 'pin' ? 'text-violet-500 bg-violet-50 dark:bg-violet-500/20' : 'text-blue-500 bg-blue-50 dark:bg-blue-500/20'
        });
      });"""

if target in content:
    content = content.replace(target, new_code)
    with open("src/pages/Calendar.tsx", "w") as f:
        f.write(content)
    print("Replaced calendar colors")
else:
    print("Target not found")
