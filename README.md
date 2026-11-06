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

The release artifacts are written to `release/`. Install the `FinGent-<version>-x64.exe` setup file (or use the portable `.exe`). The installer upgrades the existing FinGent installation in place. The desktop app stores its encrypted database under `%APPDATA%\FinGent\fingent.db`, outside the install directory; updating or uninstalling the app does not remove that data. Close FinGent before installing an update so Windows can replace its executable safely. Connect Google sync (Settings) before moving computers.

## Mobile apps (native, offline)

FinGent has native Android and iOS wrappers built with Capacitor. On both platforms, `/api/*` calls are handled by an encrypted on-device SQLite database: account balances, transactions, categories, portfolios, business data, freelancing data, routines, calendar items, and career records remain on the device. Neither mobile app requires or contacts a desktop server.

### Android

Build a debug APK with Android SDK Platform 36 and JDK 21 installed:

```powershell
npm run android:apk
```

The resulting installable file is `android\\app\\build\\outputs\\apk\\debug\\app-debug.apk`. On this development computer, the build command automatically uses FinGent's local JDK 21 build tool; on another computer, set `JAVA_HOME` to a JDK 21 installation first. The Android project targets Android 16 and supports Android 7.0 or later.

### iOS

Prepare the Xcode project on any platform with:

```powershell
npm run ios:sync
```

On macOS, run `npm run ios:open`, select the `App` target in Xcode, configure your Apple development team and signing profile, then build for an iPhone, iPad, or simulator. The target supports iOS/iPadOS 15 or later. A signed `.ipa` or App Store archive can only be produced on macOS with Xcode and an Apple developer identity. Because the app includes SQLCipher, complete Apple's encryption/export-compliance questions when distributing it.

FinGent uses the app password as the local database encryption key: existing Windows databases are migrated to an encrypted SQLite file at first unlock, while Android and iOS use SQLCipher-backed encrypted SQLite. iOS stores its SQLCipher secret through Keychain using FinGent's app-specific prefix. The key is never written to the repository, Drive, or application settings. If the app password is lost, local encrypted data cannot be recovered—keep it in a password manager. On Windows, the local server only answers requests that carry the session issued when the app is unlocked, and FinGent locks again after 10 minutes without activity. Exchange rates come from European Central Bank reference rates via Frankfurter on every platform. On Android and iOS, crypto prices come from Coinbase's public price API and stock prices keep their last saved values; Windows refreshes both. Only currency codes and ticker symbols are sent, and the last saved prices are kept when the device is offline.

### Google sync (Windows, Android, iOS)

Connect Google once on each device in **Settings → Data Management → Google sync**. FinGent then syncs on its own: when you unlock, it pulls newer data from your other device (or uploads this device's changes), and about 20 seconds after each change it uploads again. If both devices changed since their last sync, FinGent asks which copy to keep. Every table, plus your theme, accent, and hidden tabs, is included.

The snapshot is encrypted on the device with the **app password** (AES-256-GCM, key derived with PBKDF2) before upload, into Google Drive's private app-data folder that only FinGent can see. Use the same app password on every device. The password is held in memory only while FinGent is unlocked. Backups made with a different password can still be restored from the same card.

Setup (one time, by whoever builds the apps):

1. In Google Cloud, enable the **Google Drive API**.
2. **Windows app:** create an OAuth client of type **Desktop app**, download its JSON, and save it as `desktop/google-oauth.json` (ignored by Git and packaged with the installer). Or set `GOOGLE_DESKTOP_CLIENT_ID` and `GOOGLE_DESKTOP_CLIENT_SECRET` in the environment. Sign-in opens in the system browser and returns to FinGent through its local address; the refresh token is stored inside the encrypted database and never synced.
3. **Android and iOS:** enable **Google** in Firebase Authentication for the same project. Add Android app ID `ai.fingent.mobile` with your signing SHA-1 fingerprints and save `google-services.json` as `android/app/google-services.json`. Add an iOS app with bundle ID `ai.fingent.mobile`, save `GoogleService-Info.plist` as `ios/App/App/GoogleService-Info.plist`, and add its `REVERSED_CLIENT_ID` as a URL scheme in Xcode (**Info > URL Types**). Both files are ignored by Git. Phones keep the Google access token in memory, so they may ask you to pick your Google account again after about an hour.
4. **Browser (development):** without a desktop client, the browser version uses the Firebase pop-up; add the `VITE_FIREBASE_*` values from `.env.example` to `.env.local`.
5. Rebuild: `npm run desktop:dist`, `npm run android:apk`, or `npm run ios:sync`.

## Checks

- `npm run lint` validates TypeScript.
- `npm run build` creates a production build.

## Main areas

- Accounts with interest: pick your bank or e-wallet from a built-in, searchable list of Philippine banks, digital banks, e-wallets, and credit cards (rates researched November 2026, all editable). Interest is credited daily or monthly, automatically, as a reminder, or as a fixed amount, with tiers, minimum balances, promo or mission boosts, and the 20% final tax. Goal savings kept in an account grow with its interest.
- Transactions, liabilities, budgets, goals, calendar, and taxes
- Investments and portfolio transaction history
- Venture-specific Store, SaaS, and Agency dashboards
- Freelance services, contracts, invoices, time tracking, and PDF invoices
- Career tracking and settings

## Local Copilot and privacy

The FinGent Copilot is a local workflow, navigation, and command assistant. It can prepare an action such as “I spent 500 on groceries, cash,” match the account locally, and save it only after the user explicitly confirms.

Suggestions on most pages (bills due soon, goals behind pace, idle cash that could earn interest, overdue invoices, and so on) are worked out on the device from your own records; nothing is sent anywhere. **Settings → AI features** turns off suggestions, Home insights, and every Gemini request at once.

Optional Gemini BYOK guidance can be enabled in Settings. It never receives a chat message or chat history. FinGent sends Gemini only a fixed generic intent class such as `TRANSACTION_RECORDING`, never raw commands, names, categories, dates, amounts, balances, account details, client details, or financial records. If you also turn on **Let Gemini add a tip**, Gemini receives the page name and fixed, generic facts such as "a savings goal is behind pace" (no names or amounts) and returns one extra tip. The API key is held only for the active session and is cleared when it ends.
