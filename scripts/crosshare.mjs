#!/usr/bin/env node
/** Disposable upstream checkout. Never uses crosshare.org production services. */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const upstream = Object.freeze({
  repository: 'https://github.com/crosshare-org/crosshare.git',
  commit: '6f84e27f007cff55413167483b65a5075f884497',
  pnpm: '10.30.3',
});
const root = fileURLToPath(new URL('../', import.meta.url));
const checkout = path.join(root, '.prototype/crosshare');
function run(command, args, cwd = root, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd, stdio: 'inherit', env: { ...process.env, ...extraEnv },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited ${result.status}`);
}
function gitOutput(...args) {
  const result = spawnSync('git', args, { cwd: checkout, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'git failed');
  return result.stdout.trim();
}
function assertPin() {
  if (!existsSync(path.join(checkout, '.git'))) throw new Error('Run prepare first.');
  if (gitOutput('rev-parse', 'HEAD') !== upstream.commit) {
    throw new Error('Checkout is not at the pinned commit. Refusing to modify it.');
  }
}
function pnpm(...args) {
  run('npx', ['--yes', `--package=pnpm@${upstream.pnpm}`, 'pnpm', ...args], checkout);
}
function requireNode22() {
  if (Number(process.versions.node.split('.')[0]) !== 22) {
    throw new Error('Crosshare targets Node 22. Use Node 22 or: npx --yes --package=node@22 node scripts/crosshare.mjs <command>');
  }
}
const command = process.argv[2] ?? 'help';
try {
  if (command === 'prepare') {
    if (!existsSync(checkout)) {
      mkdirSync(path.dirname(checkout), { recursive: true });
      run('git', ['clone', '--no-checkout', upstream.repository, checkout]);
      run('git', ['checkout', '--detach', upstream.commit], checkout);
    }
    assertPin();
    const config = path.join(checkout, 'app/firebaseConfig.ts');
    if (!existsSync(config)) copyFileSync(path.join(checkout, 'app/firebaseConfig.emulators.ts'), config);
    console.log(`Prepared ${checkout} at ${upstream.commit}. No packages installed yet.`);
  } else if (command === 'install') {
    requireNode22();
    assertPin();
    pnpm('install', '--frozen-lockfile');
    pnpm('--dir', 'app', 'compileI18n');
  } else if (command === 'run') {
    requireNode22();
    assertPin();
    const config = readFileSync(path.join(checkout, 'app/firebaseConfig.ts'), 'utf8');
    if (config !== readFileSync(path.join(checkout, 'app/firebaseConfig.emulators.ts'), 'utf8')) {
      throw new Error('Firebase config differs from the emulator fixture. Refusing to start.');
    }
    pnpm('--dir', 'app', 'emulate');
  } else if (command === 'inspect') {
    assertPin();
    run('git', ['show', '--no-patch', '--format=fuller', upstream.commit], checkout);
    run('git', ['grep', '-n', '-E', "type: 'complete'|state.success && !state.ranSuccessEffects|didCheat: true", '--', 'app/components/Puzzle.tsx', 'app/reducers/puzzleUtils.ts'], checkout);
  } else {
    console.log('Usage: node scripts/crosshare.mjs prepare|install|run|inspect\nRequires git, Node 22, and Java 21+ for Firebase emulators.\nOnly a disposable .prototype/crosshare checkout is modified.');
    if (command !== 'help') process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
