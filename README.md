# FinGent

FinGent is a full-stack dashboard for managing personal finances, freelancing work, business activity, investments, liabilities, plans, taxes, and career progress. It combines a React single-page app with an Express API and a local SQLite database.

## Highlights

- Track accounts, income, expenses, transfers, balances, and financial events.
- Manage freelance services, fixed-price or hourly contracts, invoices, time logs, and an active timer.
- Monitor business performance, investments, liabilities, budgets, financial goals, taxes, and job applications.
- Switch between the standard and Advanced dark interface.
- Use the optional AI copilot for financial questions and selected data-entry actions.
- Export data and invoices, including a desktop-wrapper download from Settings.

## Tech stack

- React 19, Vite, TypeScript, and Tailwind CSS
- Node.js and Express
- SQLite via `better-sqlite3`
- Firebase Authentication for optional Google sign-in
- Gemini and Yahoo Finance for optional AI and market-data features

## Getting started

### Prerequisites

- Node.js 20 or later
- npm 10 or later

### Install and run

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, create the local environment file with:

```powershell
Copy-Item .env.example .env.local
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

`GEMINI_API_KEY` is optional, but required to use the AI copilot. `APP_URL` is only needed when an integration requires the deployed public URL. Never commit `.env.local` or real secrets.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Express server with the Vite development middleware. |
| `npm run build` | Build the client and bundle the production server into `dist/`. |
| `npm run start` | Run the built production server. |
| `npm run lint` | Type-check the project without emitting files. |
| `npm run clean` | Remove the generated `dist/` directory. |

## Project structure

```text
src/                React UI, pages, components, and client state
server.ts           Express server and API routes
server/             SQLite connection and AI copilot implementation
data/fingent.db     Local SQLite database
```

## Data and security notes

FinGent stores application data in `data/fingent.db`. Treat it as private financial data: back it up before major changes and do not share it publicly. The Firebase client configuration is intentionally separate from private server secrets; configure provider access and authorized domains in Firebase before using Google sign-in in production.

## Production build

```bash
npm run build
npm run start
```

The server listens on port `3000`.
