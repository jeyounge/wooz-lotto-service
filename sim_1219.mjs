import fs from 'fs';

// ─────────────────────────────────────────
// 1219회차 실제 당첨번호
// ─────────────────────────────────────────
const DRAW_1219 = {
  numbers: [1, 2, 15, 28, 39, 45],
  bonus: 31
};

// ─────────────────────────────────────────
// 히스토리 로드 (1218회차까지 → "저번주" 가정)
// ─────────────────────────────────────────
const allHistory = JSON.parse(fs.readFileSync('./src/data/lottoHistory.json', 'utf8'));
// 1219회 미포함 (저번주 기준)
const history = allHistory.filter(r => r.drwNo <= 1218).sort((a, b) => b.drwNo - a.drwNo);
const latestDrwNo = history[0].drwNo;
console.log(`\n📅 시뮬레이션 기준: ${latestDrwNo}회차까지 데이터 사용 (1219회차 예측 가정)`);
console.log(`🎯 실제 1219회차 당첨번호: [${DRAW_1219.numbers.join(', ')}] + 보너스 ${DRAW_1219.bonus}\n`);

// ─────────────────────────────────────────
// V5 킬 전략 구현 (LottoPredictorV5 동일 로직)
// ─────────────────────────────────────────
function countInLast(sorted, num, n) {
  let c = 0;
  for (let k = 0; k < n && k < sorted.length; k++) {
    if (sorted[k].numbers.includes(num)) c++;
  }
  return c;
}

function isColdFor(sorted, num, weeks) {
  for (let k = 0; k < weeks && k < sorted.length; k++) {
    if (sorted[k].numbers.includes(num)) return false;
  }
  return true;
}

function isHot(sorted, num) {
  return countInLast(sorted, num, 10) >= 3;
}

function buildKillList(sorted, killCount) {
  const kills = new Set();
  const addKill = (n, reason) => {
    if (kills.size >= killCount || kills.has(n)) return;
    kills.add(n);
  };

  // P1. 10주 중 6회 이상 (92.5%)
  for (let n = 1; n <= 45; n++) {
    if (kills.size >= killCount) break;
    if (countInLast(sorted, n, 10) >= 6) addKill(n);
  }

  // P2. 3주 연속 (90.9%)
  if (kills.size < killCount && sorted.length >= 3) {
    const r0 = sorted[0].numbers, r1 = sorted[1].numbers, r2 = sorted[2].numbers;
    for (let n = 1; n <= 45; n++) {
      if (kills.size >= killCount) break;
      if (r0.includes(n) && r1.includes(n) && r2.includes(n)) addKill(n);
    }
  }

  // P3. 직전 보너스 (86.1%)
  if (kills.size < killCount) {
    const b = sorted[0]?.bonus;
    if (b && !kills.has(b)) addKill(b);
  }

  // P4. 5주 중 4회 이상 (88.0%)
  if (kills.size < killCount) {
    for (let n = 1; n <= 45; n++) {
      if (kills.size >= killCount) break;
      if (countInLast(sorted, n, 5) >= 4) addKill(n);
    }
  }

  // P5. ±1 인접 2주 연속 포위 (87.2%)
  if (kills.size < killCount) {
    const w0 = sorted[0]?.numbers || [], w1 = sorted[1]?.numbers || [];
    for (let n = 1; n <= 45; n++) {
      if (kills.size >= killCount || kills.has(n)) continue;
      if (isHot(sorted, n)) continue;
      const nbr1 = n - 1, nbr2 = n + 1;
      const nbrHit0 = (nbr1 >= 1 && w0.includes(nbr1)) || (nbr2 <= 45 && w0.includes(nbr2));
      const nbrHit1 = (nbr1 >= 1 && w1.includes(nbr1)) || (nbr2 <= 45 && w1.includes(nbr2));
      const selfAbsent = !w0.includes(n) && !w1.includes(n);
      if (nbrHit0 && nbrHit1 && selfAbsent) addKill(n);
    }
  }

  // P6. 2주 연속 (86.3%)
  if (kills.size < killCount) {
    const r0 = sorted[0]?.numbers || [], r1 = sorted[1]?.numbers || [];
    for (let n = 1; n <= 45; n++) {
      if (kills.size >= killCount || kills.has(n)) continue;
      if (r0.includes(n) && r1.includes(n)) addKill(n);
    }
  }

  // P7. 끝자리 포화 최약체 (86.5%)
  if (kills.size < killCount) {
    const digitCounts = {}, numInDigit = {};
    sorted.slice(0, 5).forEach(r => {
      r.numbers.forEach(n => {
        const d = n % 10;
        digitCounts[d] = (digitCounts[d] || 0) + 1;
        numInDigit[n] = (numInDigit[n] || 0) + 1;
      });
    });
    const saturatedDigits = Object.entries(digitCounts)
      .filter(([, c]) => c >= 4)
      .sort((a, b) => b[1] - a[1])
      .map(([d]) => parseInt(d));
    for (const digit of saturatedDigits) {
      if (kills.size >= killCount) break;
      const candidates = [];
      for (let n = 1; n <= 45; n++) {
        if (n % 10 === digit && !kills.has(n) && !isHot(sorted, n)) candidates.push(n);
      }
      candidates.sort((a, b) => (numInDigit[a] || 0) - (numInDigit[b] || 0));
      if (candidates[0]) addKill(candidates[0]);
    }
  }

  // P8. 10주+ 콜드 (86.7%)
  if (kills.size < killCount) {
    const coldNums = [];
    for (let n = 1; n <= 45; n++) {
      if (kills.has(n) || isHot(sorted, n)) continue;
      if (isColdFor(sorted, n, 10)) {
        const lastSeen = countInLast(sorted, n, 30);
        coldNums.push({ n, lastSeen });
      }
    }
    coldNums.sort((a, b) => a.lastSeen - b.lastSeen);
    for (const { n } of coldNums) {
      if (kills.size >= killCount) break;
      addKill(n);
    }
  }

  // P9. 10주 중 5회 이상 (86.1%)
  if (kills.size < killCount) {
    for (let n = 1; n <= 45; n++) {
      if (kills.size >= killCount || kills.has(n)) continue;
      if (countInLast(sorted, n, 10) >= 5) addKill(n);
    }
  }

  return kills;
}

