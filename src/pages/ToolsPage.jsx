import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backtest, buildWheel } from '../utils/LottoTools';
import { popularityIndex } from '../utils/LottoEngine';
import '../App.css';

const parseNumbers = (text) =>
    [...new Set((text.match(/\d+/g) || []).map(Number).filter(n => n >= 1 && n <= 45))];
const won = (v) => new Intl.NumberFormat('ko-KR').format(Math.round(v)) + '원';

const cardStyle = { background: '#1c1c1c', border: '1px solid #333', borderRadius: '16px', padding: '24px', marginBottom: '24px', color: '#ddd', lineHeight: 1.6 };
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '10px', border: '1px solid #444', background: '#111', color: '#fff', fontSize: '1rem' };
const cell = { padding: '8px 6px', borderBottom: '1px solid #2a2a2a' };

export default function ToolsPage({ pastDraws }) {
    const navigate = useNavigate();
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const [btInput, setBtInput] = useState('');
    const [btResult, setBtResult] = useState(null);
    const [btError, setBtError] = useState('');

    const [wheelInput, setWheelInput] = useState('');
    const [guarantee, setGuarantee] = useState(3);
    const [wheel, setWheel] = useState(null);
    const [wheelError, setWheelError] = useState('');

    const runBacktest = () => {
        const nums = parseNumbers(btInput).sort((a, b) => a - b);
        if (nums.length !== 6) {
            setBtError('1~45 사이의 서로 다른 번호 6개를 입력해 주세요.');
            setBtResult(null);
            return;
        }
        setBtError('');
        setBtResult({ numbers: nums, popularity: popularityIndex(nums), ...backtest(nums, pastDraws) });
    };

    const runWheel = () => {
        try {
            setWheel(buildWheel(parseNumbers(wheelInput), guarantee));
            setWheelError('');
        } catch (e) {
            setWheel(null);
            setWheelError(e.message);
        }
    };

    return (
        <div className="home-layout" style={{ minHeight: '100vh', flexDirection: 'column', alignItems: 'center' }}>
            <main className="main-board" style={{ maxWidth: '800px', width: '100%', margin: '40px auto', padding: '0 16px', boxSizing: 'border-box' }}>
                <header style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h1 className="glow-title" style={{ fontSize: '2rem' }}>🧰 로또 Z 도구함</h1>
                    <p style={{ color: '#aaa' }}>예측을 흉내 내지 않는, 수학적으로 정직한 도구입니다.</p>
                </header>

                {/* BACKTEST */}
                <section style={cardStyle}>
                    <h2 style={{ color: '#ffd700', fontSize: '1.3rem', marginTop: 0 }}>1. 내 번호 전 회차 백테스트</h2>
                    <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
                        이 번호 한 줄을 1회차부터 매주 샀다면 어땠을지 계산합니다. 1게임 1,000원 기준이며 4등 5만 원, 5등 5천 원은 고정 당첨금으로 계산합니다.
                    </p>
                    <input style={inputStyle} value={btInput} onChange={e => setBtInput(e.target.value)} placeholder="예: 3, 11, 19, 27, 38, 44" onKeyDown={e => e.key === 'Enter' && runBacktest()} />
                    <button className="btn-predict-outline" style={{ marginTop: '12px', padding: '12px 20px' }} onClick={runBacktest}>백테스트 실행</button>
                    {btError && <p style={{ color: '#ff6b6b' }}>{btError}</p>}

                    {btResult && (
                        <div className="fade-in" style={{ marginTop: '20px' }}>
                            <p>
                                <strong>{btResult.numbers.join(', ')}</strong> · {btResult.draws.toLocaleString('ko-KR')}회 구매 · 대중성 지수 <strong>{btResult.popularity.toFixed(2)}배</strong>
                            </p>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ color: '#888' }}>
                                            <th style={{ ...cell, textAlign: 'left' }}>등수</th>
                                            <th style={{ ...cell, textAlign: 'right' }}>실제 당첨</th>
                                            <th style={{ ...cell, textAlign: 'right' }}>무작위 기대값</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[1, 2, 3, 4, 5].map(r => (
                                            <tr key={r}>
                                                <td style={cell}>{r}등</td>
                                                <td style={{ ...cell, textAlign: 'right' }}>{btResult.ranks[r]}회</td>
                                                <td style={{ ...cell, textAlign: 'right', color: '#888' }}>{btResult.expected[r] < 0.01 ? btResult.expected[r].toExponential(1) : btResult.expected[r].toFixed(2)}회</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p style={{ marginTop: '12px' }}>
                                총 구매 <strong>{won(btResult.spend)}</strong> · 총 당첨금 <strong>{won(btResult.prize)}</strong> · 회수율 <strong>{(btResult.prize / btResult.spend * 100).toFixed(1)}%</strong>
                                {btResult.unknownPrizeCount > 0 && <span style={{ color: '#888' }}> (당첨금 기록이 없는 1~3등 {btResult.unknownPrizeCount}회 제외)</span>}
                            </p>
                            {btResult.wins.length > 0 && (
                                <p style={{ color: '#aaa', fontSize: '0.85rem' }}>
                                    최고 기록: {btResult.wins.slice(0, 5).map(w => `${w.drwNo}회 ${w.rank}등`).join(' · ')}
                                </p>
                            )}
                            <p style={{ color: '#888', fontSize: '0.8rem' }}>
                                어떤 번호를 넣어도 결과는 무작위 기대값 근처에 머뭅니다. 로또의 장기 회수율은 판매액의 약 50%로 설계되어 있습니다.
                            </p>
                        </div>
                    )}
                </section>

                {/* WHEEL */}
                <section style={cardStyle}>
                    <h2 style={{ color: '#00f260', fontSize: '1.3rem', marginTop: 0 }}>2. 휠링 조합기 (보장형 조합표)</h2>
                    <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
                        번호를 7~15개 고르면, 모든 조합을 사지 않고도 조건부 당첨을 <strong>수학적으로 보장</strong>하는 최소한의 조합표를 만듭니다.
                        예를 들어 3개 보장은 "고른 번호 안에 당첨 번호가 3개 이상 들어 있으면, 조합표 중 최소 1장은 5등 이상"이라는 뜻입니다.
                        당첨 확률 자체를 올리지는 않고, 적은 비용으로 같은 번호 풀을 촘촘하게 덮어 줍니다.
                    </p>
                    <input style={inputStyle} value={wheelInput} onChange={e => setWheelInput(e.target.value)} placeholder="예: 2, 7, 13, 18, 24, 31, 36, 40, 43" onKeyDown={e => e.key === 'Enter' && runWheel()} />
                    <div style={{ display: 'flex', gap: '16px', margin: '12px 0', flexWrap: 'wrap' }}>
                        {[3, 4].map(g => (
                            <label key={g} style={{ cursor: 'pointer' }}>
                                <input type="radio" checked={guarantee === g} onChange={() => setGuarantee(g)} /> {g}개 보장 ({g === 3 ? '5등' : '4등'} 이상)
                            </label>
                        ))}
                    </div>
                    <button className="btn-predict-outline" style={{ padding: '12px 20px' }} onClick={runWheel}>조합표 만들기</button>
                    {wheelError && <p style={{ color: '#ff6b6b' }}>{wheelError}</p>}

                    {wheel && (
                        <div className="fade-in" style={{ marginTop: '20px' }}>
                            <p>
                                번호 {wheel.pool.length}개 · 전체 조합 {wheel.fullWheelSize.toLocaleString('ko-KR')}장 대신 <strong>{wheel.tickets.length}장</strong>({won(wheel.cost)})으로 {wheel.guarantee}개 보장
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '8px' }}>
                                {wheel.tickets.map((t, i) => (
                                    <div key={i} style={{ background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 10px', fontFamily: 'monospace' }}>
                                        <span style={{ color: '#666' }}>{String(i + 1).padStart(2, '0')}</span> {t.map(n => String(n).padStart(2, ' ')).join(' ')}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <button onClick={() => navigate('/')} className="btn-predict-outline" style={{ padding: '12px 24px' }}>로또 Z 홈으로</button>
                </div>
            </main>
        </div>
    );
}
