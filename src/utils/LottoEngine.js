// LottoEngine.js — 로또 Z v3 "비인기 조합" 엔진
//
// What it does NOT do: raise the chance of winning. Every combination is 1/8,145,060.
// What it does: among fully random candidates, pick the one other players are least
// likely to have chosen, so a win would be shared with fewer people.
//
// Why the old 4-KILL was removed: a walk-forward backtest over rounds 32..1241 showed
// all 4 killed numbers missed in 55.6% of rounds vs 55.2% for any random 4 numbers
// (z=0.29). None of the four rules differed from the 6/45 baseline (|z| < 1).

import { TOTAL_COMBOS } from './LottoTools.js';

// Fitted by scripts/fit_popularity.mjs.
// y = log((1등 당첨자 + 0.5) / (판매량 기준 기대 당첨자 + 0.5)), weighted least squares, n = 1,227 draws.
// Only the two clearly significant features are used: low12 (t=3.8) and lastDigitDup (t=2.6).
// v3.1: consec (t=-1.4), decadeMax (t=-1.7), arith and mid13to31 are set to 0. Those weak
// coefficients made 93% of recommendations contain consecutive numbers (real draws: 52%).
export const POPULARITY_MODEL = {
    coef: {
        low12: 0.0561,
        lastDigitDup: 0.0421,
        consec: 0,
        decadeMax: 0,
        arith: 0,
        mid13to31: 0,
    },
    randomMean: {
        low12: 1.598,
        mid13to31: 2.538,
        consec: 0.668,
        arith: 0.281,
        decadeMax: 2.501,
        lastDigitDup: 1.114,
    },
};

const ALL_NUMBERS = Array.from({ length: 45 }, (_, i) => i + 1);

export function comboFeatures(numbers) {
    const n = [...numbers].sort((a, b) => a - b);
    const diffs = n.slice(1).map((x, i) => x - n[i]);
    const decades = {};
    n.forEach(x => {
        const d = Math.floor(x / 10);
        decades[d] = (decades[d] || 0) + 1;
    });
    return {
        low12: n.filter(x => x <= 12).length,
        mid13to31: n.filter(x => x >= 13 && x <= 31).length,
        consec: diffs.filter(d => d === 1).length,
        arith: diffs.filter((d, i) => i > 0 && d === diffs[i - 1]).length,
        decadeMax: Math.max(...Object.values(decades)),
        lastDigitDup: 6 - new Set(n.map(x => x % 10)).size,
    };
}

// 1.00 = average random ticket. 0.80 = an estimated 20% fewer co-winners.
export function popularityIndex(numbers) {
    const f = comboFeatures(numbers);
    const { coef, randomMean } = POPULARITY_MODEL;
    let z = 0;
    for (const k of Object.keys(coef)) z += coef[k] * (f[k] - randomMean[k]);
    return Math.exp(z);
}

function longestRun(sorted) {
    let run = 1;
    let best = 1;
    for (let i = 1; i < sorted.length; i++) {
        run = sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
        best = Math.max(best, run);
    }
    return best;
}

// Patterns people deliberately play (and that a random ticket would almost never hit by design).
export function obviousPattern(numbers) {
    const n = [...numbers].sort((a, b) => a - b);
    const diffs = n.slice(1).map((x, i) => x - n[i]);
    if (diffs.every(d => d === diffs[0])) return '등차수열';
    for (let k = 2; k <= 9; k++) if (n.every(x => x % k === 0)) return `${k}의 배수만`;
    if (Math.floor(n[0] / 10) === Math.floor(n[5] / 10)) return '한 구간 몰림';
    if (n[5] <= 31) return '모두 31 이하(날짜 번호)';
    if (longestRun(n) >= 3) return '3개 이상 연속번호';
    return null;
}

function randomCombo(rng, pool) {
    const p = pool.slice();
    for (let i = 0; i < 6; i++) {
        const j = i + Math.floor(rng() * (p.length - i));
        [p[i], p[j]] = [p[j], p[i]];
    }
    return p.slice(0, 6).sort((a, b) => a - b);
}

