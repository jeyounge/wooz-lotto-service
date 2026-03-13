// 패치노트 정적 데이터
// 새로운 패치 추가 시 이 파일에 최상단에 추가하세요

export const patchNotes = [
  {
    version: 'v2.3.0',
    date: '2026-03-13',
    title: '커뮤니티 게시판 오픈 🎉',
    type: 'feature',
    changes: [
      '자유게시판 오픈 - 로또 얘기, 구매 인증 등 자유롭게 공유하세요!',
      '패치노트 페이지 추가 - 업데이트 내역을 투명하게 공개합니다.',
      '관리자 히든 예측 버튼 제거 (내부 정리)',
    ],
  },
  {
    version: 'v2.2.0',
    date: '2026-03-10',
    title: '예측 시간 제한 안내 개선',
    type: 'fix',
    changes: [
      '토요일 오후 8시 이후~일요일 오전 6시 예측 차단 메시지 문구 개선',
      '회차 undefined 표시 버그 수정',
    ],
  },
  {
    version: 'v2.1.0',
    date: '2026-03-05',
    title: 'KBO 야구 서비스 별도 오픈',
    type: 'feature',
    changes: [
      'wooz.z-labs.kr에서 KBO AI 승부 예측 서비스 오픈',
      '2015~2025 KBO 역대 순위 데이터 제공',
    ],
  },
  {
    version: 'v2.0.0',
    date: '2026-02-20',
    title: '5-KILL 챌린지 모드 출시',
    type: 'feature',
    changes: [
      '기존 3-KILL 전략에 더해 5-KILL 챌린지 모드 추가',
      '콜드 넘버 2개를 추가로 제외하여 더욱 공격적인 예측 가능',
      '킬 전략 적중률 통계 카드 신규 추가',
    ],
  },
  {
    version: 'v1.5.0',
    date: '2026-01-15',
    title: '예측 히스토리 개선',
    type: 'improvement',
    changes: [
      '이번 회차 예측 내역만 필터링하여 노출',
      '분석 리포트 저장 및 불러오기 기능 추가',
      '예측 시 DB 자동 저장',
    ],
  },
  {
    version: 'v1.0.0',
    date: '2025-12-01',
    title: '로또 Z 서비스 론칭 🚀',
    type: 'feature',
    changes: [
      '로또 Z 정식 오픈',
      '3-KILL 전략 기반 빅데이터 예측 시스템',
      '회원가입 / 로그인 기능',
      '예측 히스토리 저장',
    ],
  },
];

export const typeConfig = {
  feature: { label: '새 기능', color: '#00f260', bg: 'rgba(0,242,96,0.1)' },
  fix:     { label: '버그 수정', color: '#ff9f43', bg: 'rgba(255,159,67,0.1)' },
  improvement: { label: '개선', color: '#0575e6', bg: 'rgba(5,117,230,0.1)' },
};
