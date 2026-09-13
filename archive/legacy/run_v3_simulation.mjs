import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import LottoPredictorV3 from './src/utils/LottoPredictorV3.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load History
const historyPath = path.join(__dirname, 'src/data/lottoHistory.json');
const rawHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

// Target: 1208 (To verify)
const TARGET_ROUND_NO = 1208;
const targetRound = rawHistory.find(r => r.drwNo === TARGET_ROUND_NO);
const trainingHistory = rawHistory.filter(r => r.drwNo < TARGET_ROUND_NO);

if (!targetRound) {
    console.error("Target round 1208 not found in history data!");
    process.exit(1);
}

console.log(`\n=== 🔥 Lotto V3 (High Risk) Simulation ===`);
console.log(`Target: Round ${TARGET_ROUND_NO}`);
console.log(`Winning Numbers: ${targetRound.numbers.join(',')} + ${targetRound.bonus}`);

// Initialize V3
const predictor = new LottoPredictorV3(trainingHistory);

console.log(`\n[☠️ Kill List Selection]`);
predictor.killList.forEach(k => {
    console.log(`- Number ${k}: ${predictor.killReasons[k]}`);
});

// Check if Kill Failed (Risk Realized)
const kills = predictor.killList;
const winning = targetRound.numbers;
const bonus = targetRound.bonus;

const killedWinning = kills.filter(k => winning.includes(k));
const killedBonus = kills.includes(bonus);

if (killedWinning.length > 0) {
    console.log(`\n❌ [FAILURE] Kill Strategy Failed!`);
    console.log(`The following killed numbers appeared in 1st prize: ${killedWinning.join(', ')}`);
    console.log(`Maximum possible rank is limited.`);
} else {
    console.log(`\n✅ [SUCCESS] Kill Strategy Worked!`);
    console.log(`None of the killed numbers appeared in the winning 6.`);
    console.log(`Probability Boost Active! (Pool decreased to ${45 - kills.length})`);
}

// Simulation
console.log(`\nRunning 50,000 Predictions...`);
const stats = { 1:0, 2:0, 3:0, 4:0, 5:0, 0:0, cost:0, revenue:0 };
const PRIZES = { 
    1: targetRound.firstWinamnt, 
    2: 50000000, 
    3: 1500000, 
    4: 50000, 
    5: 5000 
};

function checkRank(pred, target) {
    const match = pred.filter(n => target.numbers.includes(n)).length;
    const bonusMatch = pred.includes(target.bonus);

    if (match === 6) return 1;
    if (match === 5 && bonusMatch) return 2;
    if (match === 5) return 3;
    if (match === 4) return 4;
    if (match === 3) return 5;
    return 0;
}

for(let i=0; i<50000; i++) {
    const { numbers } = predictor.predict();
    const rank = checkRank(numbers, targetRound);
    
    stats[rank]++;
    stats.cost += 1000;
    stats.revenue += (PRIZES[rank] || 0);

    if (i % 5000 === 0) process.stdout.write('.');
}

console.log(`\n\n=== Simulation Results (50,000 runs) ===`);
console.log(`1st (Jackpot): ${stats[1]}`);
console.log(`2nd (Bonus)  : ${stats[2]}`);
console.log(`3rd (Match 5): ${stats[3]}`);
console.log(`4th (Match 4): ${stats[4]}`);
console.log(`5th (Match 3): ${stats[5]}`);

const roi = ((stats.revenue - stats.cost) / stats.cost) * 100;
console.log(`\n💰 Cost: ${stats.cost.toLocaleString()}`);
console.log(`💰 Revenue: ${stats.revenue.toLocaleString()}`);
console.log(`📈 ROI: ${roi.toFixed(2)}%`);

if (roi > -50) console.log("🌟 Excellent Performance!");
else if (roi > -70) console.log("✨ Good Performance");
