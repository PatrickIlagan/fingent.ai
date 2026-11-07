import express from "express";
import multer from "multer";
import fsModule from "fs";
import crypto from "crypto";
import path from "path";
import os from "os";
import { evaluateRewards, planChallengeStart, planEquip, planLayout, planPurchase, rewardSummary, type RewardData } from "./src/lib/rewards";
import { closeDb, getDataDir, getDb, lockDatabase, unlockDatabase, validateDatabaseFile } from "./server/db";
import { accountGoalSavings, addMonth, isGoalError, businessMetrics, categoryAliasGroup, dueOccurrences, entryId, FALLBACK_FX_RATES, formatTicker, FX_RATES_URL, goalProgress, localDate, parseList, planGoalContribution, planGoalWithdrawal, ratesFromFrankfurter, withWholeAccounts, isAutopayLiability, isIsoDate, dueInterest, interestMode, interestSettings, isCardAccount, shareInterestWithGoals, INTEREST_FIELDS, legacyIncomeFlowNote, legacyLiabilityNote, liabilityAfterPayment, liabilityCategory, resolveCategoryAlias as resolveCategoryLabel } from "./src/lib/sharedRules";
// yahoo-finance2 exposes its constructor as CommonJS's `.default`. Using an
// explicit require keeps the production CJS bundle compatible with Electron.
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function resolveCategoryAlias(db: any, value: string) {
  const group = categoryAliasGroup(value);
  if (!group) return String(value || '').trim();

  const placeholders = group.aliases.map(() => '?').join(', ');
  const existing = await db.all(`SELECT name FROM categories WHERE active = 1 AND LOWER(name) IN (${placeholders})`, group.aliases);
  return resolveCategoryLabel(value, existing.map((item: { name: string }) => item.name));
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

const today = () => localDate();

type AccountEntry = { account_id: number; type: 'income' | 'expense'; amount: number; category: string; description: string; notes?: string; date: string; source?: string | null; source_id?: number | null };

/** Changes an account balance and records the matching transaction, linked to the record that caused it. */
async function recordAccountTransaction(db: any, entry: AccountEntry) {
  await db.run("UPDATE accounts SET balance = balance + ? WHERE id = ?", [entry.type === 'income' ? entry.amount : -entry.amount, entry.account_id]);
  const result = await db.run(
    "INSERT INTO transactions (account_id, type, amount, category, description, notes, date, source, source_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [entry.account_id, entry.type, entry.amount, entry.category, entry.description, entry.notes || '', entry.date, entry.source || null, entry.source_id ?? null]
  );
  await upsertPersonalCategory(db, entry.category, entry.type);
  return result.lastInsertRowid;
}

async function recordTransfer(db: any, from: { id: number; name: string }, to: { id: number; name: string }, amount: number, date: string, notes: string, source: string | null = null, sourceId: number | null = null) {
  await recordAccountTransaction(db, { account_id: from.id, type: 'expense', amount, category: 'Transfer', description: 'Transfer to ' + to.name, notes, date, source, source_id: sourceId });
  await recordAccountTransaction(db, { account_id: to.id, type: 'income', amount, category: 'Transfer', description: 'Transfer from ' + from.name, notes, date, source, source_id: sourceId });
}

async function linkedTransactions(db: any, source: string, sourceId: number | string, legacyNote: string) {
  return db.all("SELECT * FROM transactions WHERE (source = ? AND source_id = ?) OR (source IS NULL AND notes = ?)", [source, Number(sourceId), legacyNote]);
}

/** Deletes transactions and restores the account balances they changed. */
async function removeTransactions(db: any, transactions: any[]) {
  for (const transaction of transactions) {
    await db.run("UPDATE accounts SET balance = balance + ? WHERE id = ?", [transaction.type === 'income' ? -transaction.amount : transaction.amount, transaction.account_id]);
    await db.run("DELETE FROM transactions WHERE id = ?", [transaction.id]);
  }
}

const parseGoal = (goal: any) => ({ ...goal, sources: parseList(goal.sources), transactions: parseList(goal.transactions) });

async function goalContext(db: any) {
  return { goals: (await db.all("SELECT * FROM goals")).map(parseGoal), accounts: await db.all("SELECT * FROM accounts") };
}

async function saveGoalState(db: any, id: number, saved: number, sources: unknown[], transactions: unknown[]) {
  await db.run("UPDATE goals SET saved = ?, sources = ?, transactions = ? WHERE id = ?", [saved, JSON.stringify(sources), JSON.stringify(transactions), id]);
}

/** Records the transfer when goal money moves between accounts, then saves the goal. */
async function applyGoalContribution(db: any, goal: any, plan: any) {
  if (plan.transfer) await recordTransfer(db, plan.from, plan.saveIn, plan.entry.amount, plan.entry.date, `${plan.entry.type === 'autosave' ? 'Auto-save' : 'Saved'} for ${goal.name}.`, 'goal', Number(goal.id));
  await saveGoalState(db, goal.id, plan.saved, plan.sources, [plan.entry, ...goal.transactions]);
}

// Recurring income deposits and auto-paid bills post on each due date, then
// roll to the next month. A one-time `next_amount` replaces the usual amount
// for the next occurrence. Records saved before transactions carried a source
// link roll forward once without posting (months that may already be recorded
// aren't duplicated) and post normally from then on (`auto_post_from`).
async function postDueRecurring(db: any) {
  const now = today();
  const recurring = [
    ...(await db.all("SELECT * FROM income_flows WHERE is_recurring = 1")).map((row: any) => ({ row, kind: 'income_flow', table: 'income_flows' })),
    ...(await db.all("SELECT * FROM liabilities WHERE is_recurring = 1")).filter(isAutopayLiability).map((row: any) => ({ row, kind: 'liability', table: 'liabilities' })),
  ];
  for (const { row, kind, table } of recurring) {
    if (!isIsoDate(row.date)) continue;
    const { due, next } = dueOccurrences(row.date, now);
    if (!due.length) continue;
    const notes = kind === 'income_flow' ? legacyIncomeFlowNote(row.id) : legacyLiabilityNote(row.type, row.id);
    const linked = await linkedTransactions(db, kind, row.id, notes);
    const account = row.account_id ? await db.get("SELECT id FROM accounts WHERE id = ?", [row.account_id]) : null;
    const hasLinkedPosts = linked.some((transaction: any) => transaction.source === kind);
    for (const [index, date] of due.entries()) {
      if (!account || linked.some((transaction: any) => transaction.date === date)) continue;
      if (!hasLinkedPosts && !(isIsoDate(row.auto_post_from) && date >= row.auto_post_from)) continue;
      const amount = index === 0 && Number(row.next_amount) > 0 ? Number(row.next_amount) : Number(row.amount);
      await recordAccountTransaction(db, kind === 'income_flow'
        ? { account_id: account.id, type: 'income', amount, category: row.category || 'Income', description: row.name, notes, date, source: kind, source_id: row.id }
        : { account_id: account.id, type: 'expense', amount, category: liabilityCategory(row.type), description: row.name, notes, date, source: kind, source_id: row.id });
    }
    await db.run(`UPDATE ${table} SET date = ?, next_amount = NULL, auto_post_from = COALESCE(auto_post_from, ?) WHERE id = ?`, [next, now, row.id]);
  }

  // Goal auto-save: never overdraws; a month without enough money is recorded as skipped.
  for (const row of await db.all("SELECT * FROM goals WHERE autosave_amount > 0")) {
    if (!isIsoDate(row.autosave_date) || !row.autosave_from_account_id) continue;
    const { due, next } = dueOccurrences(row.autosave_date, now);
    if (!due.length) continue;
    for (const [index, date] of due.entries()) {
      const { goals, accounts } = await goalContext(db);
      const goal = goals.find((item: any) => item.id === row.id);
      const amount = index === 0 && Number(row.autosave_next_amount) > 0 ? Number(row.autosave_next_amount) : Number(row.autosave_amount);
      const plan = planGoalContribution(goal, goals, accounts, { amount, from_account_id: row.autosave_from_account_id, save_in_account_id: row.autosave_account_id || row.autosave_from_account_id, date, type: 'autosave' });
      if (isGoalError(plan)) await saveGoalState(db, goal.id, Number(goal.saved) || 0, goal.sources, [{ id: entryId(), date, amount, type: 'skipped', reason: plan.error }, ...goal.transactions]);
      else await applyGoalContribution(db, goal, plan);
    }
    await db.run("UPDATE goals SET autosave_date = ?, autosave_next_amount = NULL WHERE id = ?", [next, row.id]);
  }

  await postDueInterest(db);
  await checkRewards(db);
}

// ---- Ipon rewards ----------------------------------------------------------------
async function rewardData(db: any): Promise<RewardData> {
  const { goals, accounts } = await goalContext(db);
  let profile = await db.get("SELECT * FROM reward_profile WHERE id = 1");
  if (!profile) {
    await db.run("INSERT OR IGNORE INTO reward_profile (id, pet_name, equipped, created_at) VALUES (1, 'Mochi', '{}', ?)", [today()]);
    profile = await db.get("SELECT * FROM reward_profile WHERE id = 1");
  }
  const challenges = (await db.all("SELECT * FROM reward_challenges ORDER BY id")).map((row: any) => ({ ...row, params: parseJsonObject(row.params) }));
  return {
    goals, accounts, profile, challenges,
    transactions: await db.all("SELECT * FROM transactions"),
    incomeFlows: await db.all("SELECT * FROM income_flows"),
    budgets: await db.all("SELECT id FROM budgets"),
    events: await db.all("SELECT * FROM reward_events ORDER BY id"),
    syncConnected: Boolean((await db.get("SELECT value FROM app_settings WHERE key = 'google_refresh_token'"))?.value),
  };
}

const parseJsonObject = (value: unknown) => { try { const parsed = JSON.parse(String(value || '{}')); return parsed && typeof parsed === 'object' ? parsed : {}; } catch { return {}; } };

/** Records any points that are due. Each award has a unique key, so re-running never doubles it. */
async function checkRewards(db: any) {
  const result = evaluateRewards(await rewardData(db), today());
  for (const baseline of result.baselines) await db.run("UPDATE goals SET reward_baseline = ? WHERE id = ? AND reward_baseline IS NULL", [baseline.percent, baseline.goal_id]);
  const created = new Date().toISOString();
  for (const award of result.awards) await db.run("INSERT OR IGNORE INTO reward_events (ref_key, kind, points, label, date, created_at) VALUES (?, ?, ?, ?, ?, ?)", [award.ref_key, award.kind, award.points, award.label, award.date, created]);
  for (const update of result.challengeUpdates) await db.run("UPDATE reward_challenges SET status = ?, completed_at = ? WHERE id = ? AND status = 'active'", [update.status, update.completed_at, update.id]);
  return result;
}

/** Credits interest that's due (automatic and fixed modes) and grows goal savings held in those accounts. */
async function postDueInterest(db: any) {
  const now = today();
  for (const account of await db.all("SELECT * FROM accounts")) {
    if (interestMode(account) === 'off' || isCardAccount(account)) continue;
    const since = isIsoDate(account.interest_last_date) ? account.interest_last_date : now;
    const transactions = await db.all("SELECT account_id, date, type, amount FROM transactions WHERE account_id = ? AND date > ?", [account.id, since]);
    const { postings, lastDate } = dueInterest(account, transactions, now);
    await applyInterest(db, account, postings);
    if (lastDate !== account.interest_last_date) await db.run("UPDATE accounts SET interest_last_date = ? WHERE id = ?", [lastDate, account.id]);
  }
}

async function applyInterest(db: any, account: any, postings: { date: string; net: number; balanceBefore: number; description: string; notes: string }[]) {
  if (!postings.length) return;
  for (const posting of postings) await recordAccountTransaction(db, { account_id: account.id, type: 'income', amount: posting.net, category: 'Interest', description: posting.description, notes: posting.notes, date: posting.date, source: 'interest', source_id: account.id });
  const { goals } = await goalContext(db);
  for (const goal of shareInterestWithGoals(goals, account, postings)) await saveGoalState(db, goal.id, goal.saved, goal.sources, goal.transactions);
}

let recurringCheckedOn = '';
let recurringRun: Promise<void> | null = null;

/** Runs the recurring catch-up at most once a day; concurrent requests share one run. */
function ensureRecurringPosted() {
  const day = today();
  if (recurringCheckedOn === day) return Promise.resolve();
  recurringRun ??= (async () => {
    await postDueRecurring(await getDb());
    recurringCheckedOn = day;
  })().finally(() => { recurringRun = null; });
  return recurringRun;
}

const DRIVE_BACKUP_NAME = 'fingent-backup.enc';
const SYNC_TABLES = ['accounts', 'transactions', 'categories', 'goals', 'portfolios', 'portfolio_transactions', 'liabilities', 'career', 'career_tasks', 'personal_notes', 'personal_routines', 'personal_routine_logs', 'calendar_events', 'income_flows', 'budget_presets', 'budgets', 'businesses', 'business_deals', 'business_items', 'business_transactions', 'freelance_businesses', 'freelancing_services', 'freelancing_invoices', 'freelancing_time_logs', 'reward_events', 'reward_challenges', 'reward_profile'];

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

type AppLockRecord = { version: 1; salt: string; verifier: string };
const APP_LOCK_ITERATIONS = 600_000;

function appLockPath() {
  return path.join(getDataDir(), 'app-lock.json');
}

function readAppLock(): AppLockRecord | null {
  try {
    const record = JSON.parse(fsModule.readFileSync(appLockPath(), 'utf8'));
    if (record?.version !== 1 || typeof record.salt !== 'string' || typeof record.verifier !== 'string') return null;
    return record as AppLockRecord;
  } catch {
    return null;
  }
}

function matchesAppLock(password: string, record: AppLockRecord) {
  try {
    const expected = Buffer.from(record.verifier, 'base64');
    const actual = crypto.pbkdf2Sync(password, Buffer.from(record.salt, 'base64'), APP_LOCK_ITERATIONS, 32, 'sha256');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function saveAppLock(password: string) {
  const salt = crypto.randomBytes(16);
  const verifier = crypto.pbkdf2Sync(password, salt, APP_LOCK_ITERATIONS, 32, 'sha256');
  const target = appLockPath();
  const temporary = `${target}.tmp`;
  fsModule.mkdirSync(path.dirname(target), { recursive: true });
  fsModule.writeFileSync(temporary, JSON.stringify({ version: 1, salt: salt.toString('base64'), verifier: verifier.toString('base64') }), { encoding: 'utf8', mode: 0o600 });
  fsModule.renameSync(temporary, target);
}

// Unlocking issues an HttpOnly session cookie, and every other /api route
// requires it. Local programs and other web pages therefore cannot read data
// from the loopback server without the app password.
const SESSION_COOKIE = 'fingent_session';
// The Google callback is opened by the system browser, which has no session; it's checked with a one-time state value instead.
const PUBLIC_API_PATHS = new Set(['/api/health', '/api/system/lock/status', '/api/system/lock/setup', '/api/system/lock/unlock', '/api/system/google/callback']);
const activeSessions = new Set<string>();
let googleAccess: { token: string; expires: number } | null = null;

function sessionToken(req: express.Request) {
  const cookie = String(req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`));
  return cookie ? cookie.slice(SESSION_COOKIE.length + 1) : '';
}

function startSession(res: express.Response) {
  const token = crypto.randomBytes(32).toString('base64url');
  activeSessions.add(token);
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/`);
}

function endSessions(res: express.Response) {
  activeSessions.clear();
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
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

  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    next();
  });
  app.use((req, res, next) => {
    // Express routing ignores case and repeated slashes, so normalize before deciding.
    const pathname = req.path.toLowerCase().replace(/\/{2,}/g, '/').replace(/(.)\/$/, '$1');
    if (pathname !== '/api' && !pathname.startsWith('/api/')) return next();
    if (PUBLIC_API_PATHS.has(pathname)) return next();
    if (activeSessions.has(sessionToken(req))) return next();
    res.setHeader('X-FinGent-Locked', '1');
    res.status(401).json({ error: 'FinGent is locked. Unlock the app to continue.' });
  });
  app.use((req, res, next) => {
    // Every successful change bumps the data version, so sync can tell whether this device has unsynced changes.
    // Entries posted automatically (recurring, interest) aren't counted: every device works them out the same way.
    const pathname = req.path.toLowerCase();
    if (req.method === 'GET' || !pathname.startsWith('/api/') || pathname.startsWith('/api/system/')) return next();
    res.on('finish', () => {
      if (res.statusCode < 400) void getDb().then(db => db.run("INSERT INTO app_settings (key, value) VALUES ('data_version', '1') ON CONFLICT(key) DO UPDATE SET value = CAST(value AS INTEGER) + 1")).catch(() => {});
    });
    next();
  });
  app.use(async (req, _res, next) => {
    // Unlocked reads first post any recurring entries that have come due.
    const pathname = req.path.toLowerCase();
    if (req.method !== 'GET' || !pathname.startsWith('/api/') || PUBLIC_API_PATHS.has(pathname)) return next();
    try { await ensureRecurringPosted(); } catch (error) { console.error('Recurring entries could not be posted.', error); }
    next();
  });

  // The Electron wrapper uses a fresh loopback port on every launch. Store the
  // password verifier beside the encrypted database instead of browser storage,
  // whose origin is tied to that changing port. The password itself is never written.
  app.get('/api/system/lock/status', (_req, res) => {
    res.json({ configured: Boolean(readAppLock()) });
  });

  app.post('/api/system/lock/setup', async (req, res) => {
    try {
      const password = String(req.body?.password || '');
      if (password.length < 12) return res.status(400).json({ error: 'Use at least 12 characters for the app password.' });
      if (readAppLock()) return res.status(409).json({ error: 'An app password is already configured.' });
      // Do not persist a verifier until the supplied password has unlocked (or
      // initialized) the encrypted database. This avoids locking the user out
      // if they mistype the existing password during the one-time migration.
      await unlockDatabase(password);
      saveAppLock(password);
      startSession(res);
      res.json({ success: true });
    } catch (error: any) { res.status(401).json({ error: error.message || 'Could not protect FinGent.' }); }
  });

  app.post('/api/system/lock/unlock', async (req, res) => {
    try {
      const password = String(req.body?.password || '');
      const record = readAppLock();
      if (!record) return res.status(409).json({ error: 'No app password is configured yet.' });
      if (!matchesAppLock(password, record)) return res.status(401).json({ error: 'Incorrect password.' });
      await unlockDatabase(password);
      startSession(res);
      res.json({ success: true });
    } catch (error: any) { res.status(401).json({ error: error.message || 'Could not unlock FinGent.' }); }
  });

  app.post('/api/system/lock', async (_req, res) => {
    googleAccess = null;
    try {
      await lockDatabase();
      endSessions(res);
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message || 'Could not lock FinGent.' }); }
  });

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
    return res.status(410).json({ error: 'Deprecated. Use the client-side encrypted cross-device sync endpoint.' });
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
    return res.status(410).json({ error: 'Deprecated. Use the client-side encrypted cross-device sync endpoint.' });
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
        validateDatabaseFile(stagedPath);
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
      validateDatabaseFile(req.file.path);
      await closeDb();
      fsModule.copyFileSync(req.file.path, dbPath);
      recurringCheckedOn = '';
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    } finally {
      if (req.file && fsModule.existsSync(req.file.path)) fsModule.unlinkSync(req.file.path);
    }
  });

  // ---- Google sign-in for the desktop app -------------------------------------
  // Google's installed-app flow: the system browser signs in and returns to this
  // loopback server with a one-time code, exchanged using PKCE. The refresh
  // token is kept in the encrypted database (app_settings), never synced.
  // From the environment, or the 'Desktop app' client JSON downloaded from Google Cloud saved as desktop/google-oauth.json (packaged with the app).
  const googleClient = (() => {
    if (process.env.GOOGLE_DESKTOP_CLIENT_ID) return { id: process.env.GOOGLE_DESKTOP_CLIENT_ID, secret: process.env.GOOGLE_DESKTOP_CLIENT_SECRET || '' };
    try { const raw = JSON.parse(fsModule.readFileSync(path.join(appRoot, 'desktop', 'google-oauth.json'), 'utf8')); const client = raw.installed || raw; return { id: String(client.client_id || ''), secret: String(client.client_secret || '') }; } catch { return { id: '', secret: '' }; }
  })();
  const googleClientId = googleClient.id;
  const googleClientSecret = googleClient.secret;
  const googleAuthUrl = process.env.GOOGLE_OAUTH_AUTH_URL || 'https://accounts.google.com/o/oauth2/v2/auth';
  const googleTokenUrl = process.env.GOOGLE_OAUTH_TOKEN_URL || 'https://oauth2.googleapis.com/token';
  const pendingGoogleLogins = new Map<string, { verifier: string; redirect: string; expires: number }>();
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] as string));
  const resultPage = (title: string, message: string) => '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FinGent</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#ecfdf5;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a"><main style="max-width:420px;margin:24px;padding:32px;background:#fff;border-radius:24px;box-shadow:0 12px 40px rgba(15,23,42,.08);text-align:center"><h1 style="margin:0 0 8px;font-size:22px">' + escapeHtml(title) + '</h1><p style="margin:0;color:#475569;line-height:1.5">' + escapeHtml(message) + '</p></main></body></html>';
  const getSetting = async (db: any, key: string) => (await db.get("SELECT value FROM app_settings WHERE key = ?", [key]))?.value ?? null;
  const setSetting = async (db: any, key: string, value: unknown) => {
    if (value === null || value === undefined) await db.run("DELETE FROM app_settings WHERE key = ?", [key]);
    else await db.run("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, String(value)]);
  };

  async function googleAccessToken(db: any) {
    if (googleAccess && googleAccess.expires > Date.now()) return googleAccess.token;
    const refreshToken = await getSetting(db, 'google_refresh_token');
    if (!refreshToken) return null;
    const response = await fetch(googleTokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: googleClientId, client_secret: googleClientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }) });
    const body: any = await response.json().catch(() => ({}));
    if (!response.ok || !body.access_token) {
      if (body.error === 'invalid_grant') await setSetting(db, 'google_refresh_token', null);
      throw Object.assign(new Error('Your Google sign-in expired. Connect Google again in Settings.'), { status: 409 });
    }
    googleAccess = { token: body.access_token, expires: Date.now() + (Number(body.expires_in) || 3600) * 1000 - 60_000 };
    return googleAccess.token;
  }

  app.get('/api/system/google/start', (_req, res) => {
    if (!googleClientId) return res.status(400).json({ error: 'Google sign-in for the desktop app is not set up yet. Add GOOGLE_DESKTOP_CLIENT_ID and GOOGLE_DESKTOP_CLIENT_SECRET (see README).' });
    for (const [key, login] of pendingGoogleLogins) if (login.expires < Date.now()) pendingGoogleLogins.delete(key);
    const state = crypto.randomBytes(24).toString('base64url');
    const verifier = crypto.randomBytes(48).toString('base64url');
    const redirect = 'http://127.0.0.1:' + PORT + '/api/system/google/callback';
    pendingGoogleLogins.set(state, { verifier, redirect, expires: Date.now() + 10 * 60_000 });
    const query = new URLSearchParams({ client_id: googleClientId, redirect_uri: redirect, response_type: 'code', scope: 'https://www.googleapis.com/auth/drive.appdata', code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', state, access_type: 'offline', prompt: 'consent' });
    res.json({ url: googleAuthUrl + '?' + query.toString() });
  });

  app.get('/api/system/google/callback', async (req, res) => {
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
    res.setHeader('Cache-Control', 'no-store');
    const state = String(req.query.state || '');
    const pending = pendingGoogleLogins.get(state);
    pendingGoogleLogins.delete(state);
    if (!pending || pending.expires < Date.now()) return res.status(400).send(resultPage('This sign-in link expired', 'Start again from Settings in FinGent.'));
    if (req.query.error || !req.query.code) return res.status(400).send(resultPage('Google sign-in was cancelled', 'You can close this tab and try again from FinGent.'));
    try {
      const response = await fetch(googleTokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: String(req.query.code), client_id: googleClientId, client_secret: googleClientSecret, redirect_uri: pending.redirect, grant_type: 'authorization_code', code_verifier: pending.verifier }) });
      const body: any = await response.json().catch(() => ({}));
      if (!response.ok || !body.access_token) throw new Error(body.error_description || body.error || 'Google did not return a sign-in token.');
      const db = await getDb();
      if (body.refresh_token) await setSetting(db, 'google_refresh_token', body.refresh_token);
      else if (!(await getSetting(db, 'google_refresh_token'))) throw new Error('Google did not allow offline access.');
      googleAccess = { token: body.access_token, expires: Date.now() + (Number(body.expires_in) || 3600) * 1000 - 60_000 };
      res.send(resultPage("You're connected", 'FinGent can now sync through your Google account. Go back to the app; you can close this tab.'));
    } catch (error: any) {
      res.status(500).send(resultPage('Could not connect to Google', (error?.message || 'Something went wrong.') + ' Make sure FinGent is unlocked, then try again.'));
    }
  });

  app.get('/api/system/google/token', async (_req, res) => {
    try {
      const token = await googleAccessToken(await getDb());
      if (!token) return res.status(409).json({ error: 'Google is not connected.' });
      res.json({ access_token: token });
    } catch (error: any) { res.status(error.status || 500).json({ error: error.message }); }
  });

  app.post('/api/system/google/disconnect', async (_req, res) => {
    try {
      const db = await getDb();
      const refreshToken = await getSetting(db, 'google_refresh_token');
      if (refreshToken) void fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: refreshToken }) }).catch(() => {});
      await setSetting(db, 'google_refresh_token', null);
      googleAccess = null;
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // ---- Sync state --------------------------------------------------------------
  const SYNC_STATE_KEYS = ['synced_version', 'remote_modified', 'sync_auto', 'last_synced_at', 'last_synced_device', 'device_name'];
  async function syncState(db: any) {
    let deviceId = await getSetting(db, 'device_id');
    if (!deviceId) { deviceId = crypto.randomUUID(); await setSetting(db, 'device_id', deviceId); }
    return {
      data_version: Number(await getSetting(db, 'data_version')) || 0,
      synced_version: Number(await getSetting(db, 'synced_version')) || 0,
      remote_modified: await getSetting(db, 'remote_modified'),
      auto: (await getSetting(db, 'sync_auto')) !== '0',
      google_connected: Boolean(await getSetting(db, 'google_refresh_token')),
      google_provider: googleClientId ? 'desktop' : 'none',
      last_synced_at: await getSetting(db, 'last_synced_at'),
      last_synced_device: await getSetting(db, 'last_synced_device'),
      device_id: deviceId,
      device_name: (await getSetting(db, 'device_name')) || os.hostname() || 'This computer',
    };
  }
  app.get('/api/system/sync/state', async (_req, res) => {
    try { res.json(await syncState(await getDb())); } catch (error: any) { res.status(500).json({ error: error.message }); }
  });
  app.post('/api/system/sync/state', async (req, res) => {
    try {
      const db = await getDb();
      const current = await syncState(db);
      for (const key of SYNC_STATE_KEYS) {
        const incoming = key === 'sync_auto' ? (req.body.auto === undefined ? undefined : (req.body.auto ? '1' : '0')) : req.body[key];
        if (incoming === undefined) continue;
        await setSetting(db, key, key === 'synced_version' && incoming === 'current' ? current.data_version : incoming);
      }
      res.json(await syncState(db));
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // Platform-neutral snapshot used by the desktop and Android Google Drive sync.
  // The encrypted payload is created in the client before it is sent to Drive.
  app.get('/api/system/sync/export', async (_req, res) => {
    try {
      const db = await getDb();
      const tables: Record<string, unknown[]> = {};
      for (const table of SYNC_TABLES) tables[table] = await db.all(`SELECT * FROM ${table}`);
      res.json({ format: 'FINGENT_SYNC_V1', exportedAt: new Date().toISOString(), tables });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post('/api/system/sync/import', async (req, res) => {
    try {
      const snapshot = req.body;
      if (snapshot?.format !== 'FINGENT_SYNC_V1' || !snapshot.tables || typeof snapshot.tables !== 'object') return res.status(400).json({ error: 'This is not a FinGent sync backup.' });
      const db = await getDb();
      await db.exec('PRAGMA foreign_keys = OFF; BEGIN;');
      try {
        for (const table of [...SYNC_TABLES].reverse()) await db.run(`DELETE FROM ${table}`);
        for (const table of SYNC_TABLES) {
          const columns = (await db.all(`PRAGMA table_info(${table})`)).map((column: any) => column.name);
          const rows = Array.isArray(snapshot.tables[table]) ? snapshot.tables[table] : [];
          for (const row of rows) {
            const keys = columns.filter((column: string) => Object.prototype.hasOwnProperty.call(row, column));
            if (!keys.length) continue;
            await db.run(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, keys.map((key: string) => row[key]));
          }
        }
        await db.exec('COMMIT; PRAGMA foreign_keys = ON;');
      } catch (error) {
        await db.exec('ROLLBACK; PRAGMA foreign_keys = ON;');
        throw error;
      }
      recurringCheckedOn = '';
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/accounts", async (req, res) => {
    try {
      const db = await getDb();
      const { goals, accounts } = await goalContext(db);
      const savings = accountGoalSavings(goals, accounts);
      res.json(accounts.map((account: any) => ({ ...account, goal_savings: savings.get(account.id) ?? [] })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/goals", async (req, res) => {
    try {
      const db = await getDb();
      const { goals, accounts } = await goalContext(db);
      res.json(goals.map((goal: any) => ({ ...goal, progress: goalProgress(goal, accounts) })));
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
      const { amount, fromHint, toHint, date = localDate() } = req.body;
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
      await recordTransfer(db, from, to, value, date, 'Added locally through FinGent Copilot after user confirmation.');
      res.json({ success: true, from: from.name, to: to.name });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/transfers", async (req, res) => {
    try {
      const db = await getDb();
      const { from_account_id, to_account_id, amount, date = today(), notes = '' } = req.body;
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ error: 'A positive transfer amount is required.' });
      const from = await db.get("SELECT id, name FROM accounts WHERE id = ?", [from_account_id]);
      const to = await db.get("SELECT id, name FROM accounts WHERE id = ?", [to_account_id]);
      if (!from || !to || from.id === to.id) return res.status(400).json({ error: 'Choose two different existing accounts.' });
      await recordTransfer(db, from, to, value, date, String(notes || ''));
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
      const date = input.date || localDate();
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
        // Archived categories stay on historic transactions without being revived here.
        if (await db.get("SELECT id FROM categories WHERE name = ? COLLATE NOCASE AND active = 0", [row.category])) continue;
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
      const { name, type = 'expense', keywords = '' } = req.body;
      const normalized = String(name || '').trim();
      if (!normalized) return res.status(400).json({ error: 'A category name is required.' });
      await upsertPersonalCategory(db, normalized, type === 'income' ? 'income' : 'expense');
      await db.run("UPDATE categories SET keywords = ? WHERE name = ? COLLATE NOCASE", [String(keywords || '').trim(), normalized]);
      const category = await db.get("SELECT * FROM categories WHERE name = ? COLLATE NOCASE", [normalized]);
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { name, type, keywords = '' } = req.body;
      const category = await db.get("SELECT * FROM categories WHERE id = ?", [req.params.id]);
      const normalized = String(name || '').trim();
      if (!category || !normalized) return res.status(400).json({ error: 'Category not found or name is empty.' });
      await db.run("UPDATE transactions SET category = ? WHERE category = ? COLLATE NOCASE", [normalized, category.name]);
      await db.run("UPDATE categories SET name = ?, type = ?, keywords = ?, active = 1 WHERE id = ?", [normalized, type || category.type, String(keywords || '').trim(), category.id]);
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
      const today = localDate();
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
      const date = req.body.date || localDate();
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
      const { name, type, balance, image_logo_name = 'bank', color = '', purpose = '', credit_limit = null, statement_date = null, due_date = null } = req.body;
      const interest = interestSettings(req.body, null, today());
      const result = await db.run(
        `INSERT INTO accounts (name, type, balance, image_logo_name, color, purpose, credit_limit, statement_date, due_date, ${INTEREST_FIELDS.join(', ')}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${INTEREST_FIELDS.map(() => '?').join(', ')})`,
        [name, type, balance, image_logo_name, color, purpose, credit_limit, statement_date, due_date, ...INTEREST_FIELDS.map(field => interest[field])]
      );
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Editable goal fields. Savings and history are changed only through the
  // contribute / withdraw routes so balances and goal totals stay consistent.
  const GOAL_FIELDS = ['name', 'target', 'date', 'color', 'icon', 'autosave_amount', 'autosave_next_amount', 'autosave_date', 'autosave_from_account_id', 'autosave_account_id'];

  async function updateGoal(db: any, id: number, body: any) {
    const fields = GOAL_FIELDS.filter(field => Object.prototype.hasOwnProperty.call(body, field));
    if (fields.length) await db.run(`UPDATE goals SET ${fields.map(field => `${field} = ?`).join(', ')} WHERE id = ?`, [...fields.map(field => body[field] === '' ? null : body[field]), id]);
    if (Array.isArray(body.whole_account_ids)) {
      const { goals, accounts } = await goalContext(db);
      const linked = withWholeAccounts(goals.find((goal: any) => goal.id === id), goals, accounts, body.whole_account_ids);
      if (isGoalError(linked)) throw Object.assign(new Error(linked.error), { status: 400 });
      await db.run("UPDATE goals SET sources = ? WHERE id = ?", [JSON.stringify(linked.sources), id]);
    }
  }

  /** Runs a multi-step write as one database transaction and sends its result (or error status). */
  async function respondInTransaction(res: express.Response, work: (db: any) => Promise<unknown>) {
    let db: any = null;
    try {
      db = await getDb();
      await db.exec('BEGIN');
      const result = await work(db);
      await db.exec('COMMIT');
      res.json(result);
    } catch (error: any) {
      if (db) await db.exec('ROLLBACK').catch(() => {});
      res.status(error.status || 500).json({ error: error.message });
    }
  }

  app.get("/api/rewards", async (_req, res) => {
    try {
      const db = await getDb();
      const result = await checkRewards(db);
      res.json({ ...rewardSummary(await rewardData(db), today()), new_events: result.awards });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/rewards/buy", (req, res) => respondInTransaction(res, async (db) => {
    const plan = planPurchase(await rewardData(db), String(req.body.item_id || ''), today());
    if ('error' in plan) throw Object.assign(new Error(plan.error), { status: 400 });
    await db.run("INSERT INTO reward_events (ref_key, kind, points, label, date, created_at) VALUES (?, ?, ?, ?, ?, ?)", [plan.event.ref_key, plan.event.kind, plan.event.points, plan.event.label, plan.event.date, new Date().toISOString()]);
    return { success: true };
  }));

  app.post("/api/rewards/equip", (req, res) => respondInTransaction(res, async (db) => {
    const plan = planEquip(await rewardData(db), String(req.body.slot || ''), req.body.item_id ? String(req.body.item_id) : null);
    if ('error' in plan) throw Object.assign(new Error(plan.error), { status: 400 });
    await db.run("UPDATE reward_profile SET equipped = ? WHERE id = 1", [JSON.stringify(plan.equipped)]);
    return { success: true };
  }));

  app.post("/api/rewards/layout", (req, res) => respondInTransaction(res, async (db) => {
    const plan = planLayout(await rewardData(db), req.body.layout);
    if ('error' in plan) throw Object.assign(new Error(plan.error), { status: 400 });
    await db.run("UPDATE reward_profile SET equipped = ? WHERE id = 1", [JSON.stringify(plan.equipped)]);
    return { success: true };
  }));

  app.post("/api/rewards/profile", (req, res) => respondInTransaction(res, async (db) => {
    await rewardData(db);
    if (req.body.pet_name !== undefined) {
      const name = String(req.body.pet_name).trim().slice(0, 24);
      if (!name) throw Object.assign(new Error('Give your pet a name.'), { status: 400 });
      await db.run("UPDATE reward_profile SET pet_name = ? WHERE id = 1", [name]);
    }
    if (req.body.hatched) await db.run("UPDATE reward_profile SET hatched_at = COALESCE(hatched_at, ?) WHERE id = 1", [today()]);
    return { success: true };
  }));

  app.post("/api/rewards/challenges", (req, res) => respondInTransaction(res, async (db) => {
    const plan = planChallengeStart(await rewardData(db), String(req.body.template || ''), today());
    if ('error' in plan) throw Object.assign(new Error(plan.error), { status: 400 });
    let goalId = plan.linkGoalId;
    if (plan.goal) {
      const goal = await db.run("INSERT INTO goals (name, target, saved, date, color, icon, sources, transactions, created_at, reward_baseline) VALUES (?, ?, 0, ?, ?, ?, '[]', '[]', ?, 0)", [plan.goal.name, plan.goal.target, plan.goal.date, plan.goal.color, plan.goal.icon, today()]);
      goalId = Number(goal.lastInsertRowid);
    }
    const challenge = await db.run("INSERT INTO reward_challenges (template, title, params, goal_id, started_at, ends_at, status) VALUES (?, ?, ?, ?, ?, ?, 'active')", [plan.challenge.template, plan.challenge.title, JSON.stringify({ ...plan.challenge.params, start_saved: 0 }), goalId, plan.challenge.started_at, plan.challenge.ends_at]);
    return { id: Number(challenge.lastInsertRowid), goal_id: goalId };
  }));

  app.post("/api/rewards/challenges/:id/cancel", (req, res) => respondInTransaction(res, async (db) => {
    await db.run("UPDATE reward_challenges SET status = 'cancelled' WHERE id = ? AND status = 'active'", [req.params.id]);
    return { success: true };
  }));

  app.post("/api/goals", (req, res) => respondInTransaction(res, async (db) => {
      const { name, target, saved = 0, date = null, color = 'emerald', icon = 'Target', starting_savings = [] } = req.body;
      if (!String(name || '').trim() || !(Number(target) > 0)) throw Object.assign(new Error('A goal needs a name and a target above zero.'), { status: 400 });
      const result = await db.run(
        "INSERT INTO goals (name, target, saved, date, color, icon, sources, transactions, created_at) VALUES (?, ?, ?, ?, ?, ?, '[]', '[]', ?)",
        [String(name).trim(), Number(target), Number(saved) || 0, date, color, icon, today()]
      );
      const id = Number(result.lastInsertRowid);
      await updateGoal(db, id, req.body);
      // Savings already sitting in an account count toward the goal from the start.
      for (const start of Array.isArray(starting_savings) ? starting_savings : []) {
        if (!(Number(start?.amount) > 0)) continue;
        const { goals, accounts } = await goalContext(db);
        const goal = goals.find((item: any) => item.id === id);
        const plan = planGoalContribution(goal, goals, accounts, { amount: start.amount, from_account_id: start.account_id, date: today() });
        if (isGoalError(plan)) throw Object.assign(new Error(plan.error), { status: 400 });
        await applyGoalContribution(db, goal, plan);
      }
      const created = await goalContext(db);
      const made = created.goals.find((item: any) => item.id === id);
      if (made) await db.run("UPDATE goals SET reward_baseline = ? WHERE id = ?", [goalProgress(made, created.accounts).percent, id]);
      if (req.body.autosave_amount) recurringCheckedOn = '';
      return { id };
  }));

  app.put("/api/goals/:id", (req, res) => respondInTransaction(res, async (db) => {
    if (!(await db.get("SELECT id FROM goals WHERE id = ?", [req.params.id]))) throw Object.assign(new Error('Goal not found.'), { status: 404 });
    await updateGoal(db, Number(req.params.id), req.body);
    if (Object.keys(req.body).some(key => key.startsWith('autosave_'))) recurringCheckedOn = '';
    return { success: true };
  }));

  app.post("/api/goals/:id/contribute", (req, res) => respondInTransaction(res, async (db) => {
    const { goals, accounts } = await goalContext(db);
    const goal = goals.find((item: any) => item.id === Number(req.params.id));
    if (!goal) throw Object.assign(new Error('Goal not found.'), { status: 404 });
    const plan = planGoalContribution(goal, goals, accounts, { amount: req.body.amount, from_account_id: req.body.from_account_id, save_in_account_id: req.body.save_in_account_id, date: isIsoDate(req.body.date) ? req.body.date : today() });
    if (isGoalError(plan)) throw Object.assign(new Error(plan.error), { status: 400 });
    await applyGoalContribution(db, goal, plan);
    return { success: true, transfer: plan.transfer };
  }));

  app.post("/api/goals/:id/withdraw", async (req, res) => {
    try {
      const db = await getDb();
      const { goals } = await goalContext(db);
      const goal = goals.find((item: any) => item.id === Number(req.params.id));
      if (!goal) return res.status(404).json({ error: 'Goal not found.' });
      const plan = planGoalWithdrawal(goal, { amount: req.body.amount, account_id: req.body.account_id ?? null, date: isIsoDate(req.body.date) ? req.body.date : today() });
      if (isGoalError(plan)) return res.status(400).json({ error: plan.error });
      await saveGoalState(db, goal.id, plan.saved, plan.sources, [plan.entry, ...goal.transactions]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/goals/:id/autosave/skip", async (req, res) => {
    try {
      const db = await getDb();
      const goal = await db.get("SELECT * FROM goals WHERE id = ?", [req.params.id]);
      if (!goal || !isIsoDate(goal.autosave_date)) return res.status(400).json({ error: 'This goal has no scheduled auto-save.' });
      const amount = Number(goal.autosave_next_amount) > 0 ? Number(goal.autosave_next_amount) : Number(goal.autosave_amount);
      const entries = [{ id: entryId(), date: goal.autosave_date, amount, type: 'skipped', reason: 'Skipped by you.' }, ...parseList(goal.transactions)];
      await db.run("UPDATE goals SET autosave_date = ?, autosave_next_amount = NULL, transactions = ? WHERE id = ?", [addMonth(goal.autosave_date), JSON.stringify(entries), goal.id]);
      res.json({ success: true, autosave_date: addMonth(goal.autosave_date) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/goals/:id", async (req, res) => {
    try {
      const db = await getDb();
      // Balances never moved into a goal, so deleting it leaves accounts untouched.
      await db.run("DELETE FROM goals WHERE id = ?", [req.params.id]);
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

  
  // Records interest the bank credited (remind mode, or a correction). The amount is what arrived after tax.
  app.post("/api/accounts/:id/interest", (req, res) => respondInTransaction(res, async (db) => {
    const account = await db.get("SELECT * FROM accounts WHERE id = ?", [req.params.id]);
    if (!account) throw Object.assign(new Error('Account not found.'), { status: 404 });
    const net = Math.round(Number(req.body.amount) * 100) / 100;
    if (!(net > 0)) throw Object.assign(new Error('Enter the interest amount you received.'), { status: 400 });
    const date = isIsoDate(req.body.date) ? req.body.date : today();
    const gross = Number(req.body.gross) > net ? Math.round(Number(req.body.gross) * 100) / 100 : net;
    const tax = Math.round((gross - net) * 100) / 100;
    const notes = tax > 0 ? 'Added manually · gross ₱' + gross.toFixed(2) + ' · tax ₱' + tax.toFixed(2) : 'Added manually';
    await applyInterest(db, account, [{ date, net, balanceBefore: Number(account.balance) || 0, description: 'Interest', notes }]);
    if (isIsoDate(req.body.covers_until) && (!isIsoDate(account.interest_last_date) || req.body.covers_until > account.interest_last_date)) await db.run("UPDATE accounts SET interest_last_date = ? WHERE id = ?", [req.body.covers_until, account.id]);
    return { success: true };
  }));

  app.put("/api/accounts/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { name, type, balance, color, purpose, credit_limit, statement_date = null, due_date = null } = req.body;
      
      const oldAccount = await db.get("SELECT * FROM accounts WHERE id = ?", [id]);
      if (!oldAccount) return res.status(404).json({ error: 'Account not found.' });
      const interest = interestSettings(req.body, oldAccount, today());
      
      await db.run(
        `UPDATE accounts SET name = ?, type = ?, balance = ?, color = ?, purpose = ?, credit_limit = ?, statement_date = ?, due_date = ?, ${INTEREST_FIELDS.map(field => `${field} = ?`).join(', ')} WHERE id = ?`,
        [name, type, balance, color, purpose, credit_limit, statement_date, due_date, ...INTEREST_FIELDS.map(field => interest[field]), id]
      );
      
      if (oldAccount && parseFloat(oldAccount.balance) !== parseFloat(balance)) {
        const diff = parseFloat(balance) - parseFloat(oldAccount.balance);
        const txType = diff > 0 ? 'income' : 'expense';
        await db.run(
          "INSERT INTO transactions (account_id, type, amount, category, description, date) VALUES (?, ?, ?, ?, ?, ?)",
          [id, txType, Math.abs(diff), 'Adjustment', 'Balance Adjustment', localDate()]
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

  let lastRates = FALLBACK_FX_RATES;
  app.get("/api/rates", async (req, res) => {
    try {
      const response = await fetch(FX_RATES_URL, { signal: AbortSignal.timeout(8000) });
      const rates = response.ok ? ratesFromFrankfurter(await response.json()) : null;
      if (!rates) throw new Error('Exchange rates were unavailable.');
      lastRates = rates;
      res.json(rates);
    } catch(e) {
      console.error(e);
      res.json({ ...lastRates, cached: true });
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
      let { type, name, invested, current_value, shares = null, avg_price = null, ticker = null, currency = "USD", platform = null, date = localDate(), account_id = null, cash_amount = 0 } = req.body;
      const fundingAccount = account_id ? await db.get("SELECT id FROM accounts WHERE id = ?", [account_id]) : null;
      if (account_id && !fundingAccount) return res.status(400).json({ error: 'The selected account no longer exists.' });
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
      // The client converts the purchase into the account's pesos before sending cash_amount.
      if (fundingAccount && Number(cash_amount) > 0) {
         await recordAccountTransaction(db, { account_id: fundingAccount.id, type: 'expense', amount: Number(cash_amount), category: 'Investments', description: 'Bought ' + name, date, source: 'portfolio', source_id: Number(newId) });
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
      const { type, shares, price, date, account_id = null, cash_amount = 0 } = req.body;
      const cashAccount = account_id ? await db.get("SELECT id FROM accounts WHERE id = ?", [account_id]) : null;
      if (account_id && !cashAccount) return res.status(400).json({ error: 'The selected account no longer exists.' });

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
         if (cashAccount && Number(cash_amount) > 0 && (type === 'Buy' || type === 'Sell')) {
           await recordAccountTransaction(db, { account_id: cashAccount.id, type: type === 'Buy' ? 'expense' : 'income', amount: Number(cash_amount), category: 'Investments', description: (type === 'Buy' ? 'Bought ' : 'Sold ') + p.name, date: date || today(), source: 'portfolio', source_id: Number(id) });
         }
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
      const liabilities = await db.all(`
        SELECT l.*, a.name AS linked_account_name, a.type AS linked_account_type,
          (SELECT COUNT(*) FROM transactions t WHERE (t.source = 'liability' AND t.source_id = l.id) OR (t.source IS NULL AND t.notes = 'Linked to ' || l.type || ' record #' || l.id || '.')) AS linked_transaction_count
        FROM liabilities l
        LEFT JOIN accounts a ON a.id = l.account_id
        ORDER BY l.date ASC, l.id DESC
      `);
      res.json(liabilities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/liabilities", async (req, res) => {
    try {
      const db = await getDb();
      const { name, type, amount, date, provider, status, card_name, total_amount, remaining_amount, total_months, current_month, merchant, paid_using, is_recurring, account_id = null } = req.body;
      const numericAmount = Number(amount);
      if (!name || !Number.isFinite(numericAmount) || numericAmount <= 0) return res.status(400).json({ error: 'A name and positive amount are required.' });
      const linkedAccount = account_id ? await db.get("SELECT id, name, type FROM accounts WHERE id = ?", [account_id]) : null;
      if (account_id && !linkedAccount) return res.status(400).json({ error: 'The selected account no longer exists.' });
      if (type === 'Credits' && linkedAccount && !['card', 'credit'].includes(String(linkedAccount.type).toLowerCase())) return res.status(400).json({ error: 'Credit due dates can only be linked to a credit-card account.' });

      await db.exec('BEGIN');
      try {
        const result = await db.run(
          "INSERT INTO liabilities (name, type, amount, date, provider, status, card_name, total_amount, remaining_amount, total_months, current_month, merchant, paid_using, is_recurring, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [name, type, numericAmount, date, provider, status, card_name, total_amount, remaining_amount, total_months, current_month, merchant, paid_using, is_recurring ? 1 : 0, linkedAccount?.id || null]
        );
        // A Credit record represents an existing card statement/due date. It
        // must not charge the card a second time. Other linked records represent
        // money actually leaving the selected account and appear in its history.
        // Deducting at creation is the first payment, so the record moves on as if paid.
        if (linkedAccount && type !== 'Credits') {
          const id = Number(result.lastInsertRowid);
          await recordAccountTransaction(db, { account_id: linkedAccount.id, type: 'expense', amount: numericAmount, category: liabilityCategory(type), description: name, notes: legacyLiabilityNote(type, id), date: isIsoDate(date) ? date : today(), source: 'liability', source_id: id });
          const update = liabilityAfterPayment({ type, amount: numericAmount, date, is_recurring, total_months, current_month, remaining_amount });
          await db.run("UPDATE liabilities SET status = ?, date = ?, current_month = ?, remaining_amount = ? WHERE id = ?", [update.status, update.date, update.current_month, update.remaining_amount, id]);
        }
        await db.exec('COMMIT');
        if (is_recurring) recurringCheckedOn = '';
        res.json({ id: result.lastInsertRowid, account: linkedAccount?.name || null, deducted: Boolean(linkedAccount && type !== 'Credits') });
      } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/liabilities/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const liability = await db.get("SELECT * FROM liabilities WHERE id = ?", [id]);
      // ?undo=1 also removes the payments this record created and restores balances.
      if (liability && req.query.undo === '1') await removeTransactions(db, await linkedTransactions(db, 'liability', id, legacyLiabilityNote(liability.type, id)));
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
      const liability = await db.get("SELECT * FROM liabilities WHERE id = ?", [id]);
      if (!liability) return res.status(404).json({ error: 'Liability not found.' });
      const account = req.body?.account_id ? await db.get("SELECT id, name FROM accounts WHERE id = ?", [req.body.account_id]) : null;
      if (req.body?.account_id && !account) return res.status(400).json({ error: 'The selected account no longer exists.' });
      // The amount actually paid can differ from the usual one (a higher electricity bill).
      const amount = Number(req.body?.amount) > 0 ? Number(req.body.amount) : Number(liability.amount) || 0;
      const notes = legacyLiabilityNote(liability.type, id);
      if (account && amount > 0) {
        // Paying a card's due date from another account moves money onto the card.
        const card = liability.type === 'Credits' && liability.account_id && Number(liability.account_id) !== account.id
          ? await db.get("SELECT id, name FROM accounts WHERE id = ?", [liability.account_id])
          : null;
        if (card) await recordTransfer(db, account, card, amount, today(), notes, 'liability', Number(id));
        else await recordAccountTransaction(db, { account_id: account.id, type: 'expense', amount, category: liabilityCategory(liability.type), description: liability.name, notes, date: today(), source: 'liability', source_id: Number(id) });
      }
      const update = liabilityAfterPayment({ ...liability, amount });
      await db.run("UPDATE liabilities SET status = ?, date = ?, current_month = ?, remaining_amount = ? WHERE id = ?", [update.status, update.date, update.current_month, update.remaining_amount, id]);
      res.json({ success: true, ...update, account: account?.name || null });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Only the one-time amount for an auto-paid bill's next charge is editable here.
  app.put("/api/liabilities/:id", async (req, res) => {
    try {
      const db = await getDb();
      const nextAmount = Number(req.body?.next_amount) > 0 ? Number(req.body.next_amount) : null;
      const result = await db.run("UPDATE liabilities SET next_amount = ? WHERE id = ?", [nextAmount, req.params.id]);
      if (!result.changes) return res.status(404).json({ error: 'Liability not found.' });
      res.json({ success: true, next_amount: nextAmount });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/income_flows", async (req, res) => {
    try {
      const db = await getDb();
      const rows = await db.all(`
        SELECT f.*, (SELECT COUNT(*) FROM transactions t WHERE (t.source = 'income_flow' AND t.source_id = f.id) OR (t.source IS NULL AND t.notes = 'Auto-deposited from income flow #' || f.id || '.')) AS linked_transaction_count
        FROM income_flows f
      `);
      res.json(rows);
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });
  app.post("/api/income_flows", async (req, res) => {
    try {
      const db = await getDb();
      const { name, amount, date, is_recurring, budget_preset_id, account_id, category = 'Income' } = req.body;
      const numericAmount = Number(amount);
      if (!name || !Number.isFinite(numericAmount) || numericAmount <= 0 || !date) return res.status(400).json({ error: 'Name, positive amount, and date are required.' });
      const linkedAccount = account_id ? await db.get("SELECT id, name FROM accounts WHERE id = ?", [account_id]) : null;
      if (account_id && !linkedAccount) return res.status(400).json({ error: 'The selected deposit account no longer exists.' });
      await db.exec('BEGIN');
      try {
        const result = await db.run("INSERT INTO income_flows (name, amount, date, is_recurring, budget_preset_id, account_id, category) VALUES (?, ?, ?, ?, ?, ?, ?)", [name, numericAmount, date, is_recurring ? 1 : 0, budget_preset_id, linkedAccount?.id || null, category]);
        const flowId = Number(result.lastInsertRowid);
        await upsertPersonalCategory(db, category, 'income');
        await db.run("INSERT INTO calendar_events (name, type, amount, date, color, icon, provider, source, source_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [name, 'income', numericAmount, date, 'emerald', 'ArrowDown', 'Manual', 'income_flow', flowId]);
        if (linkedAccount) {
          await recordAccountTransaction(db, { account_id: linkedAccount.id, type: 'income', amount: numericAmount, category, description: name, notes: legacyIncomeFlowNote(flowId), date, source: 'income_flow', source_id: flowId });
          // The first deposit is posted, so a recurring flow's next date moves to next month.
          if (is_recurring && isIsoDate(date)) await db.run("UPDATE income_flows SET date = ? WHERE id = ?", [addMonth(date), flowId]);
        }

        if (budget_preset_id) {
          const preset = await db.get("SELECT * FROM budget_presets WHERE id = ?", [budget_preset_id]);
          if (preset) {
            const allocs = JSON.parse(preset.allocations || '[]');
            const groups = (Array.isArray(allocs) ? allocs : []).map((allocation: any, index: number) => {
              const groupLimit = numericAmount * (Number(allocation.percentage) / 100);
              const children = Array.isArray(allocation.categories) ? allocation.categories : [];
              return {
                id: Date.now() + index,
                name: allocation.name,
                limit: groupLimit,
                spent: 0,
                color: allocation.color || 'emerald',
                categories: children.map((child: any, childIndex: number) => ({ id: Date.now() + index * 100 + childIndex, name: child.name, limit: groupLimit * (Number(child.percentage) / 100), spent: 0, color: child.color || allocation.color || 'emerald', transactions: [] })),
                transactions: []
              };
            });
            const budgetData = { id: Date.now(), sourceIncomeFlowId: flowId, name: `Auto Budget: ${name} (${preset.name})`, type: is_recurring ? 'recurring' : 'specific', isGrouped: true, startDate: date, endDate: date, totalLimit: numericAmount, groups };
            await db.run("INSERT INTO budgets (name, total_amount, categories, month) VALUES (?, ?, ?, ?)", [budgetData.name, numericAmount, JSON.stringify(budgetData), date]);
          }
        }
        await db.exec('COMMIT');
        // A backdated recurring flow catches up on the next read instead of tomorrow.
        if (is_recurring) recurringCheckedOn = '';
        res.json({ id: result.lastInsertRowid, account: linkedAccount?.name || null, budget_created: Boolean(budget_preset_id) });
      } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
      }
    } catch(err: any) { res.status(500).json({error: err.message}); }
  });
  const INCOME_FLOW_FIELDS = ['name', 'amount', 'category', 'account_id', 'date', 'is_recurring', 'next_amount'];

  app.put("/api/income_flows/:id", async (req, res) => {
    try {
      const db = await getDb();
      const flow = await db.get("SELECT * FROM income_flows WHERE id = ?", [req.params.id]);
      if (!flow) return res.status(404).json({ error: 'Income flow not found.' });
      const body = { ...req.body };
      if ('amount' in body && !(Number(body.amount) > 0)) return res.status(400).json({ error: 'The usual amount must be above zero.' });
      if ('date' in body && !isIsoDate(body.date)) return res.status(400).json({ error: 'Choose a valid date.' });
      if ('next_amount' in body) body.next_amount = Number(body.next_amount) > 0 ? Number(body.next_amount) : null;
      if ('is_recurring' in body) body.is_recurring = body.is_recurring ? 1 : 0;
      if ('account_id' in body) {
        body.account_id = body.account_id ? Number(body.account_id) : null;
        if (body.account_id && !(await db.get("SELECT id FROM accounts WHERE id = ?", [body.account_id]))) return res.status(400).json({ error: 'The selected deposit account no longer exists.' });
      }
      const fields = INCOME_FLOW_FIELDS.filter(field => Object.prototype.hasOwnProperty.call(body, field));
      if (fields.length) await db.run(`UPDATE income_flows SET ${fields.map(field => `${field} = ?`).join(', ')} WHERE id = ?`, [...fields.map(field => body[field]), flow.id]);
      // Linking an account later starts automatic deposits from today, not for past months.
      if (body.account_id && !flow.auto_post_from) await db.run("UPDATE income_flows SET auto_post_from = ? WHERE id = ?", [today(), flow.id]);
      if ('category' in body) await upsertPersonalCategory(db, body.category, 'income');
      recurringCheckedOn = '';
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/income_flows/:id/skip", async (req, res) => {
    try {
      const db = await getDb();
      const flow = await db.get("SELECT * FROM income_flows WHERE id = ?", [req.params.id]);
      if (!flow || !flow.is_recurring || !isIsoDate(flow.date)) return res.status(400).json({ error: 'Only a recurring income with a next date can be skipped.' });
      await db.run("UPDATE income_flows SET date = ?, next_amount = NULL WHERE id = ?", [addMonth(flow.date), flow.id]);
      res.json({ success: true, date: addMonth(flow.date) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/income_flows/:id", async (req, res) => {
    try {
      const db = await getDb();
      const flow = await db.get("SELECT * FROM income_flows WHERE id = ?", [req.params.id]);
      // ?undo=1 also removes its deposits (restoring balances), calendar entry, and auto budget.
      if (flow && req.query.undo === '1') {
        await removeTransactions(db, await linkedTransactions(db, 'income_flow', flow.id, legacyIncomeFlowNote(flow.id)));
        await db.run("DELETE FROM calendar_events WHERE source = 'income_flow' AND (source_id = ? OR (source_id IS NULL AND name = ? AND amount = ?))", [flow.id, flow.name, flow.amount]);
        for (const budget of await db.all("SELECT id, name, categories FROM budgets")) {
          let plan: any = {};
          try { plan = JSON.parse(budget.categories || '{}'); } catch {}
          const legacyMatch = plan.sourceIncomeFlowId === undefined && String(budget.name).startsWith(`Auto Budget: ${flow.name} (`);
          if (plan.sourceIncomeFlowId === flow.id || legacyMatch) await db.run("DELETE FROM budgets WHERE id = ?", [budget.id]);
        }
      }
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
      const normalizedName = String(name || '').trim();
      const normalizedAllocations = Array.isArray(allocations) ? allocations.filter((allocation: any) => String(allocation?.name || '').trim() && Number(allocation?.percentage) > 0) : [];
      if (!normalizedName || normalizedAllocations.length === 0) return res.status(400).json({ error: 'A model name and at least one positive allocation are required.' });
      const result = await db.run("INSERT INTO budget_presets (name, allocations) VALUES (?, ?)", [normalizedName, JSON.stringify(normalizedAllocations)]);
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
      const expenses = await db.all("SELECT id, amount, category, description, date FROM transactions WHERE type = 'expense'");
      res.json(rows.map((row: any) => {
        try {
          const plan = JSON.parse(row.categories || '{}');
          const currentMonth = localDate().slice(0, 7);
          const periodExpenses = expenses.filter((transaction: any) => plan.type === 'specific'
            ? (!plan.startDate || transaction.date >= plan.startDate) && (!plan.endDate || transaction.date <= plan.endDate)
            : String(transaction.date || '').startsWith(currentMonth));
          plan.groups = (Array.isArray(plan.groups) ? plan.groups : []).map((group: any) => {
            const children = Array.isArray(group.categories) ? group.categories : [];
            if (!children.length) {
              const transactions = periodExpenses.filter((transaction: any) => String(transaction.category).toLowerCase() === String(group.name).toLowerCase());
              return { ...group, transactions, spent: transactions.reduce((sum: number, transaction: any) => sum + Number(transaction.amount || 0), 0) };
            }
            const categories = children.map((budgetCategory: any) => {
              const transactions = periodExpenses.filter((transaction: any) => String(transaction.category).toLowerCase() === String(budgetCategory.name).toLowerCase());
              return { ...budgetCategory, transactions, spent: transactions.reduce((sum: number, transaction: any) => sum + Number(transaction.amount || 0), 0) };
            });
            return { ...group, categories, spent: categories.reduce((sum: number, budgetCategory: any) => sum + Number(budgetCategory.spent || 0), 0) };
          });
          return { ...row, categories: JSON.stringify(plan) };
        } catch {
          return row;
        }
      }));
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
         Object.assign(b, businessMetrics(b.type, transactions, items));
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

  app.put("/api/budget_presets/:id", async (req, res) => {
    try {
      const db = await getDb();
      const { name, allocations } = req.body;
      if (!String(name || '').trim() || !Array.isArray(allocations) || allocations.length === 0) return res.status(400).json({ error: 'A model name and allocations are required.' });
      await db.run("UPDATE budget_presets SET name = ?, allocations = ? WHERE id = ?", [String(name).trim(), JSON.stringify(allocations), req.params.id]);
      res.json({ success: true });
    } catch(err: any) { res.status(500).json({error: err.message}); }
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

  app.post("/api/freelancing/invoices/:id/pay", async (req, res) => {
    try {
      const db = await getDb();
      const invoice = await db.get("SELECT * FROM freelancing_invoices WHERE id = ?", [req.params.id]);
      if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });
      if (invoice.status === 'Paid') return res.json({ success: true, deposited: false });
      const account = req.body?.account_id ? await db.get("SELECT id, name FROM accounts WHERE id = ?", [req.body.account_id]) : null;
      if (req.body?.account_id && !account) return res.status(400).json({ error: 'The selected account no longer exists.' });
      if (account && Number(invoice.amount) > 0) {
        await recordAccountTransaction(db, { account_id: account.id, type: 'income', amount: Number(invoice.amount), category: 'Freelance Income', description: `Invoice ${invoice.invoice_number}${invoice.client_name ? ' · ' + invoice.client_name : ''}`, date: today(), source: 'invoice', source_id: invoice.id });
      }
      await db.run("UPDATE freelancing_invoices SET status = 'Paid' WHERE id = ?", [invoice.id]);
      res.json({ success: true, deposited: Boolean(account), account: account?.name || null });
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
    const { createServer: createViteServer } = await import('vite');
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

