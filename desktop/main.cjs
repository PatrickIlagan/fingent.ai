const { app, BrowserWindow, shell } = require('electron');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');

let mainWindow;

function writeStartupLog(message) {
  try {
    const dataDir = app.getPath('userData');
    fs.mkdirSync(dataDir, { recursive: true });
    fs.appendFileSync(path.join(dataDir, 'desktop-startup.log'), `[${new Date().toISOString()}] ${message}\n`);
  } catch {
    // Logging must never prevent the desktop app from starting.
  }
}

function findOpenPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen({ host: '127.0.0.1', port: 0 }, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

function waitForLocalServer(port, attempts = 60) {
  return new Promise((resolve, reject) => {
    const check = (remaining) => {
      let retried = false;
      const retryOnce = () => {
        if (retried) return;
        retried = true;
        retry(remaining);
      };
      const request = http.get({ host: '127.0.0.1', port, path: '/api/health', timeout: 1000 }, response => {
        response.resume();
        if (response.statusCode === 200) return resolve();
        retryOnce();
      });
      request.on('error', retryOnce);
      request.on('timeout', () => { request.destroy(); retryOnce(); });
    };
    const retry = (remaining) => {
      if (remaining <= 0) return reject(new Error('FinGent’s local server did not start.'));
      setTimeout(() => check(remaining - 1), 150);
    };
    check(attempts);
  });
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.ico'),
    backgroundColor: '#f8fffc',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: false
    }
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && ['I', 'J', 'C'].includes(input.key))) event.preventDefault();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  writeStartupLog('Starting FinGent desktop app.');
  const port = await findOpenPort();
  process.env.NODE_ENV = 'production';
  process.env.PORT = String(port);
  process.env.FINGENT_HOST = '127.0.0.1';
  process.env.FINGENT_DATA_DIR = app.getPath('userData');
  process.env.FINGENT_APP_ROOT = app.getAppPath();

  // This starts the same Express and SQLite application used by the web version.
  // Its data directory is Electron's per-user app-data directory, never the installer.
  const serverPath = path.join(app.getAppPath(), 'dist', 'server.cjs');
  writeStartupLog(`Starting bundled local server from ${serverPath}.`);
  require(serverPath);
  await waitForLocalServer(port);
  writeStartupLog(`Local server is ready on 127.0.0.1:${port}.`);
  createWindow(port);
  writeStartupLog('Main window created.');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
  });
}).catch(error => {
  const detail = error && error.stack ? error.stack : String(error);
  console.error(detail);
  writeStartupLog(`Startup failed: ${detail}`);
  app.quit();
});

process.on('uncaughtException', error => writeStartupLog(`Uncaught exception: ${error.stack || error}`));
process.on('unhandledRejection', error => writeStartupLog(`Unhandled rejection: ${error && error.stack ? error.stack : error}`));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
