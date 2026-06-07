/**
 * verify_v5_new.mjs — V5.2 알고리즘 검증 스크립트
 * 실행: node verify_v5_new.mjs
 */
import { readFileSync } from 'fs';

const history = JSON.parse(readFileSync('./src/data/lottoHistory.json', 'utf8'));
const sorted = [...history].sort((a, b) => b.drwNo - a.drwNo);

function getKillListV52(hist) {
    const kills = new Set();
    const reasons = {};
    const MAX_KILLS = 2;
    const add = (n, r) => { if (kills.size < MAX_KILLS && !kills.has(n)) { kills.add(n); reasons[n] = r; } };

    // P_A: 2주 연속 출현
    if (hist.length >= 2) {
        const w0 = hist[0].numbers, w1 = hist[1].numbers;
        for (let n = 1; n <= 45; n++) if (w0.includes(n) && w1.includes(n)) add(n, 'P_A 2주연속');
    }
    // P_D: 직전 보너스
    if (kills.size < MAX_KILLS) {
        const b = hist[0]?.bonus;
        if (b && !kills.has(b)) add(b, 'P_D 직전보너스');
    }
    return { kills: Array.from(kills), reasons, count: kills.size };
}

// 1211회 기준 다음 회차 킬 목록 출력
const { kills, reasons, count } = getKillListV52(sorted);
const latestDrw = sorted[0];

console.log(`\n=== ${latestDrw.drwNo + 1}회차 예측용 V5.2 킬 목록 ===`);
console.log(`  (${latestDrw.drwNo}회 당첨: ${latestDrw.numbers.join(', ')} / 보너스: ${latestDrw.bonus} 기준)`);
console.log(`\n🛡️ 킬 번호 (${count}개):`);
if (kills.length === 0) {
    console.log('  없음 (이번 회차 킬 조건 미충족)');
} else {
    kills.forEach(k => console.log(`  ${k}번 — ${reasons[k]}`));
}

// 최근 10회차 백테스트
console.log('\n=== 최근 10회차 V5.2 성능 ===');
let ok = 0;
for (let i = 1; i <= 10; i++) {
    const hist = sorted.slice(i);
    const target = sorted[i - 1];
    const { kills: kList, reasons: r, count: cnt } = getKillListV52(hist);
    const hit = kList.filter(k => target.numbers.includes(k));
    const success = hit.length === 0;
    if (success) ok++;
    const killStr = kList.map(k => `${k}(${r[k]})`).join(', ') || '없음';
    const status = success ? '✅ 성공' : `❌ 실패(${hit.join(',')})`;
    console.log(`  ${target.drwNo}회 | [${killStr}] | 당첨: ${target.numbers.join(',')} | ${status}`);
}
console.log(`\n  최근 10회 성공률: ${ok}/10 (${ok * 10}%)`);
console.log('  300회차 기준 기대 성공률: ~78%');
