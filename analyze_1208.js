import fs from 'fs';

const history = JSON.parse(fs.readFileSync('./src/data/lottoHistory.json', 'utf8'));
const target = history.find(x => x.drwNo === 1208);
const prev = history.filter(x => x.drwNo < 1208); // History UP TO 1207

// 1. All-time Frequency
const scoresAll = {};
for(let i=1; i<=45; i++) scoresAll[i] = 0;
prev.forEach(r => r.numbers.forEach(n => scoresAll[n]++));

// 2. Recent 5 weeks, 10 weeks, 20 weeks Frequency
const scores5 = {};
const scores10 = {};
const scores20 = {};

const last5 = prev.slice(0, 5);
const last10 = prev.slice(0, 10);
const last20 = prev.slice(0, 20);

for(let i=1; i<=45; i++) {
    scores5[i] = 0; scores10[i] = 0; scores20[i] = 0;
}

last5.forEach(r => r.numbers.forEach(n => scores5[n]++));
last10.forEach(r => r.numbers.forEach(n => scores10[n]++));
last20.forEach(r => r.numbers.forEach(n => scores20[n]++));

// Helper to get rank
const getRank = (scoreObj, num) => {
    const sorted = Object.entries(scoreObj).sort((a,b) => b[1] - a[1]); // Descending
    const rank = sorted.findIndex(x => parseInt(x[0]) === num) + 1;
    return { rank, count: scoreObj[num] };
}

console.log(`Winning Numbers for 1208: ${target.numbers.join(', ')}`);
console.log(`\nAnalysis by Period:`);
console.log(`Num | All-Time Rank | Last 5 Wks (Cnt)| Last 10 Wks (Cnt)| Last 20 Wks (Cnt)`);
console.log(`----|---------------|-----------------|------------------|------------------`);

target.numbers.forEach(n => {
    const all = getRank(scoresAll, n);
    const r5 = getRank(scores5, n);
    const r10 = getRank(scores10, n);
    const r20 = getRank(scores20, n);
    
    console.log(`${n.toString().padStart(3)} | ${all.rank.toString().padStart(13)} | ${r5.count.toString().padStart(6)} (${r5.rank}위)  | ${r10.count.toString().padStart(6)} (${r10.rank}위)   | ${r20.count.toString().padStart(6)} (${r20.rank}위)`);
});
