const fs = require('fs');
let content = fs.readFileSync('src/pages/Calendar.tsx', 'utf8');
content = content.replace('liabilitiesRes.json(),\n        accountsRes.json(),\n        calendarEventsRes.json()', 'liabilitiesRes.json().catch(() => []),\n        accountsRes.json().catch(() => []),\n        calendarEventsRes.json().catch(() => [])');
content = content.replace('liabilities.forEach((d: any) =>', '(Array.isArray(liabilities) ? liabilities : []).forEach((d: any) =>');
content = content.replace('accounts.forEach((acc: any) =>', '(Array.isArray(accounts) ? accounts : []).forEach((acc: any) =>');
content = content.replace('calendarEvents.forEach((ce: any) =>', '(Array.isArray(calendarEvents) ? calendarEvents : []).forEach((ce: any) =>');
fs.writeFileSync('src/pages/Calendar.tsx', content);
