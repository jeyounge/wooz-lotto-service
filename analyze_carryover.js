
import fs from 'fs';
import path from 'path';

// Load History
const historyPath = path.resolve('src/data/lottoHistory.json');
const historyData = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
// Sort Ascending (Older -> Newer)
const sorted = [...historyData].sort((a,b) => a.drwNo - b.drwNo);

console.log(`Analyzing ${sorted.length} rounds for Carryover Kill Strategy...\n`);

let totalCarryoverOpportunities = 0;
let killHotSelected = 0;
let killHotSuccess = 0;

let killColdSelected = 0;
let killColdSuccess = 0;

// Need at least 10 weeks of history to calculate "Hot/Cold" for the carryover check
for (let i = 10; i < sorted.length - 1; i++) {
    const prev10 = sorted.slice(i-10, i); // Previous 10 weeks
    const current = sorted[i];            // "Last Week" (The one providing carryovers)
    const next = sorted[i+1];             // "This Week" (The target to predict)

    // Calculate Frequencies in Prev 10 weeks
    const counts = {};
    prev10.forEach(r => r.numbers.forEach(n => counts[n] = (counts[n]||0)+1));

    // Current numbers are candidates to be "Carried Over" (or Killed)
    const candidates = current.numbers;

    // Strategy A: Kill the HOTTEST candidate (Highest freq in prev 10)
    // Strategy B: Kill the COLDEST candidate (Lowest freq in prev 10)
    
    // Sort candidates by their frequency in prev 10
    // If tie, just pick random (or first)
    const sortedCands = [...candidates].sort((a,b) => (counts[b]||0) - (counts[a]||0));
    
    const hottest = sortedCands[0]; // Most frequent
    const coldest = sortedCands[sortedCands.length-1]; // Least frequent

    // Check performance
    totalCarryoverOpportunities++;

    // Did Hottest appear in Next?
    if (!next.numbers.includes(hottest)) {
        killHotSuccess++; // Success: We killed it, and it didn't show up
    }

    // Did Coldest appear in Next?
    if (!next.numbers.includes(coldest)) {
        killColdSuccess++; // Success: We killed it, and it didn't show up
    }
}

console.log(`Hot_Kill_Rate: ${(killHotSuccess / totalCarryoverOpportunities * 100).toFixed(2)}%`);
console.log(`Cold_Kill_Rate: ${(killColdSuccess / totalCarryoverOpportunities * 100).toFixed(2)}%`);
