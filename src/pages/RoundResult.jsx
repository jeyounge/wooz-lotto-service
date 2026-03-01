import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import '../App.css'

export default function RoundResult({ pastDraws }) {
    const navigate = useNavigate();
    const [selectedRound, setSelectedRound] = useState(null);
    const [winners, setWinners] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ total: 0, win1: 0, win2: 0, win3: 0, win4: 0, win5: 0 });
    const [simStats, setSimStats] = useState(null); // Comparison Data

    // Initialize with latest round
    useEffect(() => {
        if (pastDraws && pastDraws.length > 0 && !selectedRound) {
            setSelectedRound(pastDraws[0].drwNo);
        }
    }, [pastDraws, selectedRound]);

    // Derived info for selected round
    const targetRoundInfo = useMemo(() => {
        if (!selectedRound || !pastDraws) return null;
        return pastDraws.find(d => d.drwNo === parseInt(selectedRound));
    }, [selectedRound, pastDraws]);

    // Fetch and Calculate Results Client-Side (Robust against DB update failure)
    useEffect(() => {
        if (!selectedRound || !targetRoundInfo) return;

        const fetchAndCalculate = async () => {
            setLoading(true);
            try {
                // Fetch ALL predictions for this round (regardless of status)
                // REMOVED 'profiles(nickname)' to avoid PGRST200 error (Missing FK)
                const { data: allPredictions, error } = await supabase
                    .from('predictions')
                    .select('*')
                    .eq('drw_no', selectedRound);

                if (error) throw error;

                // Manual Profile Fetch (Robust Join)
                const userIds = [...new Set(allPredictions.map(p => p.user_id).filter(id => id))];
                let profileMap = {};

                if (userIds.length > 0) {
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, nickname')
                        .in('id', userIds);

                    if (profiles) {
                        profiles.forEach(p => {
                            profileMap[p.id] = p.nickname;
                        });
                    }
                }

                // Client-side calculation logic
                const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
                const computedWinners = [];

                // Prize table (fallback to defaults if standard amounts missing)
                const prizes = {
                    1: targetRoundInfo.firstWinamnt || 0,
                    2: targetRoundInfo.secondWinamnt || 0,
                    3: targetRoundInfo.thirdWinamnt || 0,
                    4: targetRoundInfo.fourthWinamnt || 50000,
                    4: targetRoundInfo.fourthWinamnt || 50000,
                    5: targetRoundInfo.fifthWinamnt || 5000,
                    6: 0 // Achasang
                };

                const checkWin = (numbers, draw) => {
                    const matchCount = numbers.filter(n => draw.numbers.includes(n)).length;
                    const isBonus = numbers.includes(draw.bonus);
                    if (matchCount === 6) return 1;
                    if (matchCount === 5 && isBonus) return 2;
                    if (matchCount === 5) return 3;
                    if (matchCount === 4) return 4;
                    if (matchCount === 4) return 4;
                    if (matchCount === 3) return 5;
                    if (matchCount === 2) return 6; // Achasang (2 matches)
                    return null;
                };

                allPredictions.forEach(p => {
                    const rank = checkWin(p.numbers, targetRoundInfo);
                    if (rank) {
                        counts[rank]++;
                        // Create a winner object
                        computedWinners.push({
                            ...p,
                            profiles: { nickname: profileMap[p.user_id] || '익명' },
                            rank: rank,
                            prize: prizes[rank]
                        });
                    }
                });

                // Sort winners: Rank 1 -> 5, then by creation date
                computedWinners.sort((a, b) => {
                    if (a.rank !== b.rank) return a.rank - b.rank;
                    return new Date(a.created_at) - new Date(b.created_at);
                });

                // Update Stats
                const newStats = {
                    total: allPredictions.length,
                    r1: { count: counts[1], money: counts[1] * prizes[1] },
                    r2: { count: counts[2], money: counts[2] * prizes[2] },
                    r3: { count: counts[3], money: counts[3] * prizes[3] },
                    r4: { count: counts[4], money: counts[4] * prizes[4] },
                    r5: { count: counts[5], money: counts[5] * prizes[5] },
                    r6: { count: counts[6], money: 0 },
                };
                newStats.sum = {
                    count: counts[1] + counts[2] + counts[3] + counts[4] + counts[5],
                    money: newStats.r1.money + newStats.r2.money + newStats.r3.money + newStats.r4.money + newStats.r5.money
                };

                setStats(newStats);
                setWinners(computedWinners); // Show all winners, or slice for top list if needed

            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAndCalculate();
    }, [selectedRound, targetRoundInfo]);

    // Random Simulation Logic
    const runSimulation = () => {
        if (!stats.total || !targetRoundInfo) return;

        // Use same prize logic as main stats
        const prizes = {
            1: targetRoundInfo.firstWinamnt || 0,
            2: targetRoundInfo.secondWinamnt || 0,
            3: targetRoundInfo.thirdWinamnt || 0,
            4: targetRoundInfo.fourthWinamnt || 50000,
            5: targetRoundInfo.fifthWinamnt || 5000,
            6: 0
        };

        let simCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        let totalPrize = 0;

        for (let i = 0; i < stats.total; i++) {
            // Generate Random 6 unique numbers (1-45)
            const numbers = [];
            while (numbers.length < 6) {
                const n = Math.floor(Math.random() * 45) + 1;
                if (!numbers.includes(n)) numbers.push(n);
            }

            // Check Win
            const matchCount = numbers.filter(n => targetRoundInfo.numbers.includes(n)).length;
            const isBonus = numbers.includes(targetRoundInfo.bonus);

            let rank = null;
            if (matchCount === 6) rank = 1;
            else if (matchCount === 5 && isBonus) rank = 2;
            else if (matchCount === 5) rank = 3;
            else if (matchCount === 4) rank = 4;
            else if (matchCount === 3) rank = 5;
            else if (matchCount === 2) rank = 6;

            if (rank) {
                simCounts[rank]++;
                totalPrize += (prizes[rank] || 0);
            }
        }

        setSimStats({
            total: stats.total,
            counts: simCounts,
            totalPrize: totalPrize
        });
    };

    // Auto-run simulation when real stats allow
    useEffect(() => {
        if (stats.total > 0 && !simStats) {
            runSimulation();
        }
    }, [stats, simStats]);

    const getBallColor = (num) => {
        if (num <= 10) return 'yellow';
        if (num <= 20) return 'blue';
        if (num <= 30) return 'red';
        if (num <= 40) return 'gray';
        return 'green';
    }

    const formatMoney = (n) => new Intl.NumberFormat('ko-KR').format(n);

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        const pad = (num) => num.toString().padStart(2, '0');
        return `${d.getFullYear().toString().slice(-2)}년 ${pad(d.getMonth() + 1)}월 ${pad(d.getDate())}일 ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    // Helper to render stat row
    const StatRow = ({ label, count, money, color }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #333', fontSize: '1rem' }}>
            <span style={{ color: color || '#ccc', fontWeight: 'bold' }}>{label}</span>
            <span style={{ color: '#fff' }}>
                <span style={{ fontWeight: 'bold', marginRight: '10px' }}>{count}명</span>
                <span style={{ color: '#888' }}>/ {formatMoney(money)}원</span>
            </span>
        </div>
    );

    return (
        <div className="home-layout" style={{ minHeight: '100vh', padding: '20px' }}>
            <main className="main-board" style={{ margin: '0 auto', maxWidth: '600px' }}>
                <header style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>
                        ← 홈으로
                    </button>
                    <h2 className="glow-title" style={{ margin: 0, fontSize: '1.5rem' }}>🏆 명예의 전당</h2>
                    <div style={{ width: '60px' }}></div>
                </header>

                {/* Round Selector */}
                <section style={{ marginBottom: '20px', textAlign: 'center' }}>
                    <select
                        value={selectedRound || ''}
                        onChange={(e) => setSelectedRound(parseInt(e.target.value))}
                        style={{
                            padding: '10px 20px',
                            fontSize: '1.2rem',
                            background: '#333',
                            color: '#fff',
                            border: '1px solid #555',
                            borderRadius: '8px',
                            fontWeight: 'bold'
                        }}
                    >
                        {pastDraws && pastDraws.map(d => (
                            <option key={d.drwNo} value={d.drwNo}>{d.drwNo}회차 ({d.drwNoDate})</option>
                        ))}
                    </select>
                </section>

                {/* Winning Numbers */}
                {targetRoundInfo && (
                    <section className="info-card fade-in" style={{ padding: '15px' }}>
                        <div className="lr-balls" style={{ justifyContent: 'center' }}>
                            {targetRoundInfo.numbers.map((n) => (
                                <div key={n} className={`mini-ball ball-${getBallColor(n)}`}>{n}</div>
                            ))}
                            <span className="plus">+</span>
                            <div className={`mini-ball ball-${getBallColor(targetRoundInfo.bonus)}`}>{targetRoundInfo.bonus}</div>
                        </div>
                    </section>
                )}

                {/* Detailed Stats Card */}
                <section className="info-card fade-in" style={{ padding: '20px', background: '#222', border: '1px solid #444' }}>
                    <div style={{ textAlign: 'center', marginBottom: '15px', fontSize: '1.1rem', color: '#aaa' }}>
                        총 예측 참여 <strong style={{ color: '#fff', fontSize: '1.3rem' }}>{stats.total.toLocaleString()}</strong>건
                    </div>

                    <div style={{ borderTop: '2px solid #555' }}>
                        <StatRow label="1등" count={stats.r1?.count || 0} money={stats.r1?.money || 0} color="#ffd700" />
                        <StatRow label="2등" count={stats.r2?.count || 0} money={stats.r2?.money || 0} color="#c0c0c0" />
                        <StatRow label="3등" count={stats.r3?.count || 0} money={stats.r3?.money || 0} color="#cd7f32" />
                        <StatRow label="4등" count={stats.r4?.count || 0} money={stats.r4?.money || 0} />
                        <StatRow label="5등" count={stats.r5?.count || 0} money={stats.r5?.money || 0} />
                        <StatRow label="😅 아차상 (2개)" count={stats.r6?.count || 0} money={0} color="#888" />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0 0', marginTop: '5px', borderTop: '2px solid #fff', fontSize: '1.1rem' }}>
                        <span style={{ fontWeight: 'bold', color: '#00f260' }}>총 당첨</span>
                        <span>
                            <strong style={{ marginRight: '10px' }}>{stats.sum?.count || 0}명</strong>
                            <span>/ {formatMoney(stats.sum?.money || 0)}원</span>
                        </span>
                    </div>
                </section>

                {/* VS Comparison Card */}
                {simStats && (
                    <section className="info-card fade-in" style={{ padding: '20px', background: 'linear-gradient(135deg, #1e1e23 0%, #2a2a30 100%)', border: '1px solid #444', marginBottom: '20px' }}>
                        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: '#fff' }}>🛡️ AI 예측성과 vs 완전랜덤</h3>
                            <p style={{ margin: '5px 0 0', fontSize: '0.9rem', color: '#888' }}>
                                동일한 횟수({stats.total}회)로 시뮬레이션 돌린 결과입니다.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            {/* Left: AI */}
                            <div style={{ background: 'rgba(0, 242, 96, 0.1)', padding: '15px', borderRadius: '10px', textAlign: 'center', border: '1px solid #00f260' }}>
                                <div style={{ color: '#00f260', fontWeight: 'bold', marginBottom: '5px' }}>로또 Z</div>
                                <div style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 'bold', marginBottom: '5px' }}>
                                    {stats.sum?.count || 0}건 당첨
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '5px' }}>
                                    (아차상 {stats.r6?.count || 0}건)
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                                    {formatMoney(stats.sum?.money || 0)}원
                                </div>
                            </div>

                            {/* Right: Random */}
                            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '15px', borderRadius: '10px', textAlign: 'center', border: '1px solid #555' }}>
                                <div style={{ color: '#aaa', fontWeight: 'bold', marginBottom: '5px' }}>완전 랜덤</div>
                                <div style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 'bold', marginBottom: '5px' }}>
                                    {(simStats.counts[1] + simStats.counts[2] + simStats.counts[3] + simStats.counts[4] + simStats.counts[5])}건 당첨
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '5px' }}>
                                    (아차상 {simStats.counts[6]}건)
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                                    {formatMoney(simStats.totalPrize)}원
                                </div>
                            </div>
                        </div>

                        {/* Result Message */}
                        <div style={{ textAlign: 'center', marginTop: '15px', fontWeight: 'bold' }}>
                            {stats.sum.money > simStats.totalPrize ? (
                                <span style={{ color: '#00f260' }}>AI의 승리입니다! 🤖👍 전략이 통했네요!</span>
                            ) : stats.sum.money < simStats.totalPrize ? (
                                <span style={{ color: '#ff4500' }}>이번엔 운이 더 좋았네요... 😅 (랜덤 승)</span>
                            ) : (
                                <span style={{ color: '#ccc' }}>무승부! 막상막하네요. 🤝</span>
                            )}
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '15px' }}>
                            <button onClick={runSimulation} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                🔄 랜덤 다시 돌리기
                            </button>
                        </div>
                    </section>
                )}

                {/* Winners List */}
                <section className="winners-list">
                    <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '15px', color: '#ccc' }}>🏅 당첨자 리스트</h3>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>로딩 중...</div>
                    ) : winners.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', background: '#222', borderRadius: '10px', color: '#666' }}>
                            아쉽게도 상위 당첨자가 없습니다. <br />(4등/5등은 제외)
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {winners.filter(w => w.rank < 6).map(w => (
                                <div key={w.id} className="winner-card fade-in" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '15px',
                                    background: '#2a2a2a',
                                    borderRadius: '10px',
                                    borderLeft: `5px solid ${w.rank === 1 ? '#ffd700' : w.rank === 2 ? '#c0c0c0' : w.rank === 3 ? '#cd7f32' : '#555'}`
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#fff' }}>
                                            {w.rank}등 당첨! <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'normal' }}>({w.profiles?.nickname || '익명'})</span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                                            {formatDate(w.created_at)}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: '#00f260', fontWeight: 'bold' }}>+{formatMoney(w.prize)}원</div>
                                        <div className="mini-balls-row" style={{ marginTop: '8px', display: 'flex', gap: '4px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                            {w.numbers.map(n => {
                                                const isMatch = targetRoundInfo.numbers.includes(n) || (targetRoundInfo.bonus === n && w.rank === 2);
                                                return (
                                                    <div key={n}
                                                        className={`mini-ball ${isMatch ? 'ball-' + getBallColor(n) : ''}`}
                                                        style={{
                                                            width: '22px', height: '22px', fontSize: '0.75rem', lineHeight: '22px',
                                                            ...(isMatch ? {} : { background: 'transparent', color: '#666', border: '1px solid #444' })
                                                        }}
                                                    >
                                                        {n}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

            </main>
        </div>
    )
}
