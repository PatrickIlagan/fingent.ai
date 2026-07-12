import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Settings as SettingsIcon, Download, Upload, Shield, LockKeyhole, Moon, Sun, RefreshCw, CloudUpload, CloudDownload, AlertTriangle, Monitor } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export function Settings() {
  const { themeMode, setThemeMode, triggerRefresh } = useStore();
  const isAdvanced = themeMode === 'advanced';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [encPassword, setEncPassword] = useState('');
  const [driveSyncing, setDriveSyncing] = useState(false);

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
              <p className="mt-1 max-w-2xl text-sm text-slate-500">The copilot can prepare actions from your commands and save them only after you confirm. Your account matching and financial details stay inside FinGent. It has no API key and does not send records to an external AI service. Any future AI request will use placeholder tokens such as [ACCOUNT], [AMOUNT], and [REASON].</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-3xl p-6 shadow-sm border ${isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <h3 className="text-lg font-bold flex items-center gap-2 mb-6"><Shield size={20} /> Data Management</h3>
        <p className="text-sm text-slate-500 mb-6">FinGent stores your data locally. To ensure your financial data is completely secure, we use AES-256-CBC encryption before any cloud sync.</p>
        
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


        <div className="pt-6 border-t border-slate-100 dark:border-slate-700 grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2 mb-2">
            <h4 className="font-bold flex items-center gap-2 mb-2"><Monitor size={18} /> Desktop App</h4>
            <p className="text-sm text-slate-500 mb-4">Download an Electron wrapper to run FinGent as a standalone desktop application on Windows, Mac, or Linux.</p>
            <button 
              onClick={() => window.location.href = '/api/system/desktop-wrapper'}
              className={`w-full max-w-md py-2.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-colors ${isAdvanced ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-800 hover:bg-slate-900 text-white'}`}
            >
              <Download size={16} /> Download Desktop Wrapper
            </button>
          </div>
        </div>
        <div className="pt-6 border-t border-slate-100 dark:border-slate-700 grid md:grid-cols-2 gap-4">
          <div className="pr-4">
            <h4 className="font-bold flex items-center gap-2 mb-2"><Download size={18} /> Local Export</h4>
            <p className="text-sm text-slate-500 mb-4">Download your unencrypted .db file to your device.</p>
            <button onClick={handleExport} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${isAdvanced ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}>Export Local DB</button>
          </div>
          <div>
            <h4 className="font-bold flex items-center gap-2 mb-2"><Upload size={18} /> Local Import</h4>
            <p className="text-sm text-slate-500 mb-4">Upload an unencrypted .db file to replace current data.</p>
            <input type="file" accept=".db" className="hidden" ref={fileInputRef} onChange={handleImport} />
            <button onClick={() => fileInputRef.current?.click()} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${isAdvanced ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}>Import Local DB</button>
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
