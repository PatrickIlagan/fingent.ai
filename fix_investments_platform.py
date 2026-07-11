with open("src/pages/Investments.tsx", "r") as f:
    content = f.read()

# Add to state
old_state = "const [newAsset, setNewAsset] = useState({\n    name: '', type: 'Stocks', shares: '', avgPrice: '', currentValue: '', invested: '', ticker: '', currency: 'USD'\n  });"
new_state = "const [newAsset, setNewAsset] = useState({\n    name: '', type: 'Stocks', shares: '', avgPrice: '', currentValue: '', invested: '', ticker: '', currency: 'USD', platform: ''\n  });"
content = content.replace(old_state, new_state)

# Add to reset when Add Asset is clicked
old_reset = "setNewAsset({ name: '', type: activeCategory !== 'All' ? activeCategory : 'Stocks', shares: '', avgPrice: '', currentValue: '', invested: '', ticker: '', currency: displayCurrency });"
new_reset = "setNewAsset({ name: '', type: activeCategory !== 'All' ? activeCategory : 'Stocks', shares: '', avgPrice: '', currentValue: '', invested: '', ticker: '', currency: displayCurrency, platform: '' });"
content = content.replace(old_reset, new_reset)

# Add platform to API call POST
old_post = """          body: JSON.stringify({
            type: newAsset.type,
            name: newAsset.name,
            invested: finalInvested,
            current_value: finalCurrentValue,
            shares: finalShares,
            avg_price: finalAvgPrice,
            ticker: newAsset.ticker || '',
            currency: newAsset.currency
          })"""
new_post = """          body: JSON.stringify({
            type: newAsset.type,
            name: newAsset.name,
            invested: finalInvested,
            current_value: finalCurrentValue,
            shares: finalShares,
            avg_price: finalAvgPrice,
            ticker: newAsset.ticker || '',
            currency: newAsset.currency,
            platform: newAsset.platform || ''
          })"""
content = content.replace(old_post, new_post)

# Add platform to API call PUT
old_put = """          body: JSON.stringify({
            type: newAsset.type,
            name: newAsset.name,
            invested: finalInvested,
            current_value: finalCurrentValue,
            ticker: newAsset.ticker || '',
            currency: newAsset.currency
          })"""
new_put = """          body: JSON.stringify({
            type: newAsset.type,
            name: newAsset.name,
            invested: finalInvested,
            current_value: finalCurrentValue,
            ticker: newAsset.ticker || '',
            currency: newAsset.currency,
            platform: newAsset.platform || ''
          })"""
content = content.replace(old_put, new_put)

# Add to UI
ui_insertion = """               <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Platform or Shop (Optional)</label>
                  <input 
                    type="text" 
                    value={newAsset.platform}
                    onChange={(e) => setNewAsset({ ...newAsset, platform: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none ${isAdvanced ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`} 
                    placeholder="e.g. Binance, Gotrade, Local Shop" 
                  />
               </div>"""

target_ui = """               {editingId && (newAsset.type === 'Stocks' || newAsset.type === 'Cryptos') && (
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
               )}"""

new_ui = target_ui + "\n" + ui_insertion

content = content.replace(target_ui, new_ui)

with open("src/pages/Investments.tsx", "w") as f:
    f.write(content)
