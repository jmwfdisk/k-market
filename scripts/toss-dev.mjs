import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readConfig } from '../server/config.mjs';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
if (existsSync('.env.server')) process.loadEnvFile('.env.server');
let config;
try { config = readConfig(); }
catch { console.error('테스트 환경 설정 오류: .env.server의 테스트 키·통화·사이트 주소를 확인해 주세요.'); process.exit(1); }
if (!config.enabled) {
  console.error('토스 테스트 키가 필요합니다. .env.server에 같은 상점의 TOSS_CLIENT_KEY(test_gck_)와 TOSS_SECRET_KEY(test_gsk_)를 입력해 주세요.');
  process.exit(1);
}
const site = new URL(config.siteUrl);
const apiHost = process.env.CHECKOUT_HOST || '127.0.0.1';
const apiPort = Number(process.env.PORT || 4010);
if (site.protocol !== 'http:' || site.hostname !== '127.0.0.1' || site.pathname !== '/' || apiHost !== '127.0.0.1' || !Number.isInteger(apiPort) || apiPort < 1024 || apiPort > 65535 || apiPort === Number(site.port || 80)) {
  console.error('로컬 실행은 CHECKOUT_SITE_URL=http://127.0.0.1:5173/, CHECKOUT_HOST=127.0.0.1 및 별도 API 포트(기본 4010)를 사용해 주세요.');
  process.exit(1);
}
if (process.argv.includes('--check')) {
  console.log('로컬 설정 형식 확인 완료 (토스 키 유효성 및 결제 인증은 별도 확인 필요).');
  process.exit(0);
}
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
  const timeout = setTimeout(() => { for (const child of children) if (child.exitCode === null) child.kill('SIGKILL'); }, 5000);
  timeout.unref();
}
function start(args, env = process.env) {
  const child = spawn(process.execPath, args, { env, stdio: 'inherit' });
  children.push(child);
  child.on('error', () => { console.error('로컬 테스트 프로세스를 시작하지 못했습니다.'); stop(1); });
  child.on('exit', (code) => { if (!stopping) stop(code || 1); });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
start(['--experimental-strip-types', 'server/index.mjs']);
// Secret keys are never inherited by the frontend development server.
const frontendEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('TOSS_') && !name.startsWith('VITE_')));
frontendEnv.VITE_CHECKOUT_API_URL = `http://127.0.0.1:${apiPort}`;
start(['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', site.port || '80', '--strictPort'], frontendEnv);
console.log(`토스 테스트 주문서: ${config.siteUrl}#checkout/tote\n종료: Ctrl+C (화면과 승인 서버 함께 종료)`);
