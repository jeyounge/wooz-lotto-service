import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const h2 = (color) => ({ color, fontSize: '1.5rem', marginTop: '40px', marginBottom: '20px' });
const p = { marginBottom: '20px' };
const li = { marginBottom: '10px' };

export default function GuidePage() {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="home-layout" style={{ minHeight: '100vh', flexDirection: 'column', alignItems: 'center' }}>
            <main className="main-board" style={{ maxWidth: '800px', width: '100%', margin: '40px auto', background: '#1c1c1c', padding: '40px', borderRadius: '16px', border: '1px solid #333', boxSizing: 'border-box' }}>

                <header style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '1px solid #333', paddingBottom: '30px' }}>
                    <h1 className="glow-title" style={{ fontSize: '2.2rem', marginBottom: '15px' }}>로또 Z 엔진 가이드 (v3)</h1>
                    <p style={{ color: '#aaa', fontSize: '1.05rem', lineHeight: '1.6', wordBreak: 'keep-all' }}>
                        로또 Z는 당첨 번호를 맞힌다고 말하지 않습니다. 대신 수학적으로 실제로 할 수 있는 일, 즉 <strong>당첨됐을 때 덜 나눠 갖는 조합</strong>을 만드는 데 집중합니다.
                    </p>
                </header>

                <article className="article-body fade-in" style={{ color: '#ddd', fontSize: '1.05rem', lineHeight: '1.8', wordBreak: 'keep-all' }}>
                    <h2 style={{ ...h2('#ffd700'), marginTop: '30px' }}>1. 출발점: 로또는 무작위입니다</h2>
                    <p style={p}>
                        로또 6/45의 전체 조합은 8,145,060가지이고, 어떤 조합이든 1등 확률은 똑같습니다. 로또 Z는 1회차부터 최신 회차까지 전체 당첨 번호로 여러 패턴을 검정했습니다. 오래 안 나온 번호, 연속 출현 번호, 직전 보너스 번호 모두 다음 회차 출현 확률이 기준값 6/45(약 13.3%)와 통계적으로 구별되지 않았습니다.
                    </p>

                    <h2 style={h2('#ff4d4d')}>2. 4-KILL을 폐지한 이유</h2>
                    <p style={p}>
                        이전 버전은 직전 보너스, 2주 연속 출현, 장기 미출현 번호 중 4개를 "이번 주에 안 나올 번호"로 제외했습니다. v3 개편 과정에서 이 규칙을 32회차부터 1,241회차까지, 매 회차 그 시점의 데이터만 사용해 다시 검증했습니다.
                    </p>
                    <ul style={{ marginLeft: '20px', marginBottom: '20px', color: '#ccc' }}>
                        <li style={li}>킬 번호 4개가 모두 빗나간 회차: <strong>55.6%</strong></li>
                        <li style={li}>아무 번호나 4개를 골랐을 때의 이론값: <strong>55.2%</strong></li>
                        <li style={li}>규칙별 출현율: 직전 보너스 13.9%, 2주 연속 13.8%, 20주 미출현 12.7%, 10주 미출현 13.4% (기준값 13.3%)</li>
                    </ul>
                    <p style={p}>
                        즉 4-KILL은 무작위로 번호 4개를 빼는 것과 차이가 없었습니다. 킬 번호 중 2개가 당첨 번호로 나오는 주도 이론상 약 13주에 한 번은 생깁니다. 효과가 없는 기능을 "핵심 기법"으로 내세우는 것은 정직하지 않다고 판단해 폐지했습니다.
                    </p>

                    <h2 style={h2('#00f260')}>3. 대신 할 수 있는 일: 당첨금을 덜 나누기</h2>
                    <p style={p}>
                        1등 당첨금은 당첨자 수로 나눕니다. 그래서 확률은 같아도, 많은 사람이 고르는 조합으로 당첨되면 받는 돈이 줄어듭니다. 로또 Z는 회차마다 실제 1등 당첨자 수를 판매량 기준 기대 당첨자 수와 비교해, 어떤 번호 구성이 사람들에게 인기가 있는지 분석했습니다.
                    </p>
                    <ul style={{ marginLeft: '20px', marginBottom: '20px', color: '#ccc' }}>
                        <li style={li}><strong>12 이하 번호</strong>가 하나 늘 때마다 1등 당첨자가 평균 약 6% 많았습니다. 월·일 같은 날짜 숫자를 고르는 사람이 많기 때문으로 보입니다.</li>
                        <li style={li}><strong>끝자리가 겹치는 번호</strong>가 하나 늘 때마다 약 4% 많았습니다.</li>
                        <li style={li}>연속번호, 한 구간 몰림 같은 나머지 특성은 신호가 약해 작은 가중치만 줍니다.</li>
                    </ul>
                    <p style={p}>
                        이 결과를 합쳐 조합마다 <strong>대중성 지수</strong>를 계산합니다. 1.00배가 무작위 조합의 평균이고, 0.80배라면 1등 당첨 시 나눠 가질 사람이 평균보다 약 20% 적다고 추정한다는 뜻입니다. 효과 크기는 크지 않은 추정치이며, 당첨을 보장하지 않습니다.
                    </p>

                    <h2 style={h2('#0575e6')}>4. 번호가 만들어지는 과정</h2>
                    <ul style={{ marginLeft: '20px', marginBottom: '20px', color: '#ccc' }}>
                        <li style={li}>45개 번호에서 완전히 무작위로 6개짜리 후보를 30개 만듭니다.</li>
                        <li style={li}>역대 1등 번호와 똑같은 조합, 등차수열, 같은 수의 배수만 있는 조합, 모두 31 이하인 날짜형 조합은 뺍니다.</li>
                        <li style={li}>남은 후보 중 대중성 지수가 가장 낮은 조합을 보여 드립니다.</li>
                    </ul>
                    <p style={p}>
                        후보를 매번 새로 뽑기 때문에 이용자들이 같은 "비인기 조합"으로 몰리지 않습니다. 모두가 똑같은 비인기 조합을 사면, 그 조합은 더 이상 비인기 조합이 아니기 때문입니다.
                    </p>

                    <h2 style={h2('#ffd700')}>5. 도구함: 백테스트와 휠링</h2>
                    <p style={p}>
                        <strong>내 번호 백테스트</strong>는 번호 한 줄을 1회차부터 매주 샀다면 몇 등에 몇 번 당첨됐을지, 무작위 기대값과 나란히 보여 줍니다. <strong>휠링 조합기</strong>는 번호 7~15개를 고르면 "당첨 번호가 고른 번호 안에 3개(또는 4개) 이상 있으면 최소 1장은 5등(또는 4등) 이상"을 수학적으로 보장하는 최소 조합표를 만듭니다.
                    </p>

                    <h2 style={h2('#ffd700')}>맺음말</h2>
                    <p style={p}>
                        로또의 장기 회수율은 판매액의 약 50%로 설계되어 있습니다. 로또 Z는 이 사실을 숨기지 않고, 그 안에서 합리적으로 즐기는 방법만 제공합니다. 구매는 반드시 즐거운 범위 안에서 해 주세요.
                    </p>
                </article>

                <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
                    <button onClick={() => navigate('/')} className="btn-predict-outline" style={{ padding: '15px 30px', fontSize: '1.1rem' }}>
                        로또 Z 홈으로
                    </button>
                    <button onClick={() => navigate('/tools')} className="btn-predict-outline" style={{ padding: '15px 30px', fontSize: '1.1rem', backgroundColor: 'rgba(5, 117, 230, 0.1)' }}>
                        🧰 도구함 열기
                    </button>
                </div>
            </main>
        </div>
    );
}
