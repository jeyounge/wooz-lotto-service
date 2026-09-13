
import fs from 'fs';
import LottoPredictor from './src/utils/LottoPredictor.js';

// 1. Data Setup
// Load history from JSON file
const rawData = fs.readFileSync('./src/data/lottoHistory.json', 'utf8');
const fullHistory = JSON.parse(rawData);

// Target: Round 1208 (The latest one in file)
const targetRound = fullHistory.find(h => h.drwNo === 1208);
if (!targetRound) {
    console.error("Target round 1208 not found!");
    process.exit(1);
}

// Training Data: All rounds BEFORE 1208 (1207 and older)
const trainingHistory = fullHistory.filter(h => h.drwNo < 1208);

console.log(`🎯 Simulation Target: Round 1208`);
console.log(`Winning Numbers: [${targetRound.numbers.join(', ')}] + Bonus ${targetRound.bonus}`);
console.log(`📚 Training Data: ${trainingHistory.length} rounds (Up to 1207)`);
console.log(`---------------------------------------------------`);

// 2. Initialize Predictor
const predictor = new LottoPredictor(trainingHistory);

// 3. Helper: Check Win
function checkWin(predNumbers, target) {
    const matchCount = predNumbers.filter(n => target.numbers.includes(n)).length;
    const isBonus = predNumbers.includes(target.bonus);

    if (matchCount === 6) return '1등';
    if (matchCount === 5 && isBonus) return '2등';
    if (matchCount === 5) return '3등';
    if (matchCount === 4) return '4등';
    if (matchCount === 3) return '5등';
    return '낙첨';
}

// 4. Run Simulation
const ITERATIONS = 50000;
const results = {
    random: { '1등':0, '2등':0, '3등':0, '4등':0, '5등':0, '낙첨':0 },
    logic:  { '1등':0, '2등':0, '3등':0, '4등':0, '5등':0, '낙첨':0 }
};

console.log(`🚀 Running ${ITERATIONS.toLocaleString()} simulations...`);

const start = Date.now();

// Pure Random
function getPureRandom() {
    const pool = Array.from({length:45}, (_,i)=>i+1);
    const selection = [];
    for(let i=0; i<6; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        selection.push(pool.splice(idx, 1)[0]);
    }
    return selection.sort((a,b)=>a-b);
}

for(let i=0; i<ITERATIONS; i++) {
    // Random
    const rSet = getPureRandom();
    results.random[checkWin(rSet, targetRound)]++;

    // Logic
    // predictor.predict() returns { numbers: [...], analysis: ... }
    const lSet = predictor.predict().numbers; 
    results.logic[checkWin(lSet, targetRound)]++;
    
    if (i % 5000 === 0) process.stdout.write('.');
}

console.log('\n\n✅ Simulation Complete!');
console.log(`Time: ${(Date.now() - start)/1000}s`);

// 5. Output Table
console.log(`\n### 📊 Simulation Results (Target: Round 1208)`);
console.log(`Total Runs: ${ITERATIONS.toLocaleString()}\n`);
console.log(`| Rank | Pure Random | Lotto 2.1 Algorithm | Change |`);
console.log(`| :--- | :---: | :---: | :---: |`);

['1등', '2등', '3등', '4등', '5등', '낙첨'].forEach(rank => {
    const r = results.random[rank];
    const l = results.logic[rank];
    const diff = l - r;
    const sign = diff > 0 ? '+' : '';
    console.log(`| ${rank} | ${r} | ${l} | ${sign}${diff} |`);
});

// Calculate ROI (Approximate)
// Prize assumptions: 1st(2B), 2nd(50M), 3rd(1.5M), 4th(50k), 5th(5k)
// Ticket cost: 1,000 KRW
function calcEarnings(res) {
    const revenue = 
        (res['1등'] * 2000000000) +
        (res['2등'] * 50000000) +
        (res['3등'] * 1500000) +
        (res['4등'] * 50000) +
        (res['5등'] * 5000);
    const cost = ITERATIONS * 1000;
    return { revenue, cost, profit: revenue - cost };
}

const rFin = calcEarnings(results.random);
const lFin = calcEarnings(results.logic);

console.log(`\n### 💰 Financial Analysis`);
console.log(`**Random**: Cost ${rFin.cost.toLocaleString()} / Earn ${rFin.revenue.toLocaleString()} / Net ${rFin.profit.toLocaleString()}`);
console.log(`**Logic**: Cost ${lFin.cost.toLocaleString()} / Earn ${lFin.revenue.toLocaleString()} / Net ${lFin.profit.toLocaleString()}`);

