
import fs from 'fs';
import path from 'path';

// Load History
const historyPath = path.resolve('src/data/lottoHistory.json');
const historyData = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));

// Sort by Round (Ascending: 1 -> Latest)
// Note: File might be descending, let's sort to be safe
const sorted = [...historyData].sort((a,b) => a.drwNo - b.drwNo);

console.log(`Analyzing ${sorted.length} rounds for Exclusion Patterns...\n`);

let neighborTotal = 0;
let neighborExcluded = 0;

let consecTotal = 0;
let consecNextExcluded = 0;

function hasConsecutive(numbers) {
    for (let i = 0; i < numbers.length - 1; i++) {
        if (numbers[i] + 1 === numbers[i+1]) return true;
    }
    return false;
}

for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i+1];

    // 1. Neighbor Exclusion Analysis
    // Hypothesis: For every number n in Current, (n-1) and (n+1) will NOT appear in Next.
    current.numbers.forEach(num => {
        neighborTotal++;
        
        const neighbors = [num - 1, num + 1].filter(n => n >= 1 && n <= 45);
        const hasNeighborInNext = neighbors.some(n => next.numbers.includes(n));
        
        if (!hasNeighborInNext) {
            neighborExcluded++;
        }
    });

    // 2. Consecutive Follow-up Analysis
    // Hypothesis: If Current has consecutive numbers, Next will NOT have consecutive numbers.
    if (hasConsecutive(current.numbers)) {
        consecTotal++;
        if (!hasConsecutive(next.numbers)) {
            consecNextExcluded++;
        }
    }
}

// 3. Same Number Exclusion (Re-appearance)
// Hypothesis: Numbers from Current will NOT appear in Next.
let sameNumTotal = 0;
let sameNumExcluded = 0;

for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i+1];
    
    current.numbers.forEach(num => {
        sameNumTotal++;
        if (!next.numbers.includes(num)) {
            sameNumExcluded++;
        }
    });
}


console.log(`Neighbor_Rate: ${(neighborExcluded / neighborTotal * 100).toFixed(2)}%`);
console.log(`Consecutive_Rate: ${(consecNextExcluded / consecTotal * 100).toFixed(2)}%`);
console.log(`SameNum_Rate: ${(sameNumExcluded / sameNumTotal * 100).toFixed(2)}%`);
