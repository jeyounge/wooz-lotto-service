import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import LottoPredictorV3 from './src/utils/LottoPredictorV3.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const historyPath = path.join(__dirname, 'src/data/lottoHistory.json');
const rawHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

// Target Round 1210: Use history up to 1209
const TARGET_ROUND = 1210;
const historyFor1210 = rawHistory.filter(r => r.drwNo < TARGET_ROUND);

console.log(`Analyzing for Round ${TARGET_ROUND} using ${historyFor1210.length} records...`);

const predictor = new LottoPredictorV3(historyFor1210);

console.log(`\n=== Round ${TARGET_ROUND} Prediction (3-Kill) ===`);
console.log(`KILL_NUMBERS: [${predictor.killList.join(', ')}]`);
Object.entries(predictor.killReasons).forEach(([k, v]) => console.log(`- ${k}: ${v}`));

console.log(`\n=== Round ${TARGET_ROUND} Prediction (5-Kill) ===`);
const predictor5 = new LottoPredictorV3(historyFor1210, { killCount: 5 });
console.log(`KILL_NUMBERS: [${predictor5.killList.join(', ')}]`);
Object.entries(predictor5.killReasons).forEach(([k, v]) => console.log(`- ${k}: ${v}`));
