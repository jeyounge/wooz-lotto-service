import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LottoPredictorV4 from '../utils/LottoPredictorV4' // Upgraded to V4
import { supabase } from '../supabaseClient' // Adjusted path
import Auth from '../components/Auth' // Adjusted path
import '../App.css'

export default function Home({ session, userProfile, pastDraws, handleLogout, refreshProfile }) {
  const navigate = useNavigate()
  
  // Game State
  const [numbers, setNumbers] = useState([])
  const [scores, setScores] = useState([])
  const [analysis, setAnalysis] = useState([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [allWeights, setAllWeights] = useState([])
  const [globalStats, setGlobalStats] = useState({ count: 0, totalPrize: 0, currentRoundCount: 0 })

  // Derived Data (Moved Up)
  const lastRound = useMemo(() => {
    if (!pastDraws || pastDraws.length === 0) return null;
    return pastDraws[0];
  }, [pastDraws]);
  
  const nextRound = useMemo(() => {
      return lastRound ? lastRound.drwNo + 1 : 1209;
  }, [lastRound]);

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


  // Predictor Instances
  const predictorV4Normal = useMemo(() => new LottoPredictorV4(pastDraws, { killCount: 3 }), [pastDraws]);
  const predictorV4Hard = useMemo(() => new LottoPredictorV4(pastDraws, { killCount: 5 }), [pastDraws]);

  // Current Predictor State (Default to Normal for Banner display initially)
  const [currentPredictor, setCurrentPredictor] = useState(predictorV4Normal);

  // Sync predictor when re-created (initially)
  useEffect(() => {
    setCurrentPredictor(predictorV4Normal);
  }, [predictorV4Normal]);

  // Load Weights (Use current predictor)
  useEffect(() => {
    setAllWeights(currentPredictor.getAllScores());
  }, [currentPredictor]);

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

  const generateNumbers = (isChallenge = false) => {
    setIsAnalyzing(true);
    
    // Select Predictor
    const targetPredictor = isChallenge ? predictorV4Hard : predictorV4Normal;
    setCurrentPredictor(targetPredictor);

    setTimeout(async () => {
      const result = targetPredictor.predict();
      const calculatedScores = targetPredictor.getScores(result.numbers);

      setNumbers(result.numbers);
      setScores(calculatedScores);
      
      // Add Challenge Tag to analysis if needed
      const analysisData = [...result.analysis];
      if (isChallenge) {
          analysisData.unshift(`💪 챌린지 모드 (5-KILL) 적용`);
      }

      setAnalysis(analysisData);
      
      const newRecord = {
        id: Date.now(), 
        date: new Date().toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        numbers: result.numbers,
        analysis: analysisData,
        scores: calculatedScores,
        round: nextRound,
        isChallenge // Save mode
      };

      setSelectedId(newRecord.id);
      
      // Update Grid (Optimistic UI)
      setHistory(prev => [newRecord, ...prev].slice(0, 10));

      // Save to DB (Logged in or Guest)
      try {
        const payload = {
            drw_no: nextRound,
            numbers: result.numbers,
            analysis: analysisData,
            is_challenge: isChallenge // Save Mode
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
    const currentScores = item.scores || predictorV4Normal.getScores(item.numbers);
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

    // --- Admin Hidden Prediction Logic ---
    const handleHiddenPredict = async () => {
        if (!session || session.user.email !== 'jeyounge@nate.com') return;
        setIsAnalyzing(true);

        try {
            // 1. Fetch ALL predictions for this round
            const { data: roundData, error } = await supabase
                .from('predictions')
                .select('numbers')
                .eq('drw_no', nextRound);
            
            if (error) throw error;

            // 2. Analyze Crowd Stats
            const counts = {};
            for (let i = 1; i <= 45; i++) counts[i] = 0;
            
            roundData.forEach(row => {
                row.numbers.forEach(num => counts[num]++);
            });

            const sortedNums = Object.keys(counts).map(n => parseInt(n)).sort((a,b) => counts[b] - counts[a]); // Descending
            const zeroPicked = Object.keys(counts).filter(n => counts[n] === 0).map(n => parseInt(n));
            const picked = Object.keys(counts).filter(n => counts[n] > 0).map(n => parseInt(n));
            
            // Game 1: Most Picked (Top 6)
            const game1 = sortedNums.slice(0, 6).sort((a,b) => a-b);
            
            // Game 2: Least Picked (Bottom 6 of those who were picked)
            // sortedNums includes zeros at the end, so we filter only picked ones first
            const sortedPicked = picked.sort((a,b) => counts[a] - counts[b]); // Ascending (Least first)
            const game2 = sortedPicked.slice(0, 6).sort((a,b) => a-b);

            // Game 3: Zero Picked (Avoid 5-KILL if possible)
            // Filter out 5-KILL numbers from zeroPicked
            const kills = currentPredictor.killList || [];
            let candidates3 = zeroPicked.filter(n => !kills.includes(n));
            
            // If not enough, fill with kills, then least picked
            if (candidates3.length < 6) {
                const needed = 6 - candidates3.length;
                // Try adding kills that were zero picked
                const killsZero = zeroPicked.filter(n => kills.includes(n));
                candidates3 = [...candidates3, ...killsZero].slice(0, 6);
                
                // If still not enough, add least picked
                if (candidates3.length < 6) {
                    const moreNeeded = 6 - candidates3.length;
                    const others = sortedPicked.filter(n => !candidates3.includes(n));
                    candidates3 = [...candidates3, ...others].slice(0, 6);
                }
            }
            // Shuffle and pick 6
            const game3 = candidates3.sort(() => 0.5 - Math.random()).slice(0, 6).sort((a,b) => a-b);

            // 3. Save 3 Games
            const hiddenPayloads = [
                { drw_no: nextRound, numbers: game1, analysis: ["🕵️ Strategy: Crowd Top 6 (다수결)"], is_hidden: true, user_id: session.user.id, is_challenge: false },
                { drw_no: nextRound, numbers: game2, analysis: ["🐸 Strategy: Crowd Bottom 6 (청개구리)"], is_hidden: true, user_id: session.user.id, is_challenge: false },
                { drw_no: nextRound, numbers: game3, analysis: ["👻 Strategy: Zero Pick (틈새시장)"], is_hidden: true, user_id: session.user.id, is_challenge: false }
            ];

            const { error: insertError } = await supabase.from('predictions').insert(hiddenPayloads);
            if (insertError) throw insertError;

            // Refresh
            fetchHistory();
            alert("🕵️ 히든 예측 3게임 생성 완료!");

        } catch (err) {
            console.error("Hidden predict error:", err);
            alert("Error generating hidden prediction");
        } finally {
            setIsAnalyzing(false);
        }
    };

  return (
    <div className="home-layout">
        <main className="main-board">
            <header className="main-header">
                <h1 className="glow-title">로또 Z 예측 시스템</h1>
                <div style={{ display:'flex', gap:'15px', justifyContent:'center', marginTop:'10px', color:'#aaa', fontSize:'0.85rem', flexWrap:'wrap' }}>
                   <span>🎯 전체: <strong style={{ color:'#ffd700' }}>{globalStats.count.toLocaleString()}</strong></span>
                   <span>🔥 <strong>{nextRound}회</strong>: <strong style={{ color:'#ff9f43' }}>{globalStats.currentRoundCount?.toLocaleString() || 0}</strong></span>
                   <span>💰 당첨금: <strong style={{ color:'#00f260' }}>{new Intl.NumberFormat('ko-KR').format(globalStats.totalPrize)}</strong></span>
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

            {/* KILL Strategy Banner - Dynamic based on currentPredictor state */}
            {currentPredictor.killList && currentPredictor.killList.length > 0 && (
                <section className="kill-banner fade-in" style={{ margin: '0 20px 20px', padding: '20px', background: currentPredictor.killCount > 3 ? 'rgba(255, 0, 0, 0.15)' : 'rgba(255, 0, 0, 0.08)', border: currentPredictor.killCount > 3 ? '1px solid #ff4d4d' : '1px solid rgba(255, 0, 0, 0.2)', borderRadius: '16px', textAlign: 'center' }}>
                    
                    {/* CORE 3-KILL */}
                    <div className="kill-section-core">
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#ff4d4d', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}>
                            {currentPredictor.killCount > 3 ? '⚔️ 기본 3-KILL (핵심)' : '☠️ 로또 Z 핵심 기법 [3-KILL]'}
                        </h3>
                        <div className="kill-list" style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {currentPredictor.killList.slice(0, 3).map(num => (
                                <div key={num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '120px' }}>
                                    <div className={`mini-ball`} style={{ width: '40px', height: '40px', lineHeight: '38px', fontSize: '1.1rem', background: '#2a2a2a', color: '#ff6b6b', textDecoration: 'line-through', border: '1px solid #ff4d4d' }}>{num}</div>
                                    <span style={{ fontSize: '0.75rem', color: '#ccc', marginTop: '6px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
                                        {currentPredictor.killReasons[num]?.split('(')[0] || '제외'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* EXTRA CHALLENGE KILL (Always Visible) */}
                    {/* Show candidates from active list if Challenge Mode, OR from exposed 'extraKillCandidates' if Normal Mode */}
                    {(currentPredictor.killList.length > 3 || (currentPredictor.extraKillCandidates && currentPredictor.extraKillCandidates.length > 0)) && (
                        <div className="kill-section-challenge" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px dashed rgba(255, 77, 77, 0.3)' }}>
                            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.0rem', color: currentPredictor.killCount > 3 ? '#ff9f43' : '#777', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}>
                                {currentPredictor.killCount > 3 ? '🔥 챌린지 추가 제외 (+2)' : '🔒 챌린지 추가 제외 후보 (+2)'}
                            </h3>
                            <div className="kill-list" style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                {currentPredictor.killCount > 3 
                                    ? // Active Challenge Mode: Show actual kills (slice 3 onwards)
                                      currentPredictor.killList.slice(3).map(num => (
                                        <div key={num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '120px' }}>
                                            <div className={`mini-ball`} style={{ width: '40px', height: '40px', lineHeight: '38px', fontSize: '1.1rem', background: '#4a1c1c', color: '#ff9f43', textDecoration: 'line-through', border: '1px solid #ff9f43' }}>{num}</div>
                                            <span style={{ fontSize: '0.75rem', color: '#ff9f43', marginTop: '6px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
                                                {currentPredictor.killReasons[num]?.split('(')[0].replace('🔥 ', '') || '추가 제외'}
                                            </span>
                                        </div>
                                      ))
                                    : // Normal Mode: Show Preview of Extra Candidates
                                      currentPredictor.extraKillCandidates && currentPredictor.extraKillCandidates.map(item => (
                                        <div key={item.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '120px', opacity: 0.6, filter: 'grayscale(0.8)' }}>
                                            <div className={`mini-ball`} style={{ width: '40px', height: '40px', lineHeight: '38px', fontSize: '1.1rem', background: '#333', color: '#aaa', border: '1px dashed #777' }}>{item.num}</div>
                                            <span style={{ fontSize: '0.75rem', color: '#777', marginTop: '6px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
                                                {item.reason?.split('(')[0].replace('🔥 ', '') || 'Challenge'}
                                            </span>
                                        </div>
                                      ))
                                }
                            </div>
                            {currentPredictor.killCount <= 3 && (
                                <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '10px' }}>* 챌린지 모드 실행 시 제거되는 번호들입니다.</p>
                            )}
                        </div>
                    )}

                    <p style={{ margin: '15px 0 0', fontSize: '0.8rem', color: '#888' }}>
                        * 위 번호들은 {currentPredictor.killCount > 3 ? '5-KILL' : '3-KILL'} 전략에 의해 이번 예측에서 <strong>100% 제외</strong>됩니다.
                    </p>
                </section>
            )}

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
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', justifyContent: 'center', width: '100%', maxWidth: '300px', margin: '0 auto' }}>
                    <button className="btn-predict-outline" onClick={() => generateNumbers(false)} disabled={isAnalyzing} style={{ flex: 1, padding: '15px' }}>
                        기본 예측 (3-KILL)
                    </button>
                    <button className="btn-predict-outline" onClick={() => generateNumbers(true)} disabled={isAnalyzing} style={{ flex: 1, borderColor: '#ff4d4d', color: '#ff4d4d', background: 'rgba(255,0,0,0.05)', padding: '15px' }}>
                        🔥 챌린지 (5-KILL)
                    </button>
                    {session && session.user.email === 'jeyounge@nate.com' && (
                        <button className="btn-predict-outline" onClick={handleHiddenPredict} disabled={isAnalyzing} style={{ flex: 1, borderColor: '#00f260', color: '#00f260', background: 'rgba(0,242,96,0.05)', padding: '15px' }}>
                            🕵️ 히든 예측 (관리자)
                        </button>
                    )}
                </div>
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
                                <button 
                                    onClick={() => navigate('/results')}
                                    style={{ background: 'transparent', border:'none', color:'#ffd700', cursor:'pointer', fontWeight:'bold', marginLeft: '10px' }}
                                >
                                    🏆 명예의 전당
                                </button>
                            </div>
                        </div>
                    ) : (
                        <Auth onLoginSuccess={refreshProfile} />
                    )}
                </div>

                <h3 className="panel-title">📜 Recent ({history.filter(h => h.round === nextRound).length})</h3>
                <div className="history-list">
                    {history.filter(h => h.round === nextRound).length === 0 ? (
                        <div className="empty-state">이번 회차({nextRound}회) 예측이 없습니다.</div>
                    ) : (
                        history.filter(h => h.round === nextRound).map((item) => (
                            <div key={item.id} className={`history-item ${selectedId === item.id ? 'active' : ''} ${item.is_hidden ? 'hidden-item' : ''}`} onClick={() => loadHistoryItem(item)} style={item.is_hidden ? {borderLeft: '3px solid #b33939', background: 'rgba(50, 20, 20, 0.3)'} : {}}>
                                <div className="history-header">
                                    <span className="history-round">
                                        {item.is_hidden && <span style={{marginRight:'5px'}}>🕵️</span>}
                                        {item.round ? `${item.round}회차` : '예측'}
                                    </span>
                                    <span className="history-date">{item.date}</span>
                                </div>
                                <div className="history-numbers">
                                    {item.numbers.map((num, idx) => (
                                        <span key={idx} className={`ball ball-${Math.ceil(num / 10)} small`}>{num}</span>
                                    ))}
                                </div>
                                {item.is_challenge && <div style={{ fontSize: '0.7rem', color: '#ff4d4d', marginTop: '4px', display:'flex', alignItems:'center', gap:'2px' }}>🔥 Challenge</div>}
                                {item.is_hidden && <div style={{ fontSize: '0.7rem', color: '#ccc', marginTop: '4px' }}>{item.analysis?.strategy || 'Hidden'}</div>}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </aside>
    </div>
  )
}
