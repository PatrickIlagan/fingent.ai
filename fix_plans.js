const fs = require('fs');
let content = fs.readFileSync('src/pages/Plans.tsx', 'utf8');
content = content.replace('.then(data => setGoals(data))', '.then(data => setGoals(Array.isArray(data) ? data : []))');
content = content.replace('setAccounts(data);\n        if (data.length > 0)', 'const _d = Array.isArray(data) ? data : [];\n        setAccounts(_d);\n        if (_d.length > 0)');
fs.writeFileSync('src/pages/Plans.tsx', content);
