// 이번 주 패턴 리포트 + 이용자가 켜는 패턴 필터
// Every number shown here is measured walk-forward in the browser from the draw history.

const pct = v => (v == null ? '-' : (v * 100).toFixed(1) + '%');

const VERDICT_STYLE = {
    '차이 없음': { color: '#aaa', background: 'rgba(255,255,255,0.08)' },
    '사례 부족': { color: '#ffd166', background: 'rgba(255,209,102,0.12)' },
    '재현 안 됨': { color: '#ff9f43', background: 'rgba(255,159,67,0.12)' },
    '재현됨': { color: '#00f260', background: 'rgba(0,242,96,0.12)' },
};

function Verdict({ value }) {
    const style = VERDICT_STYLE[value] || VERDICT_STYLE['차이 없음'];
    return (
        <span style={{ ...style, fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
            {value}
        </span>
    );
}

function Toggle({ checked, disabled, onChange, label }) {
    return (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: disabled ? '#555' : '#ddd', cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={!!checked} disabled={disabled} onChange={onChange} />
            {label}
        </label>
    );
}

const rowStyle = { padding: '12px 0', borderTop: '1px solid #2a2a2a' };
const smallBall = { display: 'inline-block', minWidth: '26px', padding: '2px 6px', margin: '2px', borderRadius: '999px', background: '#2a2a2a', color: '#fff', fontSize: '0.8rem', textAlign: 'center' };

export default function PatternReport({ report, filters, onToggle, disabled }) {
    if (!report) return null;
    const c = report.consecutive;
    const activeCount = Object.values(filters || {}).filter(Boolean).length;

    return (
        <section className="fade-in pattern-report" style={{ margin: '0 20px 20px', padding: '20px', background: '#1c1c1c', border: '1px solid #333', borderRadius: '16px', color: '#ddd' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: '#ffd700', textAlign: 'center' }}>
                📊 {report.nextRound}회 패턴 리포트
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: '0.78rem', color: '#888', textAlign: 'center', lineHeight: 1.5 }}>
                {report.fromRound}~{report.toRound}회를 매 회차 그 이전 데이터만으로 다시 계산한 실측 결과입니다.
                {' '}"재현됨"은 1~620회와 621회 이후 두 기간에서 모두 같은 방향의 뚜렷한 차이가 나왔다는 뜻입니다.
            </p>

            {/* Consecutive numbers */}
            <div style={rowStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ color: '#fff', fontSize: '0.92rem' }}>
                        직전 {c.lastRound}회 연속번호: {c.lastPairs.length ? c.lastPairs.map(p => p.join('-')).join(', ') : '없음'}
                    </strong>
                    <Verdict value={c.current.verdict} />
                </div>
                <div style={{ fontSize: '0.82rem', color: '#bbb', margin: '6px 0 8px', lineHeight: 1.6 }}>
                    직전 회차에 연속번호가 {c.lastPairs.length ? '있었던' : '없었던'} {c.current.cases}번 중 다음 회차에 연속번호가 나온 비율은
                    {' '}<strong style={{ color: '#fff' }}>{pct(c.current.rate)}</strong>입니다. 평소 비율은 {pct(c.baseline)}입니다.
                </div>
                <Toggle checked={filters.noConsecutive} disabled={disabled} onChange={() => onToggle('noConsecutive')} label="연속번호 없는 조합만 받기" />
            </div>

            {/* Number rules */}
            {report.numberRules.map(rule => {
                const hasTargets = rule.upcoming.length > 0;
                const showBalls = rule.upcoming.length <= 12;
                return (
                    <div key={rule.id} style={rowStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ color: '#fff', fontSize: '0.92rem' }}>{rule.label}</strong>
                            <Verdict value={rule.verdict} />
                        </div>
                        <div style={{ margin: '6px 0' }}>
                            {!hasTargets && <span style={{ fontSize: '0.8rem', color: '#666' }}>이번 회차 해당 번호 없음</span>}
                            {hasTargets && showBalls && rule.upcoming.map(x => (
                                <span key={x} style={smallBall} title={rule.id.startsWith('streak') ? `${rule.upcomingStreaks[x]}주 연속` : undefined}>
                                    {x}{rule.id.startsWith('streak') && rule.upcomingStreaks[x] >= 3 ? <small style={{ color: '#ff9f43' }}> ×{rule.upcomingStreaks[x]}</small> : null}
                                </span>
                            ))}
                            {hasTargets && !showBalls && <span style={{ fontSize: '0.8rem', color: '#aaa' }}>이번 회차 해당 번호 {rule.upcoming.length}개</span>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.8rem', color: '#bbb' }}>
                                다음 회차 출현율 <strong style={{ color: '#fff' }}>{pct(rule.rate)}</strong> · 기준 {pct(rule.baseline)} · 사례 {rule.cases.toLocaleString('ko-KR')}건
                            </span>
                            <Toggle checked={filters[rule.id]} disabled={disabled || !hasTargets} onChange={() => onToggle(rule.id)} label="이 번호들 빼기" />
                        </div>
                    </div>
                );
            })}

            <p style={{ margin: '12px 0 0', fontSize: '0.78rem', color: '#888', lineHeight: 1.6 }}>
                ⚖️ 필터를 켜도 조합 한 장의 1등 확률은 1/8,145,060으로 같습니다. 번호를 빼면 남은 번호 안에서 고를 뿐, 확률이 오르거나 내리지 않습니다.
                {activeCount > 0 && <strong style={{ color: '#ffd700' }}> 지금 필터 {activeCount}개가 켜져 있습니다.</strong>}
            </p>
        </section>
    );
}
