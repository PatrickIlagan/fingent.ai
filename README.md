# FinGent

FinGent is a local-first dashboard for personal finance, ventures, freelancing, investments, career progress, and planning.

## Run locally

1. Install Node.js 20 or later.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` if you need to override deployment settings.
4. Start the app with `npm run dev`.
5. Open http://localhost:3000.

The app stores its SQLite database locally in `data/`. It is intentionally excluded from Git so personal financial records stay on your machine.

## Windows desktop installer

Build a standalone Windows installer with:

```powershell
npm run desktop:dist
```

The release artifacts are written to `release/`. Install the `FinGent-<version>-x64.exe` setup file (or use the portable `.exe`). The desktop app uses a loopback-only local server and stores its database under `%APPDATA%\FinGent\fingent.db`; uninstalling or updating the app does not remove that data. Use the in-app database backup export before moving computers.

## Checks

- `npm run lint` validates TypeScript.
- `npm run build` creates a production build.

## Main areas

- Accounts, transactions, liabilities, budgets, goals, calendar, and taxes
- Investments and portfolio transaction history
- Venture-specific Store, SaaS, and Agency dashboards
- Freelance services, contracts, invoices, time tracking, and PDF invoices
- Career tracking and settings

## Local Copilot and privacy

The FinGent Copilot is a local workflow, navigation, and command assistant. It can prepare an action such as “I spent 500 on groceries, cash,” match the account locally, and save it only after the user explicitly confirms.

Optional Gemini BYOK guidance can be enabled in Settings. It never receives a chat message or chat history. FinGent sends Gemini only a fixed generic intent class such as `TRANSACTION_RECORDING`—never raw commands, names, categories, dates, amounts, balances, account details, client details, or financial records. The API key is held only for the active browser session and is cleared when that session ends.

## Google Drive backup setup

1. Create or select a Firebase project and enable Google as a sign-in provider.
2. Enable the Google Drive API for the same Google Cloud project and add your app URL to Firebase Authentication’s authorized domains.
3. Copy the Firebase web-app values into `.env.local` using the `VITE_FIREBASE_*` keys in `.env.example`.
4. Restart FinGent, choose an encryption password in Settings, then use **Sync to Drive**.

Backups are encrypted locally with AES-256-GCM and stored in the app’s private Google Drive application-data folder. A restore decrypts and validates the SQLite database before replacing the local copy.
