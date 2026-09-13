// Usage: node scripts/analyze_patterns.mjs <dir containing smok95 all.json>
// Walk-forward test of 20 common pattern rules (streaks, consecutive pairs, sums, odd/even...).
// Result on rounds 22..1241: no rule significant, none replicated across both halves (v3.1.0).
import fs from 'fs';
const draws = JSON.parse(fs.readFileSync(process.argv[2] + '/all.json', 'utf8'))
  .map(r => ({ no: r.draw_no, nums: [...r.numbers].sort((a, b) => a - b), bonus: r.bonus_no }))
  .sort((a, b) => a.no - b.no);
const START = 21, HALF = 620;
const pairs = n => { let p = 0; for (let i = 1; i < 6; i++) if (n[i] === n[i - 1] + 1) p++; return p; };
const maxRun = n => { let r = 1, m = 1; for (let i = 1; i < 6; i++) { r = n[i] === n[i - 1] + 1 ? r + 1 : 1; m = Math.max(m, r); } return m; };
const sum = n => n.reduce((a, b) => a + b, 0);
const odd = n => n.filter(x => x % 2).length;
const digitDup = n => 6 - new Set(n.map(x => x % 10)).size;
const streak = (t, x) => { let s = 0; for (let k = t - 1; k >= 0 && draws[k].nums.includes(x); k--) s++; return s; };
const gap = (t, x) => { for (let k = t - 1; k >= 0; k--) if (draws[k].nums.includes(x)) return t - 1 - k; return t; };

// Number-level rules: condition on history, event = number appears in draw t
const numberRules = {
  '직전 회차 출현 (이월수)': (t, x) => draws[t - 1].nums.includes(x),
  '2주 연속 출현': (t, x) => streak(t, x) >= 2,
  '3주 이상 연속 출현': (t, x) => streak(t, x) >= 3,
  '4주 이상 연속 출현': (t, x) => streak(t, x) >= 4,
  '직전 보너스 번호': (t, x) => draws[t - 1].bonus === x,
  '직전 번호의 ±1 이웃수': (t, x) => !draws[t - 1].nums.includes(x) && (draws[t - 1].nums.includes(x - 1) || draws[t - 1].nums.includes(x + 1)),
  '직전 연속쌍에 속한 번호': (t, x) => { const n = draws[t - 1].nums; return n.includes(x) && (n.includes(x - 1) || n.includes(x + 1)); },
  '10주 이상 미출현': (t, x) => gap(t, x) >= 10,
  '20주 이상 미출현': (t, x) => gap(t, x) >= 20,
  '최근 10주 3회 이상 (핫)': (t, x) => draws.slice(t - 10, t).filter(d => d.nums.includes(x)).length >= 3,
  '최근 5주 0회': (t, x) => draws.slice(t - 5, t).every(d => !d.nums.includes(x)),
};
// Draw-level rules: condition on previous draw, event on draw t
const drawRules = {
  '직전 연속쌍 있음 → 이번 연속쌍 있음': [t => pairs(draws[t - 1].nums) > 0, t => pairs(draws[t].nums) > 0],
  '직전 연속쌍 없음 → 이번 연속쌍 있음': [t => pairs(draws[t - 1].nums) === 0, t => pairs(draws[t].nums) > 0],
  '직전 3연속 있음 → 이번 연속쌍 있음': [t => maxRun(draws[t - 1].nums) >= 3, t => pairs(draws[t].nums) > 0],
  '2주 연속 연속쌍 → 이번 연속쌍 있음': [t => pairs(draws[t - 1].nums) > 0 && pairs(draws[t - 2].nums) > 0, t => pairs(draws[t].nums) > 0],
  '직전 합계 160 이상 → 이번 합계 160 이상': [t => sum(draws[t - 1].nums) >= 160, t => sum(draws[t].nums) >= 160],
  '직전 합계 110 이하 → 이번 합계 110 이하': [t => sum(draws[t - 1].nums) <= 110, t => sum(draws[t].nums) <= 110],
  '직전 홀수 4개 이상 → 이번 홀수 4개 이상': [t => odd(draws[t - 1].nums) >= 4, t => odd(draws[t].nums) >= 4],
  '직전 끝수중복 2개 이상 → 이번 끝수중복 2개 이상': [t => digitDup(draws[t - 1].nums) >= 2, t => digitDup(draws[t].nums) >= 2],
  '직전 이월수 2개 이상 → 이번 이월수 1개 이상': [t => t >= 2 && draws[t - 1].nums.filter(x => draws[t - 2].nums.includes(x)).length >= 2, t => draws[t].nums.some(x => draws[t - 1].nums.includes(x))],
};

