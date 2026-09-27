import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';
import { readConfig } from '../server/config.mjs';

// Send only validated test keys over stdin; never arguments, logs or tracked files.
const values = parseEnv(readFileSync('.env.server', 'utf8'));
const config = readConfig(values);
if (!config.enabled) throw new Error('Valid widget test keys are required in .env.server');
const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'secret', 'bulk'], { stdio: ['pipe', 'inherit', 'inherit'] });
child.stdin.end(JSON.stringify({ TOSS_CLIENT_KEY: config.clientKey, TOSS_SECRET_KEY: config.secretKey }));
child.on('error', () => { console.error('Cloudflare secret upload could not start.'); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
