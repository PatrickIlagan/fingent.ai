const fs = require('fs');
const path = require('path');

const dir = 'src/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'Investments.tsx');

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace ${...toLocaleString...} with ₱{...toLocaleString...}
  content = content.replace(/\$\{([^}]*\.toLocaleString[^}]*)\}/g, '₱{$1}');

  fs.writeFileSync(filePath, content);
});
