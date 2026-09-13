import fs from 'fs';

const history = JSON.parse(fs.readFileSync('./src/data/lottoHistory.json', 'utf8'));
history.sort((a, b) => a.drwNo - b.drwNo);

const hasNum = (idx, num) => {
    if (idx < 0 || idx >= history.length) return false;
    return history[idx].numbers.includes(num);
};

const countInRange = (idx, num, range) => {
    let c = 0;
    for (let k = 1; k <= range; k++) {
        if (idx - k >= 0 && history[idx - k].numbers.includes(num)) c++;
    }
    return c;
};

const rules = {
    // 기존 룰
    consec3:    { total: 0, hit: 0, desc: '3주 연속 출현' },
    consec2:    { total: 0, hit: 0, desc: '2주 연속 출현' },
    cold15:     { total: 0, hit: 0, desc: '15주 이상 미출현' },
    hot4of5:    { total: 0, hit: 0, desc: '최근 5주 중 4회 이상' },

    // 신규 룰 후보
    consec4:    { total: 0, hit: 0, desc: '4주 연속 출현' },
    cold10:     { total: 0, hit: 0, desc: '10주 이상 미출현' },
    cold20:     { total: 0, hit: 0, desc: '20주 이상 미출현' },
    cold8:      { total: 0, hit: 0, desc: '8주 이상 미출현' },
    hot3of5:    { total: 0, hit: 0, desc: '최근 5주 중 3회 이상' },
    hot5of10:   { total: 0, hit: 0, desc: '최근 10주 중 5회 이상' },
    hot6of10:   { total: 0, hit: 0, desc: '최근 10주 중 6회 이상' },
    bonusLast:  { total: 0, hit: 0, desc: '직전 보너스 번호' },
    bonusLast2: { total: 0, hit: 0, desc: '2주 연속 보너스 번호' },
    bonusIn3:   { total: 0, hit: 0, desc: '최근 3주 중 보너스 2회' },
    // 패리티 룰
    allEven:    { total: 0, hit: 0, desc: '최근 3주 해당번호 짝수 구간 포화(짝수 18개 중 10개이상)'},
    // 끝자리(digit) 포화
    digitSat4:  { total: 0, hit: 0, desc: '최근 5주 같은 끝자리 4회 이상' },
    digitSat5:  { total: 0, hit: 0, desc: '최근 5주 같은 끝자리 5회' },
    // 합산 범위 극단
    sumHigh:    { total: 0, hit: 0, desc: '최근 3주 합산 175 이상인 회차 번호 최소값' },
    // 이웃 번호
    neighbor2:  { total: 0, hit: 0, desc: '±1 인접번호가 2주 연속 출현' },
};

