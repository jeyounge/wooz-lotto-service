// LottoTools.js
// Honest utilities that do not pretend to predict draws:
//  - buildWheel: a covering design ("휠링") with a real mathematical guarantee
//  - backtest:   how a fixed ticket would have done over every past draw

export const TICKET_PRICE = 1000;
export const TOTAL_COMBOS = 8145060;
const FIXED_PRIZE = { 4: 50000, 5: 5000 };

// Probability that a single random ticket hits each rank in one draw.
export const RANK_PROBABILITY = {
    1: 1 / TOTAL_COMBOS,
    2: 6 / TOTAL_COMBOS,
    3: (6 * 38) / TOTAL_COMBOS,
    4: (15 * 741) / TOTAL_COMBOS,
    5: (20 * 9139) / TOTAL_COMBOS,
};

function combinations(arr, k) {
    const out = [];
    const combo = [];
    const rec = (start) => {
        if (combo.length === k) {
            out.push(combo.slice());
            return;
        }
        for (let i = start; i <= arr.length - (k - combo.length); i++) {
            combo.push(arr[i]);
            rec(i + 1);
            combo.pop();
        }
    };
    rec(0);
    return out;
}

/**
 * Greedy covering design.
 * Guarantee: if at least `guarantee` of the drawn main numbers are inside `pool`,
 * at least one returned ticket matches `guarantee` or more numbers
 * (3 => 5등 이상, 4 => 4등 이상).
 */
export function buildWheel(pool, guarantee = 3) {
    const nums = [...new Set(pool.map(Number))].filter(n => n >= 1 && n <= 45).sort((a, b) => a - b);
    if (nums.length < 7) throw new Error('휠링은 번호를 7개 이상 골라야 의미가 있습니다.');
    if (nums.length > 15) throw new Error('휠링은 최대 15개 번호까지 지원합니다.');
    if (guarantee !== 3 && guarantee !== 4) throw new Error('보장 조건은 3개 또는 4개만 지원합니다.');

    const subsetIds = new Map();
    combinations(nums, guarantee).forEach((s, i) => subsetIds.set(s.join(','), i));

    const candidates = combinations(nums, 6).map(t => ({
        numbers: t,
        subsets: combinations(t, guarantee).map(s => subsetIds.get(s.join(','))),
    }));

    const covered = new Uint8Array(subsetIds.size);
    let remaining = subsetIds.size;
    const tickets = [];

    while (remaining > 0) {
        let best = null;
        let bestGain = 0;
        for (const c of candidates) {
            let gain = 0;
            for (const s of c.subsets) if (!covered[s]) gain++;
            if (gain > bestGain) {
                bestGain = gain;
                best = c;
            }
        }
        tickets.push(best.numbers);
        for (const s of best.subsets) {
            if (!covered[s]) {
                covered[s] = 1;
                remaining--;
            }
        }
    }

    return {
        pool: nums,
        guarantee,
        tickets,
        fullWheelSize: candidates.length,
        cost: tickets.length * TICKET_PRICE,
    };
}

export function rankOf(numbers, draw) {
    const match = numbers.filter(n => draw.numbers.includes(n)).length;
    if (match === 6) return 1;
    if (match === 5 && numbers.includes(draw.bonus)) return 2;
    if (match === 5) return 3;
    if (match === 4) return 4;
    if (match === 3) return 5;
    return null;
}

/**
 * Replays one fixed ticket against every past draw.
 * 4등/5등 are fixed prizes; 1~3등 use the recorded prize when the data has it.
 */
export function backtest(numbers, history) {
    const draws = (history || []).filter(d => Array.isArray(d?.numbers) && d.numbers.length >= 6);
    const ranks = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const wins = [];
    let prize = 0;
    let unknownPrizeCount = 0;

    for (const d of draws) {
        const rank = rankOf(numbers, d);
        if (!rank) continue;
        ranks[rank]++;
        let amount = FIXED_PRIZE[rank] ?? (rank === 1 ? d.firstWinamnt : rank === 2 ? d.secondWinAmnt : d.thirdWinAmnt);
        if (amount > 0) prize += amount;
        else {
            amount = null;
            unknownPrizeCount++;
        }
        wins.push({ drwNo: d.drwNo, drwNoDate: d.drwNoDate, rank, amount });
    }

    wins.sort((a, b) => a.rank - b.rank || b.drwNo - a.drwNo);
    const expected = Object.fromEntries(
        Object.entries(RANK_PROBABILITY).map(([r, p]) => [r, p * draws.length])
    );

    return {
        draws: draws.length,
        ranks,
        expected,
        spend: draws.length * TICKET_PRICE,
        prize,
        unknownPrizeCount,
        wins,
    };
}
