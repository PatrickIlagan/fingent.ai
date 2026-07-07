const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');

const mapFn = `
  const mapPortfolioData = (dataList: any[]) => {
      if (!Array.isArray(dataList)) return [];
      return dataList.map((d: any) => ({
           id: d.id,
           type: d.type,
           name: d.name,
           invested: d.invested,
           value: d.current_value,
           shares: d.shares,
           avgPrice: d.avg_price,
           ticker: d.ticker,
           history: d.history || [],
           color: d.type === 'Stocks' ? '#10B981' : d.type === 'Cryptos' ? '#F59E0B' : d.type === 'Real Estate' ? '#3B82F6' : '#8B5CF6',
           iconColor: d.type === 'Stocks' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/20' : d.type === 'Cryptos' ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/20' : d.type === 'Real Estate' ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/20' : 'text-violet-500 bg-violet-50 dark:bg-violet-500/20'
      }));
  };
`;

content = content.replace("export function Investments({ category, onNavigate }: { category?: string, onNavigate?: (tab: string) => void }) {", "export function Investments({ category, onNavigate }: { category?: string, onNavigate?: (tab: string) => void }) {\n" + mapFn);

fs.writeFileSync('src/pages/Investments.tsx', content);
