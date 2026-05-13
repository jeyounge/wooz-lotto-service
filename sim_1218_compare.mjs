import fs from 'fs';

// ─────────────────────────────────────────────────────
// 1218회차 당첨번호 (목표)
// ─────────────────────────────────────────────────────
const DRAW_1218 = { numbers: [3, 28, 31, 32, 42, 45], bonus: 25 };

// ─────────────────────────────────────────────────────
// 히스토리 로드 + 누락 회차(1212~1217) 추가
// ─────────────────────────────────────────────────────
const baseHistory = JSON.parse(fs.readFileSync('./src/data/lottoHistory.json', 'utf8'));

const extraRounds = [
  { drwNo: 1212, numbers: [5, 8, 25, 31, 41, 44], bonus: 45 },
  { drwNo: 1213, numbers: [5, 11, 25, 27, 36, 38], bonus: 2 },
  { drwNo: 1214, numbers: [10, 15, 19, 27, 30, 33], bonus: 14 },
  { drwNo: 1215, numbers: [13, 15, 19, 21, 44, 45], bonus: 39 },
  { drwNo: 1216, numbers: [3, 10, 14, 15, 23, 24], bonus: 25 },
  { drwNo: 1217, numbers: [8, 10, 15, 20, 29, 31], bonus: 41 },
];

// 1218 미만만 사용 (저번주 = 1217까지)
const history = [...baseHistory, ...extraRounds]
  .filter(r => r.drwNo <= 1217)
  .sort((a, b) => b.drwNo - a.drwNo);

console.log(`\n📅 시뮬레이션 기준: ${history[0].drwNo}회차까지 (1218회차 예측 가정)`);
console.log(`🎯 실제 1218회차: [${DRAW_1218.numbers.join(', ')}] + 보너스 ${DRAW_1218.bonus}\n`);

// ─────────────────────────────────────────────────────
// V5 킬 전략
// ─────────────────────────────────────────────────────
function countInLast(sorted, num, n) {
  let c = 0;
  for (let k = 0; k < n && k < sorted.length; k++)
    if (sorted[k].numbers.includes(num)) c++;
  return c;
}
function isColdFor(sorted, num, weeks) {
  for (let k = 0; k < weeks && k < sorted.length; k++)
    if (sorted[k].numbers.includes(num)) return false;
  return true;
}
function isHot(sorted, num) { return countInLast(sorted, num, 10) >= 3; }

function buildKillList(sorted, killCount) {
  const kills = new Set();
  const add = n => { if (kills.size < killCount && !kills.has(n)) kills.add(n); };

  // P1. 10주 중 6회+
  for (let n = 1; n <= 45; n++) { if (kills.size >= killCount) break; if (countInLast(sorted,n,10)>=6) add(n); }
  // P2. 3주 연속
  if (kills.size < killCount && sorted.length>=3) {
    const r0=sorted[0].numbers,r1=sorted[1].numbers,r2=sorted[2].numbers;
    for (let n=1;n<=45;n++) { if(kills.size>=killCount)break; if(r0.includes(n)&&r1.includes(n)&&r2.includes(n))add(n); }
  }
  // P3. 직전 보너스
  if (kills.size<killCount) { const b=sorted[0]?.bonus; if(b&&!kills.has(b))add(b); }
  // P4. 5주 중 4회+
  if (kills.size<killCount) for (let n=1;n<=45;n++) { if(kills.size>=killCount)break; if(countInLast(sorted,n,5)>=4)add(n); }
  // P5. ±1 인접 2주 포위
  if (kills.size<killCount) {
    const w0=sorted[0]?.numbers||[],w1=sorted[1]?.numbers||[];
    for (let n=1;n<=45;n++) {
      if(kills.size>=killCount||kills.has(n)||isHot(sorted,n))continue;
      const nbr1=n-1,nbr2=n+1;
      const h0=(nbr1>=1&&w0.includes(nbr1))||(nbr2<=45&&w0.includes(nbr2));
      const h1=(nbr1>=1&&w1.includes(nbr1))||(nbr2<=45&&w1.includes(nbr2));
      if(h0&&h1&&!w0.includes(n)&&!w1.includes(n))add(n);
    }
  }
  // P6. 2주 연속
  if (kills.size<killCount) {
    const r0=sorted[0]?.numbers||[],r1=sorted[1]?.numbers||[];
    for(let n=1;n<=45;n++){if(kills.size>=killCount||kills.has(n))continue;if(r0.includes(n)&&r1.includes(n))add(n);}
  }
  // P7. 끝자리 포화 최약체
  if (kills.size<killCount) {
    const dc={},nd={};
    sorted.slice(0,5).forEach(r=>r.numbers.forEach(n=>{const d=n%10;dc[d]=(dc[d]||0)+1;nd[n]=(nd[n]||0)+1;}));
    const sat=Object.entries(dc).filter(([,c])=>c>=4).sort((a,b)=>b[1]-a[1]).map(([d])=>parseInt(d));
    for(const digit of sat){
      if(kills.size>=killCount)break;
      const cands=[];
      for(let n=1;n<=45;n++) if(n%10===digit&&!kills.has(n)&&!isHot(sorted,n))cands.push(n);
      cands.sort((a,b)=>(nd[a]||0)-(nd[b]||0));
      if(cands[0])add(cands[0]);
    }
  }
  // P8. 10주+ 콜드
  if (kills.size<killCount) {
    const cold=[];
    for(let n=1;n<=45;n++){if(kills.has(n)||isHot(sorted,n))continue;if(isColdFor(sorted,n,10))cold.push({n,s:countInLast(sorted,n,30)});}
    cold.sort((a,b)=>a.s-b.s);
    for(const{n}of cold){if(kills.size>=killCount)break;add(n);}
  }
  // P9. 10주 중 5회+
  if (kills.size<killCount) for(let n=1;n<=45;n++){if(kills.size>=killCount||kills.has(n))continue;if(countInLast(sorted,n,10)>=5)add(n);}

  return kills;
}

