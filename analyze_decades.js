
import fs from 'fs';
import path from 'path';

// Load History
const historyPath = path.resolve('src/data/lottoHistory.json');
const historyData = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));

console.log(`Analyzing ${historyData.length} rounds for Decade Frequencies...\n`);

// Buckets
const buckets = {
    '1-9': { count: 0, distinct: 9 },      // 1~9 (9 numbers)
    '10-19': { count: 0, distinct: 10 },   // 10~19 (10 numbers)
    '20-29': { count: 0, distinct: 10 },   // 20~29 (10 numbers)
    '30-39': { count: 0, distinct: 10 },   // 30~39 (10 numbers)
    '40-45': { count: 0, distinct: 6 }     // 40~45 (6 numbers)
};

let totalBalls = 0;

historyData.forEach(round => {
    round.numbers.forEach(num => {
        totalBalls++;
        if (num < 10) buckets['1-9'].count++;
        else if (num < 20) buckets['10-19'].count++;
        else if (num < 30) buckets['20-29'].count++;
        else if (num < 40) buckets['30-39'].count++;
        else buckets['40-45'].count++;
    });
});

console.log("--- Decade Statistics (Total & Average per Number) ---");
console.log(`Total Balls Drawn: ${totalBalls}\n`);

// Calculate Metrics
const results = Object.entries(buckets).map(([range, data]) => {
    const avgPerNum = data.count / data.distinct;
    const share = (data.count / totalBalls * 100).toFixed(2);
    return {
        range,
        totalAppearances: data.count,
        distinctNumbers: data.distinct,
        avgPerNumber: avgPerNum.toFixed(2),
        shareOfTotal: share + '%'
    };
});

// Sort by Best Average Performance
results.sort((a,b) => b.avgPerNumber - a.avgPerNumber);

const output = results.map((r, i) => `${i+1}. [${r.range}]: Avg ${r.avgPerNumber} (Total ${r.totalAppearances})`).join('\n');
fs.writeFileSync('decades_result.txt', output);
console.log("Analysis saved to decades_result.txt");
