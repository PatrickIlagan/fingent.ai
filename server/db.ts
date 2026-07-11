import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let dbInstance: any = null;

export async function getDb() {
  if (!dbInstance) {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const sqliteDb = new Database(path.join(dataDir, 'fingent.db'));
    
    dbInstance = {
      get: async (sql: string, params: any[] = []) => sqliteDb.prepare(sql).get(...params),
      all: async (sql: string, params: any[] = []) => sqliteDb.prepare(sql).all(...params),
      run: async (sql: string, params: any[] = []) => sqliteDb.prepare(sql).run(...params),
      exec: async (sql: string) => sqliteDb.exec(sql)
    };
    
    await initDb(dbInstance);
  }
  return dbInstance;
}

async function initDb(db: any) {

  await db.exec(`ALTER TABLE income_flows ADD COLUMN is_recurring BOOLEAN DEFAULT 0;`).catch(() => {});
  await db.exec(`ALTER TABLE income_flows ADD COLUMN budget_preset_id INTEGER;`).catch(() => {});
  await db.exec(`ALTER TABLE income_flows ADD COLUMN account_id INTEGER;`).catch(() => {});

  await db.exec(`
    CREATE TABLE IF NOT EXISTS portfolio_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      portfolio_id INTEGER,
      type TEXT NOT NULL,
      shares REAL NOT NULL,
      price REAL NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY(portfolio_id) REFERENCES portfolios(id)
    );
  `);
  
  await db.exec(`ALTER TABLE portfolios ADD COLUMN ticker TEXT;`).catch(() => {});
  await db.exec(`ALTER TABLE portfolios ADD COLUMN current_price REAL;`).catch(() => {});
  await db.exec(`ALTER TABLE portfolios ADD COLUMN currency TEXT DEFAULT 'USD';`).catch(() => {});
  await db.exec(`ALTER TABLE portfolios ADD COLUMN platform TEXT;`).catch(() => {});
  await db.exec(`ALTER TABLE accounts ADD COLUMN credit_limit REAL;`).catch(() => {});
  await db.exec(`ALTER TABLE accounts ADD COLUMN statement_date INTEGER;`).catch(() => {});
  await db.exec(`ALTER TABLE accounts ADD COLUMN due_date INTEGER;`).catch(() => {});

  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance REAL NOT NULL,
      interest_rate_pa REAL,
      image_logo_name TEXT,
      color TEXT,
      purpose TEXT,
      credit_limit REAL,
      statement_date INTEGER,
      due_date INTEGER
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      FOREIGN KEY(account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      name TEXT NOT NULL,
      target REAL NOT NULL,
      saved REAL NOT NULL,
      date TEXT,
      color TEXT,
      icon TEXT,
      sources TEXT,
      transactions TEXT
    );

    CREATE TABLE IF NOT EXISTS portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      business_id INTEGER,
      name TEXT NOT NULL,
      invested REAL NOT NULL,
      current_value REAL NOT NULL,
      shares REAL,
      avg_price REAL,
      ticker TEXT,
      current_price REAL,
      currency TEXT DEFAULT 'USD'
    );

    CREATE TABLE IF NOT EXISTS liabilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT,
      provider TEXT,
      status TEXT DEFAULT 'Unpaid',
      card_name TEXT,
      total_amount REAL,
      remaining_amount REAL,
      total_months INTEGER,
      current_month INTEGER,
      merchant TEXT,
      paid_using TEXT,
      is_recurring BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS career (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      current_role TEXT,
      target_role TEXT,
      current_salary REAL,
      target_salary REAL,
      skills_needed TEXT
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL,
      date TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      provider TEXT,
      source TEXT
    );

    CREATE TABLE IF NOT EXISTS income_flows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budget_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      name TEXT NOT NULL,
      allocations TEXT NOT NULL
    );

        CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'Active',
      target REAL
    );
    CREATE TABLE IF NOT EXISTS business_deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      title TEXT NOT NULL,
      stage TEXT NOT NULL,
      value REAL NOT NULL,
      probability INTEGER,
      closing TEXT,
      contact TEXT,
      notes TEXT,
      FOREIGN KEY(business_id) REFERENCES businesses(id)
    );
    CREATE TABLE IF NOT EXISTS business_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT,
      value REAL,
      extra_info TEXT,
      FOREIGN KEY(business_id) REFERENCES businesses(id)
    );
    CREATE TABLE IF NOT EXISTS business_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      status TEXT,
      category TEXT,
      FOREIGN KEY(business_id) REFERENCES businesses(id)
    );
    
    CREATE TABLE IF NOT EXISTS freelance_businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS freelancing_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      client TEXT,
      rate REAL,
      status TEXT DEFAULT 'Active',
      progress INTEGER,
      value REAL,
      deadline TEXT,
      next_milestone TEXT,
      hours_logged REAL,
      hours_total REAL,
      cap INTEGER,
      renew_date TEXT
    );
    CREATE TABLE IF NOT EXISTS freelancing_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      service_id INTEGER,
      invoice_number TEXT NOT NULL,
      amount REAL NOT NULL,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT DEFAULT 'Draft',
      client_name TEXT,
      client_email TEXT,
      client_address TEXT,
      items TEXT,
      notes TEXT,
      FOREIGN KEY(service_id) REFERENCES freelancing_services(id)
    );
    CREATE TABLE IF NOT EXISTS freelancing_time_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      service_id INTEGER,
      date TEXT NOT NULL,
      seconds INTEGER NOT NULL,
      description TEXT,
      FOREIGN KEY(service_id) REFERENCES freelancing_services(id)
    );
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      name TEXT NOT NULL,
      total_amount REAL NOT NULL,
      categories TEXT NOT NULL,
      month TEXT
    );
  `);

}