// ─────────────────────────────────────────
// 스코어링 (V2 기반)
// ─────────────────────────────────────────
function buildScores(sorted, killSet) {
  const scores = {};
  for (let i = 1; i <= 45; i++) scores[i] = 40;

  // 최근 5주 가중치
  sorted.slice(0, 5).forEach(r => r.numbers.forEach(n => { scores[n] = (scores[n] || 40) + 40; }));
  // 최근 10주
  sorted.slice(0, 10).forEach(r => r.numbers.forEach(n => { scores[n] = (scores[n] || 40) + 10; }));
  // 최근 30주
  sorted.slice(0, 30).forEach(r => r.numbers.forEach(n => { scores[n] = (scores[n] || 40) + 20; }));

  // Cold Boost
  const recent15 = new Set();
  sorted.slice(0, 15).forEach(r => r.numbers.forEach(n => recent15.add(n)));
  for (let i = 1; i <= 45; i++) {
    if (!recent15.has(i)) scores[i] += 15;
  }

  // Kill → -9999
  killSet.forEach(k => { scores[k] = -9999; });

  return scores;
}

function pickNumber(scores, excluded, currentSelection) {
  const pool = [];
  let totalWeight = 0;
  for (let i = 1; i <= 45; i++) {
    if (!currentSelection.includes(i) && !excluded.has(i)) {
      const w = scores[i] + (Math.random() * 10);
      if (w > 0) { pool.push({ num: i, weight: w }); totalWeight += w; }
    }
  }
  let r = Math.random() * totalWeight;
  for (const item of pool) { r -= item.weight; if (r <= 0) return item.num; }
  return pool[pool.length - 1]?.num || 1;
}

function generateCandidate(scores, killSet) {
  const sel = [];
  for (let i = 0; i < 6; i++) sel.push(pickNumber(scores, killSet, sel));
  return sel.sort((a, b) => a - b);
}

function validate(nums, history) {
  // 3연속 없어야 함
  let consecutive = 1;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === nums[i - 1] + 1) { consecutive++; if (consecutive > 2) return false; }
    else consecutive = 1;
  }

  // 홀짝 극단 제거
  const odds = nums.filter(n => n % 2 !== 0).length;
  if (odds === 6 || odds === 0) return false;

  // 합 범위
  const sum = nums.reduce((a, b) => a + b, 0);
  if (sum < 80 || sum > 200) return false;

  // 과거 1등 완전 중복 제거
  for (const r of history) {
    if (nums.filter(n => r.numbers.includes(n)).length === 6) return false;
  }

  // AC >= 5
  const diffs = new Set();
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length; j++)
      diffs.add(Math.abs(nums[i] - nums[j]));
  const ac = diffs.size - (nums.length - 1);
  if (ac < 5) return false;

  return true;
}

