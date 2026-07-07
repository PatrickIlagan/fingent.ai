const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const lines = content.split('\n');
const toRemove = [228, 229, 330, 331, 332, 333];
const fixed = lines.filter((l, i) => !toRemove.includes(i));
fs.writeFileSync('server.ts', fixed.join('\n'));
