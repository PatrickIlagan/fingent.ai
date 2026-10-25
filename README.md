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

The release artifacts are written to `release/`. Install the `FinGent-<version>-x64.exe` setup file (or use the portable `.exe`). The installer upgrades the existing FinGent installation in place. The desktop app stores its encrypted database under `%APPDATA%\FinGent\fingent.db`, outside the install directory; updating or uninstalling the app does not remove that data. Close FinGent before installing an update so Windows can replace its executable safely. Use the in-app encrypted Drive backup before moving computers.

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

FinGent uses the app password as the local database encryption key: existing Windows databases are migrated to an encrypted SQLite file at first unlock, while Android and iOS use SQLCipher-backed encrypted SQLite. iOS stores its SQLCipher secret through Keychain using FinGent's app-specific prefix. The key is never written to the repository, Drive, or application settings. If the app password is lost, local encrypted data cannot be recovered—keep a separate encrypted Drive backup password in a password manager. On Windows, the local server only answers requests that carry the session issued when the app is unlocked, and FinGent locks again after 10 minutes without activity. Exchange rates come from European Central Bank reference rates via Frankfurter on every platform. On Android and iOS, crypto prices come from Coinbase's public price API and stock prices keep their last saved values; Windows refreshes both. Only currency codes and ticker symbols are sent, and the last saved prices are kept when the device is offline.

### Cross-device Google Drive sync

Google Drive sync uses one portable encrypted snapshot, so a backup made on Android, iOS, or Windows can be restored on either of the other platforms. Before upload, the snapshot is encrypted in the app with AES-256-GCM and a password; Google Drive receives only the encrypted file in its private app-data folder.

Set up the same Google/Firebase project for both clients:

1. Enable **Google** in Firebase Authentication and enable the **Google Drive API** in the linked Google Cloud project.
2. Add the Firebase web configuration to `.env.local` using the `VITE_FIREBASE_*` values in `.env.example` (used by the browser/Windows app).
3. In Firebase, add Android app ID `ai.fingent.mobile`, register the debug/release SHA-1 fingerprints that you sign with, then save its downloaded `google-services.json` as `android/app/google-services.json`. It is intentionally ignored by Git.
4. Add an iOS app with bundle ID `ai.fingent.mobile`, then save the downloaded `GoogleService-Info.plist` as `ios/App/App/GoogleService-Info.plist`. It is also intentionally ignored by Git.
5. In the Xcode target's **Info > URL Types**, add the `REVERSED_CLIENT_ID` value from `GoogleService-Info.plist` as a URL scheme so Google can return to FinGent after sign-in.
6. Rebuild with `npm run android:apk` or run `npm run ios:sync` after adding the corresponding Firebase file.

The optional Gemini BYOK assistant calls Gemini directly from each app using the user-provided session-only key. It uses the same fixed, privacy-safe prompt on Windows, Android, and iOS: no chat text, history, names, financial values, balances, categories, or records leave FinGent.

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