export class LottoEngine {
    constructor(history) {
        this.history = (history || [])
            .filter(r => Array.isArray(r?.numbers) && r.numbers.length === 6)
            .sort((a, b) => b.drwNo - a.drwNo);
        this.pastWinning = new Set(this.history.map(r => [...r.numbers].sort((a, b) => a - b).join(',')));
    }

    /**
     * Draw `candidates` uniformly random tickets, drop obvious patterns and past winning
     * combinations, return the least popular. A small candidate count keeps results varied,
     * so users of this site do not all converge on the same "unpopular" tickets.
     *
     * Optional user filters (they never change the win probability of a single ticket):
     *   excludeNumbers  numbers that must not appear
     *   noConsecutive   reject any ticket with a consecutive pair
     *   filterLabels    human-readable names of the filters, echoed in the analysis
     */
    generate({ candidates = 30, rng = Math.random, excludeNumbers = [], noConsecutive = false, filterLabels = [] } = {}) {
        const excluded = new Set(excludeNumbers);
        const pool = ALL_NUMBERS.filter(x => !excluded.has(x));
        if (pool.length < 12) throw new Error('필터로 제외된 번호가 너무 많습니다. 필터를 줄여 주세요.');

        let best = null;
        let accepted = 0;
        for (let guard = 0; accepted < candidates && guard < candidates * 60; guard++) {
            const numbers = randomCombo(rng, pool);
            if (obviousPattern(numbers) || this.pastWinning.has(numbers.join(','))) continue;
            if (noConsecutive && comboFeatures(numbers).consec > 0) continue;
            accepted++;
            const popularity = popularityIndex(numbers);
            if (!best || popularity < best.popularity) best = { numbers, popularity };
        }
        if (!best) throw new Error('조건을 만족하는 조합을 찾지 못했습니다. 필터를 줄여 주세요.');
        return { ...best, analysis: this.analyze(best.numbers, filterLabels) };
    }

    analyze(numbers, filterLabels = []) {
        const n = [...numbers].sort((a, b) => a - b);
        const f = comboFeatures(n);
        const idx = popularityIndex(n);
        const lines = [
            `🎲 비인기 조합 엔진 v3 · 대중성 지수 ${idx.toFixed(2)}배`,
            idx < 1
                ? `📉 1등 당첨 시 나눠 가질 사람이 평균 조합보다 약 ${Math.round((1 - idx) * 100)}% 적을 것으로 추정`
                : `📈 평균 조합보다 약 ${Math.round((idx - 1) * 100)}% 많은 사람이 고르는 구성으로 추정`,
            `🔢 12 이하 번호 ${f.low12}개 (무작위 평균 1.6개) · 끝수 중복 ${f.lastDigitDup}개 (평균 1.1개)`,
            `🧮 합계 ${n.reduce((a, b) => a + b, 0)} · 연속쌍 ${f.consec}개`,
        ];
        if (filterLabels.length > 0) lines.push(`🧩 내가 켠 패턴 필터: ${filterLabels.join(', ')}`);
        lines.push(`⚖️ 당첨 확률은 어떤 조합이든 똑같이 1/${TOTAL_COMBOS.toLocaleString('ko-KR')}`);
        const pattern = obviousPattern(n);
        if (pattern) lines.push(`⚠️ 많은 사람이 일부러 고르는 패턴입니다: ${pattern}`);
        if (this.pastWinning.has(n.join(','))) lines.push('⚠️ 역대 1등 번호와 똑같은 조합입니다. 이런 조합은 따라 사는 사람이 많습니다.');
        return lines;
    }

    // Real counts, shown as plain facts (not as a prediction score).
    getFrequency(weeks = 52) {
        const counts = Object.fromEntries(ALL_NUMBERS.map(x => [x, 0]));
        this.history.slice(0, weeks).forEach(r => r.numbers.forEach(x => counts[x]++));
        return Object.entries(counts)
            .map(([num, score]) => ({ num: Number(num), score }))
            .sort((a, b) => b.score - a.score || a.num - b.num);
    }
}

export default LottoEngine;
