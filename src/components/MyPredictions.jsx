import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function MyPredictions({ session, pastDraws, onClose }) {
  const [loading, setLoading] = useState(true)
  const [predictions, setPredictions] = useState([])

  useEffect(() => {
    fetchPredictions()
  }, [])

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
      alert('데이터 로딩 실패: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Helper to check rank
  const checkWin = (prediction) => {
    const targetDraw = pastDraws.find(d => d.drwNo === prediction.drw_no)
    
    // Future Round (Not drawn yet)
    if (!targetDraw) return { status: 'pending', text: '추첨 대기', color: '#888' }

    // Check Matches
    const matchCount = prediction.numbers.filter(n => targetDraw.numbers.includes(n)).length
    const isBonus = prediction.numbers.includes(targetDraw.bonus)

    if (matchCount === 6) return { status: 'win', text: '1등 당첨!!!', color: '#ff0000', rank: 1 }
    if (matchCount === 5 && isBonus) return { status: 'win', text: '2등 당첨!!', color: '#ff4500', rank: 2 }
    if (matchCount === 5) return { status: 'win', text: '3등 당첨!', color: '#ffa500', rank: 3 }
    if (matchCount === 4) return { status: 'win', text: '4등 (5만원)', color: '#00f260', rank: 4 }
    if (matchCount === 3) return { status: 'win', text: '5등 (5천원)', color: '#0575e6', rank: 5 }
    
    return { status: 'lose', text: '낙첨', color: '#444' }
  }

  return (
    <div className="modal-overlay" style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)', zIndex: 1000,
        display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div className="modal-content" style={{
          background: '#18181b', width: '90%', maxWidth: '600px',
          maxHeight: '80vh', borderRadius: '16px', border: '1px solid #333',
          display: 'flex', flexDirection: 'column', padding: '20px',
          boxShadow: '0 0 30px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: '#ffd700' }}>📂 내 예측 보기</h2>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'#fff', fontSize:'1.5rem', cursor:'pointer' }}>&times;</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {loading ? <div style={{textAlign:'center', padding:'20px'}}>로딩 중...</div> : null}
            
            {!loading && predictions.length === 0 && (
                <div style={{textAlign:'center', color:'#666', padding:'40px'}}>
                    아직 저장된 예측 기록이 없습니다.
                </div>
            )}

            {predictions.map(pred => {
                const result = checkWin(pred)
                return (
                    <div key={pred.id} style={{
                        background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '15px',
                        display: 'flex', flexDirection: 'column', gap: '10px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.9rem', color: '#aaa' }}>
                                <b>{pred.drw_no}회차</b> ({new Date(pred.created_at).toLocaleDateString()})
                            </span>
                            <span style={{ 
                                fontWeight: 'bold', 
                                color: result.color,
                                border: `1px solid ${result.color}`,
                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem'
                            }}>
                                {result.text}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {pred.numbers.map(num => (
                                <span key={num} className={`micro-ball color-${Math.ceil(num/10)}`} 
                                      style={{ width:'28px', height:'28px', fontSize:'0.9rem' }}>
                                    {num}
                                </span>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
      </div>
    </div>
  )
}
