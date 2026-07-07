const fs = require('fs');
const path = require('path');

const dir = 'src/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'Investments.tsx');

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace ${...toFixed...} with ₱{...toFixed...}
  // WAIT: is it possible that a percentage uses toFixed?
  // Like `({gainPercent.toFixed(2)}%)` ?
  // Yes! If we replace `${...toFixed...}` with `₱{...toFixed...}`, we might ruin percentages!
});
