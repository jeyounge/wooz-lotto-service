
import fs from 'fs';
import path from 'path';

const historyPath = path.resolve('src/data/lottoHistory.json');
const historyData = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
const sorted = [...historyData].sort((a,b) => a.drwNo - b.drwNo);

console.log(`Analyzing ${sorted.length} rounds for Neighbor Kill Selection...\n`);

let totalOpportunities = 0;
let killRandomSuccess = 0;
let killHottestSuccess = 0;
let killColdestSuccess = 0;

for (let i = 5; i < sorted.length - 1; i++) {
    const prev5 = sorted.slice(i-5, i);
    const current = sorted[i];
    const next = sorted[i+1];

    // 1. Identify Neighbors
    let neighbors = new Set();
    current.numbers.forEach(n => {
        if (n-1 >= 1) neighbors.add(n-1);
        if (n+1 <= 45) neighbors.add(n+1);
    });
    const neighborList = Array.from(neighbors);

    if (neighborList.length === 0) continue;
    totalOpportunities++;

    // 2. Random Kill
    // We simulate excluding ALL of them and see average? or just pick one?
    // Let's check "Success Rate if we picked ONE randomly" -> equivalent to the average exclusion rate of the pool
    const excludedCount = neighborList.filter(n => !next.numbers.includes(n)).length;
    killRandomSuccess += (excludedCount / neighborList.length);

    // 3. Hot/Cold Kill (User's Idea: Pick Hottest in last 5 weeks)
    // Calc Freq in Prev 5
    const counts = {};
    prev5.forEach(r => r.numbers.forEach(n => counts[n] = (counts[n]||0) + 1));

    // Sort neighbors by this freq
    const sortedNeighbors = [...neighborList].sort((a,b) => (counts[b]||0) - (counts[a]||0));
    
    // Hottest Neighbor
    const hottest = sortedNeighbors[0];
    if (!next.numbers.includes(hottest)) {
        killHottestSuccess++;
    }

    // Coldest Neighbor
    const coldest = sortedNeighbors[sortedNeighbors.length-1];
    if (!next.numbers.includes(coldest)) {
        killColdestSuccess++;
    }
}

console.log(`Hottest(UserIdea): ${(killHottestSuccess / totalOpportunities * 100).toFixed(2)}%`);
