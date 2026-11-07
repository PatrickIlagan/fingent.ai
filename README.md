# FinGent

FinGent is a local-first personal finance app built for the Philippines. It runs on Windows, Android and iOS, keeps your records in an encrypted database on your own device, and works offline. It covers everyday money (accounts, spending, bills, budgets, goals) and the bigger picture (wealth plans, investments, a side business, freelancing, career and taxes). Ipon rewards and a pet that grows as you save make it more fun to stick with.

For a full tour of the features, the architecture and how everything fits together, read **[CONTEXT.md](CONTEXT.md)**.

## Features at a glance

- **Accounts:** bank, digital bank, e-wallet, cash and credit card accounts. A built-in list of Philippine banks and e-wallets fills in interest rates (researched November 2026, all editable). Interest can be credited automatically, as a reminder or as a fixed amount, with tiers, promos and the 20% final tax.
- **Spending and bills:** transactions in English or Tagalog categories, quick expenses, bills, credits, debts and installments with autopay from linked accounts.
- **Plans:**
  - **Budgets:** monthly or date-range budgets from presets like 50/30/20.
  - **Goals:** savings kept in one or more accounts, with auto-save, pace tracking and milestones.
  - **Wealth plans:** month-by-month projections across stocks, ETFs, crypto, banks and time deposits. They include Conservative / Balanced / Aggressive outlooks, what-if buttons, and table, calendar, graph and tracker views. You can compare plans and link plan accounts to your real accounts.
  - **Income rules:** take a percent of every income, for example a 10% tithe. A rule can count it to give later, or spend, move or add the money on its own.
- **Calendar:** bills, income, goals and your own notes, all in one place.
- **Investments:** stocks, crypto, real estate and others, with buy/sell history, live prices and peso conversion.
- **Business and freelancing:**
  - Store, SaaS and agency dashboards.
  - Freelance services, invoices (with PDF) and time tracking with a timer.
- **Career and taxes:**
  - Career goals, tasks, skills and income.
  - A Philippine tax planner with statutory contributions.
- **Ipon rewards:** points for real saving progress, challenges like the 52-week ipon, and a mochi pet that grows up. You can furnish its 3D-style room and share a picture of it.
- **Copilot:** a local assistant that understands commands like "gastos 500 grocery cash" and saves only after you confirm. It also gives on-device suggestions on each page.
- **Sync and exports:** encrypted Google Drive sync between your devices, plus Excel workbook and PDF statement exports.
- **Security:** an app password unlocks the encrypted database, and the Windows app locks itself after 10 minutes idle.

## Run locally (development)

