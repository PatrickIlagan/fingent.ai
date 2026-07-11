import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Plus, X, ArrowUpRight, History, Trash2, Edit2, TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react';

const getSymbol = (currency?: string) => {
  if (currency === 'USD') return '$';
  if (currency === 'PHP') return '₱';
  if (currency === 'EUR') return '€';
  if (currency === 'GBP') return '£';
  return '₱';
};

export function Investments({ category, onNavigate }: { category?: string, onNavigate?: (tab: string) => void }) {
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
           currentPrice: d.current_price,
           currency: d.currency || 'USD',
           platform: d.platform || '',
           history: d.history || [],
           color: d.type === 'Stocks' ? '#10B981' : d.type === 'Cryptos' ? '#F59E0B' : d.type === 'Real Estate' ? '#3B82F6' : '#8B5CF6',
           iconColor: d.type === 'Stocks' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/20' : d.type === 'Cryptos' ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/20' : d.type === 'Real Estate' ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/20' : 'text-violet-500 bg-violet-50 dark:bg-violet-500/20'
      }));
  };

  const { themeMode } = useStore();
  const isAdvanced = themeMode === 'advanced';
  
  
  const [investmentsData, setInvestmentsData] = useState<any[]>([]);

  const [isSyncing, setIsSyncing] = useState(false);
  const handleSyncPrices = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/portfolios/sync', { method: 'POST' });
      const res = await fetch('/api/portfolios');
      const data = await res.json();
      const dataList = Array.isArray(data) ? data : [];
      const formatted = mapPortfolioData(dataList);
      setInvestmentsData(formatted);
    } catch(e) {
      console.error(e);
    }
    setIsSyncing(false);
  };


  useEffect(() => {
    fetch('/api/portfolios')
      .then(res => res.json())
      .then(data => {
         const dataList = Array.isArray(data) ? data : [];
         const formatted = mapPortfolioData(dataList);
         setInvestmentsData(formatted);
      })
      .catch(console.error);
      
    fetch('/api/rates')
      .then(res => res.json())
      .then(data => {
        if (data && data.PHP) setExchangeRates(data);
      })
      .catch(console.error);
  }, []);

  const [selectedHolding, setSelectedHolding] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [chartMode, setChartMode] = useState<'Portfolio' | 'Asset Breakdown'>('Portfolio');
  const [displayCurrency, setDisplayCurrency] = useState<'USD'|'PHP'>('USD');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ PHP: 58.5, EUR: 0.92, GBP: 0.79, USD: 1 });

  const [timeframe, setTimeframe] = useState('1M');
  const timeframes = ['1W', '1M', '6M', '1Y', '5Y', 'YTD', 'All'];

  const [newAsset, setNewAsset] = useState({
    name: '', type: 'Stocks', shares: '', avgPrice: '', currentValue: '', invested: '', ticker: '', currency: 'USD', platform: ''
  });

  const [txInputMode, setTxInputMode] = useState<'total'|'shares'>('shares');
  const [assetInputMode, setAssetInputMode] = useState<'total'|'shares'>('shares');
  const [fetchedPrice, setFetchedPrice] = useState<number | null>(null);
  const [newTx, setNewTx] = useState({
    date: new Date().toISOString().split('T')[0], type: 'Buy', amount: '', price: '', totalAmount: ''
  });

  const [visibleLines, setVisibleLines] = useState({
    'Real Estate': true, 'Stocks': true, 'Cryptos': true, 'Others': true
  });

  const activeCategory = category ? category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'All';

  const convertCurrency = (amount: number, fromCurrency: string) => {
    if (!amount) return 0;
    if (fromCurrency === displayCurrency) return amount;
    
    // Convert to USD first
    let amountInUSD = amount;
    if (fromCurrency !== 'USD') {
       const rateToUsd = exchangeRates[fromCurrency] || 1;
       amountInUSD = amount / rateToUsd;
    }
    
    // Convert to target currency
    if (displayCurrency !== 'USD') {
       const rateFromUsd = exchangeRates[displayCurrency] || 1;
       return amountInUSD * rateFromUsd;
    }
    
    return amountInUSD;
  };

  const filteredInvestments = activeCategory === 'All' 
    ? investmentsData 
    : investmentsData.filter(inv => inv.type === activeCategory);

  const totalValue = filteredInvestments.reduce((sum, item) => sum + convertCurrency(item.value, item.currency), 0);

  // Group by type for the pie chart
  const pieDataMap = filteredInvestments.reduce((acc, inv) => {
    if (!acc[inv.type]) acc[inv.type] = { name: inv.type, value: 0, color: inv.color };
    acc[inv.type].value += convertCurrency(inv.value, inv.currency);
    return acc;
  }, {} as Record<string, any>);
  const pieData: any[] = Object.values(pieDataMap);

  const { chartData, totalInvestedLine } = React.useMemo(() => {
    const data = [];
    const now = new Date();
    let points = 7;
    let unit = 'day';
    if (timeframe === '1W') { points = 7; unit = 'day'; }
    else if (timeframe === '1M') { points = 30; unit = 'day'; }
    else if (timeframe === '6M') { points = 6; unit = 'month'; }
    else if (timeframe === 'YTD') { points = Math.max(1, now.getMonth() + 1); unit = 'month'; }
    else if (timeframe === '1Y') { points = 12; unit = 'month'; }
    else if (timeframe === '5Y') { points = 5; unit = 'year'; }
    else if (timeframe === 'All') { points = 10; unit = 'year'; }

    let curValueRE = investmentsData.filter(i => i.type === 'Real Estate').reduce((s, i) => s + convertCurrency(i.value, i.currency), 0);
    let curInvRE = investmentsData.filter(i => i.type === 'Real Estate').reduce((s, i) => s + convertCurrency(i.shares && i.avgPrice ? i.shares * i.avgPrice : i.invested, i.currency), 0);
    let curValueStocks = investmentsData.filter(i => i.type === 'Stocks').reduce((s, i) => s + convertCurrency(i.value, i.currency), 0);
    let curInvStocks = investmentsData.filter(i => i.type === 'Stocks').reduce((s, i) => s + convertCurrency(i.shares && i.avgPrice ? i.shares * i.avgPrice : i.invested, i.currency), 0);
    let curValueCryptos = investmentsData.filter(i => i.type === 'Cryptos').reduce((s, i) => s + convertCurrency(i.value, i.currency), 0);
    let curInvCryptos = investmentsData.filter(i => i.type === 'Cryptos').reduce((s, i) => s + convertCurrency(i.shares && i.avgPrice ? i.shares * i.avgPrice : i.invested, i.currency), 0);
    let curValueOthers = investmentsData.filter(i => i.type === 'Others').reduce((s, i) => s + convertCurrency(i.value, i.currency), 0);
    let curInvOthers = investmentsData.filter(i => i.type === 'Others').reduce((s, i) => s + convertCurrency(i.shares && i.avgPrice ? i.shares * i.avgPrice : i.invested, i.currency), 0);

    for (let i = points - 1; i >= 0; i--) {
      const d = new Date(now);
      let name = '';
      if (unit === 'day') {
        d.setDate(d.getDate() - i);
        name = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      } else if (unit === 'month') {
        d.setMonth(d.getMonth() - i);
        name = d.toLocaleDateString(undefined, { month: 'short' }) + (timeframe === '6M' || timeframe === 'YTD' ? '' : ` '${d.getFullYear().toString().slice(2)}`);
      } else {
        d.setFullYear(d.getFullYear() - i);
        name = d.getFullYear().toString();
      }

      // Calculate historical drift going backwards from current values
      const daysAgo = i;
      let valueRE = curValueRE;
      let valueStocks = curValueStocks;
      let valueCryptos = curValueCryptos;
      let valueOthers = curValueOthers;

      if (daysAgo !== 0) {
        // Approximate history by slightly drifting from current values 
        // A real app would calculate exact values based on transaction dates
        valueRE -= (Math.sin(daysAgo) * 0.02 + 0.01) * curValueRE * (daysAgo / points);
        valueStocks -= (Math.cos(daysAgo) * 0.05 + 0.02) * curValueStocks * (daysAgo / points);
        valueCryptos -= (Math.sin(daysAgo * 2) * 0.1 + 0.05) * curValueCryptos * (daysAgo / points);
        valueOthers -= (Math.cos(daysAgo * 0.5) * 0.01) * curValueOthers * (daysAgo / points);
      }

      const dispTotal = valueRE + valueStocks + valueCryptos + valueOthers;
      const dispTotalInv = curInvRE + curInvStocks + curInvCryptos + curInvOthers;

      data.push({
        name,
        'Real Estate': valueRE,
        'Stocks': valueStocks,
        'Cryptos': valueCryptos,
        'Others': valueOthers,
        'Total Value': dispTotal,
        'Total Invested': dispTotalInv,
      });
    }
    return { chartData: data, totalInvestedLine: data[data.length - 1]['Total Invested'] };
  }, [timeframe, displayCurrency]);

  const chartGain = chartData.length > 0 ? chartData[chartData.length - 1]['Total Value'] - chartData[0]['Total Value'] : 0;
  const chartGainPercent = chartData.length > 0 && chartData[0]['Total Value'] > 0 ? (chartGain / chartData[0]['Total Value']) * 100 : 0;

  useEffect(() => {
    if (newAsset.ticker && (newAsset.type === 'Stocks' || newAsset.type === 'Cryptos')) {
      const delay = setTimeout(() => {
        fetch(`/api/quote/${newAsset.ticker}?type=${newAsset.type}`)
          .then(res => res.ok ? res.json() : { price: null })
          .then(data => setFetchedPrice(data.price))
          .catch(() => setFetchedPrice(null));
      }, 500);
      return () => clearTimeout(delay);
    } else {
      setFetchedPrice(null);
    }
  }, [newAsset.ticker, newAsset.type]);

  const handleSaveAsset = async () => {
    const isSharesBased = (newAsset.type === 'Stocks' || newAsset.type === 'Cryptos');
    
    // Calculate final fields based on mode
    let finalShares = null;
    let finalAvgPrice = null;
    let finalInvested = parseFloat(newAsset.invested) || 0;
    let finalCurrentValue = parseFloat(newAsset.currentValue) || 0;

    if (isSharesBased) {
      if (assetInputMode === 'shares') {
        finalShares = parseFloat(newAsset.shares) || 0;
        finalInvested = parseFloat(newAsset.invested) || 0;
        finalAvgPrice = finalShares > 0 ? finalInvested / finalShares : 0;
      } else {
        // Total value mode
        finalInvested = parseFloat(newAsset.invested) || 0;
        finalCurrentValue = parseFloat(newAsset.currentValue) || 0;
        if (fetchedPrice && fetchedPrice > 0) {
          finalShares = finalCurrentValue / fetchedPrice;
          finalAvgPrice = finalShares > 0 ? finalInvested / finalShares : 0;
        }
      }
    }

    try {
      if (editingId) {
        await fetch('/api/portfolios/' + editingId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current_value: finalCurrentValue })
        });
      } else {
        await fetch('/api/portfolios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: newAsset.type,
            name: newAsset.name,
            invested: finalInvested,
            current_value: finalCurrentValue,
            shares: finalShares,
            avg_price: finalAvgPrice,
            ticker: newAsset.ticker || '',
            currency: newAsset.currency,
            platform: newAsset.platform || ''
          })
        });
      }
      
      // Refresh
      const res = await fetch('/api/portfolios');
      const data = await res.json();
      const formatted = mapPortfolioData(data);
      setInvestmentsData(formatted);
      setIsModalOpen(false);
    } catch(err) {
      console.error(err);
    }
  };

  const handleDeleteAsset = async (id: number) => {
    try {
      await fetch('/api/portfolios/' + id, { method: 'DELETE' });
      setInvestmentsData(investmentsData.filter(i => i.id !== id));
      setSelectedHolding(null);
    } catch(err) {
      console.error(err);
    }
  };

  const handleAddTransaction = async () => {
    if (!selectedHolding || !newTx.price) return;
    
    let shares = parseFloat(newTx.amount);
    if (txInputMode === 'total' && newTx.totalAmount) {
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
      });
      
      setIsTxModalOpen(false);
      setNewTx({ date: new Date().toISOString().split('T')[0], type: 'Buy', amount: '', price: '', totalAmount: '' });
      
      // Refresh
      const res = await fetch('/api/portfolios');
      const data = await res.json();
      const dataList = Array.isArray(data) ? data : [];
      const formatted = mapPortfolioData(dataList);
      setInvestmentsData(formatted);
      setSelectedHolding(formatted.find(f => f.id === selectedHolding.id));
      
    } catch(err) {
      console.error(err);
    }
  };

  if (selectedHolding) {
    const invested = selectedHolding.shares && selectedHolding.avgPrice 
      ? selectedHolding.shares * selectedHolding.avgPrice 
      : selectedHolding.invested;
    
    const gain = selectedHolding.value - invested;
    const gainPercent = invested > 0 ? (gain / invested) * 100 : 0;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => setSelectedHolding(null)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isAdvanced ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-sm'}`}
          >
            <ArrowUpRight className="w-4 h-4 rotate-[-135deg]" /> Back
          </button>
          <div className="flex gap-2">
            <button 
              onClick={() => handleDeleteAsset(selectedHolding.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isAdvanced ? 'bg-slate-800 hover:bg-rose-500/20 text-rose-400' : 'bg-white hover:bg-rose-50 text-rose-500 border border-slate-200 shadow-sm'}`}
            >
              <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Delete</span>
            </button>
            {(selectedHolding.type === 'Stocks' || selectedHolding.type === 'Cryptos') && (
            <button 
              onClick={() => {
                setNewTx({ date: new Date().toISOString().split('T')[0], type: 'Buy', amount: '', price: '', totalAmount: '' });
                setIsTxModalOpen(true);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-900/20' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'}`}
            >
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Transaction</span>
            </button>
            )}
          </div>
        </div>

        <div className={`rounded-3xl p-6 sm:p-8 shadow-sm border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-5">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center font-bold text-2xl shadow-lg ${selectedHolding.iconColor}`}>
              {selectedHolding.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">{selectedHolding.name}</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">{selectedHolding.type}{selectedHolding.platform ? ` • ${selectedHolding.platform}` : ''}</p>
            </div>
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Current Value</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-emerald-500">{getSymbol(selectedHolding?.currency)}{selectedHolding.value.toLocaleString()}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
             <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Total Invested</p>
             <h3 className="text-2xl font-bold">{getSymbol(selectedHolding?.currency)}{invested?.toLocaleString()}</h3>
          </div>
          <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
             <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Total Gain / Loss</p>
             <h3 className={`text-2xl font-bold ${gain >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {gain >= 0 ? '+' : ''}{getSymbol(selectedHolding?.currency)}{gain.toLocaleString()}
             </h3>
          </div>
          <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
             <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Return on Investment</p>
             <h3 className={`text-2xl font-bold ${gainPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%
             </h3>
          </div>
        </div>

        {(selectedHolding.shares != null) && (
          <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <h3 className="text-lg font-bold mb-4">Position Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Shares Owned</span>
                <span className="font-medium">{selectedHolding.shares}</span>
              </div>
              <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Average Price</span>
                <span className="font-medium">{getSymbol(selectedHolding?.currency)}{selectedHolding.avgPrice?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Current Price</span>
                <span className="font-medium">{getSymbol(selectedHolding?.currency)}{(selectedHolding.currentPrice || (selectedHolding.shares && selectedHolding.shares > 0 ? selectedHolding.value / selectedHolding.shares : 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        )}

        {(selectedHolding.type === 'Stocks' || selectedHolding.type === 'Cryptos') && (
        <div className={`rounded-3xl p-6 sm:p-8 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
            <History size={18} /> Transaction History
          </h3>
          <div className="space-y-4">
            {selectedHolding.history?.map((hist: any, i: number) => (
              <div key={i} className={`flex justify-between items-center p-4 rounded-2xl border ${isAdvanced ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <div>
                  <span className="text-sm font-medium">{hist.date}</span>
                  <p className="text-xs text-slate-500 mt-1">{hist.type} {hist.amount} @ {getSymbol(selectedHolding?.currency)}{hist.price.toLocaleString()}</p>
                </div>
                <span className="font-bold">{getSymbol(selectedHolding?.currency)}{(hist.amount * hist.price).toLocaleString()}</span>
              </div>
            ))}
            {(!selectedHolding.history || selectedHolding.history.length === 0) && (
              <p className="text-sm text-slate-500">No transaction history found.</p>
            )}
          </div>
        </div>
        )}

      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsTxModalOpen(false)}>
          <div 
            className={`w-full max-w-md rounded-3xl shadow-xl flex flex-col p-6 overflow-y-auto max-h-[90vh] custom-scrollbar ${isAdvanced ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-white border border-slate-100'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Add Transaction</h3>
              <button onClick={() => setIsTxModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
               <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                  <input 
                    type="date" 
                    value={newTx.date}
                    onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} 
                  />
               </div>
               <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                  <select 
                    value={newTx.type}
                    onChange={(e) => setNewTx({ ...newTx, type: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}
                  >
                    <option>Buy</option>
                    <option>Sell</option>
                  </select>
               </div>
               
               <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1 mb-4">
                 <button 
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md ${txInputMode === 'shares' ? 'bg-white dark:bg-slate-800 shadow' : 'text-slate-500'}`}
                    onClick={() => { setTxInputMode('shares'); setNewTx({...newTx, totalAmount: ''}); }}
                 >By Shares</button>
                 <button 
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md ${txInputMode === 'total' ? 'bg-white dark:bg-slate-800 shadow' : 'text-slate-500'}`}
                    onClick={() => { setTxInputMode('total'); setNewTx({...newTx, amount: ''}); }}
                 >By Total Invested</button>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 {txInputMode === 'total' ? (
                   <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Total Amount ({getSymbol(selectedHolding?.currency)})</label>
                      <input 
                        type="number" 
                        value={newTx.totalAmount}
                        onChange={(e) => setNewTx({ ...newTx, totalAmount: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} 
                        placeholder="0" 
                      />
                   </div>
                 ) : (
                   <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Shares</label>
                      <input 
                        type="number" 
                        value={newTx.amount}
                        onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} 
                        placeholder="0" 
                      />
                   </div>
                 )}
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Price per Share ({getSymbol(selectedHolding?.currency)})</label>
                    <input 
                      type="number" 
                      value={newTx.price}
                      onChange={(e) => setNewTx({ ...newTx, price: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} 
                      placeholder="0" 
                    />
                 </div>
                 <div className="col-span-2 text-xs text-slate-500 mt-[-8px]">
                    {txInputMode === 'total' 
                      ? `Calculated Shares: ${newTx.totalAmount && newTx.price ? (parseFloat(newTx.totalAmount) / parseFloat(newTx.price)).toFixed(4) : 0}`
                      : `Calculated Total: ${getSymbol(selectedHolding?.currency)}${newTx.amount && newTx.price ? (parseFloat(newTx.amount) * parseFloat(newTx.price)).toLocaleString() : 0}`
                    }
                 </div>
               </div>
            </div>

            <button 
              onClick={handleAddTransaction}
              className={`w-full mt-8 py-4 rounded-xl font-bold transition-colors ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
            >
              Add Transaction
            </button>
          </div>
        </div>
      )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold">{activeCategory === 'All' ? 'Investments' : activeCategory}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track your wealth and assets</p>
        </div>
        <div className="flex gap-2 items-center">
          {displayCurrency === 'PHP' && exchangeRates['PHP'] && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${isAdvanced ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
              <Activity size={14} className="text-emerald-500" />
              1 USD = {exchangeRates['PHP'].toFixed(2)} PHP
            </div>
          )}
          {displayCurrency === 'USD' && exchangeRates['PHP'] && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${isAdvanced ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
              <Activity size={14} className="text-emerald-500" />
              1 PHP = {(1 / exchangeRates['PHP']).toFixed(4)} USD
            </div>
          )}
          {displayCurrency !== 'USD' && displayCurrency !== 'PHP' && exchangeRates[displayCurrency] && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${isAdvanced ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
              <Activity size={14} className="text-emerald-500" />
              1 USD = {exchangeRates[displayCurrency].toFixed(2)} {displayCurrency}
            </div>
          )}
          <select
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value as any)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium outline-none ${isAdvanced ? 'bg-slate-800 border border-slate-700 text-slate-300' : 'bg-white border border-slate-200 text-slate-600'}`}
          >
            <option value="USD">USD</option>
            <option value="PHP">PHP</option>
          </select>
          <button 
            onClick={async () => {
               try {
                 await fetch('/api/portfolios/sync', { method: 'POST' });
                 const res = await fetch('/api/portfolios');
                 const data = await res.json();
                 const formatted = mapPortfolioData(Array.isArray(data) ? data : []);
                 setInvestmentsData(formatted);
               } catch(e) {}
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isAdvanced ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700' : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-sm'}`}
          >
            <RefreshCw size={16} /> <span className="hidden sm:inline">Sync Prices</span>
          </button>
          <button 
            onClick={() => {
              setNewAsset({ name: '', type: activeCategory !== 'All' ? activeCategory : 'Stocks', shares: '', avgPrice: '', currentValue: '', invested: '', ticker: '', currency: displayCurrency, platform: '' });
              setEditingId(null);
              setIsModalOpen(true);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-900/20' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'}`}
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Asset</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 rounded-3xl p-1 sm:p-6 shadow-sm border flex flex-col ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="p-4 sm:p-0 flex justify-between items-start mb-6">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">Total Balance</p>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-4 mb-1">
                {getSymbol(displayCurrency)}{totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </h1>
              <p className="text-emerald-500 font-medium text-sm flex items-center gap-1">
                {chartGain >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />} 
   {chartGain >= 0 ? '+' : '-'}{getSymbol(displayCurrency)}{Math.abs(chartGain).toLocaleString(undefined, { maximumFractionDigits: 2 })} ({chartGainPercent > 0 ? '+' : ''}{chartGainPercent.toFixed(1)}%) 
   <span className="text-slate-400 ml-1 font-normal">{timeframe}</span>
              </p>
            </div>
            <div className={`flex p-1 rounded-xl ${isAdvanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
               {timeframes.map(tf => (
                 <button 
                   key={tf}
                   onClick={() => setTimeframe(tf)}
                   className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${timeframe === tf ? (isAdvanced ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                 >
                   {tf}
                 </button>
               ))}
            </div>
          </div>

          <div className="h-[300px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'Portfolio' ? (
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isAdvanced ? '#94a3b8' : '#64748b' }} minTickGap={20} padding={{ left: 20, right: 20 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isAdvanced ? '#94a3b8' : '#64748b' }} tickFormatter={(val) => `${getSymbol(displayCurrency)}${(val/1000)}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: isAdvanced ? '#1e293b' : '#ffffff', border: isAdvanced ? '1px solid #334155' : '1px solid #e2e8f0', borderRadius: '12px' }} 
                    formatter={(value: number, name: string) => [`${getSymbol(displayCurrency)}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, name]}
                  />
                  <Area type="monotone" dataKey="Total Value" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Total Invested" stroke={isAdvanced ? '#64748b' : '#94a3b8'} strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </AreaChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isAdvanced ? '#94a3b8' : '#64748b' }} minTickGap={20} padding={{ left: 20, right: 20 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isAdvanced ? '#94a3b8' : '#64748b' }} tickFormatter={(val) => `${getSymbol(displayCurrency)}${(val/1000)}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: isAdvanced ? '#1e293b' : '#ffffff', border: isAdvanced ? '1px solid #334155' : '1px solid #e2e8f0', borderRadius: '12px' }} 
                    formatter={(value: number, name: string) => [`${getSymbol(displayCurrency)}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, name]}
                  />
                  {(activeCategory === 'All' || activeCategory === 'Real Estate') && visibleLines['Real Estate'] && <Line type="monotone" dataKey="Real Estate" stroke="#3B82F6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />}
                  {(activeCategory === 'All' || activeCategory === 'Stocks') && visibleLines['Stocks'] && <Line type="monotone" dataKey="Stocks" stroke="#10B981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />}
                  {(activeCategory === 'All' || activeCategory === 'Cryptos') && visibleLines['Cryptos'] && <Line type="monotone" dataKey="Cryptos" stroke="#F59E0B" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />}
                  {(activeCategory === 'All' || activeCategory === 'Others') && visibleLines['Others'] && <Line type="monotone" dataKey="Others" stroke="#8B5CF6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`rounded-3xl p-5 shadow-sm border flex flex-col items-center justify-center ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <h3 className="font-bold mb-2 self-start w-full flex justify-between items-center">
             Asset Allocation
             <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isAdvanced ? 'bg-slate-700 text-violet-300' : 'bg-emerald-50 text-emerald-600'}`}>Balanced Risk</span>
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${getSymbol(displayCurrency)}${value.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4 w-full">
            {pieData.map(d => (
               <div key={d.name} className="flex items-center text-xs text-slate-500">
                 <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: d.color }} />
                 <span className="truncate mr-1">{d.name}</span>
                 <span className="font-bold ml-auto">{((d.value / totalValue) * 100).toFixed(1)}%</span>
               </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-lg mb-3 px-1">Holdings</h3>
        <div className={`rounded-3xl shadow-sm border overflow-hidden ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          {filteredInvestments.map((inv, idx) => {
            const invested = inv.shares && inv.avgPrice ? inv.shares * inv.avgPrice : inv.invested;
            const gain = inv.value - invested;
            const gainPercent = invested > 0 ? (gain / invested) * 100 : 0;

            return (
              <div 
                key={inv.id} 
                onClick={() => setSelectedHolding(inv)}
                className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${idx !== filteredInvestments.length - 1 ? (isAdvanced ? 'border-b border-slate-700' : 'border-b border-slate-100') : ''}`}
              >
                <div className="flex items-center">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-4 font-bold ${inv.iconColor} shrink-0`}>
                    {inv.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-bold text-base">{inv.name} {inv.platform && <span className="text-xs font-normal text-slate-400 ml-1">({inv.platform})</span>}</p>
                      {inv.shares && inv.value ? (
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold ${gain >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                           <span className="opacity-70 font-medium">Avg: {getSymbol(inv.currency)}{inv.avgPrice.toLocaleString()}</span>
                           <span className="opacity-50 mx-0.5">•</span>
                           <span className="flex items-center gap-1">
                             Mkt: {getSymbol(inv.currency)}{(inv.value / inv.shares).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                             {gain >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                           </span>
                        </div>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {inv.type} {inv.shares != null ? `• ${inv.shares} shares` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right flex sm:block justify-between items-end w-full sm:w-auto">
                  <p className="font-bold text-lg">{getSymbol(inv.currency)}{inv.value.toLocaleString()}</p>
                  <p className={`text-xs font-medium ${gain >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {gain >= 0 ? '+' : ''}{getSymbol(inv.currency)}{gain.toLocaleString()} ({gainPercent.toFixed(2)}%)
                  </p>
                </div>
              </div>
            )
          })}
          {filteredInvestments.length === 0 && (
             <div className="p-8 text-center text-slate-500">
               No investments found in this category.
             </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div 
            className={`w-full max-w-md rounded-3xl shadow-xl flex flex-col p-6 overflow-y-auto max-h-[90vh] custom-scrollbar ${isAdvanced ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-white border border-slate-100'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editingId ? 'Edit Asset' : 'Add Asset'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
               {(newAsset.type === 'Stocks' || newAsset.type === 'Cryptos') && (
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Ticker Symbol (Optional, for auto-tracking)</label>
                    <input 
                      type="text" 
                      value={newAsset.ticker}
                      onChange={(e) => setNewAsset({ ...newAsset, ticker: e.target.value.toUpperCase() })}
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} 
                      placeholder="e.g. AAPL, BTC-USD" 
                    />
                 </div>
               )}
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Asset Name</label>
                    <input 
                      type="text" 
                      value={newAsset.name}
                      onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} 
                      placeholder="e.g. AAPL" 
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Currency</label>
                    <select 
                      value={newAsset.currency || 'USD'}
                      onChange={(e) => setNewAsset({ ...newAsset, currency: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}
                    >
                      <option value="USD">$ USD</option>
                      <option value="PHP">₱ PHP</option>
                      <option value="EUR">€ EUR</option>
                      <option value="GBP">£ GBP</option>
                    </select>
                 </div>
               </div>
               <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                  <select 
                    value={newAsset.type}
                    onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}
                  >
                    <option>Real Estate</option>
                    <option>Stocks</option>
                    <option>Cryptos</option>
                    <option>Others</option>
                  </select>
               </div>
               
               {(newAsset.type === 'Stocks' || newAsset.type === 'Cryptos') ? (
                 <>
                   {!editingId && (
                     <div className="mb-4 flex gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/50">
                        <button onClick={() => setAssetInputMode('shares')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${assetInputMode === 'shares' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>Shares & Invested</button>
                        <button onClick={() => setAssetInputMode('total')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${assetInputMode === 'total' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>Total Value</button>
                     </div>
                   )}
                   {!editingId && assetInputMode === 'shares' && (
                     <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Shares</label>
                          <input 
                            type="number" 
                            value={newAsset.shares}
                            onChange={(e) => setNewAsset({ ...newAsset, shares: e.target.value })}
                            className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} 
                            placeholder="0" 
                          />
                       </div>
                       <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Total Invested ({getSymbol(newAsset.currency)})</label>
                          <input 
                            type="number" 
                            value={newAsset.invested}
                            onChange={(e) => setNewAsset({ ...newAsset, invested: e.target.value })}
                            className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} 
                            placeholder="0" 
                          />
                       </div>
                       </div>
                       <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Current Value ({getSymbol(newAsset.currency)})</label>
                          <input 
                            type="number" 
                            value={newAsset.currentValue}
                            onChange={(e) => setNewAsset({ ...newAsset, currentValue: e.target.value })}
                            className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} 
                            placeholder="0" 
                          />
                       </div>
                     </div>
                   )}
                   {!editingId && assetInputMode === 'total' && (
                     <div className="space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Initial Invested Amount ({getSymbol(newAsset.currency)})</label>
                            <input 
                              type="number" 
                              value={newAsset.invested}
                              onChange={(e) => setNewAsset({ ...newAsset, invested: e.target.value })}
                              className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} 
                              placeholder="0" 
                            />
                         </div>
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Current Value ({getSymbol(newAsset.currency)})</label>
                            <input 
                              type="number" 
                              value={newAsset.currentValue}
                              onChange={(e) => setNewAsset({ ...newAsset, currentValue: e.target.value })}
                              className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} 
                              placeholder="0" 
                            />
                         </div>
                       </div>
                       <div className={`p-3 rounded-xl text-sm ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                           <p className="text-slate-500 mb-1">Calculated Shares {fetchedPrice !== null ? `(Current Price: ${getSymbol(newAsset.currency)}${fetchedPrice.toLocaleString()})` : ''}</p>
                           <p className="font-bold text-lg">
                             {fetchedPrice !== null && parseFloat(newAsset.currentValue) > 0 
                               ? `${(parseFloat(newAsset.currentValue) / fetchedPrice).toLocaleString(undefined, { maximumFractionDigits: 4 })} shares`
                               : (fetchedPrice === null ? <span className="text-slate-400 text-xs font-normal">Enter a valid ticker and current value to auto-calculate</span> : '0 shares')}
                           </p>
                         </div>
                     </div>
                   )}
                 </>
               ) : (
                 <>
                   {!editingId && (
                     <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Initial Invested Amount ({getSymbol(newAsset.currency)})</label>
                        <input 
                          type="number" 
                          value={newAsset.invested}
                          onChange={(e) => setNewAsset({ ...newAsset, invested: e.target.value })}
                          className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} 
                          placeholder="0" 
                        />
                     </div>
                   )}
                   <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Current Value ({getSymbol(newAsset.currency)})</label>
                      <input 
                        type="number" 
                        value={newAsset.currentValue}
                        onChange={(e) => setNewAsset({ ...newAsset, currentValue: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} 
                        placeholder="0" 
                      />
                   </div>
                 </>
               )}

               {editingId && (newAsset.type === 'Stocks' || newAsset.type === 'Cryptos') && (
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Current Value ({getSymbol(newAsset.currency)}) - Update manually for non-tracked assets</label>
                    <input 
                      type="number" 
                      value={newAsset.currentValue}
                      onChange={(e) => setNewAsset({ ...newAsset, currentValue: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} 
                      placeholder="0" 
                    />
                 </div>
               )}
               <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Platform or Shop (Optional)</label>
                  <input 
                    type="text" 
                    value={newAsset.platform}
                    onChange={(e) => setNewAsset({ ...newAsset, platform: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} 
                    placeholder="e.g. Binance, Gotrade, Local Shop" 
                  />
               </div>
            </div>

            <button 
              onClick={handleSaveAsset}
              className={`w-full mt-8 py-4 rounded-xl font-bold transition-colors ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
            >
              {editingId ? 'Save Changes' : 'Add Asset'}
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}
