import express from "express";
import multer from "multer";
import fsModule from "fs";
import crypto from "crypto";
import path from "path";
import Database from "better-sqlite3";
import { createServer as createViteServer } from "vite";
import { closeDb, getDataDir, getDb } from "./server/db";
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

// Category families keep English, Tagalog, and Taglish labels in one budget/reporting bucket.
// The user's existing preferred category label is preserved whenever possible.
const CATEGORY_ALIAS_GROUPS = [
  { canonical: 'Food', aliases: ['food', 'pagkain', 'food & dining', 'dining', 'groceries', 'grocery'] },
  { canonical: 'Transport', aliases: ['transport', 'transportation', 'pamasahe', 'commute'] },
  { canonical: 'Housing', aliases: ['housing', 'bahay', 'rent', 'upa'] },
  { canonical: 'Utilities', aliases: ['utilities', 'utility', 'kuryente', 'tubig', 'internet', 'load'] },
  { canonical: 'Health', aliases: ['health', 'kalusugan', 'gamot', 'medical'] },
  { canonical: 'Education', aliases: ['education', 'edukasyon', 'tuition', 'school', 'paaralan'] },
  { canonical: 'Entertainment', aliases: ['entertainment', 'aliwan', 'sine', 'laro'] },
  { canonical: 'Shopping', aliases: ['shopping', 'pamimili', 'clothing', 'damit'] }
];

function normalizedCategoryName(value: string) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

async function resolveCategoryAlias(db: any, value: string) {
  const supplied = String(value || '').trim();
  const normalized = normalizedCategoryName(supplied);
  const group = CATEGORY_ALIAS_GROUPS.find(item => item.aliases.includes(normalized));
  if (!group) return supplied;

  const placeholders = group.aliases.map(() => '?').join(', ');
  const existing = await db.all(`SELECT name FROM categories WHERE active = 1 AND LOWER(name) IN (${placeholders})`, group.aliases);
  const canonical = existing.find((item: { name: string }) => normalizedCategoryName(item.name) === normalizedCategoryName(group.canonical));
  return canonical?.name || existing[0]?.name || group.canonical;
}

function formatTicker(ticker: string, type: string) {
  if (!ticker) return ticker;
  let t = ticker.toUpperCase().trim();
  if (type === "Cryptos" && !t.includes("-")) {
    t = t + "-USD";
  }
  return t;
}

async function recalculateFreelanceServiceHours(db: any, serviceId: string | number) {
  const result = await db.get(
    "SELECT COALESCE(SUM(seconds), 0) AS seconds FROM freelancing_time_logs WHERE service_id = ?",
    [serviceId]
  );
  await db.run(
    "UPDATE freelancing_services SET hours_logged = ? WHERE id = ?",
    [Number(result?.seconds || 0) / 3600, serviceId]
  );
}

async function upsertPersonalCategory(db: any, name: string, type: 'income' | 'expense') {
  const normalized = String(name || '').trim();
  if (!normalized) return;
  const existing = await db.get("SELECT id, type FROM categories WHERE name = ? COLLATE NOCASE", [normalized]);
  const categoryType = existing?.type === 'both' ? 'both' : existing && existing.type !== type ? 'both' : type;
  if (existing) {
    await db.run("UPDATE categories SET type = ?, active = 1 WHERE id = ?", [categoryType, existing.id]);
  } else {
    await db.run("INSERT INTO categories (name, type, active) VALUES (?, ?, 1)", [normalized, type]);
  }
}

const DRIVE_BACKUP_NAME = 'fingent-backup.enc';

function encryptBackup(source: Buffer, password: string) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(password, salt, 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(source), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from('FGDB2'), salt, iv, tag, encrypted]);
}

