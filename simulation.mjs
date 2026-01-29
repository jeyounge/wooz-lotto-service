import LottoPredictor from './src/utils/LottoPredictor.js';
import fs from 'fs';

// Load History
const historyData = JSON.parse(fs.readFileSync('./src/data/lottoHistory.json', 'utf8'));
const TARGET_DRW_NO = 1208;
const targetRound = historyData.find(h => h.drwNo === TARGET_DRW_NO);
const trainHistory = historyData.filter(h => h.drwNo < TARGET_DRW_NO);

if (!targetRound) process.exit(1);

const predictor = new LottoPredictor(trainHistory);

function getRank(prediction, winningNums, bonusNum) {
    const matchCount = prediction.filter(n => winningNums.includes(n)).length;
    const isBonusMatch = prediction.includes(bonusNum);

    if (matchCount === 6) return 1;
    if (matchCount === 5 && isBonusMatch) return 2;
    if (matchCount === 5) return 3;
    if (matchCount === 4) return 4;
    if (matchCount === 3) return 5;
    return -1; // Fail
}

const ITERATIONS = 50000;

console.log(`=============================================`);
console.log(`📊 Simulation: 50,000 Iterations`);
console.log(`- Target: 1208회 (${targetRound.numbers.join(',')} + ${targetRound.bonus})`);
console.log(`=============================================\n`);

// Stats Holder
const stats = {
    random: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, fail: 0 },
    logic: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, fail: 0 }
};

// 1. Random
console.log(`🎲 [Random] Running ${ITERATIONS.toLocaleString()}...`);
const poolBase = Array.from({length: 45}, (_, k) => k + 1);

for (let i = 0; i < ITERATIONS; i++) {
    const nums = [];
    const pool = [...poolBase];
    for(let j=0; j<6; j++) {
        const idx = Math.floor(Math.random() * pool.length);
        nums.push(pool[idx]);
        pool.splice(idx, 1);
    }
    nums.sort((a,b) => a-b);
    
    const rank = getRank(nums, targetRound.numbers, targetRound.bonus);
    if (rank !== -1) stats.random[rank]++;
    else stats.random.fail++;
    
    if (i % 10000 === 0 && i>0) process.stdout.write('.');
}
console.log(' Done.');

// 2. Logic
console.log(`🤖 [Woozett Logic] Running ${ITERATIONS.toLocaleString()}...`);
for (let i = 0; i < ITERATIONS; i++) {
    const result = predictor.predict();
    const rank = getRank(result.numbers, targetRound.numbers, targetRound.bonus);
    if (rank !== -1) stats.logic[rank]++;
    else stats.logic.fail++;
    
    if (i % 10000 === 0 && i>0) process.stdout.write('.');
}
console.log(' Done.');

// Report
console.log(`\n=============================================`);
console.log(`🏆 FINAL RESULT (${ITERATIONS.toLocaleString()} runs)`);
console.log(`=============================================`);
console.log(`Rank\t\tRandom\t\tWoozett Logic`);
console.log(`---------------------------------------------`);
console.log(`1st (6)\t\t${stats.random[1]}\t\t${stats.logic[1]}`);
console.log(`2nd (5+B)\t${stats.random[2]}\t\t${stats.logic[2]}`);
console.log(`3rd (5)\t\t${stats.random[3]}\t\t${stats.logic[3]}`);
console.log(`4th (4)\t\t${stats.random[4]}\t\t${stats.logic[4]}`);
console.log(`5th (3)\t\t${stats.random[5]}\t\t${stats.logic[5]}`);
console.log(`Fail\t\t${stats.random.fail.toLocaleString()}\t\t${stats.logic.fail.toLocaleString()}`);
console.log(`---------------------------------------------`);

const randomTotal = stats.random[1] + stats.random[2] + stats.random[3] + stats.random[4] + stats.random[5];
const logicTotal = stats.logic[1] + stats.logic[2] + stats.logic[3] + stats.logic[4] + stats.logic[5];

console.log(`Total Wins\t${randomTotal}\t\t${logicTotal}`);
console.log(`Win Rate\t${(randomTotal/ITERATIONS*100).toFixed(2)}%\t\t${(logicTotal/ITERATIONS*100).toFixed(2)}%`);
if (randomTotal > 0) {
    console.log(`Performance\t1.0x (Base)\t${(logicTotal/randomTotal).toFixed(2)}x Better`);
}
