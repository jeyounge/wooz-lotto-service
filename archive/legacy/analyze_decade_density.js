
import fs from 'fs';
import path from 'path';

// Load History
const historyPath = path.resolve('src/data/lottoHistory.json');
const historyData = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));

console.log(`Analyzing ${historyData.length} rounds for Decade Density...\n`);

const patternCounts = {
    'Max_2': 0, // Maximum of 2 numbers from same decade
    'Max_3': 0, // Maximum of 3 numbers from same decade
    'Max_4': 0, // Maximum of 4 numbers from same decade
    'Max_5': 0, // Maximum of 5 numbers from same decade
    'Max_6': 0  // All 6 from same decade (Rare!)
};

const dominantDecadeCounts = {
    '1-9': 0,
    '10-19': 0,
    '20-29': 0,
    '30-39': 0,
    '40-45': 0
};

// Only count dominant decade when Density >= 3
const highDensityDecadeCounts = {
    '1-9': 0,
    '10-19': 0,
    '20-29': 0,
    '30-39': 0,
    '40-45': 0
};

historyData.forEach(round => {
    // Bucket current round
    const buckets = { '1-9':0, '10-19':0, '20-29':0, '30-39':0, '40-45':0 };
    
    round.numbers.forEach(num => {
        if (num < 10) buckets['1-9']++;
        else if (num < 20) buckets['10-19']++;
        else if (num < 30) buckets['20-29']++;
        else if (num < 40) buckets['30-39']++;
        else buckets['40-45']++;
    });

    // Find Max Density
    let maxDensity = 0;
    let dominantBuckets = [];

    Object.entries(buckets).forEach(([key, count]) => {
        if (count > maxDensity) {
            maxDensity = count;
            dominantBuckets = [key];
        } else if (count === maxDensity) {
            dominantBuckets.push(key);
        }
    });

    // Record Stats
    if (maxDensity >= 2) {
        patternCounts[`Max_${maxDensity}`] = (patternCounts[`Max_${maxDensity}`] || 0) + 1;
    }

    // Record Dominant Decade (If tie, record all involved)
    dominantBuckets.forEach(b => {
        dominantDecadeCounts[b]++;
        if (maxDensity >= 3) {
            highDensityDecadeCounts[b]++;
        }
    });
});

const total = historyData.length;

let output = "--- Density Pattern Probability ---\n";
Object.entries(patternCounts).forEach(([key, count]) => {
    if (count > 0) {
        output += `${key}: ${count} rounds (${(count/total*100).toFixed(1)}%)\n`;
    }
});

output += "\n--- High Density (3+) by Decade ---\n";
const sortedHigh = Object.entries(highDensityDecadeCounts).sort((a,b) => b[1] - a[1]);
sortedHigh.forEach(([key, count]) => {
    output += `[${key}]: ${count} times\n`;
});

fs.writeFileSync('density_result.txt', output);
console.log("Saved to density_result.txt");
