const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

const root = join(__dirname, '..');
const npmCli = process.env.npm_execpath;
const capacitorCli = join(root, 'node_modules', '@capacitor', 'cli', 'bin', 'capacitor');

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!npmCli) throw new Error('Run this task through `npm run ios:sync`.');
run(process.execPath, [npmCli, 'run', 'build']);
run(process.execPath, [capacitorCli, 'sync', 'ios']);

// Capacitor can emit Windows separators in SwiftPM paths when sync runs on Windows.
// Normalize generated local-package paths so the committed Xcode project also resolves on macOS.
const packageFile = join(root, 'ios', 'App', 'CapApp-SPM', 'Package.swift');
const source = readFileSync(packageFile, 'utf8');
const normalized = source.replace(/path: "([^"]+)"/g, (_, path) => `path: "${path.replace(/\\/g, '/')}"`);
if (normalized !== source) writeFileSync(packageFile, normalized, 'utf8');
