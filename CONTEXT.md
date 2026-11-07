# FinGent: project context

This file explains what FinGent is, how it is built, what every part of the app does, and what has been made so far. It is meant for anyone picking up the project: a new contributor, a future you, or an AI assistant. The [README](README.md) covers setup and builds; this file covers everything else.

---

## 1. What FinGent is

FinGent is a personal finance app for the Philippines that anybody can use: a student saving an allowance, an employee with a salary, a freelancer, or someone running a small business. It is built on a few principles:

- **Local-first and private.** Records live in an encrypted database on the user's own device. Nothing needs a server or an account, and the app works offline.
- **One app for the whole picture.** It covers everyday money (accounts, spending, bills, budgets, goals) and long-term planning (wealth plans, investments, business, freelancing, career and taxes).
- **Philippine context.** Peso first, with local banks and e-wallets, the 20% final tax on interest, BIR-style tax planning, Tagalog/Taglish commands and categories, and things like the 52-week ipon and tithes.
- **General, not personal.** Features are built so anyone can set up their own situation, through templates, presets and editable plans, rather than being hard-coded to one person's setup.
- **Encouraging.** Celebrations, milestones, Ipon points and a pet that grows make saving feel rewarding.

Platforms: **Windows** (Electron desktop app), **Android** and **iOS** (Capacitor native apps), plus a browser version for development.

---

## 2. Architecture

```
            React UI (src/pages, src/components)  ── same code on every platform
                          │  fetch('/api/...')
          ┌───────────────┴────────────────┐
   Windows / browser                      Android / iOS
   server.ts (Express)                    src/lib/mobileApi.ts
   server/db.ts: SQLCipher SQLite         replaces window.fetch for /api/*
   desktop/main.cjs: Electron shell       encrypted SQLite (one JSON record per row)
          └───────────────┬────────────────┘
          src/lib/*: shared pure rules and engines, used by both backends and the UI
```

- **Two backends, one API.** Every `/api/*` endpoint exists twice: once in `server.ts` for desktop and once in `src/lib/mobileApi.ts` for phones. They must behave the same, and that **parity** is a hard rule. Logic that decides anything (interest, goals, rewards, wealth projections, income rules, suggestions) lives in pure modules in `src/lib/` that both backends import, so there is only one copy of it.
- **Desktop backend.**
  - Express server with `better-sqlite3-multiple-ciphers` (SQLCipher); the schema is in `server/db.ts`.
  - Writes that change several rows use `respondInTransaction(res, async db => ...)`.
  - The server only answers requests carrying the session cookie issued at unlock.
  - In production it is bundled to `dist/server.cjs` and run inside Electron.
- **Phone backend.**
  - `mobileApi.ts` stores records in one encrypted SQLite table (`mobile_records_v2`), as `{collection, id, payload JSON}`.
  - Simple tables use a generic CRUD map (`collections`); richer features have their own route functions (rewards, wealth plans, income rules, goals, transfers, and so on).
- **Linked records.** A transaction created by a feature carries `source` and `source_id`, so it can be found, updated and undone when that record changes. Sources include `income_flow`, `liability`, `goal`, `portfolio`, `invoice`, `interest`, `income_rule` and `wealth_plan`. A manual entry can only set `source: 'wealth_plan'`; other sources belong to the features that own them.
- **Change events.** `src/lib/changeWatcher.ts` wraps `fetch` and raises `fingent-data-changed` after every successful write. Sync, Ipon rewards, the income-rules note and live screens listen to it.
- **State.** `src/store/useStore.ts` (zustand) holds the theme, accent, hidden tabs, the rewards snapshot and a refresh toggle.
- **Sync.** `SYNC_TABLES` (server) and `syncTableCollections` (phone) list every table in a sync snapshot. Add new tables to both.

---

## 3. Data model (tables)

