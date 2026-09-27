# Cloudflare 토스 테스트 승인 서버

공개 화면은 GitHub Pages, 승인 API는 Cloudflare Worker `k-market-test-checkout`를 사용합니다. 사용자 결정에 따라 Cloudflare 사용을 재개했습니다. 유료 플랜 업그레이드는 하지 않습니다.

배포 API 주소: `https://k-market-test-checkout.k-market-pages.workers.dev`. GitHub Actions의 `VITE_CHECKOUT_API_URL`에도 같은 주소를 설정합니다. 새 workers.dev 하위 도메인은 첫 배포 후 DNS/HTTPS 준비 시간이 필요할 수 있습니다.

## 저장과 승인

`CheckoutStore`는 SQLite Durable Object입니다. 모든 테스트 주문을 하나의 저장소에 보관하여 주문 간 결제키 중복 및 승인 잠금 제약을 유지합니다. Node.js 로컬 서버와 동일한 `server/checkout-core.mjs`를 사용합니다. 로컬 SQLite 파일은 업로드하지 않으며 공개 서버 주문은 새로 시작합니다. 단일 저장소 구성은 현재 소규모 테스트 용도입니다.

## 배포

`github-pages/`에서 실행합니다.

```sh
npm ci
npx wrangler login
npx wrangler deploy --dry-run
npx wrangler deploy
node scripts/cloudflare-secrets.mjs
```

시크릿 업로드 스크립트는 Git에서 제외된 `.env.server`의 결제위젯 테스트 키 두 개만 stdin으로 전송합니다. 키를 명령행 인수나 공개 파일에 넣지 않습니다. Worker는 라이브 키를 허용하지 않습니다. Cloudflare 계정의 Workers 하위 도메인 등록이 필요한 경우 대시보드에서 등록합니다.

배포된 HTTPS Worker 주소를 GitHub Actions 변수 `VITE_CHECKOUT_API_URL`에 설정하고 Pages 워크플로를 다시 실행합니다. `wrangler.jsonc`의 `CHECKOUT_SITE_URL`은 `https://jmwfdisk.github.io/k-market/`이며 다른 Origin은 거부합니다. Workers 배포는 GitHub Pages 워크플로와 별도입니다.

## 검증

- `npm test`: 공통 주문/승인 로직 및 로컬 설정 검사.
- `npm run build`, `npx wrangler deploy --dry-run`: 화면 및 Worker 번들 검사.
- `npx wrangler dev --local --port 8787 --var TOSS_CLIENT_KEY:test_gck_fixture --var TOSS_SECRET_KEY:test_gsk_fixture` 실행 후 `node scripts/check-worker.mjs`: 로컬 Workers 런타임에서 저장·중복 요청·금액·접근·요청 크기 검사. 이 fixture는 실제 결제용 키가 아닙니다.
- 공개 서버 검증은 `CHECKOUT_VERIFY_URL` 환경변수로 Worker 주소 지정. 시험 주문 한 건을 생성하지만 토스 승인 요청은 보내지 않습니다.
- 실제 결제창 카드 인증과 서버 승인은 별도로 브라우저에서 확인하고 개발자센터 내역과 대조합니다.

공식 문서: [SQLite Durable Objects](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/), [무료 플랜 및 사용 한도](https://developers.cloudflare.com/durable-objects/platform/pricing/).
