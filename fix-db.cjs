const fs = require('fs');
const content = `import Database from 'better-sqlite3';
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
  await db.exec(\`
    CREATE TABLE IF NOT EXISTS portfolio_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      portfolio_id INTEGER,
      type TEXT NOT NULL,
      shares REAL NOT NULL,
      price REAL NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY(portfolio_id) REFERENCES portfolios(id)
    );
  \`);
  
  await db.exec(\`ALTER TABLE portfolios ADD COLUMN ticker TEXT;\`).catch(() => {});
  await db.exec(\`ALTER TABLE portfolios ADD COLUMN current_price REAL;\`).catch(() => {});
  await db.exec(\`ALTER TABLE portfolios ADD COLUMN currency TEXT DEFAULT 'USD';\`).catch(() => {});
  
  await db.exec(\`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance REAL NOT NULL,
      interest_rate_pa REAL,
      image_logo_name TEXT,
      color TEXT,
      purpose TEXT
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
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL,
      date TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      provider TEXT,
      source TEXT
    );
  \`);

  // Seed data if empty
  const accountCount = await db.get('SELECT COUNT(*) as count FROM accounts');
  if (accountCount.count === 0) {
    await db.run(\`INSERT INTO accounts (name, type, balance, interest_rate_pa, image_logo_name) VALUES 
      ('BDO Savings', 'bank', 50000, 0.0025, 'bdo'),
      ('GCash', 'wallet', 15000, 0, 'gcash'),
      ('Maya', 'wallet', 20000, 0.04, 'maya'),
      ('BPI Credit', 'credit', -5000, 0.03, 'bpi')
    \`);
    await db.run(\`INSERT INTO transactions (account_id, type, amount, category, description, date) VALUES 
      (2, 'expense', 150, 'food', 'Coffee', datetime('now', '-1 day')),
      (1, 'income', 30000, 'salary', 'Paycheck', datetime('now', '-3 days')),
      (3, 'expense', 1200, 'bills', 'Internet', datetime('now', '-5 days'))
    \`);
    await db.run(\`INSERT INTO portfolios (type, name, invested, current_value, shares, avg_price) VALUES 
      ('Real Estate', 'Apartment Unit 1', 2000000, 2500000, 1, 2000000),
      ('Stocks', 'AAPL', 1500, 8500, 50, 150),
      ('Cryptos', 'BTC', 30000, 31000, 0.5, 60000),
      ('Stocks', 'TSLA', 4000, 4200, 20, 200),
      ('Others', 'Rolex Watch', 450000, 500000, 1, 450000)
    \`);
    await db.run(\`INSERT INTO career (current_role, target_role, current_salary, target_salary, skills_needed) VALUES 
      ('Junior Developer', 'Senior Developer', 60000, 120000, '["React", "Node.js", "System Design"]')
    \`);
  }
}
`;
fs.writeFileSync('server/db.ts', content);
