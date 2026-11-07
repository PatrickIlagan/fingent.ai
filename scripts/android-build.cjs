const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

const root = join(__dirname, '..');
const android = join(root, 'android');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
// A full, quoted path: Windows may be set not to run programs from the current folder
// (NoDefaultCurrentDirectoryInExePath), and the project path can contain spaces.
const gradle = process.platform === 'win32' ? `"${join(android, 'gradlew.bat')}"` : './gradlew';
const bundledJdk = process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'FinGent', 'build-tools', 'jdk-21.0.11+10');
const defaultAndroidSdk = process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Android', 'Sdk');
const environment = { ...process.env };
const pathKey = process.platform === 'win32' ? 'Path' : 'PATH';

if ((!environment.JAVA_HOME || !existsSync(join(environment.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'))) && bundledJdk && existsSync(join(bundledJdk, 'bin', 'java.exe'))) {
  environment.JAVA_HOME = bundledJdk;
  environment[pathKey] = `${join(bundledJdk, 'bin')}${process.platform === 'win32' ? ';' : ':'}${environment[pathKey] ?? environment.PATH ?? ''}`;
}

if ((!environment.ANDROID_HOME || !existsSync(environment.ANDROID_HOME)) && defaultAndroidSdk && existsSync(defaultAndroidSdk)) {
  environment.ANDROID_HOME = defaultAndroidSdk;
  environment.ANDROID_SDK_ROOT = defaultAndroidSdk;
}

const sync = spawnSync(npm, ['run', 'android:sync'], { cwd: root, env: environment, stdio: 'inherit', shell: true });
if (sync.status !== 0) process.exit(sync.status ?? 1);

const build = spawnSync(gradle, ['assembleDebug'], { cwd: android, env: environment, stdio: 'inherit', shell: true });
process.exit(build.status ?? 1);
