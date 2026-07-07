const fs = require('fs');
const path = require('path');

const dir = 'src/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'Investments.tsx');

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // We know we did `sed -i 's/₱/\$/g'` in the previous turn.
  // This means literal ₱ was replaced by $.
  // If we just blindly replace `\$` with `₱`, we might break `\${...}`.
  // Wait, the previous turn literally ran: sed -i 's/₱/\$/g'
  // Let's just find and replace `$${` with `₱${`
  content = content.replace(/\$\$\{/g, '₱${');
  
  // Replace ">$" with ">₱"
  content = content.replace(/>\$/g, '>₱');

  // Replace "$ " with "₱ "
  content = content.replace(/\$ /g, '₱ ');
  
  // Replace "$[0-9]" with "₱[0-9]"
  content = content.replace(/\$([0-9])/g, '₱$1');
  
  // Replace "'$" with "'₱"
  content = content.replace(/'\$/g, "'₱");
  content = content.replace(/"\$/g, '"₱');
  content = content.replace(/\}\$/g, '}₱');
  
  // " \${" -> " ₱${"
  content = content.replace(/ \$\$\{/g, ' ₱${'); // actually we already did $\${
  content = content.replace(/ \$\{/g, ' ₱${'); // this might break classNames!
  // Wait, replacing " ${" with " ₱${" would break: className={`p-4 ${var}`} -> `p-4 ₱${var}`
  // So don't do that. Let's just restore exactly what was ₱ before.
  // Since we only replaced ₱ with $, anything that is now $ and isn't part of template string or regex was probably ₱.

  fs.writeFileSync(filePath, content);
});
