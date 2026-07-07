const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');

const syncLogic = `
  const [isSyncing, setIsSyncing] = useState(false);
  const handleSyncPrices = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/portfolios/sync', { method: 'POST' });
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
           iconColor: d.type === 'Stocks' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/20' : d.type === 'Cryptos' ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/20' : d.type === 'Real Estate' ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/20' : 'text-violet-500 bg-violet-50 dark:bg-violet-500/20'
      }));
      setInvestmentsData(formatted);
    } catch(e) {
      console.error(e);
    }
    setIsSyncing(false);
  };
`;

content = content.replace("const [investmentsData, setInvestmentsData] = useState<any[]>([]);", "const [investmentsData, setInvestmentsData] = useState<any[]>([]);\n" + syncLogic);

const refreshButton = `
        <button 
          onClick={handleSyncPrices}
          disabled={isSyncing}
          className={\`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm \${isAdvanced ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'} \${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}\`}
        >
          <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} /> <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Prices'}</span>
        </button>
        <button 
`;

content = content.replace("import { Plus, X, ArrowUpRight, History, Trash2, Edit2, TrendingUp, TrendingDown, Clock, Activity, Calendar } from 'lucide-react';", "import { Plus, X, ArrowUpRight, History, Trash2, Edit2, TrendingUp, TrendingDown, Clock, Activity, Calendar, RefreshCw } from 'lucide-react';");
content = content.replace("<button \n          onClick={() => {", refreshButton + "          onClick={() => {");

fs.writeFileSync('src/pages/Investments.tsx', content);
