import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const historyPath = path.join(__dirname, 'src/data/lottoHistory.json');
const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

// Sort by date/drwNo descending (newest first)
history.sort((a, b) => b.drwNo - a.drwNo);

console.log(`Total Records: ${history.length}`);

let failCount = 0;
let totalChecks = 0;
const recentLimit = 100; // Check last 100 rounds for recent trend
let recentFailCount = 0;

for (let i = 0; i < history.length - 1; i++) {
    const currentRound = history[i];
    const prevRound = history[i+1]; // Since sorted desc, next in array is previous round

    const prevBonus = prevRound.bonus;
    const currentMain = currentRound.numbers;

    if (currentMain.includes(prevBonus)) {
        failCount++;
        if (i < recentLimit) {
            recentFailCount++;
        }
    }
    totalChecks++;
}

console.log(`\n=== Rule: Exclude Last Week's Bonus Number ===`);
console.log(`[All Time]`);
console.log(`- Total Rounds Checked: ${totalChecks}`);
console.log(`- Failures (Bonus appeared in next main): ${failCount}`);
console.log(`- Failure Rate: ${((failCount / totalChecks) * 100).toFixed(2)}%`);
console.log(`- Success Rate (Safe to Exclude): ${((1 - failCount / totalChecks) * 100).toFixed(2)}%`);

console.log(`\n[Recent ${recentLimit} Rounds]`);
console.log(`- Failures: ${recentFailCount}`);
console.log(`- Failure Rate: ${((recentFailCount / recentLimit) * 100).toFixed(2)}%`);
console.log(`- Success Rate: ${((1 - recentFailCount / recentLimit) * 100).toFixed(2)}%`);

// --- Check Hot Number Risk ---
let hotFailCount = 0;
let hotTotalChecks = 0;
// We start from 10 to have history
for (let i = 0; i < history.length - 11; i++) {
    const currentRound = history[i];
    const past10 = history.slice(i+1, i+11);
    
    const counts = {};
    past10.forEach(r => r.numbers.forEach(n => counts[n] = (counts[n]||0)+1));
    
    // Identify Hot Numbers (Freq >= 3)
    const hotNumbers = Object.keys(counts).filter(n => counts[n] >= 3).map(Number);
    
    if (hotNumbers.length > 0) {
        hotTotalChecks++;
        // Did ANY hot number appear in current round?
        const appeared = currentRound.numbers.some(n => hotNumbers.includes(n));
        if (appeared) {
            hotFailCount++;
        }
    }
}

console.log(`\n=== Risk: Excluding "Hot Numbers" (Freq >= 3 in last 10 wks) ===`);
console.log(`- How often does AT LEAST ONE Hot Number appear next?`);
console.log(`- Total Opportunities: ${hotTotalChecks}`);
console.log(`- Times they appeared (Failed Exclusion): ${hotFailCount}`);
console.log(`- DANGER Rate: ${((hotFailCount / hotTotalChecks) * 100).toFixed(2)}%`);

// --- Check 3-Consecutive Rule ---
let consecFailCount = 0;
let consecTotalChecks = 0;

for (let i = 0; i < history.length - 3; i++) {
    const r0 = history[i].numbers;     // Target Round (4th week)
    const r1 = history[i+1].numbers;   // 3rd week
    const r2 = history[i+2].numbers;   // 2nd week
    const r3 = history[i+3].numbers;   // 1st week
    
    // Find numbers that appeared in r1, r2, AND r3
    const threeConsecutive = [];
    for (let n = 1; n <= 45; n++) {
        if (r1.includes(n) && r2.includes(n) && r3.includes(n)) {
            threeConsecutive.push(n);
        }
    }

    if (threeConsecutive.length > 0) {
        consecTotalChecks += threeConsecutive.length;
        // Did any of them appear in r0 (4th week)?
        const failed = threeConsecutive.filter(n => r0.includes(n));
        consecFailCount += failed.length;
    }
}

console.log(`\n=== Rule: Exclude 3-Consecutive Numbers (Appear 3 weeks in a row) ===`);
console.log(`- How often does a number appear for the 4th time?`);
console.log(`- Total Cases (Num appeared 3x): ${consecTotalChecks}`);
console.log(`- Failures (Appeared 4th time): ${consecFailCount}`);
console.log(`- Failure Rate: ${((consecFailCount / consecTotalChecks) * 100).toFixed(2)}%`);
console.log(`- Success Rate (Safe to Exclude): ${((1 - consecFailCount / consecTotalChecks) * 100).toFixed(2)}%`);


