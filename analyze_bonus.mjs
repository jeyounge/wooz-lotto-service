import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const historyPath = path.join(__dirname, 'src/data/lottoHistory.json');
const rawHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

// Sort ascending (1 to Latest)
const sorted = rawHistory.sort((a,b) => a.drwNo - b.drwNo);

let totalRounds = 0;
let recurrenceCount = 0;

console.log(`Analyzing ${sorted.length} rounds...`);

for (let i = 0; i < sorted.length - 1; i++) {
    const currentRound = sorted[i]; // Round N
    const nextRound = sorted[i+1];    // Round N+1
    
    const bonusN = currentRound.bonus;
    const winningNext = nextRound.numbers; // Main 6 numbers of N+1

    // Check if Bonus of N appeared in Winning of N+1
    if (winningNext.includes(bonusN)) {
        recurrenceCount++;
    }
    totalRounds++;
}

const probability = (recurrenceCount / totalRounds) * 100;

console.log(`\n[Bonus Number Recurrence Analysis]`);
console.log(`Total Intervals Checked: ${totalRounds}`);
console.log(`Recurrence Count: ${recurrenceCount} times`);
console.log(`Recurrence Probability: ${probability.toFixed(2)}%`);
console.log(`\nInverse (Exclusion Success Rate): ${(100 - probability).toFixed(2)}%`);

if (probability < 15) {
    console.log("Conclusion: ✅ Reliable Exclusion Strategy (Low Risk)");
} else {
    console.log("Conclusion: ⚠️ High Risk Exclusion");
}
