const fs = require('fs');
const path = require('path');

const dir = 'src/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'Investments.tsx');

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Revert $ back to ₱
  content = content.replace(/\$([0-9]+)/g, '₱$1'); // $165,000 -> ₱165,000
  content = content.replace(/\$\$\{/g, '₱${'); // $${value} -> ₱${value}
  content = content.replace(/>\$/g, '>₱'); // >$ -> >₱
  content = content.replace(/'\$/g, "'₱"); // '$ -> '₱
  content = content.replace(/"\$/g, '"₱'); // "$ -> "₱
  content = content.replace(/\}\$/g, '}₱'); // }$ -> }₱
  content = content.replace(/ \$/g, ' ₱'); //  $ ->  ₱

  fs.writeFileSync(filePath, content);
});
