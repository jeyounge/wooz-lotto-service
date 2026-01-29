import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LottoPredictor from '../utils/LottoPredictor' // Adjusted path
import { supabase } from '../supabaseClient' // Adjusted path
import Auth from '../components/Auth' // Adjusted path
import '../App.css'

export default function Home({ session, userProfile, pastDraws, handleLogout }) {
  const navigate = useNavigate()
  
  // Game State
  const [numbers, setNumbers] = useState([])
  const [scores, setScores] = useState([])
  const [analysis, setAnalysis] = useState([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [allWeights, setAllWeights] = useState([])
  const [globalStats, setGlobalStats] = useState({ count: 0, totalPrize: 0 })

  // Fetch Global Stats
  useEffect(() => {
      const fetchStats = async () => {
          // 1. Count
          const { count } = await supabase.from('predictions').select('*', { count: 'exact', head: true });
          
          // 2. Total Prize (via RPC)
          const { data: prize } = await supabase.rpc('get_total_prize');
          
          setGlobalStats({ 
              count: count || 0, 
              totalPrize: prize || 0 
          });
      };
      
      fetchStats();
      
      // Optional: Realtime subscription could go here
  }, []);
  
  // Local History State
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('predictionHistory'); 
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedId, setSelectedId] = useState(null); 

  // Derived Data
  const lastRound = useMemo(() => {
    if (!pastDraws || pastDraws.length === 0) return null;
    return pastDraws[0];
  }, [pastDraws]);
  
  const nextRound = useMemo(() => {
      return lastRound ? lastRound.drwNo + 1 : 1209;
  }, [lastRound]); 

  // Initialize Predictor
  const predictor = useMemo(() => {
    return new LottoPredictor(pastDraws);
  }, [pastDraws]);

  // Load Weights
  useEffect(() => {
    setAllWeights(predictor.getAllScores());
  }, [predictor]);

  // Sync Local History (Only for guests)
  useEffect(() => {
    if (!session) {
        localStorage.setItem('predictionHistory', JSON.stringify(history));
    }
  }, [history, session]);

  // Fetch DB History (For Logged In Users)
  useEffect(() => {
    if (!session) return;
    
    const fetchHistory = async () => {
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
                analysis: item.analysis || null // Load stored analysis
            }));
            setHistory(mapped);
        }
    };
    fetchHistory();
  }, [session]);

  const generateNumbers = () => {
    setIsAnalyzing(true);
    setTimeout(async () => {
      const result = predictor.predict();
      const calculatedScores = predictor.getScores(result.numbers);

      setNumbers(result.numbers);
      setScores(calculatedScores);
      setAnalysis(result.analysis);
      
      const newRecord = {
        id: Date.now(), 
        date: new Date().toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        numbers: result.numbers,
        analysis: result.analysis,
        scores: calculatedScores,
        round: nextRound
      };

      setSelectedId(newRecord.id);
      
      // Update Grid (Optimistic UI)
      setHistory(prev => [newRecord, ...prev].slice(0, 10));

      // Save to DB if logged in
      if (session && session.user) {
        try {
           const { error } = await supabase
            .from('predictions')
            .insert({
                user_id: session.user.id,
                drw_no: nextRound,
                numbers: result.numbers,
                analysis: result.analysis // Save Analysis
            });
           if (error) console.error('Error saving prediction:', error);
        } catch (err) {
            console.error('DB Insert Exception:', err);
        }
      }

      setIsAnalyzing(false);
    }, 800); 
  };

  const loadHistoryItem = (item) => {
    setNumbers(item.numbers);
    setSelectedId(item.id);

    // 1. Scores: DB doesn't store scores, so we always recalc if missing
    // (It's deterministic based on numbers, so safe to recalc)
    const currentScores = item.scores || predictor.getScores(item.numbers);
    setScores(currentScores);

    // 2. Analysis: MUST use DB version if available to preserve the "feeling"
    if (item.analysis && item.analysis.length > 0) {
        setAnalysis(item.analysis);
    } else {
        // Fallback: Re-generate simple analysis if missing
        const totalScore = currentScores.reduce((a,b) => a + b.score, 0);
        const reAnalysis = [
            `PC 추정: ${Math.round(totalScore/6)}점`,
            `재분석 완료 (${item.date})` 
        ];
        setAnalysis(reAnalysis);
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
                <h1 className="glow-title">우제로또 예측 시스템</h1>
                <div style={{ display:'flex', gap:'20px', justifyContent:'center', marginTop:'10px', color:'#888', fontSize:'0.9rem' }}>
                   <span>🎯 누적 예측: <strong style={{ color:'#ffd700' }}>{globalStats.count.toLocaleString()}</strong>건</span>
                   <span>💰 누적 당첨금: <strong style={{ color:'#00f260' }}>{new Intl.NumberFormat('ko-KR').format(globalStats.totalPrize)}</strong>원</span>
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
                            <span className="winner-count">1등 당첨자: <strong>{lastRound.firstPrzwnerCo}명</strong></span>
                            <span className="prize-amt">당첨금: <strong>₩{new Intl.NumberFormat('ko-KR').format(lastRound.firstWinamnt)}</strong></span>
                        </div>
                    </div>
                )}
            </section>

            <section className="prediction-stage">
                {numbers.length > 0 ? (
                    <div className="active-prediction fade-in">
                        <div className="prediction-balls">
                            {numbers.map((num, i) => {
                                const scoreObj = scores.find(s => s.num === num);
                                return (
                                    <div key={i} className="ball-wrapper">
                                        <div className={`main-ball ball-${getBallColor(num)}`}>{num}</div>
                                        <span className="ball-score">{scoreObj ? scoreObj.score : 0}점</span>
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
                
                <button className="btn-predict-outline" onClick={generateNumbers} disabled={isAnalyzing}>
                    {isAnalyzing ? '분석 중...' : '번호 예측하기'}
                </button>
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
                    <h4>📋 전체 번호별 가중치 점수 (Top 45)</h4>
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
                                    style={{ background: 'transparent', border:'none', color:'#0575e6', cursor:'pointer', fontWeight:'bold' }}
                                >
                                    📂 내 예측 보기
                                </button>
                            </div>
                        </div>
                    ) : (
                        <Auth />
                    )}
                </div>

                <h3 className="panel-title">📜 Recent ({history.length})</h3>
                <div className="history-list">
                    {history.length === 0 ? (
                        <div className="empty-state">No predictions yet.</div>
                    ) : (
                        history.map((item) => (
                            <div key={item.id} className={`history-item ${selectedId === item.id ? 'active' : ''}`} onClick={() => loadHistoryItem(item)}>
                                <div className="history-header">
                                    <span className="history-round">{item.round ? `${item.round}회차` : '예측'}</span>
                                    <span className="history-time">{item.date}</span>
                                </div>
                                <div className="history-numbers">
                                    {item.numbers.map(num => (
                                        <span key={num} className={`mini-ball color-${Math.ceil(num/10)}`}>{num}</span>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </aside>
    </div>
  )
}