for (let i = 30; i < history.length; i++) {
    const cur = history[i];
    const nums = cur.numbers;

    for (let n = 1; n <= 45; n++) {
        const absent = !nums.includes(n);

        // 3연속
        if (hasNum(i-1,n) && hasNum(i-2,n) && hasNum(i-3,n)) {
            rules.consec3.total++; if (absent) rules.consec3.hit++;
        }
        // 4연속
        if (hasNum(i-1,n) && hasNum(i-2,n) && hasNum(i-3,n) && hasNum(i-4,n)) {
            rules.consec4.total++; if (absent) rules.consec4.hit++;
        }
        // 2연속
        if (hasNum(i-1,n) && hasNum(i-2,n)) {
            rules.consec2.total++; if (absent) rules.consec2.hit++;
        }
        // cold8
        {
            let cold = true;
            for (let k=1;k<=8;k++) if (hasNum(i-k,n)) { cold=false; break; }
            if (cold) { rules.cold8.total++; if (absent) rules.cold8.hit++; }
        }
        // cold10
        {
            let cold = true;
            for (let k=1;k<=10;k++) if (hasNum(i-k,n)) { cold=false; break; }
            if (cold) { rules.cold10.total++; if (absent) rules.cold10.hit++; }
        }
        // cold15
        {
            let cold = true;
            for (let k=1;k<=15;k++) if (hasNum(i-k,n)) { cold=false; break; }
            if (cold) { rules.cold15.total++; if (absent) rules.cold15.hit++; }
        }
        // cold20
        {
            let cold = true;
            for (let k=1;k<=20;k++) if (hasNum(i-k,n)) { cold=false; break; }
            if (cold) { rules.cold20.total++; if (absent) rules.cold20.hit++; }
        }
        // hot 3/5
        if (countInRange(i,n,5) >= 3) { rules.hot3of5.total++; if (absent) rules.hot3of5.hit++; }
        // hot 4/5
        if (countInRange(i,n,5) >= 4) { rules.hot4of5.total++; if (absent) rules.hot4of5.hit++; }
        // hot 5/10
        if (countInRange(i,n,10) >= 5) { rules.hot5of10.total++; if (absent) rules.hot5of10.hit++; }
        // hot 6/10
        if (countInRange(i,n,10) >= 6) { rules.hot6of10.total++; if (absent) rules.hot6of10.hit++; }

        // 끝자리 포화
        {
            const digit = n % 10;
            let digitCount = 0;
            for (let k=1;k<=5;k++) {
                if (i-k >= 0) history[i-k].numbers.forEach(x => { if (x%10===digit) digitCount++; });
            }
            if (digitCount >= 4) { rules.digitSat4.total++; if (absent) rules.digitSat4.hit++; }
            if (digitCount >= 5) { rules.digitSat5.total++; if (absent) rules.digitSat5.hit++; }
        }

        // 인접번호 2연속 출현 (±1)
        {
            const nbr1 = n-1, nbr2 = n+1;
            const nbrIn1 = (nbr1>=1 && hasNum(i-1,nbr1)) || (nbr2<=45 && hasNum(i-1,nbr2));
            const nbrIn2 = (nbr1>=1 && hasNum(i-2,nbr1)) || (nbr2<=45 && hasNum(i-2,nbr2));
            if (nbrIn1 && nbrIn2 && !hasNum(i-1,n) && !hasNum(i-2,n)) {
                rules.neighbor2.total++; if (absent) rules.neighbor2.hit++;
            }
        }
    }

    // 보너스 룰
    {
        const lastBonus = history[i-1].bonus;
        if (lastBonus) {
            rules.bonusLast.total++;
            if (!nums.includes(lastBonus)) rules.bonusLast.hit++;
        }
    }
    // 2주 연속 보너스
    {
        const b0 = history[i-1].bonus, b1 = history[i-2]?.bonus;
        if (b0 && b1 && b0 === b1) {
            rules.bonusLast2.total++;
            if (!nums.includes(b0)) rules.bonusLast2.hit++;
        }
    }
}

console.log('\n🔬 확장 제외 룰 분석 결과 (1211회차 기반)');
console.log('=========================================================');

const sorted = Object.entries(rules)
    .filter(([, r]) => r.total >= 10)
    .map(([key, r]) => ({
        key,
        desc: r.desc,
        total: r.total,
        hit: r.hit,
        rate: r.total > 0 ? (r.hit / r.total * 100) : 0
    }))
    .sort((a, b) => b.rate - a.rate);

sorted.forEach(r => {
    const bar = '█'.repeat(Math.round(r.rate / 5));
    const mark = r.rate >= 80 ? '🔥' : r.rate >= 70 ? '✅' : '⚠️';
    console.log(`${mark} [${r.rate.toFixed(1)}%] ${r.desc}`);
    console.log(`   사례 ${r.total}건, 적중 ${r.hit}건  ${bar}`);
});

console.log('\n📊 70% 이상 제외 성공 룰 요약');
console.log('---------------------------------------------------------');
sorted.filter(r => r.rate >= 70).forEach(r => {
    console.log(`  - ${r.desc}: ${r.rate.toFixed(1)}% (${r.total}건)`);
});
