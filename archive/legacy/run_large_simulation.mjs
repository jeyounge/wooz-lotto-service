import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import LottoPredictor from './src/utils/LottoPredictor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const BATCHES = 100;
const ITERATIONS_PER_BATCH = 50000;
const TOTAL_RUNS = BATCHES * ITERATIONS_PER_BATCH;
const TARGET_DRW_NO = 1208; // Target for simulation

// Load History
const historyPath = path.join(__dirname, 'src/data/lottoHistory.json');
const rawHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

// Prepare Data
// 1. Target Round (Real 1208 Result)
const targetRound = rawHistory.find(h => h.drwNo === TARGET_DRW_NO);
if (!targetRound) {
    console.error(`Target round ${TARGET_DRW_NO} not found in history!`);
    process.exit(1);
}

// 2. Training Data (Up to 1207)
const trainingHistory = rawHistory.filter(h => h.drwNo < TARGET_DRW_NO);

console.log(`\n================================`);
console.log(`🎲 SIMULATION CONFIGURATION`);
console.log(`- Target Round: ${TARGET_DRW_NO}`);
console.log(`- Winning Numbers: [${targetRound.numbers.join(', ')}] + Bonus ${targetRound.bonus}`);
console.log(`- Training History: ${trainingHistory.length} rounds`);
console.log(`- Simulations: ${BATCHES} batches x ${ITERATIONS_PER_BATCH.toLocaleString()} runs`);
console.log(`- Total Predictions: ${TOTAL_RUNS.toLocaleString()}`);
console.log(`================================\n`);

// Helper: Check Rank
function checkRank(predNumbers, target) {
    const matchCount = predNumbers.filter(n => target.numbers.includes(n)).length;
    const isBonus = predNumbers.includes(target.bonus);

    if (matchCount === 6) return 1;
    if (matchCount === 5 && isBonus) return 2;
    if (matchCount === 5) return 3;
    if (matchCount === 4) return 4;
    if (matchCount === 3) return 5;
    return 0; // Miss
}

// Prize Constants (Approximate)
const PRIZES = {
    1: 2000000000,
    2: 50000000,
    3: 1500000,
    4: 50000,
    5: 5000,
    0: 0
};

// Simulation State
const globalStats = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 0: 0,
    cost: 0,
    revenue: 0
};

const batchResults = [];

// Execution
const startTime = Date.now();

// We reuse the predictor instance if it doesn't store state between predictions to save init time?
// LottoPredictor stores scores in `this.scores`. `predict()` uses randomness.
// However, `predict()` might be expensive if it loops 5000 times for validation. Use with care.
const predictor = new LottoPredictor(trainingHistory);

console.log(`Starting execution...`);

for (let b = 1; b <= BATCHES; b++) {
    const batchStats = { 1:0, 2:0, 3:0, 4:0, 5:0, 0:0 };
    
    for (let i = 0; i < ITERATIONS_PER_BATCH; i++) {
        // Run Prediction
        const result = predictor.predict(); 
        const nums = result.numbers;
        
        // Validation (Double check if validate worked)
        // const isValid = predictor.validate(nums); 
        // if(!isValid) console.warn("Invalid prediction generated!", nums);

        // Check Win
        const rank = checkRank(nums, targetRound);
        
        // Update Stats
        batchStats[rank]++;
        globalStats[rank]++;
        
        // Money
        globalStats.cost += 1000;
        globalStats.revenue += PRIZES[rank];
    }
    
    // Log Batch
    const batchRevenue = (batchStats[1]*PRIZES[1]) + (batchStats[2]*PRIZES[2]) + (batchStats[3]*PRIZES[3]) + (batchStats[4]*PRIZES[4]) + (batchStats[5]*PRIZES[5]);
    const batchCost = ITERATIONS_PER_BATCH * 1000;
    const batchProfit = batchRevenue - batchCost;
    
    batchResults.push({
        batchId: b,
        ...batchStats,
        cost: batchCost,
        revenue: batchRevenue,
        profit: batchProfit
    });

    // Progress Bar-ish
    process.stdout.write(b % 10 === 0 ? `${b}` : '.');
}

const endTime = Date.now();
const duration = (endTime - startTime) / 1000;

console.log(`\n\n✅ Simulation Completed in ${duration.toFixed(2)}s`);
console.log(`--------------------------------`);
console.log(`[ Global Results ]`);
console.log(`1st Places : ${globalStats[1]}`);
console.log(`2nd Places : ${globalStats[2]}`);
console.log(`3rd Places : ${globalStats[3]}`);
console.log(`4th Places : ${globalStats[4]}`);
console.log(`5th Places : ${globalStats[5]}`);
console.log(`Total Cost : ${globalStats.cost.toLocaleString()} KRW`);
console.log(`Revenue    : ${globalStats.revenue.toLocaleString()} KRW`);
console.log(`Profit     : ${(globalStats.revenue - globalStats.cost).toLocaleString()} KRW`);
console.log(`ROI        : ${(( (globalStats.revenue - globalStats.cost) / globalStats.cost ) * 100).toFixed(4)} %`);

// CSV Export
const csvHeader = "BatchID,1st,2nd,3rd,4th,5th,Miss,Cost,Revenue,Profit\n";
const csvRows = batchResults.map(r => 
    `${r.batchId},${r[1]},${r[2]},${r[3]},${r[4]},${r[5]},${r[0]},${r.cost},${r.revenue},${r.profit}`
).join('\n');

const csvContent = csvHeader + csvRows;
const csvPath = path.join(__dirname, 'simulation_results_100x50k.csv');

fs.writeFileSync(csvPath, csvContent, 'utf8');
console.log(`\n📁 Results saved to: ${csvPath}`);
