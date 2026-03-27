import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

export default function GuidePage() {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="home-layout" style={{ minHeight: '100vh', flexDirection: 'column', alignItems: 'center' }}>
            <main className="main-board" style={{ maxWidth: '800px', width: '100%', margin: '40px auto', background: '#1c1c1c', padding: '40px', borderRadius: '16px', border: '1px solid #333' }}>

                <header style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '1px solid #333', paddingBottom: '30px' }}>
                    <h1 className="glow-title" style={{ fontSize: '2.5rem', marginBottom: '15px' }}>로또 Z 심층 이용 가이드</h1>
                    <p style={{ color: '#aaa', fontSize: '1.1rem', lineHeight: '1.6', wordBreak: 'keep-all' }}>
                        우리는 어떻게 수백만 가지의 경우의 수 중에서 최적의 번호를 찾아내는가?
                        결과를 바꾸는 가장 강력한 통계 무기, <strong>'로또 Z 알고리즘'</strong>의 상세 원리를 파헤칩니다.
                    </p>
                </header>

                <article className="article-body fade-in" style={{ color: '#ddd', fontSize: '1.05rem', lineHeight: '1.8' }}>
                    <h2 style={{ color: '#ffd700', fontSize: '1.5rem', marginTop: '30px', marginBottom: '20px' }}>1. 예측 시스템의 철학: 찍는 것이 아니라 지우는 것</h2>
                    <p style={{ marginBottom: '20px' }}>
                        로또는 45개의 숫자 중 6개를 맞추는 극악의 확률 게임입니다. 전체 조합의 수는 정확히 8,145,060 가지입니다. 대부분의 사람들은 수동으로 번호를 고를 때 "무엇이 나올까"에 집중합니다. 그러나 Z-Labs의 데이터 사이언티스트들은 발상을 전환했습니다. <strong>"무엇이 절대 나오지 않을까?"</strong>에 집중하는 오답 제거(Elimination) 전략을 채택한 것입니다.
                    </p>
                    <p style={{ marginBottom: '20px' }}>
                        우리의 예측 엔진은 지난 수백 회차의 당첨 결과 데이터를 스캔하여, 이번 회차에 당첨 번호로 출현할 통계적 확률이 '0.1%' 미만으로 수렴하는 이른바 '최악의 번호'들을 우선적으로 찾아냅니다. 쓸모없는 곁가지를 모두 쳐내고, 가장 튼튼하고 생명력 넘치는 가지(번호)들만 남기는 것. 이것이 로또 Z 알고리즘의 대전제입니다.
                    </p>

                    <h2 style={{ color: '#00f260', fontSize: '1.5rem', marginTop: '40px', marginBottom: '20px' }}>2. 기본 3-KILL 전략 (Core Elimination)</h2>
                    <p style={{ marginBottom: '20px' }}>
                        메인 화면에서 가장 돋보이는 <strong>3-KILL 시스템</strong>은 로또 Z 예측의 척추와도 같습니다. 버튼을 누를 때마다 백그라운드 서버에서는 다음과 같은 엄격한 3단계 심사를 통해 3개의 숫자를 영구 결번(Kill) 처리합니다.
                    </p>
                    <ul style={{ marginLeft: '20px', marginBottom: '20px', color: '#ccc' }}>
                        <li style={{ marginBottom: '10px' }}><strong>연속 출현 한계점 돌파 검증:</strong> 3주 이상 연속으로 당첨 번호에 포함된 숫자가 4주 연속으로 등장할 확률은 복권 역사상 지극히 희박합니다. 시스템은 이러한 과열(Over-heated) 숫자들을 즉각 차단합니다.</li>
                        <li style={{ marginBottom: '10px' }}><strong>절대 동반 불가 배열 필터링:</strong> 직전 당첨 번호와의 상성(Correlation)을 분석합니다. 특정 번호가 나왔을 때 통계적으로 한 번도 함께 나온 적이 없는 앙숙 번호들의 스코어를 깎고, 그중 최하위 숫자를 버립니다.</li>
                        <li style={{ marginBottom: '10px' }}><strong>완벽한 콜드 넘버(Cold Number) 배제:</strong> 최소 15주 이상 단 한 번도 나오지 않았으며, 심지어 주변 이웃수(Neighbor)마저 힘을 잃은 완벽한 0%대 모멘텀 숫자를 제거합니다.</li>
                    </ul>

                    <h2 style={{ color: '#ff4d4d', fontSize: '1.5rem', marginTop: '40px', marginBottom: '20px' }}>3. 🔥 5-KILL 챌린지 모드 (Extreme Challenge)</h2>
                    <p style={{ marginBottom: '20px' }}>
                        기본 3-KILL 전략으로 만족하지 못하는 극단적 확률 사냥꾼들을 위해 준비된 <strong>5-KILL 챌린지 모드</strong>입니다. 45개의 숫자 중 무려 5개를 날려버리고 남은 40개의 숫자로만 조합을 구성합니다.
                    </p>
                    <p style={{ marginBottom: '20px' }}>
                        경우의 수를 수학적으로 계산해보면, 45개 중 6개를 고르는 경우의 수(약 814만)에서 40개 중 6개를 고르는 경우의 수(약 383만)로 <strong>무려 모수의 53%가 절삭되는 엄청난 효과</strong>를 가져옵니다. 단 5개의 공을 뺐을 뿐인데 여러분의 당첨 확률 베이스라인이 두 배로 도약하는 기적과도 같은 통계적 지름길입니다.
                    </p>
                    <p style={{ marginBottom: '20px', background: 'rgba(255, 77, 77, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255, 77, 77, 0.3)' }}>
                        <strong>⚠ 리스크 경고:</strong> 이 모드는 매우 공격적입니다. 시스템이 제외한 5개의 숫자 중 단 1개라도 실제 당첨 번호로 나와버린다면 그 주차의 1등 예측은 물 건너가게 됩니다. 하이리스크-하이리턴을 감수할 용기 있는 플레이어에게만 권장합니다.
                    </p>

                    <h2 style={{ color: '#0575e6', fontSize: '1.5rem', marginTop: '40px', marginBottom: '20px' }}>4. 다차원 점수제 기반 출력 시스템 (Multi-dimensional Scoring)</h2>
                    <p style={{ marginBottom: '20px' }}>
                        킬(KILL) 과정을 거쳐 잔존한 40여 개의 숫자는 단순히 뽑기로 던져지지 않습니다. 로또 Z의 의사결정 인공지능 보드는 이 살아남은 정예 숫자들 각각에 대해 15가지의 가중치 질문을 던져 점수(Score)를 매깁니다.
                    </p>
                    <ul style={{ marginLeft: '20px', marginBottom: '20px', color: '#ccc' }}>
                        <li style={{ marginBottom: '10px' }}>모서리 구역(Edge Zone) 집중도 가산점 부여</li>
                        <li style={{ marginBottom: '10px' }}>끝수(Last Digit) 폭발 주기에 도달한 그룹 번호 가산점 증폭</li>
                        <li style={{ marginBottom: '10px' }}>직전 회차 보너스 번호 및 이웃수의 회귀 반동 점수 책정</li>
                        <li style={{ marginBottom: '10px' }}>최근 5주 연속 콜드(Cold) 상태에서 서서히 꿈틀대는 모멘텀 신호의 포착</li>
                    </ul>
                    <p style={{ marginBottom: '20px' }}>
                        이러한 섬세하고 혹독한 채점표를 뚫고 가장 상위권 성적(Top Rank)을 받은 영광의 번호 6개만이 여러분의 스마트폰 화면에 추천 번호로서 당당하게 모습을 드러내는 것입니다. 화면에 출력된 각 공 아래에 작게 표기된 점수가 바로 이 가중치 환산 점수입니다.
                    </p>

                    <h2 style={{ color: '#ffd700', fontSize: '1.5rem', marginTop: '40px', marginBottom: '20px' }}>결언: 숫자는 거짓말을 하지 않습니다</h2>
                    <p style={{ marginBottom: '20px' }}>
                        물론 로또는 신의 영역이며, 기계가 아무리 수학을 분석해도 100% 당첨을 장담할 수는 없습니다. 하지만 로또 Z는 모호한 미신이나 꿈에 의존하는 맹목적 도박의 세계에, 투명하고 검증 가능한 데이터 과학의 지표를 던졌습니다. 우연 속에서 질서를 찾으려는 인류의 도전은 멈추지 않을 것입니다. 오직 여러분의 판단만이 마지막 남은 퍼즐의 한 조각입니다.
                    </p>

                </article>

                <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
                    <button onClick={() => navigate('/')} className="btn-predict-outline" style={{ padding: '15px 30px', fontSize: '1.1rem' }}>
                        로또 Z 예측 홈으로
                    </button>
                    <button onClick={() => navigate('/articles')} className="btn-predict-outline" style={{ padding: '15px 30px', fontSize: '1.1rem', backgroundColor: 'rgba(5, 117, 230, 0.1)' }}>
                        📝 분석 칼럼 더 읽기
                    </button>
                </div>
            </main>
        </div>
    );
}
