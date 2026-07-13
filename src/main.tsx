import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installNativeApi } from './lib/mobileApi.ts';
import { AppLock } from './components/AppLock.tsx';

async function bootstrap() {
  await installNativeApi();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
    <AppLock><App /></AppLock>
    </StrictMode>,
  );
}

void bootstrap();
