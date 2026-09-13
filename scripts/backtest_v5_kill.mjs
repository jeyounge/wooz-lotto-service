// Usage: node scripts/backtest_v5_kill.mjs <dir containing smok95 all.json>
// Walk-forward backtest that led to removing the 4-KILL feature (v3.0.0)
import fs from 'fs';
const SP = process.argv[2];
const all = JSON.parse(fs.readFileSync(SP + '/all.json', 'utf8'))
  .map(r => ({ drwNo: r.draw_no, numbers: r.numbers, bonus: r.bonus_no }))
  .sort((a, b) => b.drwNo - a.drwNo);

// Exact port of LottoPredictorV5._applyKillStrategyV5
function v5Kills(history) {
  const sorted = [...history].sort((a, b) => b.drwNo - a.drwNo);
  const kills = new Set(), reasons = {};
  const add = (n, r) => { if (kills.size < 4 && !kills.has(n)) { kills.add(n); reasons[n] = r; } };
  const cold = (n, w) => { for (let k = 0; k < w && k < sorted.length; k++) if (sorted[k].numbers.includes(n)) return false; return true; };
  if (sorted[0]?.bonus) add(sorted[0].bonus, '직전보너스');
  for (let n = 1; n <= 45 && kills.size < 4; n++) if (sorted[0].numbers.includes(n) && sorted[1].numbers.includes(n)) add(n, '2주연속');
  for (let n = 1; n <= 45 && kills.size < 4; n++) if (cold(n, 20)) add(n, '20주미출현');
  for (let n = 1; n <= 45 && kills.size < 4; n++) if (cold(n, 10)) add(n, '10주미출현');
  return { list: [...kills], reasons };
}

const target = all.find(r => r.drwNo === 1241);
const before = all.filter(r => r.drwNo < 1241);
const k = v5Kills(before);
console.log('== 1241 actual', target.numbers, '+', target.bonus);
console.log('V5 kills (complete history):', JSON.stringify(k.reasons), 'hits:', k.list.filter(n => target.numbers.includes(n)));
const gapped = before.filter(r => r.drwNo <= 1227 || r.drwNo >= 1236);
const kg = v5Kills(gapped);
console.log('V5 kills (site-like, 1228-1235 missing):', JSON.stringify(kg.reasons), 'hits:', kg.list.filter(n => target.numbers.includes(n)));
const t40 = all.find(r => r.drwNo === 1240), k40 = v5Kills(all.filter(r => r.drwNo < 1240));
console.log('== 1240 actual', t40.numbers, 'kills', JSON.stringify(k40.reasons), 'hits', k40.list.filter(n => t40.numbers.includes(n)));

// Walk-forward backtest
const START = 31;
const dist = [0, 0, 0, 0, 0], ruleHit = {}, ruleCnt = {};
let rounds = 0;
const chrono = [...all].reverse();
for (let i = START; i < chrono.length; i++) {
  const cur = chrono[i], hist = chrono.slice(0, i);
  const { list, reasons } = v5Kills(hist);
  const hits = list.filter(n => cur.numbers.includes(n)).length;
  dist[hits]++; rounds++;
  for (const n of list) { const r = reasons[n]; ruleCnt[r] = (ruleCnt[r] || 0) + 1; if (cur.numbers.includes(n)) ruleHit[r] = (ruleHit[r] || 0) + 1; }
}
const C = (n, r) => { let x = 1; for (let i = 0; i < r; i++) x = x * (n - i) / (i + 1); return x; };
const theo = [0, 1, 2, 3, 4].map(h => C(4, h) * C(41, 6 - h) / C(45, 6));
console.log(`\n== Walk-forward V5 4-kill, rounds ${START + 1}..1241 (n=${rounds})`);
console.log('hits | observed | theoretical-random');
dist.forEach((c, h) => console.log(`  ${h}  | ${(c / rounds * 100).toFixed(2)}% (${c}) | ${(theo[h] * 100).toFixed(2)}%`));
const z0 = (dist[0] / rounds - theo[0]) / Math.sqrt(theo[0] * (1 - theo[0]) / rounds);
console.log('all-4-survive z-score vs random:', z0.toFixed(2));
console.log('\nper-rule: number appears in main draw (random baseline 6/45 = 13.33%)');
for (const r of Object.keys(ruleCnt)) {
  const p = ruleHit[r] / ruleCnt[r], z = (p - 6 / 45) / Math.sqrt((6 / 45) * (39 / 45) / ruleCnt[r]);
  console.log(`  ${r}: ${(p * 100).toFixed(2)}% of ${ruleCnt[r]}  z=${z.toFixed(2)}`);
}
// last 52 rounds
let s52 = 0; const d52 = [0,0,0,0,0];
for (let i = chrono.length - 52; i < chrono.length; i++) { const { list } = v5Kills(chrono.slice(0, i)); const h = list.filter(n => chrono[i].numbers.includes(n)).length; d52[h]++; }
console.log('\nlast 52 rounds hit distribution:', d52.join(' / '));