// ─────────────────────────────────────────────────────
// 스코어링
// ─────────────────────────────────────────────────────
function buildScores(sorted, killSet) {
  const scores = {};
  for(let i=1;i<=45;i++) scores[i]=40;
  sorted.slice(0,5).forEach(r=>r.numbers.forEach(n=>{scores[n]+=40;}));
  sorted.slice(0,10).forEach(r=>r.numbers.forEach(n=>{scores[n]+=10;}));
  sorted.slice(0,30).forEach(r=>r.numbers.forEach(n=>{scores[n]+=20;}));
  const r15=new Set(); sorted.slice(0,15).forEach(r=>r.numbers.forEach(n=>r15.add(n)));
  for(let i=1;i<=45;i++) if(!r15.has(i)) scores[i]+=15;
  killSet.forEach(k=>{scores[k]=-9999;});
  return scores;
}

function pickNumber(scores, killSet, sel) {
  const pool=[]; let total=0;
  for(let i=1;i<=45;i++) {
    if(!sel.includes(i)&&!killSet.has(i)) {
      const w=scores[i]+(Math.random()*10);
      if(w>0){pool.push({num:i,weight:w});total+=w;}
    }
  }
  let r=Math.random()*total;
  for(const item of pool){r-=item.weight;if(r<=0)return item.num;}
  return pool[pool.length-1]?.num||1;
}

function generateCandidate(scores, killSet) {
  const sel=[];
  for(let i=0;i<6;i++) sel.push(pickNumber(scores,killSet,sel));
  return sel.sort((a,b)=>a-b);
}

function validate(nums, hist) {
  let cons=1;
  for(let i=1;i<nums.length;i++){
    if(nums[i]===nums[i-1]+1){cons++;if(cons>2)return false;}else cons=1;
  }
  const odds=nums.filter(n=>n%2!==0).length;
  if(odds===6||odds===0)return false;
  const sum=nums.reduce((a,b)=>a+b,0);
  if(sum<80||sum>200)return false;
  for(const r of hist) if(nums.filter(n=>r.numbers.includes(n)).length===6)return false;
  const diffs=new Set();
  for(let i=0;i<nums.length;i++) for(let j=i+1;j<nums.length;j++) diffs.add(Math.abs(nums[i]-nums[j]));
  if(diffs.size-(nums.length-1)<5)return false;
  return true;
}

function predictV5(scores, killSet, hist) {
  for(let i=0;i<2000;i++){const c=generateCandidate(scores,killSet);if(validate(c,hist))return c;}
  return generateCandidate(scores,killSet);
}

// ─────────────────────────────────────────────────────
// 완전 랜덤 생성 (validate 없이 순수 랜덤 6개)
// ─────────────────────────────────────────────────────
function randomPick() {
  const pool = Array.from({length:45},(_,i)=>i+1);
  const sel = [];
  while(sel.length<6) {
    const idx = Math.floor(Math.random()*pool.length);
    sel.push(...pool.splice(idx,1));
  }
  return sel.sort((a,b)=>a-b);
}

// ─────────────────────────────────────────────────────
// 등수 판정
// ─────────────────────────────────────────────────────
function getPrize(my, draw, bonus) {
  const m = my.filter(n=>draw.includes(n)).length;
  const hasBonus = my.includes(bonus);
  if(m===6) return 1;
  if(m===5&&hasBonus) return 2;
  if(m===5) return 3;
  if(m===4) return 4;
  if(m===3) return 5;
  return 0;
}

// ─────────────────────────────────────────────────────
// 시뮬레이션
// ─────────────────────────────────────────────────────
const TOTAL = 50000;
const { numbers: WIN, bonus: BONUS } = DRAW_1218;

// 킬 목록 미리 출력
const kill5  = buildKillList(history, 5);
const kill10 = buildKillList(history, 10);
const score5  = buildScores(history, kill5);
const score10 = buildScores(history, kill10);