const z2 = (hit, n, p) => n ? (hit / n - p) / Math.sqrt(p * (1 - p) / n) : NaN;
const rows = [];
const evalRange = (lo, hi, fnCond, fnEvent, baseEvent) => {
  let n = 0, hit = 0, bn = 0, bh = 0;
  for (let t = lo; t < hi; t++) {
    const r = fnCond(t); if (r === null) continue;
    for (const [c, e] of r) { bn++; if (e) bh++; if (c) { n++; if (e) hit++; } }
  }
  return { n, hit, base: bh / bn };
};
const numberPairs = (rule) => t => { const out = []; for (let x = 1; x <= 45; x++) out.push([rule(t, x), draws[t].nums.includes(x)]); return out; };
const drawPairs = ([cond, ev]) => t => [[cond(t), ev(t)]];

const report = (name, gen, fixedBase) => {
  const all = evalRange(START, draws.length, gen), a = evalRange(START, HALF, gen), b = evalRange(HALF, draws.length, gen);
  const base = fixedBase ?? all.base;
  rows.push({
    rule: name, cases: all.n,
    rate: (all.hit / all.n * 100).toFixed(1) + '%', baseline: (base * 100).toFixed(1) + '%',
    diff: ((all.hit / all.n - base) * 100).toFixed(1) + 'p',
    z: +z2(all.hit, all.n, base).toFixed(2),
    z_first_half: +z2(a.hit, a.n, fixedBase ?? a.base).toFixed(2),
    z_second_half: +z2(b.hit, b.n, fixedBase ?? b.base).toFixed(2),
  });
};
for (const [k, f] of Object.entries(numberRules)) report(k, numberPairs(f), 6 / 45);
for (const [k, f] of Object.entries(drawRules)) report(k, drawPairs(f));
console.table(rows);
const tests = rows.length, bonf = 3.29 + 0.0; // ~ two-sided p<0.001
console.log(`tests=${tests}; Bonferroni two-sided 5% threshold |z| > ${(tests <= 20 ? 2.96 : 3.1)}`);
console.log('significant in BOTH halves (|z|>1.96 same sign):', rows.filter(r => Math.abs(r.z_first_half) > 1.96 && Math.abs(r.z_second_half) > 1.96 && Math.sign(r.z_first_half) === Math.sign(r.z_second_half)).map(r => r.rule));

// Independence check: repeats from previous draw vs hypergeometric
const C = (n, k) => { if (k < 0 || k > n) return 0; let x = 1; for (let i = 0; i < k; i++) x = x * (n - i) / (i + 1); return x; };
const obs = Array(7).fill(0); let N = 0;
for (let t = 1; t < draws.length; t++) { obs[draws[t].nums.filter(x => draws[t - 1].nums.includes(x)).length]++; N++; }
let chi = 0; const line = [];
for (let k = 0; k <= 6; k++) { const e = N * C(6, k) * C(39, 6 - k) / C(45, 6); if (e > 5) chi += (obs[k] - e) ** 2 / e; line.push(`${k}:${obs[k]}/${e.toFixed(0)}`); }
console.log('이월수 개수 분포 observed/expected', line.join('  '), ' chi2=', chi.toFixed(2), '(df≈3, 5% crit 7.81)');
const freq = Array(46).fill(0); draws.forEach(d => d.nums.forEach(x => freq[x]++));
const E = draws.length * 6 / 45; let chiF = 0; for (let x = 1; x <= 45; x++) chiF += (freq[x] - E) ** 2 / E;
console.log(`번호별 누적 빈도 균등성 chi2=${chiF.toFixed(1)} (df=44, 5% crit 60.5)  min=${Math.min(...freq.slice(1))} max=${Math.max(...freq.slice(1))} expected=${E.toFixed(0)}`);

// What fires for the upcoming round
const t = draws.length;
const fired = Object.entries(numberRules).map(([k, f]) => [k, Array.from({ length: 45 }, (_, i) => i + 1).filter(x => f(t, x))]);
console.log('\n1242회 적용 대상:'); fired.forEach(([k, xs]) => console.log(`  ${k}: ${xs.length > 12 ? xs.length + '개' : xs.join(', ')}`));
console.log('  직전 연속쌍:', pairs(draws[t - 1].nums), ' 직전 합계:', sum(draws[t - 1].nums), ' 직전 홀수:', odd(draws[t - 1].nums));
