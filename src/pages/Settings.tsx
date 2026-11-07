import React, { useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useStore } from '../store/useStore';
import { Settings as SettingsIcon, Bot, CheckCircle2, Download, Upload, Shield, KeyRound, LockKeyhole, Moon, Sun, RefreshCw, CloudUpload, CloudDownload, AlertTriangle, Monitor, Save, FileSpreadsheet, FileText, Palette, PanelsTopLeft, Eye, EyeOff, Sparkles } from 'lucide-react';
import { getByokSettings, saveByokSettings, testByokKey } from '../lib/byokAssistant';
import { exportEverythingWorkbook } from '../lib/workbookExport';
import { exportEverythingPdfStatement } from '../lib/export';
import { GoogleSyncCard } from '../components/GoogleSyncCard';
import { itemById } from '../lib/rewardsCatalog';

export function Settings() {
  const { themeMode, setThemeMode, accentColor, setAccentColor, hiddenTabs, toggleTabVisibility, triggerRefresh, aiEnabled, setAiEnabled, suggestionsEnabled, setSuggestionsEnabled, geminiSuggestions, setGeminiSuggestions, dismissedSuggestions, restoreSuggestions, rewards } = useStore();
  const isAdvanced = themeMode === 'advanced';
  // The mobile apps keep records in their own encrypted store, so the desktop .db file cannot be exported or imported there.
  const isNative = Capacitor.isNativePlatform();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [byok, setByok] = useState(getByokSettings);
  const [byokStatus, setByokStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [byokError, setByokError] = useState('');
  const moduleOptions = [
    ['rewards', 'Ipon (pet & points)'], ['accounts', 'Accounts'], ['liabilities', 'Liabilities'], ['plans', 'Plans'], ['calendar', 'Calendar'],
    ['investments', 'Investments'], ['career', 'Career'], ['business', 'Business'], ['freelancing', 'Freelancing'],
    ['taxes', 'Taxes'], ['categories', 'Categories'], ['personal', 'Personal space']
  ];
  const accentOptions = [
    { id: 'emerald' as const, label: 'Emerald', swatch: 'from-emerald-400 to-teal-500' },
    { id: 'ocean' as const, label: 'Ocean', swatch: 'from-blue-500 to-cyan-500' },
    { id: 'violet' as const, label: 'Violet', swatch: 'from-violet-500 to-fuchsia-500' },
    { id: 'sunset' as const, label: 'Sunset', swatch: 'from-rose-500 to-orange-400' },
    { id: 'mango' as const, label: 'Mango', swatch: 'from-amber-400 to-orange-500', item: 'theme-mango' },
    { id: 'sakura' as const, label: 'Sakura', swatch: 'from-pink-400 to-rose-400', item: 'theme-sakura' },
    { id: 'matcha' as const, label: 'Matcha', swatch: 'from-lime-400 to-green-500', item: 'theme-matcha' },
    { id: 'midnight' as const, label: 'Midnight', swatch: 'from-indigo-500 to-slate-700', item: 'theme-midnight' }
  ];
  const ownedRewards = new Set(rewards?.owned ?? []);

  const handleExport = () => {
    window.location.href = '/api/system/export';
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('db', file);

    setImporting(true);
    try {
      const res = await fetch('/api/system/import', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        alert('Database imported successfully!');
        triggerRefresh();
        window.location.reload();
      } else {
        const data = await res.json();
        alert('Error importing: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error importing database');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  const saveByok = () => {
    saveByokSettings({ enabled: byok.enabled, apiKey: byok.apiKey.trim() });
    setByokStatus('idle');
    setByokError('');
  };

  const verifyByok = async () => {
    if (!byok.apiKey.trim()) return setByokError('Enter an API key first.');
    setByokStatus('testing');
    setByokError('');
    try {
      await testByokKey(byok.apiKey.trim());
      saveByokSettings({ enabled: byok.enabled, apiKey: byok.apiKey.trim() });
      setByokStatus('connected');
    } catch (error) {
      setByokStatus('error');
      setByokError(error instanceof Error ? error.message : 'Could not verify the API key.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage app preferences and data</p>
        </div>
      </div>

      <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <h3 className="text-lg font-bold flex items-center gap-2 mb-6"><SettingsIcon size={20} /> Preferences</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">App Theme</p>
              <p className="text-sm text-slate-500">Switch between Advanced (Dark) and Basic (Light) modes</p>
            </div>
            <button 
              onClick={() => setThemeMode(isAdvanced ? 'basic' : 'advanced')}
              className={`p-3 rounded-xl transition-colors flex items-center gap-2 ${isAdvanced ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-medium'}`}
            >
              {isAdvanced ? <><Sun size={18} /> Basic Mode</> : <><Moon size={18} /> Advanced Mode</>}
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="mb-3 flex items-center gap-2"><Palette size={18} /><div><p className="font-bold">Accent color</p><p className="text-sm text-slate-500">Personalize navigation, highlights, and primary actions.</p></div></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {accentOptions.map(option => { const locked = 'item' in option && !ownedRewards.has(String(option.item)); const cost = 'item' in option ? itemById(String(option.item))?.cost : 0; return <button key={option.id} disabled={locked} title={locked ? `Unlock in Ipon for ${cost} points` : undefined} onClick={() => setAccentColor(option.id)} className={`relative rounded-2xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${accentColor === option.id ? (isAdvanced ? 'border-white/40 bg-slate-700' : 'border-slate-400 bg-slate-50 shadow-sm') : (isAdvanced ? 'border-slate-700 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300')}`}><span className={`mb-2 block h-8 rounded-xl bg-gradient-to-r ${option.swatch}`} /><span className="text-xs font-bold">{option.label}</span>{accentColor === option.id && <CheckCircle2 size={14} className="float-right mt-0.5 text-emerald-500" />}{locked && <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-bold text-white"><LockKeyhole size={10} /> {cost}</span>}</button>; })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="mb-3 flex items-center gap-2"><PanelsTopLeft size={18} /><div><p className="font-bold">Visible workspaces</p><p className="text-sm text-slate-500">Hide modules you do not use. Their data is kept and can be restored anytime.</p></div></div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {moduleOptions.map(([id, label]) => { const visible = !hiddenTabs.includes(id); return <button key={id} onClick={() => toggleTabVisibility(id)} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left text-sm font-bold ${visible ? (isAdvanced ? 'border-slate-600 bg-slate-700/60' : 'border-emerald-200 bg-emerald-50 text-emerald-900') : (isAdvanced ? 'border-slate-800 bg-slate-900/50 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-400')}`}><span>{label}</span>{visible ? <Eye size={16} /> : <EyeOff size={16} />}</button>; })}
            </div>
            <p className="mt-2 text-xs text-slate-500">Home and Settings always remain available.</p>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-start justify-between gap-4">
              <div><p className="font-bold flex items-center gap-2"><Sparkles size={18} /> AI features</p><p className="mt-1 max-w-2xl text-sm text-slate-500">Suggestions and Home insights are worked out on this device from your own records. Turning this off hides them and stops every Gemini request. The Copilot keeps working for commands.</p></div>
              <Switch advanced={isAdvanced} label="AI features" checked={aiEnabled} onChange={setAiEnabled} />
            </div>
            {aiEnabled && <div className={`mt-4 space-y-3 rounded-2xl p-4 ${isAdvanced ? 'bg-slate-900/40' : 'bg-slate-50'}`}>
              <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold">Suggestions on pages</p><p className="mt-0.5 text-xs text-slate-500">Up to three tips per page. Tips you dismiss stay hidden on this device.</p></div><Switch advanced={isAdvanced} label="Suggestions on pages" checked={suggestionsEnabled} onChange={setSuggestionsEnabled} /></div>
              <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold">Let Gemini add a tip</p><p className="mt-0.5 text-xs text-slate-500">Off by default. Uses your own Gemini key below. Gemini receives only the page name and fixed, generic facts such as “a savings goal is behind pace”, never names, amounts, accounts, notes, or transactions.</p></div><Switch advanced={isAdvanced} label="Let Gemini add a tip" checked={geminiSuggestions && suggestionsEnabled} disabled={!suggestionsEnabled} onChange={setGeminiSuggestions} /></div>
              {dismissedSuggestions.length > 0 && <button onClick={restoreSuggestions} className={`text-xs font-bold ${isAdvanced ? 'text-violet-300' : 'text-emerald-700'}`}>Show {dismissedSuggestions.length} dismissed tip{dismissedSuggestions.length === 1 ? '' : 's'} again</button>}
            </div>}
          </div>

          <div className="flex items-start gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className={`mt-0.5 rounded-xl p-2 ${isAdvanced ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}><LockKeyhole size={18} /></div>
            <div>
              <p className="font-bold">Local Copilot privacy</p>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">The local copilot prepares actions from your commands and saves only after you confirm. Account matching, financial details, and chat history stay inside FinGent. It has no API key and does not send records or chats to an external AI service.</p>
            </div>
          </div>
          {aiEnabled && <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-bold flex items-center gap-2"><Bot size={18} /> Optional Gemini BYOK</p><p className="mt-1 max-w-2xl text-sm text-slate-500">BYOK never receives your chat text or history. When enabled, FinGent sends Gemini only one fixed generic intent class (for example, <code>TRANSACTION_RECORDING</code>) for workflow guidance—never names, amounts, balances, categories, records, or account details. Your key is held only for this browser session and is cleared when the session ends.</p></div><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={byok.enabled} onChange={event => setByok(value => ({ ...value, enabled: event.target.checked }))} className="h-4 w-4 accent-emerald-600" /> Enable no-chat BYOK guidance</label></div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row"><input type="password" value={byok.apiKey} onChange={event => setByok(value => ({ ...value, apiKey: event.target.value }))} placeholder="Gemini API key" autoComplete="off" className={`min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm outline-none ${isAdvanced ? 'border border-slate-700 bg-slate-900 text-white focus:border-violet-500' : 'border border-slate-200 bg-slate-50 focus:border-emerald-500'}`} /><button onClick={saveByok} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${isAdvanced ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-900 text-white hover:bg-slate-800'}`}><Save size={16} className="mr-1 inline" /> Save key</button><button onClick={verifyByok} disabled={byokStatus === 'testing'} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">{byokStatus === 'testing' ? <RefreshCw size={16} className="mr-1 inline animate-spin" /> : <KeyRound size={16} className="mr-1 inline" />} Test key</button></div>
            {byokStatus === 'connected' && <p className="mt-3 flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 size={16} /> Key verified and stored locally.</p>}{byokError && <p className="mt-3 text-sm text-rose-600">{byokError}</p>}
          </div>}
        </div>
      </div>

      <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <h3 className="text-lg font-bold flex items-center gap-2 mb-6"><Shield size={20} /> Data Management</h3>
        <p className="text-sm text-slate-500 mb-4">FinGent keeps your data on this device. Sync and backups are encrypted here before anything leaves it.</p>
        <div className="mb-6"><GoogleSyncCard /></div>


        <div className="pt-6 border-t border-slate-100 dark:border-slate-700 grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2 grid gap-4 md:grid-cols-3">
            <div className={`rounded-2xl border p-4 ${isAdvanced ? 'border-slate-700 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}><h4 className="font-bold flex items-center gap-2"><FileSpreadsheet size={18} /> Complete Excel workbook</h4><p className="mt-1 text-sm text-slate-500">Export every module to a formatted multi-sheet workbook with formulas and charts.</p><button onClick={() => exportEverythingWorkbook().catch(error => alert(error.message || 'Excel export failed.'))} className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${isAdvanced ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>Export Excel</button></div>
            <div className={`rounded-2xl border p-4 ${isAdvanced ? 'border-slate-700 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}><h4 className="font-bold flex items-center gap-2"><FileText size={18} /> Financial statement PDF</h4><p className="mt-1 text-sm text-slate-500">Save a styled statement with balances, transactions, ventures, and freelancing data.</p><button onClick={() => exportEverythingPdfStatement().catch(error => alert(error.message || 'PDF export failed.'))} className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${isAdvanced ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-800 text-white hover:bg-slate-900'}`}>Export PDF</button></div>
            {isNative
              ? <div className={`rounded-2xl border p-4 ${isAdvanced ? 'border-slate-700 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}><h4 className="font-bold flex items-center gap-2"><Download size={18} /> Complete backup</h4><p className="mt-1 text-sm text-slate-500">On mobile, use the encrypted Google Drive sync above for a full backup. It restores on Android, iOS, and Windows.</p></div>
              : <div className={`rounded-2xl border p-4 ${isAdvanced ? 'border-slate-700 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}><h4 className="font-bold flex items-center gap-2"><Download size={18} /> Complete database backup</h4><p className="mt-1 text-sm text-slate-500">Export the encrypted <code>.db</code> for full-fidelity restore. Import requires the same FinGent app password.</p><button onClick={handleExport} className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold border ${isAdvanced ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-white'}`}>Export database</button></div>}
          </div>
          <div className="md:col-span-2 mb-2">
            <h4 className="font-bold flex items-center gap-2 mb-2"><Monitor size={18} /> FinGent for Windows</h4>
            <p className="text-sm text-slate-500">Use the official <code>FinGent-Setup.exe</code> installer distributed with a release. The installed app runs its own loopback-only server and stores your SQLite database in your Windows user profile—not in the installer folder or a hosted service.</p>
          </div>
        </div>
        {!isNative && <div className="pt-6 border-t border-slate-100 dark:border-slate-700 grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <h4 className="font-bold flex items-center gap-2 mb-2"><Upload size={18} /> Local Import</h4>
            <p className="text-sm text-slate-500 mb-4">Restore a full-fidelity <code>.db</code> backup. FinGent validates the SQLite file before replacing the current database; this operation cannot import Excel or PDF exports.</p>
            <input type="file" accept=".db" className="hidden" ref={fileInputRef} onChange={handleImport} />
            <button disabled={importing} onClick={() => fileInputRef.current?.click()} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors disabled:opacity-60 ${isAdvanced ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}>{importing ? <RefreshCw size={16} className="mr-1 inline animate-spin" /> : null}Import database</button>
          </div>
        </div>}
      </div>

      <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-rose-500"><AlertTriangle size={20} /> Disclaimers & Liability</h3>
        <div className={`p-4 rounded-xl text-sm space-y-3 ${isAdvanced ? 'bg-slate-900/50 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
          <p><strong>1. Data Privacy & Security:</strong> FinGent is designed to operate primarily via local/containerized storage to ensure the highest level of privacy. If you connect Google sync, your data is encrypted on your device with your app password (AES-256-GCM) before it is uploaded to a private Google Drive app folder. We never receive your password or your data. A lost app password cannot be recovered.</p>
          <p><strong>2. Local Copilot and suggestions:</strong> FinGent’s copilot can prepare and, after an explicit confirmation, save records locally. Page suggestions and insights are calculated on your device. Neither sends financial details to an external AI service, and neither provides personalised financial advice. If you turn on the optional Gemini features with your own key, Gemini receives only generic facts or a fixed intent class, never your records. You can turn all AI features off in Settings.</p>
          <p><strong>3. Limitation of Liability:</strong> By using FinGent, you agree that the developers shall not be held liable for any data loss, financial losses, miscalculations, or any direct/indirect damages arising from the use of this application. Always verify critical financial information independently.</p>
        </div>
      </div>
    </div>
  );
}

function Switch({ advanced, label, checked, disabled = false, onChange }: { advanced: boolean; label: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${checked ? (advanced ? 'bg-violet-600' : 'bg-emerald-500') : (advanced ? 'bg-slate-600' : 'bg-slate-300')}`}>
    <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
  </button>;
}
