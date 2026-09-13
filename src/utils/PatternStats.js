// PatternStats.js — "이번 주 패턴 리포트"
//
// For each popular lotto "pattern rule", measure what actually happened next, walk-forward:
// at every draw we look only at the draws before it. Results are compared with the
// baseline and re-checked separately on rounds 1~620 and 621~ so a lucky streak in
// one period does not look like a real effect.
//
// Reproduces scratch analysis from 2026-09-13 (e.g. 3주+ 연속 출현: 138 cases, 10.9%;
// 직전 연속쌍 있음 → 이번 연속쌍: 629 cases, 49.6% vs 51.6%). No rule was significant.

export const BASE_NUMBER_RATE = 6 / 45;
const START_INDEX = 21; // first evaluated draw (round 22) has 21 weeks of history, same as the original analysis
const HALF_SPLIT_DRW = 620;
const Z_CRIT = 1.96;

export const NUMBER_RULES = [
    { id: 'streak3', label: '3주 이상 연속 출현한 번호', test: s => s.streak >= 3 },
    { id: 'streak2', label: '2주 이상 연속 출현한 번호', test: s => s.streak >= 2 },
    { id: 'repeat', label: '직전 회차 당첨번호 (이월수)', test: s => s.streak >= 1 },
    { id: 'bonus', label: '직전 회차 보너스 번호', test: s => s.isLastBonus },
    { id: 'hot10', label: '최근 10주 3회 이상 나온 번호', test: s => s.count10 >= 3 },
    { id: 'cold20', label: '20주 이상 안 나온 번호', test: s => s.gap >= 20 },
];

export function consecutivePairs(numbers) {
    const n = [...numbers].sort((a, b) => a - b);
    const out = [];
    for (let i = 1; i < n.length; i++) if (n[i] === n[i - 1] + 1) out.push([n[i - 1], n[i]]);
    return out;
}

const zScore = (hits, cases, p) => (cases > 0 ? (hits / cases - p) / Math.sqrt((p * (1 - p)) / cases) : 0);
const counter = () => ({ all: [0, 0], a: [0, 0], b: [0, 0] });
const add = (c, half, hit) => {
    c.all[0]++; c[half][0]++;
    if (hit) { c.all[1]++; c[half][1]++; }
};

function summarize(c, base) {
    const [cases, hits] = c.all;
    const z = zScore(hits, cases, base.all);
    const zA = zScore(c.a[1], c.a[0], base.a);
    const zB = zScore(c.b[1], c.b[0], base.b);
    let verdict;
    if (cases < 30) verdict = '사례 부족';
    else if (Math.abs(z) < Z_CRIT) verdict = '차이 없음';
    else if (Math.abs(zA) >= Z_CRIT && Math.abs(zB) >= Z_CRIT && Math.sign(zA) === Math.sign(zB)) verdict = '재현됨';
    else verdict = '재현 안 됨';
    return {
        cases,
        hits,
        rate: cases ? hits / cases : null,
        baseline: base.all,
        z,
        zFirstHalf: zA,
        zSecondHalf: zB,
        verdict,
        significant: verdict === '재현됨',
    };
}

function stateFor(x, t, draws, streak, lastSeen) {
    let count10 = 0;
    for (let k = Math.max(0, t - 10); k < t; k++) if (draws[k].set.has(x)) count10++;
    return {
        streak: streak[x],
        isLastBonus: draws[t - 1].bonus === x,
        count10,
        gap: lastSeen[x] < 0 ? t : t - 1 - lastSeen[x],
    };
}

export function computePatternReport(history) {
    const draws = (history || [])
        .filter(r => Array.isArray(r?.numbers) && r.numbers.length === 6)
        .map(r => ({ drwNo: r.drwNo, numbers: [...r.numbers].sort((a, b) => a - b), bonus: r.bonus, set: new Set(r.numbers) }))
        .sort((a, b) => a.drwNo - b.drwNo);
    if (draws.length < START_INDEX + 30) return null;

    const numberCounters = Object.fromEntries(NUMBER_RULES.map(r => [r.id, counter()]));
    const afterPair = counter();
    const afterNoPair = counter();
    const anyPair = counter();
    const streak = Array(46).fill(0);
    const lastSeen = Array(46).fill(-1);

    for (let t = 0; t < draws.length; t++) {
        const d = draws[t];
        if (t >= START_INDEX) {
            const half = d.drwNo <= HALF_SPLIT_DRW ? 'a' : 'b';
            for (let x = 1; x <= 45; x++) {
                const s = stateFor(x, t, draws, streak, lastSeen);
                const hit = d.set.has(x);
                for (const rule of NUMBER_RULES) if (rule.test(s)) add(numberCounters[rule.id], half, hit);
            }
            const prevHadPair = consecutivePairs(draws[t - 1].numbers).length > 0;
            const hasPair = consecutivePairs(d.numbers).length > 0;
            add(prevHadPair ? afterPair : afterNoPair, half, hasPair);
            add(anyPair, half, hasPair);
        }
        for (let x = 1; x <= 45; x++) {
            if (d.set.has(x)) {
                streak[x]++;
                lastSeen[x] = t;
            } else {
                streak[x] = 0;
            }
        }
    }

    const numberBase = { all: BASE_NUMBER_RATE, a: BASE_NUMBER_RATE, b: BASE_NUMBER_RATE };
    const pairBase = {
        all: anyPair.all[1] / anyPair.all[0],
        a: anyPair.a[1] / anyPair.a[0],
        b: anyPair.b[1] / anyPair.b[0],
    };

    // The upcoming round: which rules apply right now
    const t = draws.length;
    const last = draws[t - 1];
    const upcomingState = Array.from({ length: 46 }, (_, x) => (x === 0 ? null : stateFor(x, t, draws, streak, lastSeen)));
    const lastPairs = consecutivePairs(last.numbers);

    return {
        fromRound: draws[START_INDEX].drwNo,
        toRound: last.drwNo,
        nextRound: last.drwNo + 1,
        numberRules: NUMBER_RULES.map(rule => ({
            id: rule.id,
            label: rule.label,
            ...summarize(numberCounters[rule.id], numberBase),
            upcoming: Array.from({ length: 45 }, (_, i) => i + 1).filter(x => rule.test(upcomingState[x])),
            upcomingStreaks: Object.fromEntries(
                Array.from({ length: 45 }, (_, i) => i + 1).filter(x => rule.test(upcomingState[x])).map(x => [x, upcomingState[x].streak])
            ),
        })),
        consecutive: {
            lastRound: last.drwNo,
            lastPairs,
            baseline: pairBase.all,
            afterPair: summarize(afterPair, pairBase),
            afterNoPair: summarize(afterNoPair, pairBase),
            current: summarize(lastPairs.length > 0 ? afterPair : afterNoPair, pairBase),
        },
    };
}
