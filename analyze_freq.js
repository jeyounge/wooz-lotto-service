
import fs from 'fs';
import path from 'path';

// Load History
const historyPath = path.resolve('src/data/lottoHistory.json');
const historyData = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));

console.log(`Analyzing ${historyData.length} rounds...`);

// 1. All-Time Frequency
const counts = {};
historyData.forEach(round => {
    round.numbers.forEach(num => {
        counts[num] = (counts[num] || 0) + 1;
    });
});

// Convert to Array
const ranked = Object.entries(counts)
    .map(([num, count]) => ({ num: parseInt(num), count }))
    .sort((a,b) => b.count - a.count);

console.log("\nTop 10 Frequent Numbers (All Time):");
console.table(ranked.slice(0, 10));

console.log("\nBottom 10 Frequent Numbers (All Time):");
console.table(ranked.slice(-10));

// Calculate "70% point"
const totalCounts = ranked.reduce((sum, item) => sum + item.count, 0);
let accum = 0;
let cutOffIndex = 0;

console.log("\nDistribution Analysis:");
// Simply dividing numbers into tiers
const tierSize = 45 / 5; // 9 numbers per tier
for(let i=0; i<5; i++) {
    const slice = ranked.slice(i*tierSize, (i+1)*tierSize);
    const avg = slice.reduce((a,b)=>a+b.count,0) / slice.length;
    console.log(`Tier ${i+1} (Top ${(i+1)*20}%): Avg Freq ${avg.toFixed(1)}`);
}

// User mentioned "70% stats"
// It could mean: numbers that account for 70% of appearances? 
// Or the Top 30% of numbers (which might account for higher probability?)
// Let's show the Top 15 (approx 33%) vs Bottom 15.

console.log("\nTop 15 Numbers (Hot Tier):", ranked.slice(0, 15).map(x=>x.num).join(', '));
