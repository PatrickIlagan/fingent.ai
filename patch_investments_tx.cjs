const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');

const newLogic = `
  const handleAddTransaction = async () => {
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
      });
      
      setIsTxModalOpen(false);
      setNewTx({ date: new Date().toISOString().split('T')[0], type: 'Buy', amount: '', price: '' });
      
      // Refresh
      const res = await fetch('/api/portfolios');
      const data = await res.json();
      const dataList = Array.isArray(data) ? data : [];
      const formatted = dataList.map((d: any) => ({
           id: d.id,
           type: d.type,
           name: d.name,
           invested: d.invested,
           value: d.current_value,
           shares: d.shares,
           avgPrice: d.avg_price,
           ticker: d.ticker,
           color: d.type === 'Stocks' ? '#10B981' : d.type === 'Cryptos' ? '#F59E0B' : d.type === 'Real Estate' ? '#3B82F6' : '#8B5CF6',
           iconColor: d.type === 'Stocks' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/20' : d.type === 'Cryptos' ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/20' : d.type === 'Real Estate' ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/20' : 'text-violet-500 bg-violet-50 dark:bg-violet-500/20',
           history: selectedHolding.id === d.id ? [{ date: newTx.date, type: newTx.type, amount: parseFloat(newTx.amount), price: parseFloat(newTx.price) }, ...(selectedHolding.history || [])] : []
      }));
      setInvestmentsData(formatted);
      setSelectedHolding(formatted.find(f => f.id === selectedHolding.id));
      
    } catch(err) {
      console.error(err);
    }
  };
`;

content = content.replace(/const handleAddTransaction = \(\) => \{[\s\S]*?setSelectedHolding\(updatedHolding\);\s*setInvestmentsData\(investmentsData\.map\(i => i\.id === updatedHolding\.id \? updatedHolding : i\)\);\s*\};/, newLogic.trim());

fs.writeFileSync('src/pages/Investments.tsx', content);
