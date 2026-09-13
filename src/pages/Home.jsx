import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LottoEngine, popularityIndex } from '../utils/LottoEngine'
import { supabase } from '../supabaseClient' // Adjusted path
import Auth from '../components/Auth' // Adjusted path
import { getPredictionStatus } from '../utils/timeUtils'
import { computePatternReport } from '../utils/PatternStats'
import PatternReport from '../components/PatternReport'
import '../App.css'

export default function Home({ session, userProfile, pastDraws, handleLogout, refreshProfile }) {
    const navigate = useNavigate()

    // --- State Variables ---
    const [numbers, setNumbers] = useState([]);
    const [, setScores] = useState([]);
    const [analysis, setAnalysis] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [allWeights, setAllWeights] = useState([]);
    const [predictionStatus, setPredictionStatus] = useState({ isOpen: true, message: '' });

    // Global Statistics
    const [globalStats, setGlobalStats] = useState({ count: 0, totalPrize: 0, currentRoundCount: 0 });

    // Derived Data (Moved Up)
    const lastRound = useMemo(() => {
        if (!pastDraws || pastDraws.length === 0) return null;
        // ALWAYS use the absolute latest round available in DB/Cache
        // Even if firstPrzwnerCo is 0 (meaning prize distribution is still being calculated),
        // we should show the balls for the latest drawn round.
        return pastDraws[0];
    }, [pastDraws]);

    const nextRound = useMemo(() => {
        // ALWAYS use the absolute latest round in the DB + 1 for predictions.
        // It doesn't matter if the latest round's prize data is confirmed or not.
        return pastDraws && pastDraws.length > 0 ? pastDraws[0].drwNo + 1 : 1209;
    }, [pastDraws]);

    // Fetch Global Stats
    useEffect(() => {
        const fetchStats = async () => {
            // 1. Total Count & Total Prize
            const { count: totalCount } = await supabase.from('predictions').select('*', { count: 'exact', head: true });

            const { data: winners } = await supabase
                .from('predictions')
                .select('prize')
                .eq('status', 'win');

            const totalPrize = winners ? winners.reduce((acc, curr) => acc + (curr.prize || 0), 0) : 0;

            // 2. Current Round Count
            let currentCount = 0;
            if (nextRound) {
                const { count } = await supabase
                    .from('predictions')
                    .select('*', { count: 'exact', head: true })
                    .eq('drw_no', nextRound);
                currentCount = count || 0;
            }

            setGlobalStats({
                count: totalCount || 0,
                totalPrize: totalPrize,
                currentRoundCount: currentCount
            });
        };
        fetchStats();


    }, [nextRound]);

    // Local History State
    const [history, setHistory] = useState(() => {
        const saved = localStorage.getItem('predictionHistory');
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedId, setSelectedId] = useState(null);


    // Predictor Instance
    const currentPredictor = useMemo(() => new LottoEngine(pastDraws), [pastDraws]);

    // Weekly pattern report (walk-forward stats) + optional user filters
    const patternReport = useMemo(() => computePatternReport(pastDraws), [pastDraws]);
    const [patternFilters, setPatternFilters] = useState({});
    const togglePatternFilter = (id) => setPatternFilters(prev => ({ ...prev, [id]: !prev[id] }));

    const buildGenerateOptions = () => {
        const exclude = new Set();
        const labels = [];
        (patternReport?.numberRules || []).forEach(rule => {
            if (!patternFilters[rule.id] || rule.upcoming.length === 0) return;
            rule.upcoming.forEach(x => exclude.add(x));
            labels.push(rule.upcoming.length <= 6 ? `${rule.label} 제외(${rule.upcoming.join(', ')})` : `${rule.label} ${rule.upcoming.length}개 제외`);
        });
        if (patternFilters.noConsecutive) labels.push('연속번호 없는 조합만');
        return { excludeNumbers: [...exclude], noConsecutive: !!patternFilters.noConsecutive, filterLabels: labels };
    };

    // Load Weights (Use current predictor)
    useEffect(() => {
        setAllWeights(currentPredictor.getFrequency(52));
    }, [currentPredictor]);

    // Check Prediction Status (Time Restrictions)
    useEffect(() => {
        const checkStatus = () => {
            const status = getPredictionStatus();
            setPredictionStatus(status);
        };

        checkStatus(); // Initial check

        // Poll every 30 seconds to update status automatically
        const intervalId = setInterval(checkStatus, 30000);

        return () => clearInterval(intervalId);
    }, []);

    // Sync Local History (Only for guests)
    useEffect(() => {
        if (!session) {
            localStorage.setItem('predictionHistory', JSON.stringify(history));
        }
    }, [history, session]);

    // Fetch DB History (For Logged In Users)
    // Fetch DB History (For Logged In Users)
    const fetchHistory = async () => {
        if (!session) return;

        const { data, error } = await supabase
            .from('predictions')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (data) {
            // Map DB format to UI format
            const mapped = data.map(item => ({
                id: item.id,
                date: new Date(item.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                numbers: item.numbers,
                round: item.drw_no,
                scores: null, // Will calc on load
                analysis: item.analysis || null, // Load stored analysis
                is_hidden: item.is_hidden,
                is_challenge: item.is_challenge
            }));
            setHistory(mapped);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [session]);

    const generateNumbers = () => {
        setIsAnalyzing(true);

        setTimeout(async () => {
            let result;
            try {
                result = currentPredictor.generate(buildGenerateOptions());
            } catch (err) {
                alert(err.message);
                setIsAnalyzing(false);
                return;
            }
            const calculatedScores = [];

            setNumbers(result.numbers);
            setScores(calculatedScores);
            setAnalysis(result.analysis);

            const newRecord = {
                id: Date.now(),
                date: new Date().toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                numbers: result.numbers,
                analysis: result.analysis,
                scores: calculatedScores,
                round: nextRound,
                isChallenge: false // Keep DB structure compatibility
            };

            setSelectedId(newRecord.id);

            // Update Grid (Optimistic UI)
            setHistory(prev => [newRecord, ...prev].slice(0, 10));

            // Save to DB (Logged in or Guest)
            try {
                const payload = {
                    drw_no: nextRound,
                    numbers: result.numbers,
                    analysis: result.analysis,
                    is_challenge: false // Keep DB structure compatibility
                };
                // Only add user_id if logged in
                if (session && session.user) {
                    payload.user_id = session.user.id;
                }

                const { error } = await supabase
                    .from('predictions')
                    .insert(payload);

                if (error) console.error('Error saving prediction:', error);
            } catch (err) {
                console.error('DB Insert Exception:', err);
            }

            // OPTIMISTIC UPDATE
            setGlobalStats(prev => ({
                ...prev,
                count: prev.count + 1
            }));

            setIsAnalyzing(false);
        }, 800);
    };

    const loadHistoryItem = (item) => {
        setNumbers(item.numbers);
        setSelectedId(item.id);

        // 1. Scores: DB doesn't store scores, so we always recalc if missing
        // (It's deterministic based on numbers, so safe to recalc)
        // 1. Scores: DB doesn't store scores, so we always recalc if missing
        // (It's deterministic based on numbers, so safe to recalc)
        // Note: History items won't restore the exact specific Kill List of that time, 
        // but the scores calculation is generic V4 logic.
        const currentScores = item.scores || [];
        setScores(currentScores);

        // 2. Analysis: MUST use DB version if available to preserve the "feeling"
        if (item.analysis && item.analysis.length > 0) {
            setAnalysis(item.analysis);
        } else {
            setAnalysis(currentPredictor.analyze(item.numbers));
        }
    }

    const getBallColor = (num) => {
        if (num <= 10) return 'yellow';
        if (num <= 20) return 'blue';
        if (num <= 30) return 'red';
        if (num <= 40) return 'gray';
        return 'green';
    }


    return (
        <div className="home-layout">
            <main className="main-board">
                <header className="main-header">
                    <h1 className="glow-title">로또 Z 비인기 조합 생성기</h1>
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '10px', color: '#aaa', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                        <span>🎯 전체: <strong style={{ color: '#ffd700' }}>{globalStats.count.toLocaleString()}</strong></span>
                        <span>🔥 <strong>{nextRound}회</strong>: <strong style={{ color: '#ff9f43' }}>{globalStats.currentRoundCount?.toLocaleString() || 0}</strong></span>
                        <span>💰 누적 당첨: <strong style={{ color: '#00f260' }}>{new Intl.NumberFormat('ko-KR').format(globalStats.totalPrize)}</strong></span>
                    </div>
                </header>

                <section className="info-card">
                    {lastRound && (
                        <div className="last-round-content">
                            <div className="lr-header">
                                <span className="lr-round">{lastRound.drwNo}회</span>
                                <span className="lr-date">{lastRound.drwNoDate}</span>
                            </div>
                            <div className="lr-balls">
                                {lastRound.numbers.map((n) => (
                                    <div key={n} className={`mini-ball ball-${getBallColor(n)}`}>{n}</div>
                                ))}
                                <span className="plus">+</span>
                                <div className={`mini-ball ball-${getBallColor(lastRound.bonus)}`}>{lastRound.bonus}</div>
                            </div>
                            <div className="lr-footer">
                                <span className="winner-count">1등 당첨자: <strong>{lastRound.firstPrzwnerCo > 0 ? `${lastRound.firstPrzwnerCo}명` : '집계 중'}</strong></span>
                                <span className="prize-amt">당첨금: <strong>{lastRound.firstWinamnt > 0 ? `₩${new Intl.NumberFormat('ko-KR').format(lastRound.firstWinamnt)}` : '집계 중'}</strong></span>
                            </div>

                            {/* SEO & AD BOT DYNAMIC CONTENT: Weekly text summary rendered without clicks */}
                            <div className="seo-dynamic-report" style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.85rem', color: '#ccc', lineHeight: '1.6', textAlign: 'left' }}>
                                <strong style={{ color: '#fff', display: 'block', marginBottom: '8px' }}>📊 {lastRound.drwNo}회차 데이터 분석 브리핑</strong>
                                최근 진행된 {lastRound.drwNo}회 추첨의 당첨 번호는 <strong>{lastRound.numbers.join(', ')}</strong>, 보너스 번호는 <strong>{lastRound.bonus}</strong>입니다.
                                1등 당첨자는 <strong>{lastRound.firstPrzwnerCo > 0 ? lastRound.firstPrzwnerCo + '명' : '집계 중'}</strong>이고, 1인당 당첨금은 <strong>{lastRound.firstWinamnt > 0 ? new Intl.NumberFormat('ko-KR').format(lastRound.firstWinamnt) + '원' : '집계 중'}</strong>입니다.
                                로또 Z 대중성 모델로 이 당첨 조합을 평가하면 대중성 지수는 <strong>{popularityIndex(lastRound.numbers).toFixed(2)}배</strong>입니다. 1.00배보다 높으면 평균적인 조합보다 많은 사람이 고르는 번호 구성이라는 뜻입니다.
                                다음 {nextRound}회차도 모든 조합의 1등 확률은 똑같이 8,145,060분의 1입니다.
                            </div>
                        </div>
                    )}
                </section>

                {/* v3: honest engine card (replaces the 4-KILL banner and kill stats) */}
                <section className="fade-in" style={{ margin: '0 20px 20px', padding: '20px', background: 'rgba(0, 242, 96, 0.06)', border: '1px solid rgba(0, 242, 96, 0.25)', borderRadius: '16px' }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', color: '#00f260', textAlign: 'center' }}>🎯 로또 Z v3: 맞히는 척 대신, 덜 나눠 갖는 조합</h3>
                    <ul style={{ margin: 0, paddingLeft: '18px', color: '#ccc', fontSize: '0.88rem', lineHeight: '1.7' }}>
                        <li><strong style={{ color: '#fff' }}>당첨 확률은 못 올립니다.</strong> 모든 조합의 1등 확률은 똑같이 8,145,060분의 1입니다.</li>
                        <li><strong style={{ color: '#fff' }}>대신 당첨금을 덜 나누게 합니다.</strong> 1,227회 실제 1등 당첨자 수를 분석해, 사람들이 많이 고르는 구성(12 이하 번호, 겹치는 끝수)을 피한 조합을 만듭니다.</li>
                        <li><strong style={{ color: '#fff' }}>4-KILL은 폐지했습니다.</strong> 1,210회 백테스트에서 킬 번호 4개가 모두 빗나간 비율은 55.6%로, 아무 번호 4개를 고른 경우(55.2%)와 차이가 없었습니다.</li>
                    </ul>
                    <div style={{ marginTop: '15px', textAlign: 'center' }}>
                        <button onClick={() => navigate('/tools')} className="btn-predict-outline" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                            🧰 내 번호 백테스트 · 휠링 조합기
                        </button>
                    </div>
                </section>

                <PatternReport report={patternReport} filters={patternFilters} onToggle={togglePatternFilter} disabled={isAnalyzing} />

                <section className="prediction-stage">
                    {numbers.length > 0 ? (
                        <div className="active-prediction fade-in">
                            <div className="prediction-balls">
                                {numbers.map((num, i) => {
                                    return (
                                        <div key={i} className="ball-wrapper">
                                            <div className={`main-ball ball-${getBallColor(num)}`}>{num}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="prediction-placeholder">
                            <h2>READY?</h2>
                        </div>
                    )}

                    {predictionStatus.isOpen ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', justifyContent: 'center', width: '100%', maxWidth: '300px', margin: '0 auto' }}>
                            <button className="btn-predict-outline" onClick={() => generateNumbers()} disabled={isAnalyzing} style={{ flex: 1, padding: '15px' }}>
                                비인기 조합 생성
                            </button>
                        </div>
                    ) : (
                        <div style={{
                            margin: '20px auto',
                            padding: '20px',
                            background: 'rgba(255, 77, 77, 0.1)',
                            border: '1px solid rgba(255, 77, 77, 0.3)',
                            borderRadius: '12px',
                            textAlign: 'center',
                            maxWidth: '400px',
                            color: '#ff6b6b'
                        }}>
                            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem' }}>예측 시스템 일시 중지</h3>
                            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
                                {predictionStatus.message}
                            </p>
                        </div>
                    )}
                </section>

                <section className="analysis-card">
                    <div className="card-header">
                        <h3>📊 예측 분석 리포트</h3>
                    </div>

                    {numbers.length > 0 ? (
                        <ul className="analysis-list fade-in">
                            {analysis.map((text, i) => <li key={i}>{text}</li>)}
                        </ul>
                    ) : (
                        <div className="analysis-placeholder">
                            <p>번호를 예측하거나 기록을 선택하면 분석 결과가 표시됩니다.</p>
                        </div>
                    )}

                    <div className="weight-grid-section">
                        <h4>📋 최근 52주 번호별 출현 횟수 (참고용 사실 데이터)</h4>
                        <div className="weight-grid">
                            {allWeights.map((item) => (
                                <div key={item.num} className={`weight-box ball-${getBallColor(item.num)}`}>
                                    <span className="wb-num">{item.num}</span>
                                    <span className="wb-score">{item.score}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ADSENSE CONTENT ENRICHMENT: Detailed Guide Section */}
                <section className="guide-card" style={{ margin: '0 20px 20px', padding: '25px', background: '#1c1c1c', borderRadius: '16px', border: '1px solid #333', color: '#ddd', lineHeight: '1.6' }}>
                    <h2 style={{ color: '#ffd700', fontSize: '1.4rem', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                        💡 로또 Z는 이렇게 번호를 만듭니다
                    </h2>

                    <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '20px' }}>1. 무작위 후보 30개 중 가장 덜 붐비는 1개</h3>
                    <p style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '15px' }}>
                        버튼을 누르면 45개 번호에서 완전히 무작위로 6개짜리 후보 30개를 만듭니다. 역대 1등 번호와 똑같은 조합, 등차수열이나 모두 31 이하인 날짜형 조합처럼 사람들이 일부러 고르는 뻔한 패턴은 뺍니다. 남은 후보 중 대중성 지수가 가장 낮은 조합 하나를 보여 드립니다. 후보를 매번 새로 뽑기 때문에 이용자 모두가 같은 번호를 받게 되는 일도 없습니다.
                    </p>

                    <h3 style={{ color: '#00f260', fontSize: '1.1rem', marginTop: '20px' }}>2. 대중성 지수는 어떻게 계산하나요?</h3>
                    <p style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '15px' }}>
                        회차마다 실제 1등 당첨자 수를 판매량으로 계산한 기대 당첨자 수와 비교했습니다. 당첨 번호에 12 이하 숫자가 하나 늘 때마다 1등 당첨자는 평균 약 6% 많았고, 끝자리가 겹치는 번호가 하나 늘 때마다 약 4% 많았습니다. 생일이나 날짜로 번호를 고르는 사람이 많기 때문으로 보입니다. 대중성 지수 1.00배는 무작위 조합의 평균입니다. 0.80배라면 1등에 당첨됐을 때 나눠 가질 사람이 평균보다 약 20% 적다고 추정한다는 뜻입니다.
                    </p>

                    <div style={{ background: 'rgba(5, 117, 230, 0.1)', border: '1px solid rgba(5, 117, 230, 0.3)', padding: '15px', borderRadius: '8px', marginTop: '25px', fontSize: '0.85rem' }}>
                        * 로또 Z는 사용자의 당첨을 보장하지 않으며, 모든 예측 조합은 통계 기반의 확률적 결과물일 뿐 참고 용도로만 활용하시기 바랍니다.
                        로또는 즐거운 범위 안에서만 구매해 주세요. 로또 Z는 당첨 확률을 높여 준다고 말하지 않습니다. 🍀
                        <div style={{ marginTop: '15px', textAlign: 'center' }}>
                            <button onClick={() => navigate('/guide')} className="btn-predict-outline" style={{ padding: '8px 16px', fontSize: '0.9rem', backgroundColor: 'transparent' }}>
                                📖 로또 Z 엔진 상세 가이드 읽기
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            {/* Sidebar */}
            <aside className="history-floating-banner">
                <div className="history-panel">
                    <div className="auth-section">
                        {session ? (
                            <div style={{ padding: '20px', background: 'rgba(5, 117, 230, 0.1)', borderRadius: '12px', border: '1px solid rgba(5, 117, 230, 0.3)', textAlign: 'center' }}>
                                <h3 style={{ margin: '0 0 10px 0', color: '#fff' }}>
                                    👋 <span style={{ color: '#00f260' }}>{userProfile?.nickname || '사용자'}</span>님!
                                </h3>
                                <button onClick={handleLogout} style={{ padding: '8px 16px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                                    로그아웃
                                </button>
                                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                    <button
                                        onClick={() => navigate('/mypage')}
                                        style={{ background: 'transparent', border: 'none', color: '#0575e6', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        📂 내 예측 보기
                                    </button>
                                    <button
                                        onClick={() => navigate('/results')}
                                        style={{ background: 'transparent', border: 'none', color: '#ffd700', cursor: 'pointer', fontWeight: 'bold', marginLeft: '10px' }}
                                    >
                                        🏆 명예의 전당
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '20px', background: 'rgba(5, 117, 230, 0.1)', borderRadius: '12px', border: '1px solid rgba(5, 117, 230, 0.3)', textAlign: 'center' }}>
                                <Auth onLoginSuccess={refreshProfile} />
                            </div>
                        )}
                    </div>

                    <h3 className="panel-title">📜 Recent ({history.filter(h => h.round === nextRound).length})</h3>
                    <div className="history-list">
                        {history.filter(h => h.round === nextRound).length === 0 ? (
                            <div className="empty-state">이번 회차({nextRound}회) 예측이 없습니다.</div>
                        ) : (
                            history.filter(h => h.round === nextRound).map((item) => (
                                <div key={item.id} className={`history-item ${selectedId === item.id ? 'active' : ''} ${item.is_hidden ? 'hidden-item' : ''}`} onClick={() => loadHistoryItem(item)} style={item.is_hidden ? { borderLeft: '3px solid #b33939', background: 'rgba(50, 20, 20, 0.3)' } : {}}>
                                    <div className="history-header">
                                        <span className="history-round">
                                            {item.is_hidden && <span style={{ marginRight: '5px' }}>🕵️</span>}
                                            {item.round ? `${item.round}회차` : '예측'}
                                        </span>
                                        <span className="history-date">{item.date}</span>
                                    </div>
                                    <div className="history-numbers">
                                        {item.numbers.map((num, idx) => (
                                            <span key={idx} className={`ball ball-${Math.ceil(num / 10)} small`}>{num}</span>
                                        ))}
                                    </div>
                                    {item.is_challenge && <div style={{ fontSize: '0.7rem', color: '#ff4d4d', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>🔥 Challenge</div>}
                                    {item.is_hidden && <div style={{ fontSize: '0.7rem', color: '#ccc', marginTop: '4px' }}>{item.analysis?.strategy || 'Hidden'}</div>}
                                </div>
                            ))
                        )}
                    </div>
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', fontSize: '0.75rem', color: '#666' }}>
                        © 2026 Lotto Z. <br />
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <button onClick={() => navigate('/articles')} style={{ background: 'none', border: 'none', padding: 0, color: '#888', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.75rem' }}>📝 분석 칼럼</button>
                            <button onClick={() => navigate('/community')} style={{ background: 'none', border: 'none', padding: 0, color: '#888', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.75rem' }}>💬 게시판</button>
                            <button onClick={() => navigate('/patch-notes')} style={{ background: 'none', border: 'none', padding: 0, color: '#888', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.75rem' }}>📋 패치노트</button>
                            <button onClick={() => navigate('/guide')} style={{ background: 'none', border: 'none', padding: 0, color: '#888', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.75rem' }}>📘 이용가이드</button>
                            <button onClick={() => navigate('/inquiry')} style={{ background: 'none', border: 'none', padding: 0, color: '#888', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.75rem' }}>문의하기</button>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    )
}
