const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');

const oldHandle = `const handleAddTransaction = async () => {
    if (!selectedHolding || !newTx.amount || !newTx.price) return;
    
    try {
      await fetch('/api/portfolios/' + selectedHolding.id + '/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newTx.type,
          shares: parseFloat(newTx.amount),
          price: parseFloat(newTx.price),
          date: newTx.date
        })
      });`;

const newHandle = `const handleAddTransaction = async () => {
    if (!selectedHolding || !newTx.price) return;
    
    let shares = parseFloat(newTx.amount);
    if (newTx.totalAmount) {
       shares = parseFloat(newTx.totalAmount) / parseFloat(newTx.price);
    }
    
    try {
      await fetch('/api/portfolios/' + selectedHolding.id + '/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newTx.type,
          shares: shares || 0,
          price: parseFloat(newTx.price),
          date: newTx.date
        })
      });`;

content = content.replace(oldHandle, newHandle);

content = content.replace("const [newTx, setNewTx] = useState({ date: new Date().toISOString().split('T')[0], type: 'Buy', amount: '', price: '' });", "const [newTx, setNewTx] = useState({ date: new Date().toISOString().split('T')[0], type: 'Buy', amount: '', price: '', totalAmount: '' });");
content = content.replace("setNewTx({ date: new Date().toISOString().split('T')[0], type: 'Buy', amount: '', price: '' });", "setNewTx({ date: new Date().toISOString().split('T')[0], type: 'Buy', amount: '', price: '', totalAmount: '' });");

fs.writeFileSync('src/pages/Investments.tsx', content);
