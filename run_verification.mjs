import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import LottoPredictor from './src/utils/LottoPredictor.js';
import LottoPredictorV2 from './src/utils/LottoPredictorV2.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const BATCHES = 20; // Smaller run for verification
const ITERATIONS_PER_BATCH = 10000;
const TARGET_DRW_NO = 1208;

const historyPath = path.join(__dirname, 'src/data/lottoHistory.json');
const rawHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

const targetRound = rawHistory.find(h => h.drwNo === TARGET_DRW_NO);
const trainingHistory = rawHistory.filter(h => h.drwNo < TARGET_DRW_NO);

const PRIZES = { 1: 2000000000, 2: 50000000, 3: 1500000, 4: 50000, 5: 5000, 0: 0 };

function checkRank(predNumbers, target) {
    const matchCount = predNumbers.filter(n => target.numbers.includes(n)).length;
    const isBonus = predNumbers.includes(target.bonus);
    if (matchCount === 6) return 1;
    if (matchCount === 5 && isBonus) return 2;
    if (matchCount === 5) return 3;
    if (matchCount === 4) return 4;
    if (matchCount === 3) return 5;
    return 0;
}

function runSim(StrategyClass, name) {
    console.log(`\nStarting ${name}...`);
    const predictor = new StrategyClass(trainingHistory);
    const stats = { 1:0, 2:0, 3:0, 4:0, 5:0, 0:0, cost:0, revenue:0 };

    for(let b=0; b<BATCHES; b++) {
        for(let i=0; i<ITERATIONS_PER_BATCH; i++) {
            const nums = predictor.predict().numbers;
            const rank = checkRank(nums, targetRound);
            stats[rank]++;
            stats.cost += 1000;
            stats.revenue += PRIZES[rank];
        }
        process.stdout.write('.');
    }
    
    return stats;
}

const v1 = runSim(LottoPredictor, "Version 1 (Original)");
const v2 = runSim(LottoPredictorV2, "Version 2 (Upgraded)");

console.log('\n\n=== Comparison Results ===');

function printStats(name, s) {
    console.log(`[${name}]`);
    console.log(`1st: ${s[1]}, 2nd: ${s[2]}, 3rd: ${s[3]}, 4th: ${s[4]}, 5th: ${s[5]}`);
    const profit = s.revenue - s.cost;
    console.log(`Profit: ${profit.toLocaleString()} KRW, ROI: ${((profit/s.cost)*100).toFixed(2)}%`);
}

printStats("V1", v1);
printStats("V2", v2);

if (v2.revenue > v1.revenue) {
    console.log(`\n✅ V2 Outperformed V1!`);
} else {
    console.log(`\n⚠️ V2 did not beat V1 in this run. Random variance applies.`);
}
