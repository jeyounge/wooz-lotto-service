import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import LottoPredictorV3 from './src/utils/LottoPredictorV3.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const historyPath = path.join(__dirname, 'src/data/lottoHistory.json');
const rawHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

const TARGET_ROUND_NO = 1208;
const trainingHistory = rawHistory.filter(r => r.drwNo < TARGET_ROUND_NO);

const predictor = new LottoPredictorV3(trainingHistory);

console.log(`KILL_NUMBERS: ${predictor.killList.join(', ')}`);
console.log(`KILL_NUMBERS: ${predictor.killList.join(', ')}`);
const target = rawHistory.find(r => r.drwNo === TARGET_ROUND_NO);
if (target) {
    const winning = target.numbers;
    const bonus = target.bonus;
    console.log(`\nTarget Round ${TARGET_ROUND_NO} Result: ${winning.join(',')} + ${bonus}`);
    
    const failMain = predictor.killList.filter(k => winning.includes(k));
    const failBonus = predictor.killList.includes(bonus);
    
    if (failMain.length > 0) {
        console.log(`❌ FAIL: Killed numbers [${failMain.join(', ')}] appeared in Main Numbers!`);
    } else if (failBonus) {
         console.log(`⚠️ WARNING: Killed number appeared in Bonus (Safe for 1st, but missed 2nd)`);
    } else {
        console.log(`✅ SUCCESS: All killed numbers were safe!`);
    }
}
