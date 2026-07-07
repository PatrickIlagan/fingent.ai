const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const lines = content.split('\n');
const fixedLines = lines.filter((line, i) => !(i >= 306 && i <= 309));
fs.writeFileSync('server.ts', fixedLines.join('\n'));
