// ... (imports remain)
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import '../App.css'

export default function MyPage({ session, pastDraws, handleLogout }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [predictions, setPredictions] = useState([])
  const [selectedRound, setSelectedRound] = useState(null)
  const [activeDrawData, setActiveDrawData] = useState(null) // Full DB Row

  useEffect(() => {
    if (!session) {
        navigate('/');
        return;
    }
    fetchPredictions()
  }, [session])

  const fetchPredictions = async () => {
    try {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPredictions(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Unique Rounds
  const availableRounds = useMemo(() => {
      const rounds = new Set(predictions.map(p => p.drw_no));
      return Array.from(rounds).sort((a,b) => b-a);
  }, [predictions]);

  // Default Round
  useEffect(() => {
    if (availableRounds.length > 0 && !selectedRound) {
        setSelectedRound(availableRounds[0]);
    }
  }, [availableRounds, selectedRound]);

  // Fetch Full History Data when round changes
  useEffect(() => {
      if (!selectedRound) return;
      
      const fetchDetail = async () => {
          const { data, error } = await supabase
            .from('lotto_history')
            .select('*')
            .eq('drw_no', selectedRound)
            .eq('drw_no', selectedRound)
            .maybeSingle();
          
          if (data) setActiveDrawData(data);
          else setActiveDrawData(null);
      };
      
      fetchDetail();
  }, [selectedRound]);

  // Filtered Predictions
  const filteredPredictions = useMemo(() => {
      if (!selectedRound) return [];
      return predictions.filter(p => p.drw_no === parseInt(selectedRound));
  }, [predictions, selectedRound]);

  // Win Check Logic
  const checkWin = (prediction) => {
    if (!activeDrawData) return { status: 'pending', text: '추첨 대기', color: '#888', prize: 0 }

    const matchCount = prediction.numbers.filter(n => activeDrawData.numbers.includes(n)).length
    const isBonus = prediction.numbers.includes(activeDrawData.bonus)

    // Prize amounts from DB
    if (matchCount === 6) return { 
        status: 'win', text: '1등', color: '#ff0000', rank: 1, 
        prize: activeDrawData.first_win_amnt 
    }
    if (matchCount === 5 && isBonus) return { 
        status: 'win', text: '2등', color: '#ff4500', rank: 2, 
        prize: activeDrawData.second_win_amnt 
    }
    if (matchCount === 5) return { 
        status: 'win', text: '3등', color: '#ffa500', rank: 3, 
        prize: activeDrawData.third_win_amnt 
    }
    if (matchCount === 4) return { 
        status: 'win', text: '4등', color: '#00f260', rank: 4, 
        prize: activeDrawData.fourth_win_amnt 
    }
    if (matchCount === 3) return { 
        status: 'win', text: '5등', color: '#0575e6', rank: 5, 
        prize: activeDrawData.fifth_win_amnt 
    }
    
    return { status: 'lose', text: '낙첨', color: '#444', prize: 0, rank: null }
  }

  // Lazy Sync: Update DB if result is available but DB says 'pending'
  useEffect(() => {
      if (!activeDrawData || filteredPredictions.length === 0) return;

      const updates = [];
      filteredPredictions.forEach(p => {
          if (p.status !== 'pending' && p.status) return; // Already processed

          const result = checkWin(p);
          if (result.status !== 'pending') {
              updates.push({
                  id: p.id,
                  user_id: session.user.id, // RLS requirement usually
                  status: result.status,
                  rank: result.rank,
                  prize: result.prize
              });
          }
      });

      if (updates.length > 0) {
          console.log(`Syncing ${updates.length} results to DB...`);
          supabase.from('predictions').upsert(updates)
            .then(({ error }) => {
                if (!error) {
                    // Update local state to reflect 'done' (simple reload or local mutation)
                    setPredictions(prev => prev.map(p => {
                        const update = updates.find(u => u.id === p.id);
                        return update ? { ...p, ...update } : p;
                    }));
                } else {
                    console.error('Result Sync Error:', error);
                }
            });
      }
  }, [activeDrawData, filteredPredictions, session]);

  const getBallColor = (num) => {
     if (num <= 10) return 'yellow';
     if (num <= 20) return 'blue';
     if (num <= 30) return 'red';
     if (num <= 40) return 'gray';
     return 'green';
  }

  const formatMoney = (amount) => {
      if (!amount) return '0원';
      return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  }

  return (
    <div className="mypage-container" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
                <button onClick={() => navigate('/')} style={{ background:'transparent', border:'none', color:'#aaa', cursor:'pointer', marginBottom:'10px' }}>&larr; 돌아가기</button>
                <h1 style={{ margin: 0, color: '#ffd700' }}>📂 내 예측 보관함</h1>
            </div>
            
            <button onClick={handleLogout} style={{ padding:'8px 16px', background:'#333', color:'#fff', border:'1px solid #555', borderRadius:'6px' }}>로그아웃</button>
        </header>

        {/* Round Filter */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ color: '#aaa' }}>조회 회차:</span>
            <select 
                value={selectedRound || ''} 
                onChange={(e) => setSelectedRound(parseInt(e.target.value))}
                style={{ padding: '8px 16px', borderRadius: '6px', background: '#222', color:'#fff', border: '1px solid #444', fontSize: '1rem', fontWeight:'bold' }}
            >
                {availableRounds.length === 0 && <option>기록 없음</option>}
                {availableRounds.map(r => (
                    <option key={r} value={r}>{r}회차</option>
                ))}
            </select>
        </div>

        {/* Official Detailed Result Card */}
        {selectedRound && (
            <div style={{ 
                background: 'rgba(30, 30, 35, 0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}>
                <h3 style={{ margin: 0, color: '#f1f1f1', borderBottom:'1px solid #444', paddingBottom:'10px', width:'100%', textAlign:'center' }}>
                    <span style={{ color: '#ffd700' }}>{selectedRound}회</span> 당첨 결과
                    {activeDrawData && <span style={{ fontSize:'0.8rem', color:'#888', marginLeft:'10px' }}>({activeDrawData.drw_date})</span>}
                </h3>
                
                {activeDrawData ? (
                    <>
                        {/* Balls */}
                        <div className="lr-balls" style={{ justifyContent: 'center', margin: '10px 0' }}>
                            {activeDrawData.numbers.map((n) => (
                                <div key={n} className={`mini-ball ball-${getBallColor(n)}`}>{n}</div>
                            ))}
                            <span className="plus" style={{ color:'#666' }}>+</span>
                            <div className={`mini-ball ball-${getBallColor(activeDrawData.bonus)}`}>{activeDrawData.bonus}</div>
                        </div>

                        {/* Detailed Stats Table style */}
                        <div style={{ width:'100%', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', fontSize:'0.9rem', color:'#ccc' }}>
                            <div style={{ background:'rgba(255,255,255,0.03)', padding:'10px', borderRadius:'8px', textAlign:'center' }}>
                                <div style={{ fontSize:'0.8rem', color:'#888' }}>총 판매금액</div>
                                <div style={{ color:'#fff', fontWeight:'bold' }}>{formatMoney(activeDrawData.total_sell_amnt)}</div>
                            </div>
                            <div style={{ background:'rgba(255,255,255,0.03)', padding:'10px', borderRadius:'8px', textAlign:'center' }}>
                                <div style={{ fontSize:'0.8rem', color:'#888' }}>1등 당첨 ({activeDrawData.first_how})</div>
                                <div style={{ color:'#ffd700', fontWeight:'bold' }}>{activeDrawData.first_przwner_co}명 / {formatMoney(activeDrawData.first_win_amnt)}</div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ padding: '20px', color: '#888' }}>
                        ⏳ DB에서 데이터를 불러오는 중이거나 결과가 없습니다.
                    </div>
                )}
            </div>
        )}

        {/* Prediction List */}
        <div className="prediction-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loading && <div style={{ textAlign:'center', color:'#888' }}>Loading...</div>}
            
            {!loading && filteredPredictions.length === 0 && (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#555', border: '1px dashed #333', borderRadius: '12px' }}>
                    이 회차의 예측 기록이 없습니다.
                </div>
            )}

            {filteredPredictions.map(pred => {
                const result = checkWin(pred);
                return (
                    <div key={pred.id} style={{ 
                        background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid rgba(255,255,255,0.05)', 
                        borderRadius: '12px', 
                        padding: '1.2rem',
                        display: 'flex',
                        flexDirection: window.innerWidth > 600 ? 'row' : 'column',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <div style={{ flex: 1, width: '100%' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px', justifyContent: window.innerWidth > 600 ? 'flex-start' : 'center', flexWrap: 'wrap' }}>
                                <span style={{ color: '#aaa', fontSize: '0.9rem' }}>{new Date(pred.created_at).toLocaleString()}</span>
                                
                                {/* HIDDEN Badge */}
                                {pred.is_hidden && (
                                    <span style={{ 
                                        fontSize: '0.75rem', 
                                        background: 'rgba(50, 20, 20, 0.6)', 
                                        border: '1px solid #b33939', 
                                        color: '#ff6b6b', 
                                        padding: '2px 8px', 
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        {Array.isArray(pred.analysis) ? pred.analysis[0] : '🕵️ Hidden'}
                                    </span>
                                )}

                                {/* CHALLENGE Badge */}
                                {pred.is_challenge && (
                                    <span style={{ 
                                        fontSize: '0.75rem', 
                                        background: 'rgba(255, 0, 0, 0.1)', 
                                        border: '1px solid #ff4d4d', 
                                        color: '#ff4d4d', 
                                        padding: '2px 8px', 
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        🔥 5-KILL Challenge
                                    </span>
                                )}
                            </div>
                            
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                {pred.numbers.map(num => {
                                    const isMatch = activeDrawData && (activeDrawData.numbers.includes(num) || activeDrawData.bonus === num);
                                    const ballClass = isMatch ? `ball-${getBallColor(num)}` : 'ball-dark';
                                    
                                    return (
                                        <div key={num} className={`mini-ball ${ballClass}`} style={{ width:'36px', height:'36px', fontSize:'0.95rem' }}>
                                            {num}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Result Badge + Amount */}
                        <div style={{ 
                            minWidth: '100px', 
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px',
                            justifyContent: 'center'
                        }}>
                            <div style={{
                                color: result.color,
                                fontWeight: 'bold',
                                fontSize: '1.1rem'
                            }}>
                                {result.text}
                            </div>
                            
                            {result.status === 'win' && (
                                <div style={{ fontSize:'0.85rem', color:'#fff', fontWeight:'bold' }}>
                                    {formatMoney(result.prize)}
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
        
        {/* Debug / Test Section Removed or Kept small */}
        {/* ... */}
    </div>
  )
}
