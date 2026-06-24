import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const port = process.env.PORT || '3000';
const host = '0.0.0.0';
const nextBin = join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'next.cmd' : 'next');

console.log(`[startup] cwd=${process.cwd()}`);
console.log(`[startup] port=${port}`);
console.log(`[startup] nextBin=${nextBin}`);

if (!existsSync(nextBin)) {
  console.error(`[startup] Next.js executable not found at ${nextBin}`);
  process.exit(1);
}

const child = spawn(nextBin, ['start', '-H', host, '-p', port], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.log(`[startup] Next.js stopped by signal ${signal}`);
    process.exit(0);
  }
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('[startup] Failed to start Next.js:', error);
  process.exit(1);
});
