# FinGent

FinGent is a local-first dashboard for personal finance, ventures, freelancing, investments, career progress, and planning.

## Run locally

1. Install Node.js 20 or later.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` if you need to override deployment settings.
4. Start the app with `npm run dev`.
5. Open http://localhost:3000.

The app stores its SQLite database locally in `data/`. It is intentionally excluded from Git so personal financial records stay on your machine.

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

The FinGent Copilot is a local workflow, navigation, and command assistant. It can prepare an action such as “I spent 500 on groceries, cash,” match the account locally, and save it only after the user explicitly confirms. It has no API key and makes no request to an external AI or chat service. Financial values and account names stay in FinGent; any future external-AI integration must receive tokenized placeholders such as `[ACCOUNT]`, `[AMOUNT]`, and `[REASON]`, with the mapping retained locally.
