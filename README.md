# 우제로또 예측 시스템 (Wooz Lotto)

**우제로또(Wooz Lotto)**는 React와 고도화된 통계 분석 로직을 기반으로 제작된 현대적인 웹 로또 예측 애플리케이션입니다. 과거 데이터 시뮬레이션을 통해 검증된 최적의 번호 조합 전략을 사용자에게 제공합니다.

## 🚀 라이브 데모 (Live Demo)
**접속 주소**: [https://wooz-lotto-react.vercel.app](https://wooz-lotto-react.vercel.app)

---

## 🛠 기술 스택 (Tech Stack)

### 인프라 (Infrastructure)
- **호스팅**: [Vercel](https://vercel.com) (Frontend & Serverless Functions)
- **데이터베이스**: [Supabase](https://supabase.com) (PostgreSQL 기반)
  - **Auth**: 사용자 인증 및 보안 관리
  - **DB**: 예측 기록 및 유저 프로필 관리 (RLS 보안 정책 적용)

### 핵심 기술 (Core Technologies)
- **언어**: JavaScript (ES6+)
- **프레임워크**: React 18
- **빌드 도구**: Vite
- **스타일링**: Vanilla CSS (모던 글래스모피즘 디자인)
- **라우팅**: React Router DOM v6
- **데이터 통신**: Axios / Supabase Client

---

## 💡 주요 기능 (Key Features)

### 1. 고도화된 예측 엔진 (Logic V2)
- **가중치 알고리즘**: 최근 5회, 10회, 30회 출현 빈도 및 패턴 분석.
- **스마트 필터링**:
  - 합계 구간 제한: 80 ~ 200
  - 연속 번호 제한
  - 홀짝 비율 밸런싱
  - **과거 이력 제외**: 역대 1등 당첨 번호와 완전히 똑같은 조합(6개 일치)은 제외.
- **콜드 넘버 보정**: 오랫동안 나오지 않은 번호에 가중치를 부여하여 균형 유지.

### 2. 시뮬레이션 및 검증
- **500만 회 이상의 대규모 시뮬레이션** 검증 완료 (50,000번 x 100세트).
- 기존 로직(V1) 대비 **수익률(ROI) 4.2% 개선** 입증.
- 3등 이상 상위 당첨 확률 유의미하게 증가.

### 3. 사용자 경험 (UX)
- **실시간 글로벌 통계**: 전체 사용자의 누적 예측 횟수와 이론적 당첨금 실시간 카운팅.
- **게스트 모드**: 로그인 없이도 예측 체험 가능 (DB 카운팅 연동).
- **마이페이지**: 로그인 시 나만의 예측 기록 저장 및 분석 리포트 제공.
- **반응형 디자인**: 데스크탑 및 모바일 환경 완벽 지원.

---

## 📂 프로젝트 구조 (Project Structure)

```
wooz-lotto-react/
├── public/              # 정적 리소스 (파비콘 등)
├── src/
│   ├── components/      # 재사용 UI 컴포넌트 (Auth, DebugEnv 등)
│   ├── pages/           # 페이지 뷰 (Home, MyPage)
│   ├── utils/           # 핵심 로직 (LottoPredictor, Service, Simulators)
│   ├── data/            # 과거 당첨 이력 JSON
│   ├── supabaseClient.js # DB 연결 설정
│   └── App.jsx          # 메인 앱 진입점 및 라우팅 설정
├── run_large_simulation.mjs # 서버 사이드 대규모 시뮬레이션 스크립트
├── run_verification.mjs     # 로직 성능 비교/검증 스크립트
└── README.md
```

## 🔧 설치 및 배포 (Setup & Deployment)

### 로컬 개발 환경 (Local Development)
```bash
npm install
npm run dev
```

### 배포 (Vercel)
```bash
# 프로덕션 배포
npx vercel --prod
```

### 환경 변수 (.env)
DB 연결을 위해 필수 설정이 필요합니다:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 📝 라이선스
이 프로젝트는 개인 학습 및 포트폴리오 목적으로 제작되었습니다.