| Table | Holds |
| --- | --- |
| `accounts` | Bank, digital, cash, card and investment accounts with balance, credit limits and interest settings (rate, mode, frequency, tiers, boost, tax, minimum balance) |
| `transactions` | Income and expenses per account, with `source`/`source_id` links |
| `categories` | Income and expense categories (English/Tagalog aliases are merged) |
| `goals` | Savings goals: target, date, sources (whole accounts or amounts in accounts), auto-save, history |
| `liabilities` | Quick expenses, bills, credits, debts and installments, with recurrence and autopay |
| `income_flows` | Salary and other recurring income, with auto-deposit to an account |
| `budgets`, `budget_presets` | Budgets and allocation presets (e.g. 50/30/20) |
| `portfolios`, `portfolio_transactions` | Investment holdings and their buy/sell history |
| `businesses`, `business_deals`, `business_items`, `business_transactions` | Store / SaaS / Agency ventures |
| `freelance_businesses`, `freelancing_services`, `freelancing_invoices`, `freelancing_time_logs` | Freelance work |
| `career`, `career_tasks` | Career profile, skills and tasks |
| `personal_notes`, `personal_routines`, `personal_routine_logs` | Personal space |
| `calendar_events` | Notes, pins and income/bill markers |
| `wealth_plans` | Each plan as one JSON document (see §5) |
| `income_rules`, `income_rule_entries` | Income rules and what each one counted or gave (see §6) |
| `reward_events`, `reward_challenges`, `reward_profile` | Ipon points ledger, challenges, and the pet and room |
| `app_settings` | Device settings, sync state, data version |

---

## 4. Features

### App lock and security
- **Unlocking:** an app password unlocks (and is the key for) the encrypted database. If it is lost, the data cannot be recovered. Code: `src/components/AppLock.tsx`, `src/lib/appLock.ts`.
- **Windows:** sessions expire after 10 minutes idle, and the server rejects requests without the unlock session.
- **iOS:** the SQLCipher secret is kept in the Keychain.

### Home
- A greeting, net worth and balance overview, and Home insights.
- Cards for Ipon (pet and points) and **To give** (income-rule counters with a Give button).
- Financial goals with milestone bars, the wealth portfolio, upcoming bills, budget status, and suggestions.

### Accounts and interest
- **Account types:** Card, Bank, Digital and Cash, each with a detail view, history and exports.
- **Bank presets:** a searchable catalog of Philippine banks, digital banks, e-wallets and cards (`src/lib/institutions.ts`). It holds researched rates (November 2026), tiers, promos and logos, and every value can be edited.
- **Interest engine** (`src/lib/sharedRules.ts`):
  - Credited daily or monthly, on a chosen day.
  - Modes: auto, remind, fixed or off.
  - Supports tiers, minimum balance, promo/mission boosts with a cap and end date, and the 20% final tax.
  - Missed days are caught up when the app opens.
  - Goal savings kept in an account share its interest.
- Account cards show which goals and wealth plans count part of the account.

### Transactions and categories
- **Logging:** Quick Add, per-account history, transfers, balance adjustments, and edit or delete with balance restore.
- **Categories:** created automatically as they are used, and bilingual aliases are merged (e.g. "Pagkain" and "Food").
- **Not counted as spending or income:** transfers, adjustments, investment trades and goal moves (`isCashFlow`).

### Liabilities
- **Types:** Quick Expenses, Bills, Credits, Debts and Installments, with due dates, recurrence and remaining amounts.
- **Autopay:** recurring items linked to an account are paid automatically on their due date.
- **Paying:** a payment records the transaction and moves the next due date. Undoing it removes what it created.

### Income flows
- Salary, freelance retainers and other recurring income.
- A flow linked to an account deposits automatically on its date.
- The amount can be edited for a single month, and the flow shows on the calendar.

### Plans
Plans has four sub-tabs: **Budget**, **Goals**, **Wealth** and **Rules**.

**Budgets:**
- Recurring monthly budgets or budgets for a date range, grouped categories, and presets.
- Spending is matched by category.

**Goals:**
- A goal can count whole accounts or set amounts kept in accounts, across several accounts.
- Auto-save on a schedule, with a skip option.
- Add money or take it out, with pace tracking (ahead, on track, behind).
- 25/50/75% milestone ticks and a celebration when the goal is reached.
- `GoalBuilder.tsx` builds goals; the rules live in `sharedRules.ts` (`goalProgress`, `planGoalContribution`, `planGoalWithdrawal`, `accountGoalSavings`).

**Wealth plans:** see §5.

**Income rules:** see §6.

### Calendar
- A month view of bills, income, goal dates, auto-saves and notes or pins.
- Each day has a menu to add a note, schedule something or build a goal.