1. Install Node.js 20 or later.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` if you need Google sign-in or other settings.
4. Start the app with `npm run dev`, then open http://localhost:3000.

The database lives in `data/` (ignored by Git). The SQLCipher driver is a native module: if you have built the Windows app, run `npm run desktop:restore-node-modules` first so the driver matches plain Node again. To try the real desktop shell instead, run `npm run desktop:dev`.

## Windows desktop installer

```powershell
npm run desktop:dist
```

Release files go to `release/`. Install `FinGent-<version>-x64.exe`, or use the portable `.exe`. The installer upgrades an existing install in place.

Your encrypted database is stored in `%APPDATA%\FinGent\fingent.db`, outside the install folder, so updating or uninstalling never removes it. Close FinGent before installing an update. Connect Google sync (Settings) before moving to another computer.

## Mobile apps (native, offline)

Android and iOS use Capacitor. On phones every `/api/*` call is answered on the device by an encrypted SQLite database (`src/lib/mobileApi.ts`), so neither app needs or contacts a desktop server.

### Android

With Android SDK Platform 36 and JDK 21 installed:

```powershell
npm run android:apk
```

The APK is written to `android\app\build\outputs\apk\debug\app-debug.apk`. On another computer, set `JAVA_HOME` to a JDK 21 install first. The app targets Android 16 and supports Android 7.0 or later.

### iOS

```powershell
npm run ios:sync
```

On macOS, run `npm run ios:open`, select the `App` target, set your Apple team and signing, then build for a device or simulator. The app supports iOS/iPadOS 15 or later. A signed `.ipa` needs macOS, Xcode and an Apple developer identity. FinGent includes SQLCipher, so answer Apple's encryption export questions when you distribute it.

## Security and privacy

- **Encryption:** the app password is the database encryption key. Windows migrates older databases to encrypted SQLite at first unlock. Android and iOS use SQLCipher, and iOS keeps its secret in the Keychain. The key is never written to the repository, to Drive or to settings. **If the password is lost, the data cannot be recovered**, so keep it in a password manager.
- **Desktop sessions:** the local Windows server only answers requests carrying the session issued at unlock, and it locks again after 10 minutes without activity.
- **What leaves the device:**
  - Exchange rates come from European Central Bank reference rates via Frankfurter.
  - Phones get crypto prices from Coinbase's public API, while Windows refreshes stocks and crypto. Only currency codes and ticker symbols are sent.
- **Suggestions** are worked out on the device. **Settings → AI features** turns off suggestions, Home insights and every Gemini request at once.
- **Optional Gemini (bring your own key):**
  - Gemini never receives chat messages, names, amounts, dates, accounts or records. It gets only a generic intent class, plus fixed generic facts if you turn on **Let Gemini add a tip**.
  - The key lives only for the session.

## Google sync (Windows, Android, iOS)

Connect Google once on each device in **Settings → Data Management → Google sync**. After that, FinGent syncs on its own:

- When you unlock, it pulls newer data from your other device, or uploads this device's changes.
- About 20 seconds after each change, it uploads again.
- If both devices changed since their last sync, it asks which copy to keep.

Every table is included (wealth plans and income rules too), along with your theme, accent and hidden tabs. Snapshots are encrypted on the device with the app password (AES-256-GCM, PBKDF2) before they go into Drive's private app-data folder. Use the same app password on every device.

Setup, done once by whoever builds the apps:

1. In Google Cloud, enable the **Google Drive API**.
2. **Windows:** create an OAuth client of type **Desktop app**. Save its JSON as `desktop/google-oauth.json` (ignored by Git), or set `GOOGLE_DESKTOP_CLIENT_ID` and `GOOGLE_DESKTOP_CLIENT_SECRET`.
3. **Android and iOS:** enable Google in Firebase Authentication.
   - **Android:** add app ID `ai.fingent.mobile` with your SHA-1 fingerprints, and save `android/app/google-services.json`.
   - **iOS:** save `ios/App/App/GoogleService-Info.plist` and add its `REVERSED_CLIENT_ID` as a URL scheme.
   - Both files are ignored by Git.
4. **Browser (development):** add the `VITE_FIREBASE_*` values from `.env.example` to `.env.local`.
5. Rebuild with `npm run desktop:dist`, `npm run android:apk` or `npm run ios:sync`.

## Checks

- `npm run lint`: TypeScript type-check.
- `npm run build`: production web build plus the bundled server (`dist/server.cjs`).

## Project layout

| Path | What it is |
| --- | --- |
| `src/pages/` | One screen per area (Home, Accounts, Plans, Wealth plans, Rewards, …) |
| `src/components/` | Shared UI: dialogs, Copilot sheet, pet and room art, wealth plan views, income rules |
| `src/lib/` | Pure shared rules and engines used by both backends: interest, goals, wealth plans, income rules, rewards, suggestions, sync, and the phone API |
| `server.ts`, `server/db.ts` | Desktop API (Express) and the encrypted SQLite schema |
| `desktop/main.cjs` | Electron shell for Windows |
| `android/`, `ios/` | Capacitor native projects |
| `scripts/` | Android and iOS build helpers |

See [CONTEXT.md](CONTEXT.md) for the details.
