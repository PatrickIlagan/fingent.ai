import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installNativeApi } from './lib/mobileApi.ts';
import { AppLock } from './components/AppLock.tsx';
import { Capacitor } from '@capacitor/core';

async function bootstrap() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
    <AppLock onUnlock={async (password) => {
      if (Capacitor.isNativePlatform()) await installNativeApi(password);
      else {
        const response = await fetch('/api/system/unlock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }), cache: 'no-store', referrerPolicy: 'no-referrer' });
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Could not unlock the local database.');
      }
    }}><App /></AppLock>
    </StrictMode>,
  );
}

void bootstrap();
