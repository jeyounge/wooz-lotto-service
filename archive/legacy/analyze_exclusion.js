import fs from 'fs';

const history = JSON.parse(fs.readFileSync('./src/data/lottoHistory.json', 'utf8'));
// Sort by DrwNo Ascending for analysis
history.sort((a,b) => a.drwNo - b.drwNo);

const stats = {
    consecutive3: { total: 0, excludedCorrectly: 0 }, // If appeared 3 times, did it disappear next?
    consecutive2: { total: 0, excludedCorrectly: 0 }, // If appeared 2 times, did it disappear next?
    cold15: { total: 0, excludedCorrectly: 0 },       // If not appeared >= 15 rounds, did it stay absent?
    cold20: { total: 0, excludedCorrectly: 0 },       // If not appeared >= 20 rounds, did it stay absent?
    hotLast5: { total: 0, excludedCorrectly: 0 }      // If appeared >= 3 times in last 5, did it disappear?
};

// Helper: Check if num exists in round index
const hasNum = (idx, num) => {
    if (idx < 0 || idx >= history.length) return false;
    return history[idx].numbers.includes(num);
};

// Start from round 30 to have history
for (let i = 30; i < history.length; i++) {
    const currentRound = history[i];
    
    // Check every number 1~45 for exclusion rules
    for (let num = 1; num <= 45; num++) {
        
        // Rule 1: 3-Consecutive (Appeared in i-1, i-2, i-3)
        if (hasNum(i-1, num) && hasNum(i-2, num) && hasNum(i-3, num)) {
            stats.consecutive3.total++;
            if (!currentRound.numbers.includes(num)) {
                stats.consecutive3.excludedCorrectly++;
            }
        }

        // Rule 2: 2-Consecutive
        if (hasNum(i-1, num) && hasNum(i-2, num)) {
            stats.consecutive2.total++;
            if (!currentRound.numbers.includes(num)) {
                stats.consecutive2.excludedCorrectly++;
            }
        }
        
        // Rule 3: Cold 15 (Absent in i-1 ... i-15)
        let isCold15 = true;
        for(let k=1; k<=15; k++) {
            if (hasNum(i-k, num)) { isCold15 = false; break; }
        }
        if (isCold15) {
            stats.cold15.total++;
            if (!currentRound.numbers.includes(num)) stats.cold15.excludedCorrectly++;
        }

        // Rule 4: Overheated (Appeared >= 4 times in last 5 rounds)
        let countLast5 = 0;
        for(let k=1; k<=5; k++) {
            if (hasNum(i-k, num)) countLast5++;
        }
        if (countLast5 >= 4) {
            stats.hotLast5.total++;
            if (!currentRound.numbers.includes(num)) stats.hotLast5.excludedCorrectly++;
        }
    }
}

console.log(`\n🔎 Exclusion Strategy Analysis (Based on ${history.length} rounds)`);
console.log(`----------------------------------------------------------------`);
console.log(`1. [3-Consecutive] (Appeared 3 times in a row)`);
console.log(`   - Cases: ${stats.consecutive3.total}`);
console.log(`   - Successfully Excluded: ${stats.consecutive3.excludedCorrectly}`);
console.log(`   - Success Rate: ${((stats.consecutive3.excludedCorrectly/stats.consecutive3.total)*100).toFixed(2)}%`);
console.log(`   (If rate is 95%, it means 95% of the time the number NOT appear next)`);

console.log(`\n2. [2-Consecutive] (Appeared 2 times in a row)`);
console.log(`   - Cases: ${stats.consecutive2.total}`);
console.log(`   - Successfully Excluded: ${stats.consecutive2.excludedCorrectly}`);
console.log(`   - Success Rate: ${((stats.consecutive2.excludedCorrectly/stats.consecutive2.total)*100).toFixed(2)}%`);

console.log(`\n3. [Cold-15] (Not appeared for 15+ rounds)`);
console.log(`   - Cases: ${stats.cold15.total}`);
console.log(`   - Successfully Excluded: ${stats.cold15.excludedCorrectly}`);
console.log(`   - Success Rate: ${((stats.cold15.excludedCorrectly/stats.cold15.total)*100).toFixed(2)}%`);

console.log(`\n4. [Overheated] (Appeared 4+ times in last 5 rounds)`);
console.log(`   - Cases: ${stats.hotLast5.total}`);
console.log(`   - Successfully Excluded: ${stats.hotLast5.excludedCorrectly}`);
console.log(`   - Success Rate: ${((stats.hotLast5.excludedCorrectly/stats.hotLast5.total)*100).toFixed(2)}%`);
