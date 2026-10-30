// Shared plumbing for the yarn entry points under scripts/.

import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);

// Windows has no bare `yarn`/`playwright` executables, only .cmd shims.
export const bin = name =>
  process.platform === 'win32' ? `${name}.cmd` : name;

export const localBin = name =>
  path.join(rootDir, 'node_modules', '.bin', bin(name));

// Node 24 on Windows refuses to spawn a .cmd without a shell, so package
// CLIs run as their JavaScript entry points with the current Node instead.
const windowsScripts = {
  playwright: path.join(rootDir, 'node_modules', 'playwright', 'cli.js'),
  'test-storybook': path.join(
    rootDir,
    'node_modules',
    '@storybook',
    'test-runner',
    'dist',
    'test-storybook.js'
  ),
};

const scriptFor = name =>
  process.platform === 'win32' ? windowsScripts[name] : undefined;

/**
 * Runs a command from the repo root with inherited stdio and returns its
 * exit status.
 */
export const run = (command, args, env = {}) =>
  spawnSync(command, args, {
    stdio: 'inherit',
    cwd: rootDir,
    env: { ...process.env, ...env },
    // Node 24 on Windows won't launch a .cmd shim without one.
    shell: process.platform === 'win32' && command.endsWith('.cmd'),
  }).status ?? 1;

/**
 * Runs a package CLI, avoiding the Windows .cmd shim where Node refuses it.
 */
export const runLocal = (name, args, env = {}) => {
  const script = scriptFor(name);

  return script
    ? run(process.execPath, [script, ...args], env)
    : run(localBin(name), args, env);
};

/**
 * Like runLocal, but ends the process on failure.
 */
export const runLocalOrExit = (name, args, env) => {
  const status = runLocal(name, args, env);

  if (status !== 0) {
    process.exit(status);
  }
};

/**
 * Starts a package CLI without waiting for it, for a server to keep serving.
 */
export const spawnLocal = (name, args, options = {}) => {
  const script = scriptFor(name);

  return script
    ? spawn(process.execPath, [script, ...args], options)
    : spawn(localBin(name), args, options);
};

/**
 * Like run, but ends the process on failure.
 */
export const runOrExit = (command, args, env) => {
  const status = run(command, args, env);
  if (status !== 0) {
    process.exit(status);
  }
};
