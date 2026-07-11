with open("src/pages/Calendar.tsx", "r") as f:
    content = f.read()

old_parsing = """      (Array.isArray(liabilities) ? liabilities : []).forEach((d: any) => {
         let dayStr = '15';
         if (d.date && d.date.includes('th')) dayStr = d.date.split('th')[0];
         else if (d.date && d.date.includes('st')) dayStr = d.date.split('st')[0];
         else if (d.date && d.date.includes('nd')) dayStr = d.date.split('nd')[0];
         else if (d.date && d.date.includes('rd')) dayStr = d.date.split('rd')[0];
         else if (!isNaN(parseInt(d.date))) dayStr = d.date;
         
         const dateStr = `${year}-${month}-${dayStr.padStart(2, '0')}`;"""

new_parsing = """      (Array.isArray(liabilities) ? liabilities : []).forEach((d: any) => {
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
         }"""

content = content.replace(old_parsing, new_parsing)

with open("src/pages/Calendar.tsx", "w") as f:
    f.write(content)