function decryptBackup(payload: Buffer, password: string) {
  if (payload.subarray(0, 5).toString() === 'FGDB2') {
    const salt = payload.subarray(5, 21);
    const iv = payload.subarray(21, 33);
    const tag = payload.subarray(33, 49);
    const data = payload.subarray(49);
    const key = crypto.scryptSync(password, salt, 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]);
  }
  const key = crypto.scryptSync(password, 'fingent_salt', 32);
  const iv = payload.subarray(0, 16);
  const data = payload.subarray(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

function validateDatabase(databasePath: string) {
  const candidate = new Database(databasePath, { readonly: true });
  try {
    const result = candidate.pragma('quick_check', { simple: true });
    if (result !== 'ok') throw new Error('The selected file is not a healthy SQLite database.');
  } finally {
    candidate.close();
  }
}


async function startServer() {
  const app = express();
  const dataDir = getDataDir();
  const uploadDir = path.join(dataDir, 'uploads');
  fsModule.mkdirSync(uploadDir, { recursive: true });
  const upload = multer({ dest: uploadDir });
  const PORT = Number(process.env.PORT || 3000);
  const HOST = process.env.FINGENT_HOST || '127.0.0.1';
  const appRoot = process.env.FINGENT_APP_ROOT || process.cwd();

  app.use(express.json());

  // API Routes
  app.get("/api/system/desktop-wrapper", async (req, res) => {
    const archiverModule = (await import('archiver')) as any; const archive = (archiverModule.default || archiverModule)('zip', {
      zlib: { level: 9 }
    });

    res.attachment('FinGent-Desktop.zip');
    archive.pipe(res);

    const packageJson = {
      "name": "fingent-desktop",
      "version": "1.0.0",
      "main": "main.js",
      "scripts": {
        "start": "electron ."
      },
      "dependencies": {
        "electron": "^28.0.0"
      }
    };

    const host = req.get('host') || '';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    
    const mainJs = `
const { app, BrowserWindow } = require('electron');

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false
    }
  });

  win.loadURL('${protocol}://${host}');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
`;

    const readmeMd = `
# FinGent Desktop App Wrapper

To run FinGent as a desktop application:

1. Ensure you have Node.js installed on your computer.
2. Open a terminal or command prompt in this folder.
3. Run \`npm install\` to install Electron.
4. Run \`npm start\` to launch the desktop app.
    `;

    archive.append(JSON.stringify(packageJson, null, 2), { name: 'package.json' });
    archive.append(mainJs, { name: 'main.js' });
    archive.append(readmeMd, { name: 'README.md' });

    archive.finalize();
  });

  app.post("/api/system/drive/upload", async (req, res) => {
    try {
      const { accessToken, password } = req.body;
      if (!accessToken || !password) return res.status(400).json({ error: "Missing token or password" });

      const dbPath = path.join(dataDir, 'fingent.db');
      if (!fsModule.existsSync(dbPath)) return res.status(404).json({ error: 'Local database not found.' });
      const encrypted = encryptBackup(fsModule.readFileSync(dbPath), password);

      const searchParams = new URLSearchParams({ q: "name='" + DRIVE_BACKUP_NAME + "' and trashed=false", spaces: 'appDataFolder', fields: 'files(id,name,modifiedTime)' });
      const searchRes = await fetch("https://www.googleapis.com/drive/v3/files?" + searchParams, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!searchRes.ok) throw new Error('Google Drive search failed. Check that Drive API access is enabled.');
      const searchData = await searchRes.json();
      let fileId = null;
      if (searchData.files && searchData.files.length > 0) {
        fileId = searchData.files[0].id;
      }

      // Upload to Drive (Simple upload for media, then update metadata, or multipart. We'll use multipart)
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify({ name: DRIVE_BACKUP_NAME, parents: ['appDataFolder'], appProperties: { product: 'FinGent', format: 'FGDB2' } })], { type: 'application/json' }));
      form.append('file', new Blob([encrypted]), DRIVE_BACKUP_NAME);

      let uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
      let method = "POST";
      if (fileId) {
        uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
        method = "PATCH";
      }

      const uploadRes = await fetch(uploadUrl, {
        method,
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form
      });
      
      const uploadData = await uploadRes.json();
      if (uploadData.error) throw new Error(uploadData.error.message);

      res.json({ success: true, fileId: uploadData.id, modifiedTime: uploadData.modifiedTime || new Date().toISOString() });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/system/drive/download", async (req, res) => {
    try {
      const { accessToken, password } = req.body;
      if (!accessToken || !password) return res.status(400).json({ error: "Missing token or password" });

      const searchParams = new URLSearchParams({ q: "name='" + DRIVE_BACKUP_NAME + "' and trashed=false", spaces: 'appDataFolder', fields: 'files(id,name,modifiedTime)' });
      const searchRes = await fetch("https://www.googleapis.com/drive/v3/files?" + searchParams, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!searchRes.ok) throw new Error('Google Drive search failed. Check that Drive API access is enabled.');
      const searchData = await searchRes.json();
      if (!searchData.files || searchData.files.length === 0) {
        return res.status(404).json({ error: "No backup found on Google Drive" });
      }
      const fileId = searchData.files[0].id;

      // Download
      const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!downloadRes.ok) throw new Error("Failed to download from Drive");
      
      const arrayBuffer = await downloadRes.arrayBuffer();
      const encrypted = Buffer.from(arrayBuffer);

      const dbPath = path.join(dataDir, 'fingent.db');
      const stagedPath = dbPath + '.restore-' + crypto.randomUUID();
      fsModule.writeFileSync(stagedPath, decryptBackup(encrypted, password));
      try {
        validateDatabase(stagedPath);
        await closeDb();
        fsModule.copyFileSync(stagedPath, dbPath);
      } finally {
        if (fsModule.existsSync(stagedPath)) fsModule.unlinkSync(stagedPath);
      }

      res.json({ success: true, modifiedTime: searchData.files[0].modifiedTime || null });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/system/export", (req, res) => {
    const dbPath = path.join(dataDir, 'fingent.db');
    if (fsModule.existsSync(dbPath)) {
      res.download(dbPath, 'fingent_backup.db');
    } else {
      res.status(404).json({ error: "Database not found" });
    }
  });

  app.post("/api/system/import", upload.single('db'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const dbPath = path.join(dataDir, 'fingent.db');
      validateDatabase(req.file.path);
      await closeDb();
      fsModule.copyFileSync(req.file.path, dbPath);
      
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    } finally {
      if (req.file && fsModule.existsSync(req.file.path)) fsModule.unlinkSync(req.file.path);
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/accounts", async (req, res) => {
    try {
      const db = await getDb();
      const accounts = await db.all("SELECT * FROM accounts");
      res.json(accounts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/goals", async (req, res) => {
    try {
      const db = await getDb();
      const goals = await db.all("SELECT * FROM goals");
      res.json(goals.map((g: any) => ({
        ...g,
        sources: g.sources ? JSON.parse(g.sources) : [],
        transactions: g.transactions ? JSON.parse(g.transactions) : []
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/transactions", async (req, res) => {
    try {
      const db = await getDb();
      const tx = await db.all(`
        SELECT t.*, a.name as account_name 
        FROM transactions t 
        JOIN accounts a ON t.account_id = a.id 
        ORDER BY date DESC, t.id DESC
      `);
      res.json(tx);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/wealth", async (req, res) => {
     try {
       const db = await getDb();
       const accounts = await db.all("SELECT SUM(balance) as totalCash FROM accounts");
       const portfolios = await db.all("SELECT * FROM portfolios");
       res.json({ totalCash: accounts[0].totalCash || 0, portfolios });
     } catch(error: any) {
       res.status(500).json({ error: error.message });
     }
  });

  app.get("/api/career", async (req, res) => {
     try {
       const db = await getDb();
       let career = await db.get("SELECT * FROM career LIMIT 1");
       if (!career) {
          await db.run("INSERT INTO career (current_role, target_role, current_salary, target_salary, skills_needed) VALUES ('', '', 0, 0, '[]')");
          career = await db.get("SELECT * FROM career LIMIT 1");
       }
       res.json(career);
     } catch(error: any) {
       res.status(500).json({ error: error.message });
     }
  });

  app.put("/api/career", async (req, res) => {
     try {
       const db = await getDb();
       const { current_role, target_role, current_salary, target_salary, skills_needed } = req.body;
       const career = await db.get("SELECT id FROM career LIMIT 1");
       if (career) {
          await db.run(
            "UPDATE career SET current_role = ?, target_role = ?, current_salary = ?, target_salary = ?, skills_needed = ? WHERE id = ?",
            [current_role, target_role, current_salary, target_salary, JSON.stringify(skills_needed || []), career.id]
          );
       } else {
          await db.run(
            "INSERT INTO career (current_role, target_role, current_salary, target_salary, skills_needed) VALUES (?, ?, ?, ?, ?)",
            [current_role, target_role, current_salary, target_salary, JSON.stringify(skills_needed || [])]
          );
       }
       res.json({ success: true });
     } catch(error: any) {
       res.status(500).json({ error: error.message });
     }
  });

  app.get("/api/copilot/accounts", async (req, res) => {
    try {
      const db = await getDb();
      res.json(await db.all("SELECT id, name, type FROM accounts ORDER BY name COLLATE NOCASE"));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/copilot/transfers", async (req, res) => {
    try {
      const db = await getDb();
      const { amount, fromHint, toHint, date = new Date().toISOString().slice(0, 10) } = req.body;
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ error: 'A positive transfer amount is required.' });
      const accounts = await db.all("SELECT id, name, balance FROM accounts");
      const match = (hint: string) => {
        const normalized = String(hint || '').trim().toLowerCase();
        const exact = accounts.filter((account: any) => account.name.toLowerCase() === normalized);
        const close = exact.length ? exact : accounts.filter((account: any) => account.name.toLowerCase().includes(normalized) || normalized.includes(account.name.toLowerCase()));
        return close.length === 1 ? close[0] : null;
      };
      const from = match(fromHint);
      const to = match(toHint);
      if (!from || !to) return res.status(400).json({ error: 'Could not uniquely match both local accounts. Use the exact account names.' });
      if (from.id === to.id) return res.status(400).json({ error: 'Choose two different accounts for a transfer.' });
      await db.run("UPDATE accounts SET balance = balance - ? WHERE id = ?", [value, from.id]);
      await db.run("UPDATE accounts SET balance = balance + ? WHERE id = ?", [value, to.id]);
      await db.run("INSERT INTO transactions (account_id, type, amount, category, description, notes, date) VALUES (?, 'expense', ?, 'Transfer', ?, ?, ?)", [from.id, value, 'Transfer to ' + to.name, 'Added locally through FinGent Copilot after user confirmation.', date]);
      await db.run("INSERT INTO transactions (account_id, type, amount, category, description, notes, date) VALUES (?, 'income', ?, 'Transfer', ?, ?, ?)", [to.id, value, 'Transfer from ' + from.name, 'Added locally through FinGent Copilot after user confirmation.', date]);
      res.json({ success: true, from: from.name, to: to.name });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/copilot/investments/buy", async (req, res) => {
    try {
      const db = await getDb();
      const input = req.body;
      const type = input.type === 'Cryptos' ? 'Cryptos' : 'Stocks';
      const ticker = formatTicker(String(input.ticker || ''), type);
      const date = input.date || new Date().toISOString().slice(0, 10);
      const invested = Number(input.invested);
      if (!ticker || !Number.isFinite(invested) || invested <= 0) return res.status(400).json({ error: 'Ticker and invested amount are required.' });
      let shares = input.shares === null || input.shares === undefined ? null : Number(input.shares);
      let price = input.avg_price === null || input.avg_price === undefined ? null : Number(input.avg_price);
      let currentPrice = price;
      if (!price || !shares) {
        const quote: any = await yahooFinance.quote(ticker);
        currentPrice = Number(quote?.regularMarketPrice) || null;
        if (!price) price = currentPrice;
      }
      if (!price || !Number.isFinite(price) || price <= 0) return res.status(422).json({ error: 'Current price was unavailable. Add an explicit share count and price, then try again.' });
      if (!shares) shares = invested / price;
      if (!Number.isFinite(shares) || shares <= 0) return res.status(400).json({ error: 'Could not calculate a valid share count.' });
      const cost = shares * price;
      const existing = await db.get("SELECT * FROM portfolios WHERE ticker = ? COLLATE NOCASE AND type = ?", [ticker, type]);
      if (existing) {
        const nextShares = Number(existing.shares || 0) + shares;
        const nextInvested = Number(existing.invested || 0) + cost;
        const nextAverage = nextInvested / nextShares;
        const nextCurrentValue = (currentPrice || price) * nextShares;
        await db.run("INSERT INTO portfolio_transactions (portfolio_id, type, shares, price, date) VALUES (?, 'Buy', ?, ?, ?)", [existing.id, shares, price, date]);
        await db.run("UPDATE portfolios SET shares = ?, invested = ?, avg_price = ?, current_value = ?, current_price = ?, currency = ? WHERE id = ?", [nextShares, nextInvested, nextAverage, nextCurrentValue, currentPrice || price, input.currency || 'USD', existing.id]);
        return res.json({ id: existing.id, created: false, shares, price, date });
      }
      const result = await db.run("INSERT INTO portfolios (type, name, invested, current_value, shares, avg_price, ticker, current_price, currency, platform) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [type, input.name || ticker, cost, (currentPrice || price) * shares, shares, price, ticker, currentPrice || price, input.currency || 'USD', input.platform || '']);
      await db.run("INSERT INTO portfolio_transactions (portfolio_id, type, shares, price, date) VALUES (?, 'Buy', ?, ?, ?)", [result.lastInsertRowid, shares, price, date]);
      res.json({ id: result.lastInsertRowid, created: true, shares, price, date });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/categories", async (req, res) => {
    try {
      const db = await getDb();
      const historical = await db.all("SELECT category, GROUP_CONCAT(DISTINCT type) AS types FROM transactions WHERE TRIM(category) != '' GROUP BY LOWER(category)");
      for (const row of historical) {
        await upsertPersonalCategory(db, row.category, String(row.types || '').includes('income') ? 'income' : 'expense');
        if (String(row.types || '').includes('income') && String(row.types || '').includes('expense')) {
          const category = await db.get("SELECT id FROM categories WHERE name = ? COLLATE NOCASE", [row.category]);
          if (category) await db.run("UPDATE categories SET type = 'both' WHERE id = ?", [category.id]);
        }
      }
      const categories = await db.all(`
        SELECT c.*, COUNT(t.id) AS transaction_count,
          COALESCE(SUM(t.amount), 0) AS total_amount,
          MAX(t.date) AS last_used
        FROM categories c
        LEFT JOIN transactions t ON LOWER(t.category) = LOWER(c.name)
        WHERE c.active = 1
        GROUP BY c.id
        ORDER BY c.name COLLATE NOCASE
      `);
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const db = await getDb();
      const { name, type = 'expense' } = req.body;
      const normalized = String(name || '').trim();
      if (!normalized) return res.status(400).json({ error: 'A category name is required.' });
      await upsertPersonalCategory(db, normalized, type === 'income' ? 'income' : 'expense');
      const category = await db.get("SELECT * FROM categories WHERE name = ? COLLATE NOCASE", [normalized]);
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { name, type } = req.body;
      const category = await db.get("SELECT * FROM categories WHERE id = ?", [req.params.id]);
      const normalized = String(name || '').trim();
      if (!category || !normalized) return res.status(400).json({ error: 'Category not found or name is empty.' });
      await db.run("UPDATE transactions SET category = ? WHERE category = ? COLLATE NOCASE", [normalized, category.name]);
      await db.run("UPDATE categories SET name = ?, type = ?, active = 1 WHERE id = ?", [normalized, type || category.type, category.id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const db = await getDb();
      await db.run("UPDATE categories SET active = 0 WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/career/tasks", async (_req, res) => {
    try {
      const db = await getDb();
      res.json(await db.all("SELECT * FROM career_tasks ORDER BY status ASC, due_date ASC, id DESC"));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/career/tasks", async (req, res) => {
    try {
      const db = await getDb();
      const { title, due_date, priority, notes } = req.body;
      const result = await db.run(
        "INSERT INTO career_tasks (title, due_date, priority, notes) VALUES (?, ?, ?, ?)",
        [title, due_date || null, priority || 'Medium', notes || '']
      );
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/career/tasks/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { title, due_date, priority, status, notes } = req.body;
      await db.run(
        "UPDATE career_tasks SET title = ?, due_date = ?, priority = ?, status = ?, notes = ? WHERE id = ?",
        [title, due_date || null, priority || 'Medium', status || 'Open', notes || '', req.params.id]
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/career/tasks/:id", async (req, res) => {
    try {
      const db = await getDb();
      await db.run("DELETE FROM career_tasks WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/personal/notes", async (_req, res) => {
    try {
      const db = await getDb();
      res.json(await db.all("SELECT * FROM personal_notes ORDER BY updated_at DESC, id DESC"));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/personal/notes", async (req, res) => {
    try {
      const db = await getDb();
      const { title, body = '' } = req.body;
      const result = await db.run("INSERT INTO personal_notes (title, body, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", [title, body]);
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/personal/notes/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { title, body = '' } = req.body;
      await db.run("UPDATE personal_notes SET title = ?, body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [title, body, req.params.id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/personal/notes/:id", async (req, res) => {
    try {
      const db = await getDb();
      await db.run("DELETE FROM personal_notes WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/personal/routines", async (_req, res) => {
    try {
      const db = await getDb();
      const today = new Date().toISOString().slice(0, 10);
      res.json(await db.all(`
        SELECT r.*, EXISTS(SELECT 1 FROM personal_routine_logs l WHERE l.routine_id = r.id AND l.date = ?) AS completed_today,
          (SELECT COUNT(*) FROM personal_routine_logs l WHERE l.routine_id = r.id AND l.date >= date(?, '-6 days')) AS completed_this_week
        FROM personal_routines r WHERE r.active = 1 ORDER BY r.created_at DESC, r.id DESC
      `, [today, today]));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/personal/routines", async (req, res) => {
    try {
      const db = await getDb();
      const { name, frequency = 'Daily' } = req.body;
      const result = await db.run("INSERT INTO personal_routines (name, frequency) VALUES (?, ?)", [name, frequency]);
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/personal/routines/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { name, frequency, active = 1 } = req.body;
      await db.run("UPDATE personal_routines SET name = ?, frequency = ?, active = ? WHERE id = ?", [name, frequency || 'Daily', active ? 1 : 0, req.params.id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/personal/routines/:id/check-in", async (req, res) => {
    try {
      const db = await getDb();
      const date = req.body.date || new Date().toISOString().slice(0, 10);
      const existing = await db.get("SELECT id FROM personal_routine_logs WHERE routine_id = ? AND date = ?", [req.params.id, date]);
      if (existing) await db.run("DELETE FROM personal_routine_logs WHERE id = ?", [existing.id]);
      else await db.run("INSERT INTO personal_routine_logs (routine_id, date) VALUES (?, ?)", [req.params.id, date]);
      res.json({ completed: !existing });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/personal/routines/:id", async (req, res) => {
    try {
      const db = await getDb();
      await db.run("DELETE FROM personal_routine_logs WHERE routine_id = ?", [req.params.id]);
      await db.run("DELETE FROM personal_routines WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    try {
      const db = await getDb();
      const { name, type, balance, interest_rate_pa = 0, image_logo_name = 'bank', color = '', purpose = '', credit_limit = null, statement_date = null, due_date = null } = req.body;
      const result = await db.run(
        "INSERT INTO accounts (name, type, balance, interest_rate_pa, image_logo_name, color, purpose, credit_limit, statement_date, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [name, type, balance, interest_rate_pa, image_logo_name, color, purpose, credit_limit, statement_date, due_date]
      );
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/goals", async (req, res) => {
    try {
      const db = await getDb();
      const { name, target, saved, date, color, icon, sources, transactions } = req.body;
      const result = await db.run(
        "INSERT INTO goals (name, target, saved, date, color, icon, sources, transactions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [name, target, saved, date, color, icon, JSON.stringify(sources || []), JSON.stringify(transactions || [])]
      );
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/goals/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { name, target, saved, date, color, icon, sources, transactions } = req.body;
      await db.run(
        "UPDATE goals SET name = ?, target = ?, saved = ?, date = ?, color = ?, icon = ?, sources = ?, transactions = ? WHERE id = ?",
        [name, target, saved, date, color, icon, JSON.stringify(sources || []), JSON.stringify(transactions || []), req.params.id]
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const db = await getDb();
      const { account_id, type, amount, category: suppliedCategory, description, notes = '', date } = req.body;
      const category = await resolveCategoryAlias(db, suppliedCategory);
      
      // Update account balance
      const account = await db.get("SELECT balance FROM accounts WHERE id = ?", [account_id]);
      if (account) {
        const newBalance = type === 'income' ? account.balance + Number(amount) : account.balance - Number(amount);
        await db.run("UPDATE accounts SET balance = ? WHERE id = ?", [newBalance, account_id]);
      }

      const result = await db.run(
        "INSERT INTO transactions (account_id, type, amount, category, description, notes, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [account_id, type, amount, category, description, notes, date]
      );
      await upsertPersonalCategory(db, category, type === 'income' ? 'income' : 'expense');
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      
      // We should theoretically reverse the balance change, but this is a simplified version
      const tx = await db.get("SELECT * FROM transactions WHERE id = ?", [id]);
      if (tx) {
        const account = await db.get("SELECT balance FROM accounts WHERE id = ?", [tx.account_id]);
        if (account) {
           const newBalance = tx.type === 'income' ? account.balance - tx.amount : account.balance + tx.amount;
           await db.run("UPDATE accounts SET balance = ? WHERE id = ?", [newBalance, tx.account_id]);
        }
        await db.run("DELETE FROM transactions WHERE id = ?", [id]);
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  
  app.post("/api/accounts/accrue-interest", async (req, res) => {
    try {
      const db = await getDb();
      const accounts = await db.all("SELECT * FROM accounts WHERE interest_rate_pa > 0");
      let accruedCount = 0;
      
      for (const account of accounts) {
        // Daily interest = (balance * interest_rate_pa) / 365
        const dailyInterest = (account.balance * account.interest_rate_pa) / 365;
        if (dailyInterest > 0) {
          const newBalance = account.balance + dailyInterest;
          await db.run("UPDATE accounts SET balance = ? WHERE id = ?", [newBalance, account.id]);
          await db.run(
            "INSERT INTO transactions (account_id, type, amount, category, description, date) VALUES (?, ?, ?, ?, ?, ?)",
            [account.id, 'income', dailyInterest, 'Interest', 'Daily Interest Payout', new Date().toISOString()]
          );
          accruedCount++;
        }
      }
      res.json({ success: true, accruedCount });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/accounts/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { name, type, balance, color, purpose, credit_limit, interest_rate_pa } = req.body;
      
      const oldAccount = await db.get("SELECT balance FROM accounts WHERE id = ?", [id]);
      
      await db.run(
        "UPDATE accounts SET name = ?, type = ?, balance = ?, color = ?, purpose = ?, credit_limit = ?, interest_rate_pa = ? WHERE id = ?",
        [name, type, balance, color, purpose, credit_limit, interest_rate_pa, id]
      );
      
      if (oldAccount && parseFloat(oldAccount.balance) !== parseFloat(balance)) {
        const diff = parseFloat(balance) - parseFloat(oldAccount.balance);
        const txType = diff > 0 ? 'income' : 'expense';
        await db.run(
          "INSERT INTO transactions (account_id, type, amount, category, description, date) VALUES (?, ?, ?, ?, ?, ?)",
          [id, txType, Math.abs(diff), 'Adjustment', 'Balance Adjustment', new Date().toISOString()]
        );
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/accounts/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      
      // Delete associated transactions first
      await db.run("DELETE FROM transactions WHERE account_id = ?", [id]);
      await db.run("DELETE FROM accounts WHERE id = ?", [id]);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/rates", async (req, res) => {
    try {
      const phpQuote = await yahooFinance.quote("PHP=X");
      const eurQuote = await yahooFinance.quote("EURUSD=X");
      const gbpQuote = await yahooFinance.quote("GBPUSD=X");
      res.json({
        PHP: phpQuote?.regularMarketPrice || 58.5,
        EUR: eurQuote?.regularMarketPrice ? 1 / eurQuote.regularMarketPrice : 0.92,
        GBP: gbpQuote?.regularMarketPrice ? 1 / gbpQuote.regularMarketPrice : 0.79,
        USD: 1
      });
    } catch(e) {
      console.error(e);
      res.json({ PHP: 58.5, EUR: 0.92, GBP: 0.79, USD: 1 });
    }
  });

  app.get("/api/quote/:ticker", async (req, res) => {
    try {
      const { ticker } = req.params;
      const type = (req.query.type as string) || 'Stocks';
      const quote = await yahooFinance.quote(formatTicker(ticker, type)) as any;
      if (quote && quote.regularMarketPrice) {
        res.json({ price: quote.regularMarketPrice });
      } else {
        res.status(404).json({ error: "Not found" });
      }
    } catch(e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.get("/api/portfolios", async (req, res) => {
    try {
      const db = await getDb();
      const portfolios = await db.all("SELECT * FROM portfolios");
      const transactions = await db.all("SELECT * FROM portfolio_transactions ORDER BY date DESC");
      
      const enrichedPortfolios = portfolios.map((p: any) => ({
        ...p,
        history: transactions.filter((t: any) => t.portfolio_id === p.id).map((t: any) => ({
           id: t.id,
           date: t.date,
           type: t.type,
           amount: t.shares,
           price: t.price
        }))
      }));
      res.json(enrichedPortfolios);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  
  app.post("/api/portfolios/sync", async (req, res) => {
    try {
      const db = await getDb();
      const portfolios = await db.all("SELECT * FROM portfolios WHERE ticker IS NOT NULL AND ticker != ''");
      
      let updated = 0;
      for (const p of portfolios) {
        try {
          const quote = await yahooFinance.quote(formatTicker(p.ticker, p.type)) as any;
          if (quote && quote.regularMarketPrice) {
            const currentPrice = quote.regularMarketPrice;
            const shares = p.shares || 0;
            const newValue = currentPrice * shares;
            const currency = quote.currency || 'USD';
            
            await db.run("UPDATE portfolios SET current_value = ?, current_price = ?, currency = ? WHERE id = ?", [newValue, currentPrice, currency, p.id]);
            updated++;
          }
        } catch(err) {
          console.error("Failed to fetch price for " + p.ticker, err);
        }
      }
      
      res.json({ success: true, updated });
    } catch(err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/calendar_events", async (req, res) => {
    try {
      const db = await getDb();
      const events = await db.all("SELECT * FROM calendar_events");
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/calendar_events", async (req, res) => {
    try {
      const db = await getDb();
      const { name, type, amount, date, color, icon, provider, source } = req.body;
      const result = await db.run(
        "INSERT INTO calendar_events (name, type, amount, date, color, icon, provider, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [name, type, amount, date, color, icon, provider, source]
      );
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/calendar_events/:id", async (req, res) => {
    try {
      const db = await getDb();
      await db.run("DELETE FROM calendar_events WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/portfolios", async (req, res) => {
    try {
      const db = await getDb();
      let { type, name, invested, current_value, shares = null, avg_price = null, ticker = null, currency = "USD", platform = null, date = new Date().toISOString().split('T')[0] } = req.body;
      let priceResolved = false;
      
      if (ticker) { ticker = formatTicker(ticker, type);
        try {
           const quote = await yahooFinance.quote(formatTicker(ticker, type)) as any;
           if (quote && quote.regularMarketPrice) {
              const currentPrice = quote.regularMarketPrice;
              priceResolved = true;
              if (shares === null && current_value > 0) {
                 shares = current_value / currentPrice;
                 avg_price = shares > 0 ? invested / shares : null;
              } else {
                 current_value = currentPrice * (shares || 0);
              }
           }
        } catch(e) {
           console.error('Failed to fetch initial price for ticker', ticker);
        }
      }

      const result = await db.run(
        "INSERT INTO portfolios (type, name, invested, current_value, shares, avg_price, ticker, currency, platform) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [type, name, invested, current_value, shares, avg_price, ticker, currency, platform]
      );
      
      const newId = result.lastInsertRowid;
      
      if (shares && shares > 0 && avg_price && avg_price > 0) {
         await db.run(
           "INSERT INTO portfolio_transactions (portfolio_id, type, shares, price, date) VALUES (?, ?, ?, ?, ?)",
           [newId, 'Buy', shares, avg_price, date]
         );
      }

      res.json({ id: newId, shares, avg_price, date, price_resolved: priceResolved });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  
  app.post("/api/portfolios/:id/transactions", async (req, res) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { type, shares, price, date } = req.body;
      
      await db.run(
        "INSERT INTO portfolio_transactions (portfolio_id, type, shares, price, date) VALUES (?, ?, ?, ?, ?)",
        [id, type, shares, price, date]
      );
      
      const p = await db.get("SELECT * FROM portfolios WHERE id = ?", [id]);
      if (p) {
         let newShares = p.shares || 0;
         let newInvested = p.invested || 0;
         let newAvgPrice = p.avg_price || 0;
         
         if (type === 'Buy') {
            const cost = shares * price;
            newInvested += cost;
            newShares += shares;
            newAvgPrice = newShares > 0 ? newInvested / newShares : 0;
         } else if (type === 'Sell') {
            const costBasis = shares * newAvgPrice;
            newInvested -= costBasis;
            newShares -= shares;
            if (newShares <= 0) {
              newShares = 0;
              newInvested = 0;
              newAvgPrice = 0;
            }
         }
         
         let currentValue = p.current_value;
         if (p.ticker) {
            try {
               const quote = await yahooFinance.quote(formatTicker(p.ticker, p.type)) as any;
               if (quote && quote.regularMarketPrice) {
                  currentValue = quote.regularMarketPrice * newShares;
               }
            } catch(e) {}
         } else if (type === 'Buy' || type === 'Sell') {
            currentValue = newShares * newAvgPrice;
         }
         
         await db.run(
           "UPDATE portfolios SET shares = ?, invested = ?, avg_price = ?, current_value = ? WHERE id = ?",
           [newShares, newInvested, newAvgPrice, currentValue, id]
         );
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/portfolios/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { current_value } = req.body;
      await db.run("UPDATE portfolios SET current_value = ? WHERE id = ?", [current_value, id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/portfolios/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      await db.run("DELETE FROM portfolios WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/liabilities", async (req, res) => {
    try {
      const db = await getDb();
      const liabilities = await db.all("SELECT * FROM liabilities");
      res.json(liabilities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/liabilities", async (req, res) => {
    try {
      const db = await getDb();
      const { name, type, amount, date, provider, status, card_name, total_amount, remaining_amount, total_months, current_month, merchant, paid_using, is_recurring } = req.body;
      const result = await db.run(
        "INSERT INTO liabilities (name, type, amount, date, provider, status, card_name, total_amount, remaining_amount, total_months, current_month, merchant, paid_using, is_recurring) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [name, type, amount, date, provider, status, card_name, total_amount, remaining_amount, total_months, current_month, merchant, paid_using, is_recurring]
      );
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/liabilities/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      await db.run("DELETE FROM liabilities WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/liabilities/:id/pay", async (req, res) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      await db.run("UPDATE liabilities SET status = 'Paid' WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/income_flows", async (req, res) => {
    try {
      const db = await getDb();
      const rows = await db.all("SELECT * FROM income_flows");
      res.json(rows);
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });
  app.post("/api/income_flows", async (req, res) => {
    try {
      const db = await getDb();
      const { name, amount, date, is_recurring, budget_preset_id, account_id, category = 'Income' } = req.body;
      const result = await db.run("INSERT INTO income_flows (name, amount, date, is_recurring, budget_preset_id, account_id, category) VALUES (?, ?, ?, ?, ?, ?, ?)", [name, amount, date, is_recurring ? 1 : 0, budget_preset_id, account_id, category]);
      await upsertPersonalCategory(db, category, 'income');
      
      // Also add to calendar_events
      await db.run("INSERT INTO calendar_events (name, type, amount, date, color, icon, provider, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [name, 'income', amount, date, 'emerald', 'ArrowDown', 'Manual', 'income_flow']);
      
      if (budget_preset_id) {
         const preset = await db.get("SELECT * FROM budget_presets WHERE id = ?", [budget_preset_id]);
         if (preset) {
            const allocs = JSON.parse(preset.allocations || '[]');
            const categories = allocs.map((a: any, i: number) => ({
               id: Date.now() + i,
               name: a.name,
               limit: amount * (a.percentage / 100),
               spent: 0,
               color: a.color || 'emerald',
               categories: a.categories || [],
               transactions: []
            }));
            
            const budgetData = {
               id: Date.now(),
               name: `Auto Budget: ${name} (${preset.name})`,
               type: is_recurring ? 'recurring' : 'specific',
               isGrouped: true,
               startDate: date,
               endDate: date,
               totalLimit: amount,
               groups: categories
            };
            
            await db.run("INSERT INTO budgets (name, total_amount, categories, month) VALUES (?, ?, ?, ?)", [budgetData.name, amount, JSON.stringify(budgetData), date]);
         }
      }
      
      
      res.json({ id: result.lastInsertRowid });
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });
  app.delete("/api/income_flows/:id", async (req, res) => {
    try {
      const db = await getDb();
      await db.run("DELETE FROM income_flows WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });

  app.get("/api/budget_presets", async (req, res) => {
    try {
      const db = await getDb();
      const rows = await db.all("SELECT * FROM budget_presets");
      res.json(rows);
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });
  app.post("/api/budget_presets", async (req, res) => {
    try {
      const db = await getDb();
      const { name, allocations } = req.body;
      const result = await db.run("INSERT INTO budget_presets (name, allocations) VALUES (?, ?)", [name, JSON.stringify(allocations)]);
      res.json({ id: result.lastInsertRowid });
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });
  app.delete("/api/budget_presets/:id", async (req, res) => {
    try {
      const db = await getDb();
      await db.run("DELETE FROM budget_presets WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });

  app.get("/api/budgets", async (req, res) => {
    try {
      const db = await getDb();
      const rows = await db.all("SELECT * FROM budgets");
      res.json(rows);
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });
  app.post("/api/budgets", async (req, res) => {
    try {
      const db = await getDb();
      const { name, total_amount, categories, month } = req.body;
      const result = await db.run("INSERT INTO budgets (name, total_amount, categories, month) VALUES (?, ?, ?, ?)", [name, total_amount, JSON.stringify(categories), month]);
      res.json({ id: result.lastInsertRowid });
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });
  app.delete("/api/budgets/:id", async (req, res) => {
    try {
      const db = await getDb();
      await db.run("DELETE FROM budgets WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });

  // Vite middleware for development
    app.get("/api/businesses", async (req, res) => {
    try {
      const db = await getDb();
      const businesses = await db.all("SELECT * FROM businesses");
      // For each business, calculate mrr and customers
      for (const b of businesses) {
         const transactions = await db.all("SELECT * FROM business_transactions WHERE business_id = ?", [b.id]);
         const items = await db.all("SELECT * FROM business_items WHERE business_id = ?", [b.id]);
         
         const thisMonth = new Date().toISOString().slice(0, 7);
         const active = (item: any) => item.status === 'Active';
         if (b.type === 'Store') {
            const orders = transactions.filter((t:any) => t.type === 'income' && String(t.date || '').startsWith(thisMonth));
            b.mrr = orders.reduce((sum:any, t:any) => sum + (Number(t.amount) || 0), 0);
            b.customers = new Set(orders.map((t:any) => t.description).filter(Boolean)).size;
         } else if (b.type === 'SaaS') {
            const subscriptions = items.filter((i:any) => ['user', 'subscription'].includes(i.type) && active(i));
            b.customers = subscriptions.length;
            b.mrr = subscriptions.reduce((sum:any, item:any) => sum + (Number(item.value) || 0), 0);
         } else if (['Agency', 'Professional Services'].includes(b.type)) {
            const clients = items.filter((i:any) => i.type === 'client' && active(i));
            b.customers = clients.length;
            b.mrr = clients.reduce((sum:any, item:any) => sum + (Number(item.value) || 0), 0);
         } else if (b.type === 'Creator') {
            const partnerships = items.filter((i:any) => i.type === 'partnership' && active(i));
            b.customers = partnerships.length;
            b.mrr = partnerships.reduce((sum:any, item:any) => sum + (Number(item.value) || 0), 0);
         } else {
            b.mrr = 0;
            b.customers = 0;
         }
         b.growth = 0;
      }
      res.json(businesses);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/businesses", async (req, res) => {
    try {
      const db = await getDb();
      const { name, type, status, target } = req.body;
      const result = await db.run("INSERT INTO businesses (name, type, status, target) VALUES (?, ?, ?, ?)", [name, type, status, target]);
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/business_deals", async (req, res) => {
    try {
      const db = await getDb();
      const items = await db.all("SELECT i.*, b.name as venture FROM business_items i LEFT JOIN businesses b ON i.business_id = b.id WHERE i.type IN ('lead', 'proposal')");
      const itemDeals = items.map((i:any) => ({
        id: i.id,
        title: i.name,
        venture: i.venture,
        stage: i.status,
        value: i.value,
        probability: i.type === 'proposal' ? 80 : 30, // rough estimate based on type
        closing: 'TBD',
        contact: 'N/A',
        notes: i.extra_info || '',
        source: 'item'
      }));
      const savedDeals = await db.all("SELECT d.*, b.name as venture FROM business_deals d LEFT JOIN businesses b ON d.business_id = b.id");
      res.json([...itemDeals, ...savedDeals.map((deal: any) => ({ ...deal, source: 'deal' }))]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/business_deals", async (req, res) => {
    try {
      const db = await getDb();
      const { business_id, title, stage, value, probability, closing, contact, notes } = req.body;
      const result = await db.run("INSERT INTO business_deals (business_id, title, stage, value, probability, closing, contact, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
        [business_id, title, stage, value, probability, closing, contact, notes]);
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/business_deals/:id", async (req, res) => {
     try {
        const db = await getDb();
        const { stage, notes } = req.body;
        const item = await db.get("SELECT id FROM business_items WHERE id = ?", [req.params.id]);
        if (item) {
          await db.run("UPDATE business_items SET status = ?, extra_info = ? WHERE id = ?", [stage, notes || '', req.params.id]);
        } else {
          await db.run("UPDATE business_deals SET stage = ?, notes = ? WHERE id = ?", [stage, notes || '', req.params.id]);
        }
        res.json({ success: true });
     } catch(e: any) {
        res.status(500).json({ error: e.message });
     }
  });

  app.put("/api/transactions/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { account_id, type, amount, category: suppliedCategory, description, notes = '', date } = req.body;
      const category = await resolveCategoryAlias(db, suppliedCategory);
      const previous = await db.get("SELECT * FROM transactions WHERE id = ?", [req.params.id]);
      if (!previous) return res.status(404).json({ error: 'Transaction not found.' });

      const previousAccount = await db.get("SELECT balance FROM accounts WHERE id = ?", [previous.account_id]);
      if (previousAccount) {
        const restored = previous.type === 'income' ? previousAccount.balance - Number(previous.amount) : previousAccount.balance + Number(previous.amount);
        await db.run("UPDATE accounts SET balance = ? WHERE id = ?", [restored, previous.account_id]);
      }

      const nextAccount = await db.get("SELECT balance FROM accounts WHERE id = ?", [account_id]);
      if (!nextAccount) return res.status(400).json({ error: 'Account not found.' });
      const nextBalance = type === 'income' ? nextAccount.balance + Number(amount) : nextAccount.balance - Number(amount);
      await db.run("UPDATE accounts SET balance = ? WHERE id = ?", [nextBalance, account_id]);
      await db.run(
        "UPDATE transactions SET account_id = ?, type = ?, amount = ?, category = ?, description = ?, notes = ?, date = ? WHERE id = ?",
        [account_id, type, amount, category, description, notes, date, req.params.id]
      );
      await upsertPersonalCategory(db, category, type === 'income' ? 'income' : 'expense');
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/business_deals/:id", async (req, res) => {
    try {
      const db = await getDb();
      const item = await db.get("SELECT id FROM business_items WHERE id = ?", [req.params.id]);
      if (item) await db.run("DELETE FROM business_items WHERE id = ?", [req.params.id]);
      else await db.run("DELETE FROM business_deals WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/businesses/:id/items", async (req, res) => {
    try {
      const db = await getDb();
      const items = await db.all("SELECT * FROM business_items WHERE business_id = ?", [req.params.id]);
      res.json(items);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/businesses/:id/items", async (req, res) => {
    try {
      const db = await getDb();
      const { type, name, status, value, extra_info } = req.body;
      const result = await db.run("INSERT INTO business_items (business_id, type, name, status, value, extra_info) VALUES (?, ?, ?, ?, ?, ?)",
        [req.params.id, type, name, status, value, extra_info ? JSON.stringify(extra_info) : null]);
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/businesses/:businessId/items/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { type, name, status, value, extra_info } = req.body;
      await db.run(
        "UPDATE business_items SET type = ?, name = ?, status = ?, value = ?, extra_info = ? WHERE id = ? AND business_id = ?",
        [type, name, status, value || 0, extra_info ? JSON.stringify(extra_info) : null, req.params.id, req.params.businessId]
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/businesses/:businessId/items/:id", async (req, res) => {
    try {
      const db = await getDb();
      await db.run("DELETE FROM business_items WHERE id = ? AND business_id = ?", [req.params.id, req.params.businessId]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/businesses/:id/transactions", async (req, res) => {
    try {
      const db = await getDb();
      const transactions = await db.all("SELECT * FROM business_transactions WHERE business_id = ?", [req.params.id]);
      res.json(transactions);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/businesses/:id/transactions", async (req, res) => {
    try {
      const db = await getDb();
      const { type, amount, date, description, status, category } = req.body;
      const result = await db.run("INSERT INTO business_transactions (business_id, type, amount, date, description, status, category) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [req.params.id, type, amount, date, description, status, category]);
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/businesses/:businessId/transactions/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { type, amount, date, description, status, category } = req.body;
      await db.run(
        "UPDATE business_transactions SET type = ?, amount = ?, date = ?, description = ?, status = ?, category = ? WHERE id = ? AND business_id = ?",
        [type, amount || 0, date, description, status, category, req.params.id, req.params.businessId]
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/businesses/:businessId/transactions/:id", async (req, res) => {
    try {
      const db = await getDb();
      await db.run("DELETE FROM business_transactions WHERE id = ? AND business_id = ?", [req.params.id, req.params.businessId]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });



  
  // Freelance Businesses
  app.get("/api/freelance_businesses", async (req, res) => {
    try {
      const db = await getDb();
      const businesses = await db.all('SELECT * FROM freelance_businesses ORDER BY id DESC');
      res.json(businesses);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/freelance_businesses", async (req, res) => {
    try {
      const db = await getDb();
      const { name, type, description } = req.body;
      const result = await db.run(
        'INSERT INTO freelance_businesses (name, type, description) VALUES (?, ?, ?)',
        [name, type, description]
      );
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  app.put("/api/freelance_businesses/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { name, type, description } = req.body;
      await db.run('UPDATE freelance_businesses SET name = ?, type = ?, description = ? WHERE id = ?', [name, type, description, req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/freelance_businesses/:id", async (req, res) => {
    try {
      const db = await getDb();
      await db.run('DELETE FROM freelancing_time_logs WHERE business_id = ?', [req.params.id]);
      await db.run('DELETE FROM freelancing_invoices WHERE business_id = ?', [req.params.id]);
      await db.run('DELETE FROM freelancing_services WHERE business_id = ?', [req.params.id]);
      await db.run('DELETE FROM freelance_businesses WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/businesses/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { name, type, status, target } = req.body;
      await db.run("UPDATE businesses SET name = ?, type = ?, status = ?, target = ? WHERE id = ?", [name, type, status, target || 0, req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/businesses/:id", async (req, res) => {
    try {
      const db = await getDb();
      const id = req.params.id;
      await db.run("DELETE FROM business_deals WHERE business_id = ?", [id]);
      await db.run("DELETE FROM business_items WHERE business_id = ?", [id]);
      await db.run("DELETE FROM business_transactions WHERE business_id = ?", [id]);
      await db.run("DELETE FROM businesses WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/freelancing/overview", async (_req, res) => {
    try {
      const db = await getDb();
      const rows = await db.all(`
        SELECT
          b.id,
          b.name,
          b.type,
          b.description,
          (SELECT COUNT(*) FROM freelancing_services s WHERE s.business_id = b.id AND s.status = 'Active') AS active_contracts,
          (SELECT COUNT(*) FROM freelancing_invoices i WHERE i.business_id = b.id) AS invoice_count,
          (SELECT COALESCE(SUM(i.amount), 0) FROM freelancing_invoices i WHERE i.business_id = b.id AND i.status = 'Paid') AS paid_total,
          (SELECT COALESCE(SUM(i.amount), 0) FROM freelancing_invoices i WHERE i.business_id = b.id AND i.status != 'Paid') AS outstanding_total,
          (SELECT COALESCE(SUM(l.seconds), 0) FROM freelancing_time_logs l WHERE l.business_id = b.id) AS seconds_logged
        FROM freelance_businesses b
        ORDER BY b.id DESC
      `);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Freelancing Services
  app.get("/api/freelancing/services", async (req, res) => {
    try {
      const db = await getDb();
      const businessId = req.query.business_id as string | undefined;
      const services = businessId
        ? await db.all("SELECT * FROM freelancing_services WHERE business_id = ? ORDER BY id DESC", [businessId])
        : await db.all("SELECT * FROM freelancing_services ORDER BY id DESC");
      res.json(services);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/freelancing/services", async (req, res) => {
    try {
      const db = await getDb();
      const s = req.body;
      const result = await db.run(
        `INSERT INTO freelancing_services (business_id, name, type, client, rate, status, progress, value, deadline, next_milestone, hours_logged, hours_total, cap, renew_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.business_id, s.name, s.type, s.client, s.rate||0, s.status||'Active', s.progress||0, s.value||0, s.deadline||'', s.next_milestone||'', s.hours_logged||0, s.hours_total||0, s.cap||0, s.renew_date||'']
      );
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/freelancing/services/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const s = req.body;
      await db.run(
        `UPDATE freelancing_services SET 
          name = ?, type = ?, client = ?, rate = ?, status = ?, progress = ?, value = ?, deadline = ?, next_milestone = ?, hours_logged = ?, hours_total = ?, cap = ?, renew_date = ?
         WHERE id = ?`,
        [s.name, s.type, s.client, s.rate||0, s.status||'Active', s.progress||0, s.value||0, s.deadline||'', s.next_milestone||'', s.hours_logged||0, s.hours_total||0, s.cap||0, s.renew_date||'', id]
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/freelancing/services/:id", async (req, res) => {
    try {
      const db = await getDb();
      await db.run("DELETE FROM freelancing_time_logs WHERE service_id = ?", [req.params.id]);
      await db.run("DELETE FROM freelancing_invoices WHERE service_id = ?", [req.params.id]);
      await db.run("DELETE FROM freelancing_services WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Freelancing Invoices
  app.get("/api/freelancing/invoices", async (req, res) => {
    try {
      const db = await getDb();
      const businessId = req.query.business_id as string | undefined;
      const invoices = businessId
        ? await db.all("SELECT * FROM freelancing_invoices WHERE business_id = ? ORDER BY issue_date DESC, id DESC", [businessId])
        : await db.all("SELECT * FROM freelancing_invoices ORDER BY issue_date DESC, id DESC");
      res.json(invoices);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/freelancing/invoices", async (req, res) => {
    try {
      const db = await getDb();
      const i = req.body;
      const result = await db.run(
        `INSERT INTO freelancing_invoices (business_id, service_id, invoice_number, amount, issue_date, due_date, status, client_name, client_email, client_address, items, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [i.business_id, i.service_id || null, i.invoice_number, i.amount, i.issue_date, i.due_date, i.status||'Draft', i.client_name, i.client_email, i.client_address, JSON.stringify(i.items||[]), i.notes]
      );
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  app.put("/api/freelancing/invoices/:id", async (req, res) => {
    try {
      const db = await getDb();
      const i = req.body;
      await db.run(
        `UPDATE freelancing_invoices SET service_id = ?, invoice_number = ?, amount = ?, issue_date = ?, due_date = ?, status = ?, client_name = ?, client_email = ?, client_address = ?, items = ?, notes = ? WHERE id = ?`,
        [i.service_id || null, i.invoice_number, i.amount, i.issue_date, i.due_date, i.status || 'Draft', i.client_name, i.client_email, i.client_address, JSON.stringify(i.items || []), i.notes || '', req.params.id]
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  app.delete("/api/freelancing/invoices/:id", async (req, res) => {
    try {
      const db = await getDb();
      await db.run('DELETE FROM freelancing_invoices WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Freelancing Time Logs
  app.get("/api/freelancing/time_logs", async (req, res) => {
    try {
      const db = await getDb();
      const businessId = req.query.business_id as string | undefined;
      const logs = businessId
        ? await db.all("SELECT * FROM freelancing_time_logs WHERE business_id = ? ORDER BY date DESC, id DESC", [businessId])
        : await db.all("SELECT * FROM freelancing_time_logs ORDER BY date DESC, id DESC");
      res.json(logs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/freelancing/time_logs", async (req, res) => {
    try {
      const db = await getDb();
      const l = req.body;
      const result = await db.run(
        `INSERT INTO freelancing_time_logs (business_id, service_id, date, seconds, description) VALUES (?, ?, ?, ?, ?)`,
        [l.business_id, l.service_id || null, l.date, l.seconds, l.description]
      );
      if (l.service_id) {
        await recalculateFreelanceServiceHours(db, l.service_id);
      }
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/freelancing/time_logs/:id", async (req, res) => {
    try {
      const db = await getDb();
      const existing = await db.get("SELECT service_id FROM freelancing_time_logs WHERE id = ?", [req.params.id]);
      if (!existing) return res.status(404).json({ error: "Time log not found" });
      const log = req.body;
      await db.run(
        "UPDATE freelancing_time_logs SET service_id = ?, date = ?, seconds = ?, description = ? WHERE id = ?",
        [log.service_id || null, log.date, log.seconds, log.description || '', req.params.id]
      );
      if (existing.service_id) await recalculateFreelanceServiceHours(db, existing.service_id);
      if (log.service_id && log.service_id !== existing.service_id) await recalculateFreelanceServiceHours(db, log.service_id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/freelancing/time_logs/:id", async (req, res) => {
    try {
      const db = await getDb();
      const existing = await db.get("SELECT service_id FROM freelancing_time_logs WHERE id = ?", [req.params.id]);
      if (!existing) return res.status(404).json({ error: "Time log not found" });
      await db.run("DELETE FROM freelancing_time_logs WHERE id = ?", [req.params.id]);
      if (existing.service_id) await recalculateFreelanceServiceHours(db, existing.service_id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(appRoot, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

