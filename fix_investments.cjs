const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');
content = content.replace('const formatted = data.map', 'const dataList = Array.isArray(data) ? data : [];\n         const formatted = dataList.map');
fs.writeFileSync('src/pages/Investments.tsx', content);
