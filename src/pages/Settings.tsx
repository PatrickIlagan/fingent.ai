import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Settings as SettingsIcon, Bot, CheckCircle2, Download, Upload, Shield, KeyRound, LockKeyhole, Moon, Sun, RefreshCw, CloudUpload, CloudDownload, AlertTriangle, Monitor, Save, FileSpreadsheet, FileText } from 'lucide-react';
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getByokSettings, saveByokSettings, testByokKey } from '../lib/byokAssistant';
import { exportEverythingWorkbook } from '../lib/workbookExport';
import { exportEverythingPdfStatement } from '../lib/export';

export function Settings() {
  const { themeMode, setThemeMode, triggerRefresh } = useStore();
  const isAdvanced = themeMode === 'advanced';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [encPassword, setEncPassword] = useState('');
  const [driveSyncing, setDriveSyncing] = useState(false);
  const [byok, setByok] = useState(getByokSettings);
  const [byokStatus, setByokStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [byokError, setByokError] = useState('');

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

  const handleDriveUpload = async () => {
    if (!encPassword) return alert("Please enter an encryption password first in the field above.");
    if (!auth || !isFirebaseConfigured) return alert('Google Drive is not configured. Add the VITE_FIREBASE_* values to .env.local, enable Google sign-in, and enable Google Drive API.');
    try {
      setDriveSyncing(true);
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (!token) throw new Error("No access token");

      const res = await fetch('/api/system/drive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: token, password: encPassword })
      });
      const data = await res.json();
      if (data.success) {
        alert("Successfully encrypted and synced to Google Drive!");
      } else {
        alert("Failed to sync: " + data.error);
      }
    } catch(err: any) {
      alert("Drive sync failed: " + err.message);
    } finally {
      setDriveSyncing(false);
    }
  };

  const handleDriveDownload = async () => {
    if (!encPassword) return alert("Please enter the exact encryption password used during backup in the field above.");
    if (!auth || !isFirebaseConfigured) return alert('Google Drive is not configured. Add the VITE_FIREBASE_* values to .env.local, enable Google sign-in, and enable Google Drive API.');
    try {
      setDriveSyncing(true);
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (!token) throw new Error("No access token");

      const res = await fetch('/api/system/drive/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: token, password: encPassword })
      });
      const data = await res.json();
      if (data.success) {
        alert("Successfully restored from Google Drive!");
        triggerRefresh();
        window.location.reload();
      } else {
        alert("Failed to restore: " + data.error);
      }
    } catch(err: any) {
      alert("Drive restore failed: " + err.message);
    } finally {
      setDriveSyncing(false);
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

          <div className="flex items-start gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className={`mt-0.5 rounded-xl p-2 ${isAdvanced ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}><LockKeyhole size={18} /></div>
            <div>
              <p className="font-bold">Local Copilot privacy</p>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">The local copilot prepares actions from your commands and saves only after you confirm. Account matching, financial details, and chat history stay inside FinGent. It has no API key and does not send records or chats to an external AI service.</p>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-bold flex items-center gap-2"><Bot size={18} /> Optional Gemini BYOK</p><p className="mt-1 max-w-2xl text-sm text-slate-500">BYOK never receives your chat text or history. When enabled, FinGent sends Gemini only one fixed generic intent class (for example, <code>TRANSACTION_RECORDING</code>) for workflow guidance—never names, amounts, balances, categories, records, or account details. Your key is held only for this browser session and is cleared when the session ends.</p></div><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={byok.enabled} onChange={event => setByok(value => ({ ...value, enabled: event.target.checked }))} className="h-4 w-4 accent-emerald-600" /> Enable no-chat BYOK guidance</label></div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row"><input type="password" value={byok.apiKey} onChange={event => setByok(value => ({ ...value, apiKey: event.target.value }))} placeholder="Gemini API key" autoComplete="off" className={`min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm outline-none ${isAdvanced ? 'border border-slate-700 bg-slate-900 text-white focus:border-violet-500' : 'border border-slate-200 bg-slate-50 focus:border-emerald-500'}`} /><button onClick={saveByok} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${isAdvanced ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-900 text-white hover:bg-slate-800'}`}><Save size={16} className="mr-1 inline" /> Save key</button><button onClick={verifyByok} disabled={byokStatus === 'testing'} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">{byokStatus === 'testing' ? <RefreshCw size={16} className="mr-1 inline animate-spin" /> : <KeyRound size={16} className="mr-1 inline" />} Test key</button></div>
            {byokStatus === 'connected' && <p className="mt-3 flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 size={16} /> Key verified and stored locally.</p>}{byokError && <p className="mt-3 text-sm text-rose-600">{byokError}</p>}
          </div>
        </div>
      </div>

      <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <h3 className="text-lg font-bold flex items-center gap-2 mb-6"><Shield size={20} /> Data Management</h3>
        <p className="text-sm text-slate-500 mb-6">FinGent stores data locally. Google Drive backups are encrypted locally with AES-256-GCM before upload, so Drive only receives encrypted backup bytes.</p>
        
        <div className="mb-6">
          <label className="block text-sm font-bold mb-1">Database Encryption Password</label>
          <p className="text-xs text-slate-500 mb-2">Required for Google Drive Cloud Sync. Your data will be encrypted with this key before uploading. If you forget this password, your cloud backup cannot be recovered!</p>
          <input 
            type="password" 
            value={encPassword}
            onChange={(e) => setEncPassword(e.target.value)}
            placeholder="Enter a strong password..." 
            className={`w-full max-w-md px-4 py-2 rounded-xl text-sm outline-none transition-colors ${isAdvanced ? 'bg-slate-900 border border-slate-700 focus:border-violet-500 text-white' : 'bg-slate-50 border border-slate-200 focus:border-emerald-500'}`}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className={`p-5 rounded-2xl border ${isAdvanced ? 'border-slate-700 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
            <h4 className="font-bold flex items-center gap-2 mb-2"><CloudUpload size={18} /> Cloud Backup</h4>
            <p className="text-sm text-slate-500 mb-4">Encrypt and save your database to your personal Google Drive.</p>
            <button 
              onClick={handleDriveUpload}
              disabled={driveSyncing}
              className={`w-full py-2.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-colors disabled:opacity-50 ${isAdvanced ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              {driveSyncing ? <RefreshCw className="animate-spin" size={16} /> : 'Sync to Drive'}
            </button>
          </div>
          
          <div className={`p-5 rounded-2xl border ${isAdvanced ? 'border-slate-700 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
            <h4 className="font-bold flex items-center gap-2 mb-2"><CloudDownload size={18} /> Cloud Restore</h4>
            <p className="text-sm text-slate-500 mb-4">Download and decrypt your database from Google Drive.</p>
            <button 
              onClick={handleDriveDownload}
              disabled={driveSyncing}
              className={`w-full py-2.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-colors disabled:opacity-50 ${isAdvanced ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-800 hover:bg-slate-900 text-white'}`}
            >
              {driveSyncing ? <RefreshCw className="animate-spin" size={16} /> : 'Restore from Drive'}
            </button>
          </div>
        </div>
        {!isFirebaseConfigured && <div className={`mb-6 rounded-2xl border p-4 text-sm ${isAdvanced ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-900'}`}><p className="font-bold">Google Drive needs one-time project setup</p><p className="mt-1">Add the <code>VITE_FIREBASE_*</code> values from <code>.env.example</code> to <code>.env.local</code>, enable Google sign-in in Firebase Authentication, enable the Google Drive API for that Google Cloud project, and add this app URL to Firebase’s authorized domains.</p></div>}


        <div className="pt-6 border-t border-slate-100 dark:border-slate-700 grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2 grid gap-4 md:grid-cols-3">
            <div className={`rounded-2xl border p-4 ${isAdvanced ? 'border-slate-700 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}><h4 className="font-bold flex items-center gap-2"><FileSpreadsheet size={18} /> Complete Excel workbook</h4><p className="mt-1 text-sm text-slate-500">Export every module to a formatted multi-sheet workbook with formulas and charts.</p><button onClick={() => exportEverythingWorkbook().catch(error => alert(error.message || 'Excel export failed.'))} className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${isAdvanced ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>Export Excel</button></div>
            <div className={`rounded-2xl border p-4 ${isAdvanced ? 'border-slate-700 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}><h4 className="font-bold flex items-center gap-2"><FileText size={18} /> Financial statement PDF</h4><p className="mt-1 text-sm text-slate-500">Save a styled statement with balances, transactions, ventures, and freelancing data.</p><button onClick={() => exportEverythingPdfStatement().catch(error => alert(error.message || 'PDF export failed.'))} className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${isAdvanced ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-800 text-white hover:bg-slate-900'}`}>Export PDF</button></div>
            <div className={`rounded-2xl border p-4 ${isAdvanced ? 'border-slate-700 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}><h4 className="font-bold flex items-center gap-2"><Download size={18} /> Complete database backup</h4><p className="mt-1 text-sm text-slate-500">Export an unencrypted <code>.db</code> file for full-fidelity restore into FinGent.</p><button onClick={handleExport} className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold border ${isAdvanced ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-white'}`}>Export database</button></div>
          </div>
          <div className="md:col-span-2 mb-2">
            <h4 className="font-bold flex items-center gap-2 mb-2"><Monitor size={18} /> FinGent for Windows</h4>
            <p className="text-sm text-slate-500">Use the official <code>FinGent-Setup.exe</code> installer distributed with a release. The installed app runs its own loopback-only server and stores your SQLite database in your Windows user profile—not in the installer folder or a hosted service.</p>
          </div>
        </div>
        <div className="pt-6 border-t border-slate-100 dark:border-slate-700 grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <h4 className="font-bold flex items-center gap-2 mb-2"><Upload size={18} /> Local Import</h4>
            <p className="text-sm text-slate-500 mb-4">Restore a full-fidelity <code>.db</code> backup. FinGent validates the SQLite file before replacing the current database; this operation cannot import Excel or PDF exports.</p>
            <input type="file" accept=".db" className="hidden" ref={fileInputRef} onChange={handleImport} />
            <button disabled={importing} onClick={() => fileInputRef.current?.click()} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors disabled:opacity-60 ${isAdvanced ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}>{importing ? <RefreshCw size={16} className="mr-1 inline animate-spin" /> : null}Import database</button>
          </div>
        </div>
      </div>

      <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-rose-500"><AlertTriangle size={20} /> Disclaimers & Liability</h3>
        <div className={`p-4 rounded-xl text-sm space-y-3 ${isAdvanced ? 'bg-slate-900/50 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
          <p><strong>1. Data Privacy & Security:</strong> FinGent is designed to operate primarily via local/containerized storage to ensure the highest level of privacy. If you choose to use the Google Drive cloud sync, your data will be encrypted locally using AES-256-CBC before transmission. We do not store, access, or intercept your encryption password. You are solely responsible for securely storing your encryption password. If it is lost, your cloud backups cannot be recovered.</p>
          <p><strong>2. Local Copilot:</strong> FinGent’s copilot can prepare and, after an explicit confirmation, save records locally. It does not send financial details to an external AI service and does not provide personalised financial advice.</p>
          <p><strong>3. Limitation of Liability:</strong> By using FinGent, you agree that the developers shall not be held liable for any data loss, financial losses, miscalculations, or any direct/indirect damages arising from the use of this application. Always verify critical financial information independently.</p>
        </div>
      </div>
    </div>
  );
}