### Investments
- **Holdings:** stocks, crypto, real estate and others, in any currency, converted to pesos (ECB rates via Frankfurter).
- **Trades:** buy/sell history, and a trade can move cash in a linked account.
- **Prices:** Windows refreshes stock and crypto prices (Yahoo Finance); phones refresh crypto (Coinbase) and keep the last saved stock prices.

### Business
- Dashboards for Store, SaaS and Agency ventures.
- Each has deals, items, transactions, an operating snapshot, next best actions and recent cash flow.

### Freelancing
- Services, plus invoices with PDF export that deposit into an account when paid.
- A timer and time logs that update hours on each service.

### Career
- Sub-tabs: Overview, Calendar, Tasks, Upskilling and Income.
- A profile with current and target role and salary, skills and an upskilling plan.
- Career tasks and dates on a career calendar, plus income details and income flows.

### Taxes
- A Philippine tax planner that estimates income tax under tax scenarios, including employee statutory contributions (SSS, PhilHealth, Pag-IBIG).
- It also explains how the estimate works.

### Personal
- Notes and routines with completion logs.

### Ipon rewards
Code: `src/pages/Rewards.tsx`, `src/lib/rewards.ts`, `rewardsCatalog.ts`, `roomLayout.ts`, `Pet.tsx`, `PetRoom.tsx`, `RoomArt.tsx`.

**Points** come from real progress:
- first steps (first account, goal, budget, interest, sync, challenge);
- goal milestones;
- weekly saving streaks;
- challenge weeks and paydays.

Every award has a unique `ref_key`, so it is given only once, even across devices.

**Challenges** are sized from the user's own income and spending: 52-week ipon, save 20%, pay yourself first, spend less, no-spend weekend, weekly saver, emergency fund, and earn interest.

**The pet** is a mochi that grows through Egg, Hatchling, Kid, Teen, Adult and Legend as lifetime points rise.

**The shop** sells colors, eyes, patterns, hats, glasses, neckwear, wallpapers, floors, window views, rugs and furniture.

**The room** is isometric and 3D-style, with drag-to-place furniture, rotation and wall pieces. A picture of it can be shared (Capacitor Share and Filesystem).

### Copilot, suggestions and AI
- **Local Copilot** (`src/lib/localCopilot.ts`, `ChatSheet.tsx`):
  - Understands English and Tagalog commands, such as "gastos 500 grocery cash" or "sweldo 20000 BDO".
  - Matches accounts and categories on the device, drafts the action, and saves only after the user confirms.
  - Also handles navigation and questions.
- **Suggestions** (`src/lib/suggestions.ts`, `Suggestions.tsx`): short tips per page, worked out on the device. Examples: bills due soon, autopay not set, goals behind pace, idle cash that could earn interest, an interest boost ending, overdue invoices, spending jumps, payday reminders, portfolio concentration.
- **Gemini (optional, bring your own key)** (`src/lib/byokAssistant.ts`):
  - Never receives messages, names, amounts or records. It gets only a generic intent class, plus fixed generic facts if "Let Gemini add a tip" is on.
  - The key lives only for the session.
  - **Settings → AI features** turns all of it off at once.

### Google sync
Code: `src/lib/driveSync.ts`, `GoogleSyncCard.tsx`, `SyncStatus.tsx`.
- **How it syncs:** pulls when the app unlocks, and pushes about 20 seconds after each change. If both sides changed, the user chooses which copy to keep.
- **Encryption:** the snapshot is encrypted with the app password (AES-256-GCM, PBKDF2) and stored in Drive's private app-data folder.
- **Sign-in:** Windows uses a desktop OAuth flow (loopback and PKCE); phones use Firebase Google sign-in.

### Exports
- Excel workbook of everything (`workbookExport.ts`) and PDF statements (`export.ts`).
- Per-screen exports, such as account history and the wealth plan table.

