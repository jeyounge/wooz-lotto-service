import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import LottoPredictorV4 from './src/utils/LottoPredictorV4.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const historyPath = path.join(__dirname, 'src/data/lottoHistory.json');
const rawHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

// Test Cases: Round 1210, 1209, 1208
const testRounds = [1210, 1209, 1208, 1207, 1206];

// Helper: Get Actual Result
function getResult(round) {
    if (round === 1210) return { numbers: [1, 7, 9, 17, 27, 38], bonus: 31 }; // Manual entry for 1210
    return rawHistory.find(r => r.drwNo === round);
}

console.log("=== V4 Backtest Report ===\n");

testRounds.forEach(round => {
    // 1. Prepare History (Up to round-1)
    const historyForRound = rawHistory.filter(r => r.drwNo < round);
    if (historyForRound.length === 0) return;

    // 2. Predict using V4
    const predictor = new LottoPredictorV4(historyForRound, { killCount: 5 }); // Test with 5 kills to see robustness
    
    // 3. Verify
    const result = getResult(round);
    if (!result) return;

    const kills = predictor.killList;
    const failures = kills.filter(k => result.numbers.includes(k));
    
    console.log(`[Round ${round}]`);
    console.log(`- Kill List: [${kills.join(', ')}]`);
    console.log(`- Reasons:`);
    kills.forEach(k => console.log(`  * ${k}: ${predictor.killReasons[k]}`));
    
    if (failures.length > 0) {
        console.log(`❌ FAILURE: Excluded Winning Numbers: [${failures.join(', ')}]`);
    } else {
        console.log(`✅ SUCCESS: Safe Exclusion`);
    }
    console.log("");
});
