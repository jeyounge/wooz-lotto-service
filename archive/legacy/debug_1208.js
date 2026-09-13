import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'src', 'data', 'lottoHistory.json');

function debug1208() {
    const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
    const fullHistory = JSON.parse(rawData);
    
    // Sort Newest -> Oldest
    fullHistory.sort((a,b) => b.drwNo - a.drwNo);
    
    // 1208 is at index 0
    const target = fullHistory.find(r => r.drwNo === 1208);
    // Training data is everything AFTER 1208
    const training = fullHistory.filter(r => r.drwNo < 1208);
    
    console.log(`Analyzing Target Round: ${target.drwNo}`);
    console.log(`Winning Numbers: ${target.numbers.join(', ')}`);
    
    // 1. Check AC
    const nums = target.numbers;
    const diffs = new Set();
    for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            diffs.add(Math.abs(nums[i] - nums[j]));
        }
    }
    const ac = diffs.size - 5;
    console.log(`\n[metric] AC Value: ${ac} (Pass if >= 7) -> ${ac >= 7 ? 'PASS' : 'FAIL'}`);
    
    // 2. Check Sum
    const sum = nums.reduce((a,b)=>a+b, 0);
    console.log(`[metric] Sum: ${sum} (Pass if 90~180) -> ${sum >= 90 && sum <= 180 ? 'PASS' : 'FAIL'}`);

    // 3. Check Hot/Warm/Cold Balance (The suspect)
    // Build frequency map from training data
    const freq = {};
    for (let i = 1; i <= 45; i++) freq[i] = 0;
    training.forEach(r => r.numbers.forEach(n => freq[n]++));
    
    const ranked = Object.entries(freq)
        .sort((a,b) => b[1] - a[1]) // Descending
        .map(entry => parseInt(entry[0]));
        
    const hotPool = ranked.slice(0, 15);
    const warmPool = ranked.slice(15, 30);
    const coldPool = ranked.slice(30, 45);
    
    let hotCount = 0, warmCount = 0, coldCount = 0;
    
    target.numbers.forEach(n => {
        if (hotPool.includes(n)) hotCount++;
        else if (warmPool.includes(n)) warmCount++;
        else if (coldPool.includes(n)) coldCount++;
    });
    
    console.log(`\n[metric] Distribution:`);
    console.log(`Hot (1-15): ${hotCount} (Expected 2)`);
    console.log(`Warm (16-30): ${warmCount} (Expected 2)`);
    console.log(`Cold (31-45): ${coldCount} (Expected 2)`);
    
    const isBalanced = (hotCount === 2 && warmCount === 2 && coldCount === 2);
    console.log(`Rule Check -> ${isBalanced ? 'PASS' : 'FAIL'}`);
    
    if (!isBalanced) {
        console.log(`\nCONCLUSION: The algorithm forced a 2:2:2 mix, but the actual result was ${hotCount}:${warmCount}:${coldCount}.`);
        console.log(`We need to relax the strict 2:2:2 rule.`);
    }
}

debug1208();