### Settings
- App theme: **Basic** (light) or **Advanced** (dark, violet).
- Accent color and visible workspaces (hide tabs you don't use).
- AI features, the local Copilot privacy explanation, Google sync, data management, and the app lock.

### UI and feel
- Responsive, with a sidebar on desktop and a bottom bar plus drawer on phones.
- Smooth framer-motion transitions, number count-ups, celebration toasts and confetti (`Celebrations.tsx`).
- The sliding `Segmented` control, and the gradient logo (`Logo.tsx`).

---

## 5. Wealth plans (Plans → Wealth)

Code:
- **Engine:** `src/lib/wealthPlan.ts` (pure).
- **Screens:** `src/pages/WealthPlans.tsx`, plus `src/components/wealth/PlanView.tsx`, `PlanEditor.tsx` and `PlanChart.tsx`.
- **Storage:** `wealth_plans` (`GET/POST /api/wealth-plans`, `PUT/DELETE /api/wealth-plans/:id`). The whole plan is one JSON document.

### What a plan holds
- **When:** a start month (`YYYY-MM`) and a number of months.
- **Break months:**
  - `skip`: the month doesn't exist, like summer in a school-year plan.
  - `pause`: no deposits, but balances still grow.
- **Year grouping:** the month the year starts and a label (e.g. "SY"), used for the separators in the table.
- **Buckets (the plan's accounts).** Each bucket has:
  - a **kind**: ETF, stock, crypto, bank, time deposit, cash or other;
  - a starting balance;
  - a **contribution**: a fixed amount a month, or a percent of income (from chosen income flows, accounts or categories);
  - yearly rates per scenario, tax on growth, and an optional promo (months, rate, tax, applied to the start balance);
  - "invest every N months", which pools deposits before buying, to save on fees;
  - **links** to real accounts or holdings.
- **Repeating extras:** money added on chosen calendar months (e.g. an allowance or scholarship in October and March) or every N months.
- **One-time deposits:** e.g. birthday money in month 6.
- **Milestones:** amounts to reach, and which buckets count toward them.
- **Inflation:** used for the "in today's money" view.
- **Deposit history and typed balances:** a deposit log, and balances typed in per month.

### Projection math (`simulate`)
Each month, for each bucket:
1. Growth on the invested balance. The rate is the scenario rate after tax, compounded monthly. During promo months the promo replaces the base rate, applied to the start balance.
2. That month's deposit is added: the regular contribution plus extras plus one-time deposits.
3. A pooled bucket holds its deposits until the buying month.

The result is a row per month with deposits, balances, money put in, growth, totals, milestone hits and the names of any extras or one-time deposits.

**Default rates** (all editable per bucket):

| Kind | Conservative | Balanced | Aggressive |
| --- | --- | --- | --- |
| Stocks and ETFs | 4% | 8% | 12% |
| Crypto | −25% | +5% | +40% |
| Bank | 3% | 3% | 3% |
| Time deposit | 4.5% | 4.5% | 4.5% |
| Cash | 0% | 0% | 0% |
| Other | 3% | 6% | 9% |

- Banks and time deposits use the same rate in every scenario, and have 20% tax by default.
- A savings bucket can take its linked account's own interest rate (`accountRate`).

**What-ifs** stack and show as a dashed line: +1% return, a market drop in a chosen month (it hits market kinds only), pausing deposits, +₱X a month, a one-time bonus, and stopping deposits after a month.

### Actuals and tracking
- **Links:**
  - A **whole** link counts the full balance and every peso that arrives.
  - A **percent** link counts that share of the balance and of each inflow.
  - A **fixed** link counts up to that amount of the balance.
- **What counts as a deposit:** money arriving in a linked account (salary, freelance, transfers from unlinked accounts). Interest counts as growth, and plan deposits are never counted twice.
- **What's actual for each bucket** (`planActuals`), in priority order: a typed balance, then linked balances, then the starting balance plus logged deposits.
- **Tracker carryover:** money put in early reduces later months' targets (`periodProgress`).
- **On-track status:** the plan is checked against last month's end (`planSoFar`), since the current month is still in progress.
- **Log a deposit:** for linked buckets it records a real transaction or transfer (tagged `wealth_plan`) and adds it to the plan's history.
- **Account split** (`accountAllocation`) shows how each account is shared across plans and goals, and warns when shares pass 100% or more than the balance is assigned.

### Screens
- **Plan list:** each plan shows its likely end value with a range, a sparkline, the next milestone and its planned date, and whether it is on track or behind.
- **New plan:** pick a template, then make it yours (name, start, months, amounts, starting balances, links). There is a live preview of the end value.
- **Templates** (`planTemplate`):

| Template | What it sets up |
| --- | --- |
| School-year savings | Aug–Jun years with July skipped; an index fund every 2 months, a time deposit, emergency savings and personal money; allowance/scholarship months; ₱40K–₱250K milestones |
| Emergency fund | 6× average monthly spending in 12 months, with 1-, 3- and 6-month milestones |
| Long-term investing | 10 years of ETF, stocks, some crypto and a cash buffer |
| Big purchase | A target split between a time deposit and savings over 36 months |
| Pay yourself first | 10% + 10% of income |
| Start from scratch | An empty plan |

- **Plan view tabs:**
  - **Overview:** KPIs, a projection chart with the range band, milestones (each can become a goal), and accounts.
  - **Table:** the monthly breakdown, plan or plan vs actual, with year separators, ★ for extras, ⚡ for one-time deposits and milestone badges. Exports to Excel or PDF.
  - **Calendar:** each month marked done, partly, missed or this month. Tap a month for its breakdown and Log deposit.
  - **Graph:** toggles for accounts, range, actual, money put in and what-if.
  - **Tracker:** actual balances you can correct, the next milestone, this month's plan vs actual, and Log deposit.
  - **Edit:** every setting.
- **Other tools:**
  - **Compare:** two plans, a plan vs your current path (re-projected from today's real balances), or one plan in two scenarios. It shows an overlay graph, milestone timing ("3 mo sooner") and a difference table.
  - **Account split:** the allocation view above.
  - **Calculator:** start amount, monthly amount, years, rate and inflation give the future value, today's money and growth.

---

## 6. Income rules (Plans → Rules)

Code:
- **Engine:** `src/lib/incomeRules.ts`.
- **UI:** `src/components/IncomeRules.tsx` (page, editor, Give dialog, history, Home card, watcher).
- **Storage:** `income_rules`, `income_rule_entries`.

### Rules
- **Amount:** a percent of each income, or a fixed amount (never more than the income).
- **Which income:** all income, or chosen categories, or chosen accounts. Interest only if ticked.
- **Never counted:** transfers, adjustments, goal moves, investment sales, plan deposits, and entries a rule made itself.
- **Start date:** a rule counts income from this date.
- **Actions:**
  - **Counter:** adds up what you owe. **Give** pays it off, in part or in full, from one or more accounts, or just marks it given.
  - **Spend:** records the share as spending from the income's account, or from chosen accounts.
  - **Move:** transfers the share to one or more accounts, split by shares.
  - **Add:** adds the share as income to chosen accounts, like an envelope.
- **Presets:** Tithe 10% (counter), Pay yourself first 20% (move), Taxes 8% (counter), Giving 5% (counter).

### Behaviour
- **Every income path runs the rules:** manual and Copilot entries, recurring income flows, paid invoices, and interest if the rule includes it. Both backends call `applyIncomeRules` from `recordAccountTransaction` and `POST /api/transactions`.
- **What gets recorded:** each match records an **accrual** entry, with the transaction IDs it created. Gives are **give** entries. What's owed equals accruals minus gives.
- **Edits and deletes:** editing an income re-runs its rules; deleting it, or removing linked income elsewhere, undoes them (`reverseIncomeRules`). Deleting a single history entry undoes its transactions.
- **Counting past income:** a new counter can count income already logged since a date.
- **Feedback:** a note pops up whenever an income sets off a rule (`IncomeRulesWatcher`), and Home shows the total to give.
- **API:**
  - `GET/POST /api/income-rules`
  - `PUT/DELETE /api/income-rules/:id`
  - `POST /api/income-rules/:id/give`
  - `GET /api/income-rules/entries?rule_id=&after=`
  - `DELETE /api/income-rules/entries/:id`

---

## 7. Conventions and gotchas

- **Parity first.** A new endpoint or rule goes into `server.ts` and `mobileApi.ts` together, with the logic in `src/lib/`.
- **No `@types/react` in the project.**
  - Components that receive `key` need `key?: string | number` in their props type.
  - Use `ReactElement`, not the `JSX` namespace.
  - Import React types explicitly (`type ReactNode`).
- **Zustand selectors must return stable values.** Never return a new `[]` or `{}` from a selector (`?? []`); use a module-level constant. A new value every read causes an infinite render loop that blanks the app.
- **Phone grid rule.** Global CSS collapses `.fixed.inset-0 .grid.grid-cols-2` to one column on phones. In dialogs, use `grid-cols-[1fr_1fr]` when two columns must stay.
- **Themes.** Every component styles both `basic` (light) and `advanced` (dark) via `themeMode`.
- **Feedback.** Use `celebrate({ kind, title, message })` for toasts (`kind: 'goal'` adds confetti), and `CountUp` for animated numbers.
- **Dates.** Use `localDate()` (Manila-safe), never `toISOString().slice(0, 10)` for "today".
- **Writing style for the UI.** Plain, friendly wording ("put in", "to give", "on track"), and avoid jargon.
- **The native driver.** `better-sqlite3-multiple-ciphers` is compiled for Electron by `desktop:prepare-native`. Plain Node (`npm run dev`) needs `npm run desktop:restore-node-modules` first.
- **Secrets stay out of Git:** `desktop/google-oauth.json`, `google-services.json`, `GoogleService-Info.plist`, `.env*` and `data/`.

---

## 8. Build, run and release

| Command | Does |
| --- | --- |
| `npm run dev` | Development server (Express + Vite) on http://localhost:3000 |
| `npm run desktop:dev` | Builds, then opens the Electron app |
| `npm run build` | Web build to `dist/` plus the server bundle `dist/server.cjs` |
| `npm run lint` | TypeScript type-check |
| `npm run desktop:dist` | Windows installer to `release/` (prepares the Electron driver first) |
| `npm run android:sync` / `android:apk` | Sync the web build into Android / build a debug APK |
| `npm run ios:sync` / `ios:open` | Sync into Xcode / open Xcode (macOS) |

After UI changes, rebuild and run `npx cap sync` so the phone projects carry the new web build.

## 9. How changes are verified

- `npm run lint` and `npm run build` on every change.
- **API flow suites** run the same scenarios against both backends:
  - the desktop server, run under Electron's Node with a throwaway data folder;
  - the phone API, bundled with esbuild, using mocked Capacitor and SQLite.
- **What the suites cover:** accounts, transactions, liabilities, goals, interest, sync, rewards, the room, wealth plans and income rules.
- **Engine checks** (pure) cover the interest math, timeline and breaks, pooled investing, scenarios, what-ifs, carryover, links, allocation, templates and the rule math.
- **Screenshots:** an off-screen Electron window captures phone-size screens from seeded demo data, and reports anything that sticks out past the screen edge.
- These harness scripts are run from a working folder and are not committed yet. Last run: 153 desktop and 276 phone checks passing.

---

## 10. What has been built (history)

| Area | Highlights |
| --- | --- |
| Foundation | App structure; the local, rules-based Copilot with Tagalog commands; bilingual categories; a responsive mobile shell |
| Desktop | Windows Electron app, packaged server, a single verified installer, in-place updates that keep your data |
| Phones | Native offline Android app, then a secure iOS target, both on the on-device encrypted API |
| Security | App password before the dashboard, encrypted desktop and phone databases, hardened sync and BYOK, unlock sessions on the desktop API |
| Sync | Encrypted cross-device Google Drive sync |
| Connected money | Payments, recurring entries and investments move money in accounts; goal savings across accounts; calendar planning; per-month income edits |
| Personalisation | Hidden tabs, accents, local insights, budget models, category-aware Copilot |
| Feel | Fluid animations, celebrations, phone layout fixes |
| Interest | Account interest with Philippine bank presets, the new logo, tighter cards, on-device AI suggestions with an off switch |
| Ipon rewards | Points ledger, challenges, the mochi pet with stages, shop and themes, the isometric room with drag-to-place, sharing a picture |
| Planning | Wealth plans (templates, scenarios, what-ifs, table, calendar, graph, tracker, compare, account split, calculator); income rules (counter, spend, move, add; Give; history); plan shares on account cards; Home render-loop fix |

## 11. Known caveats and ideas

- **Not yet tested:** the planning features on a real phone and the packaged installer. They are verified through the flow suites and screenshots only.
- **Rules and the past:** income rules apply to income logged from their start date. Auto actions (spend, move, add) are not backfilled, only counters.
- **Plan-account names:** the wealth plan table abbreviates account names to their first word in column headers.
- **Phone stock prices:** phones don't refresh stock prices (there's no free public API without a key). They keep the last saved value.
- **Possible next steps:**
  - commit the test harness into the repo;
  - add plan reminders (e.g. "deposit due this week");
  - export and import a single wealth plan as a file to share it.
