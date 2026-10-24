import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installNativeApi } from './lib/mobileApi.ts';
import { installLockedResponseGuard } from './lib/appLock.ts';
import { AppLock } from './components/AppLock.tsx';
import { Capacitor } from '@capacitor/core';

async function bootstrap() {
  if (!Capacitor.isNativePlatform()) installLockedResponseGuard();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
    <AppLock onUnlock={async (password) => {
      // On desktop, verifying the password already unlocked the local server.
      if (Capacitor.isNativePlatform()) await installNativeApi(password);
    }}><App /></AppLock>
    </StrictMode>,
  );
}

void bootstrap();
