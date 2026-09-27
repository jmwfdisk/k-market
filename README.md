# K-MARKET · GitHub Pages

한국의 좋은 일상을 소개하는 공개 상품 카탈로그입니다. 기존 K-MARKET 화면과 시연용 상품 6개를 바탕으로 구성했습니다.

## 개발

Node.js 22.13 이상에서 `npm ci`, `npm run dev`를 실행합니다.
`npm run build`는 TypeScript 검사 후 `dist/`에 정적 파일을 생성합니다.
`npm run preview`로 결과를 확인합니다. `npm test`로 복합 검색·가격 범위·정렬 검증을 실행합니다.

- `src/catalog.ts`: 상품명, 소개, 예시 가격(USD 센트 정수).
- `src/store.tsx`: 검색, 카테고리, 메인 화면.
- `src/main.tsx`: 상품 상세 화면 및 해시 경로.
- `src/logo.tsx`, `public/logo.png`: 공통 이미지 로고(상단·하단·상세, 브라우저 아이콘).
- `src/style.css`: 반응형 스타일.
- `public/products/`: 상품 이미지.

## 배포

GitHub Pages의 Source를 GitHub Actions로 설정합니다. `main`에 push하면 `.github/workflows/pages.yml`이 빌드 및 배포합니다. 이미지와 번들 경로는 저장소 하위 경로를 지원하며 상품 상세는 `#product/tote` 같은 해시 주소로 직접 접근할 수 있습니다.

이 사이트는 상품 소개 및 UI 시연용입니다. 로그인, 주문, 결제, 배송 견적, 관리자 API 및 고객 데이터는 포함하지 않습니다. 상품과 가격은 판매 제안이 아닌 예시입니다. 기존 서버 애플리케이션은 별도로 보존됩니다.

## 사진

Illustrative photography, Unsplash License: https://unsplash.com/license
사진은 한국산 제품이라는 주장을 의미하지 않습니다.

- Tote: Wafer WAN https://unsplash.com/photos/pgEImVUs2rI
- Notebook: Kelly Sikkema https://unsplash.com/photos/eBo-8_0i5ic
- Mug: NordWood Themes https://unsplash.com/photos/nDd3dIkkOLo
- Skincare: Victoria Priessnitz https://unsplash.com/photos/XuRiyB55ZGk
- Headphones: VCOM https://unsplash.com/photos/C0k_JxvcilU
- Vase: Sixteen Miles Out https://unsplash.com/photos/aFvxASlms2A

## 검색 및 이용 안내

- `src/shop-header.tsx`: 카테고리 통합 검색창, 로그인 안내, 고객센터 드롭다운, 상세검색 및 쇼핑몰 도우미.
- `src/catalog-search.ts`: 상품명/영문명·카테고리·USD 가격 범위 필터 및 정렬.
- `tests/search.test.mjs`: 복합 필터, 가격 입력 오류와 0 처리, 초기화 및 정렬 검사.
- 로그인은 기능 준비 안내이며 인증이나 개인정보 입력을 제공하지 않습니다. 도우미는 이용 안내로 실시간 상담이나 AI 채팅이 아닙니다.
- 헤더 배치는 사용자가 제공한 나라장터 쇼핑몰 화면을 참고했습니다. 해당 기관과의 제휴를 의미하지 않습니다.
