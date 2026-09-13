// Usage: node scripts/fit_popularity.mjs <dir containing smok95 all.json>
// Fits the popularity coefficients used in src/utils/LottoEngine.js
import fs from 'fs';
const all = JSON.parse(fs.readFileSync(process.argv[2] + '/all.json', 'utf8'));
const TOTAL = 8145060;
export function features(numbers) {
  const n = [...numbers].sort((a, b) => a - b);
  const diffs = n.slice(1).map((x, i) => x - n[i]);
  const dec = {}; n.forEach(x => { const d = Math.floor(x / 10); dec[d] = (dec[d] || 0) + 1; });
  return {
    low12: n.filter(x => x <= 12).length,
    mid13to31: n.filter(x => x >= 13 && x <= 31).length,
    consec: diffs.filter(d => d === 1).length,
    arith: diffs.filter((d, i) => i > 0 && d === diffs[i - 1]).length,
    decadeMax: Math.max(...Object.values(dec)),
    lastDigitDup: 6 - new Set(n.map(x => x % 10)).size,
  };
}
const names = Object.keys(features([1, 2, 3, 4, 5, 6]));
const rows = all.filter(r => r.total_sales_amount > 0 && Number.isFinite(r.divisions?.[0]?.winners)).map(r => {
  const e = r.total_sales_amount / 1000 / TOTAL, w = r.divisions[0].winners;
  return { x: [1, ...names.map(k => features(r.numbers)[k])], y: Math.log((w + 0.5) / (e + 0.5)), wt: Math.min(e, 20) };
});
const p = names.length + 1, XtX = Array.from({ length: p }, () => Array(p).fill(0)), Xty = Array(p).fill(0);
for (const r of rows) for (let i = 0; i < p; i++) { Xty[i] += r.wt * r.x[i] * r.y; for (let j = 0; j < p; j++) XtX[i][j] += r.wt * r.x[i] * r.x[j]; }
const inv = m => { const n = m.length, a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => +(i === j))]); for (let i = 0; i < n; i++) { let piv = i; for (let k = i + 1; k < n; k++) if (Math.abs(a[k][i]) > Math.abs(a[piv][i])) piv = k; [a[i], a[piv]] = [a[piv], a[i]]; const d = a[i][i]; for (let j = 0; j < 2 * n; j++) a[i][j] /= d; for (let k = 0; k < n; k++) if (k !== i) { const f = a[k][i]; for (let j = 0; j < 2 * n; j++) a[k][j] -= f * a[i][j]; } } return a.map(r => r.slice(n)); };
const XtXi = inv(XtX), beta = XtXi.map(r => r.reduce((s, v, j) => s + v * Xty[j], 0));
let rss = 0, sw = 0; for (const r of rows) { const yh = r.x.reduce((s, v, i) => s + v * beta[i], 0); rss += r.wt * (r.y - yh) ** 2; sw += r.wt; }
const sigma2 = rss / (rows.length - p);
console.log('n=', rows.length);
['intercept', ...names].forEach((k, i) => console.log(`${k.padEnd(12)} beta=${beta[i].toFixed(4)}  t=${(beta[i] / Math.sqrt(sigma2 * XtXi[i][i])).toFixed(2)}`));
// Random-ticket feature means (Monte Carlo), for centering
const mean = Object.fromEntries(names.map(k => [k, 0])); const N = 200000;
for (let s = 0; s < N; s++) { const pool = Array.from({ length: 45 }, (_, i) => i + 1); for (let i = 0; i < 6; i++) { const j = i + Math.floor(Math.random() * (45 - i)); [pool[i], pool[j]] = [pool[j], pool[i]]; } const f = features(pool.slice(0, 6)); for (const k of names) mean[k] += f[k] / N; }
console.log('random-ticket means', JSON.stringify(Object.fromEntries(Object.entries(mean).map(([k, v]) => [k, +v.toFixed(3)]))));
