# 로또 Z (Lotto Z)

**접속 주소**: [https://lotto.z-labs.kr](https://lotto.z-labs.kr)

로또 Z는 로또 번호를 "맞힌다"고 말하지 않습니다. 모든 조합의 1등 확률은 1/8,145,060으로 같습니다.
대신 수학적으로 실제로 가능한 일에 집중합니다.

1. **비인기 조합 생성**: 당첨 확률은 그대로 두고, 당첨 시 나눠 가질 사람이 적은 조합을 고릅니다.
2. **내 번호 백테스트**: 번호 한 줄을 1회차부터 매주 샀다면 어땠을지 무작위 기대값과 비교합니다.
3. **휠링 조합기**: 고른 번호 풀에서 조건부 당첨(3개 또는 4개 보장)을 수학적으로 보장하는 최소 조합표를 만듭니다.

---

## v3 엔진 (2026-09)

### 4-KILL을 폐지한 근거
`scripts/backtest_v5_kill.mjs`로 32~1,241회차를 walk-forward 방식(매 회차 당시 데이터만 사용)으로 검증했습니다.

| 킬 번호 적중 수 | V5 실측 | 무작위 이론값 |
|---|---|---|
| 0개 (4개 모두 빗나감) | 55.62% | 55.20% |
| 1개 | 36.12% | 36.80% |
| 2개 | 7.77% | 7.46% |
| 3개 | 0.50% | 0.52% |

규칙별 출현율도 모두 기준값 6/45(13.33%)와 구별되지 않았습니다(|z| < 1).

### 비인기 조합 모델
`scripts/fit_popularity.mjs`로 1,227회의 실제 1등 당첨자 수를 판매량 기준 기대 당첨자 수와 비교해 가중 최소제곱 회귀를 했습니다.

| 특성 | 계수 | t |
|---|---|---|
| 12 이하 번호 개수 | +0.056 | 3.82 |
| 끝수 중복 개수 | +0.042 | 2.59 |
| 한 구간 최대 개수 | -0.038 | -1.67 |
| 연속쌍 개수 | -0.026 | -1.39 |

엔진(`src/utils/LottoEngine.js`)은 균등 무작위 후보 30개에서 뻔한 패턴과 역대 1등 조합을 빼고, 대중성 지수가 가장 낮은 조합을 고릅니다.
후보 수를 작게 유지해 이용자들이 같은 조합으로 몰리지 않게 합니다.

---

## 기술 스택

- React 19 + Vite, React Router
- Supabase (Auth, `lotto_history`, `predictions`, 커뮤니티)
- Vercel 호스팅, `/api/lottodata/*` 는 smok95 정적 JSON 프록시

## 데이터 흐름

- `collector.js`: GitHub Actions가 매주 토요일 21시(KST)에 실행합니다. smok95 전체 회차 JSON으로 `src/data/lottoHistory.json`을 재생성하고 Supabase에 동기화합니다.
  - 로컬 드라이런: `node collector.js --no-db`
- 클라이언트(`src/App.jsx`): 번들 JSON 이후 회차를 DB에서 모두 가져오고, 최근 60회 안에 빠진 회차가 있으면 개별로 채웁니다.

## 프로젝트 구조

```
src/
├── pages/          Home, ToolsPage(백테스트·휠링), GuidePage, 커뮤니티, 칼럼 등
├── utils/
│   ├── LottoEngine.js     v3 비인기 조합 엔진
│   ├── LottoTools.js      휠링(커버링 디자인), 백테스트
│   ├── LottoService.js    단일 회차 조회
│   └── ResultProcessor.js 예측 결과 채점
├── data/           lottoHistory.json, articles.js, patchNotes.js
scripts/            회귀·백테스트 재현 스크립트, 커뮤니티 SQL
archive/legacy/     V1~V5 예측기와 과거 일회성 분석·디버그 스크립트 (앱에서 사용하지 않음)
```

## 로컬 실행

```bash
npm install
npm run dev
```

환경 변수: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