function predict(scores, killSet, history) {
  for (let i = 0; i < 2000; i++) {
    const c = generateCandidate(scores, killSet);
    if (validate(c, history)) return c;
  }
  return generateCandidate(scores, killSet);
}

// ─────────────────────────────────────────
// 등수 판정
// ─────────────────────────────────────────
function getPrize(myNums, drawNums, bonus) {
  const matched = myNums.filter(n => drawNums.includes(n)).length;
  const hasBonus = myNums.includes(bonus);
  if (matched === 6) return 1;
  if (matched === 5 && hasBonus) return 2;
  if (matched === 5) return 3;
  if (matched === 4) return 4;
  if (matched === 3) return 5;
  return 0;
}

// ─────────────────────────────────────────
// 시뮬레이션 실행
// ─────────────────────────────────────────
const TOTAL = 10000;
const MODES = [
  { name: '5-KILL (기본)', killCount: 5 },
  { name: '10-KILL (챌린지)', killCount: 10 }
];

for (const mode of MODES) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎰 ${mode.name} 모드 — ${TOTAL.toLocaleString()}회 시뮬레이션`);
  console.log(`${'='.repeat(60)}`);

  const killSet = buildKillList(history, mode.killCount);
  const scores = buildScores(history, killSet);

  console.log(`🚫 킬 번호 (${killSet.size}개): [${[...killSet].sort((a,b)=>a-b).join(', ')}]`);
  console.log(`📊 예측 풀: ${45 - killSet.size}개 번호에서 조합 생성\n`);

  const prizes = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let matchCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  const startTime = Date.now();

  for (let i = 0; i < TOTAL; i++) {
    const nums = predict(scores, killSet, history);
    const prize = getPrize(nums, DRAW_1219.numbers, DRAW_1219.bonus);
    if (prize > 0) prizes[prize]++;
    const matched = nums.filter(n => DRAW_1219.numbers.includes(n)).length;
    matchCounts[matched]++;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`⏱️  소요 시간: ${elapsed}초\n`);
  console.log(`📈 번호 일치 분포:`);
  for (let m = 6; m >= 0; m--) {
    const bar = '█'.repeat(Math.round(matchCounts[m] / (TOTAL / 50)));
    console.log(`  ${m}개 일치: ${String(matchCounts[m]).padStart(5)}회 (${(matchCounts[m]/TOTAL*100).toFixed(2)}%) ${bar}`);
  }

  console.log(`\n🏆 등수별 당첨 결과:`);
  const prizeNames = { 1: '1등 (6개)', 2: '2등 (5+보너스)', 3: '3등 (5개)', 4: '4등 (4개)', 5: '5등 (3개)' };
  const prizeAmounts = { 1: '수십억', 2: '약 5천만원', 3: '약 150만원', 4: '5만원', 5: '5천원' };
  let hasPrize = false;
  for (let p = 1; p <= 5; p++) {
    const cnt = prizes[p];
    if (cnt > 0) {
      console.log(`  ${prizeNames[p]}: ${cnt}개 (${(cnt/TOTAL*100).toFixed(3)}%) ← ${prizeAmounts[p]}`);
      hasPrize = true;
    } else {
      console.log(`  ${prizeNames[p]}: 0개`);
    }
  }

  const totalPrize4up = prizes[4] + prizes[5];
  console.log(`\n💰 소액 환급 (4~5등) 합계: ${totalPrize4up}개`);
  console.log(`   → 5등 환급: ${(prizes[5] * 5000).toLocaleString()}원`);
  console.log(`   → 4등 환급: ${(prizes[4] * 50000).toLocaleString()}원`);
  console.log(`   → 구매비용 (1만 게임 × 1천원): ${(TOTAL * 1000).toLocaleString()}원`);
  console.log(`   → 순 수익: ${((prizes[5] * 5000) + (prizes[4] * 50000) - TOTAL * 1000).toLocaleString()}원`);
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`📌 1219회차 당첨번호: [${DRAW_1219.numbers.join(', ')}] + 보너스 ${DRAW_1219.bonus}`);
console.log(`📌 1등 당첨번호가 포함된 구간 (1~10대): ${DRAW_1219.numbers.filter(n=>n<=10).join(', ')} — 저번호 집중 회차`);
console.log(`${'─'.repeat(60)}\n`);