console.log(`🚫 5-KILL  킬 번호: [${[...kill5].sort((a,b)=>a-b).join(', ')}]`);
console.log(`🚫 10-KILL 킬 번호: [${[...kill10].sort((a,b)=>a-b).join(', ')}]`);
const killedWinners5  = WIN.filter(n=>kill5.has(n));
const killedWinners10 = WIN.filter(n=>kill10.has(n));
console.log(`⚠️  5-KILL 에 걸린 당첨번호: ${killedWinners5.length>0 ? killedWinners5.join(', ') : '없음 ✅'}`);
console.log(`⚠️  10-KILL에 걸린 당첨번호: ${killedWinners10.length>0 ? killedWinners10.join(', ') : '없음 ✅'}`);

const modes = [
  { name: '5-KILL V5 알고리즘', scores: score5, killSet: kill5, algo: true },
  { name: '10-KILL V5 알고리즘', scores: score10, killSet: kill10, algo: true },
  { name: '완전 랜덤', scores: null, killSet: null, algo: false },
];

const results = [];

for (const mode of modes) {
  const prizes = {1:0,2:0,3:0,4:0,5:0};
  const matchCounts = {0:0,1:0,2:0,3:0,4:0,5:0,6:0};
  const start = Date.now();

  for(let i=0;i<TOTAL;i++){
    const nums = mode.algo
      ? predictV5(mode.scores, mode.killSet, history)
      : randomPick();
    const p = getPrize(nums, WIN, BONUS);
    if(p>0) prizes[p]++;
    const m = nums.filter(n=>WIN.includes(n)).length;
    matchCounts[m]++;
  }

  const elapsed = ((Date.now()-start)/1000).toFixed(1);
  results.push({ ...mode, prizes, matchCounts, elapsed });
}

// ─────────────────────────────────────────────────────
// 결과 출력
// ─────────────────────────────────────────────────────
const prizeNames = {1:'1등(6개)',2:'2등(5+보너스)',3:'3등(5개)',4:'4등(4개)',5:'5등(3개)'};
const prizeAmounts = {1:'수십억',2:'~5천만',3:'~150만',4:'5만',5:'5천'};

for (const r of results) {
  console.log(`\n${'═'.repeat(62)}`);
  console.log(`🎰 [${r.name}] — ${TOTAL.toLocaleString()}회 / ⏱️ ${r.elapsed}초`);
  console.log(`${'─'.repeat(62)}`);
  console.log(`📈 번호 일치 분포:`);
  for(let m=6;m>=0;m--){
    const cnt = r.matchCounts[m];
    const bar = '█'.repeat(Math.round(cnt/(TOTAL/60)));
    console.log(`  ${m}개: ${String(cnt).padStart(5)}회 (${(cnt/TOTAL*100).toFixed(2)}%) ${bar}`);
  }
  console.log(`\n🏆 등수별 당첨:`);
  for(let p=1;p<=5;p++){
    const cnt = r.prizes[p];
    const mark = cnt>0 ? '🎉' : '  ';
    console.log(`  ${mark} ${prizeNames[p]}: ${cnt}개 (${(cnt/TOTAL*100).toFixed(3)}%) [${prizeAmounts[p]}]`);
  }
  const refund = r.prizes[5]*5000 + r.prizes[4]*50000 + r.prizes[3]*1500000
               + r.prizes[2]*50000000 + r.prizes[1]*2000000000;
  const cost = TOTAL * 1000;
  console.log(`\n💰 환급금 합계: ${refund.toLocaleString()}원`);
  console.log(`   구매비용:    ${cost.toLocaleString()}원`);
  console.log(`   순 수익:     ${(refund-cost).toLocaleString()}원 (${((refund/cost)*100).toFixed(1)}% 환급률)`);
}

// ─────────────────────────────────────────────────────
// 비교 요약 테이블
// ─────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(62)}`);
console.log(`📊 비교 요약 (1만게임 기준)`);
console.log(`${'─'.repeat(62)}`);
console.log(`${'모드'.padEnd(20)} ${'3등'.padStart(4)} ${'4등'.padStart(5)} ${'5등'.padStart(5)} ${'환급률'.padStart(7)}`);
console.log(`${'─'.repeat(62)}`);
for(const r of results){
  const refund = r.prizes[5]*5000+r.prizes[4]*50000+r.prizes[3]*1500000
               + r.prizes[2]*50000000+r.prizes[1]*2000000000;
  const rate = (refund/(TOTAL*1000)*100).toFixed(1);
  console.log(`${r.name.padEnd(22)} ${String(r.prizes[3]).padStart(4)} ${String(r.prizes[4]).padStart(5)} ${String(r.prizes[5]).padStart(5)} ${rate.padStart(6)}%`);
}
console.log(`${'═'.repeat(62)}`);
console.log(`\n🎯 1218회차 당첨번호: [${WIN.join(', ')}] + 보너스 ${BONUS}`);
console.log(`   소계: 합산 ${WIN.reduce((a,b)=>a+b,0)}, 홀짝비 ${WIN.filter(n=>n%2!==0).length}홀/${WIN.filter(n=>n%2===0).length}짝\n`);
