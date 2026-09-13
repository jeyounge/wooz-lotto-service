import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import LottoPredictorV5 from './src/utils/LottoPredictorV5.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const historyPath = path.join(__dirname, 'src/data/lottoHistory.json');
const rawHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

const TARGET_ROUND_NO = 1223;
// 1223회차 예측을 위해 1222회차까지의 데이터를 사용합니다.
const trainingHistory = rawHistory.filter(r => r.drwNo < TARGET_ROUND_NO);

const predictor5 = new LottoPredictorV5(trainingHistory, { killCount: 5 });
const predictor10 = new LottoPredictorV5(trainingHistory, { killCount: 10 });

console.log(`--- ${TARGET_ROUND_NO}회차 5-KILL ---`);
console.log(`제외된 번호: ${predictor5.killList.join(', ')}`);
console.log(`제외 사유:`);
for (const num of predictor5.killList) {
    console.log(`  - ${num}: ${predictor5.killReasons[num]}`);
}

console.log(`\n--- ${TARGET_ROUND_NO}회차 10-KILL ---`);
console.log(`제외된 번호: ${predictor10.killList.join(', ')}`);
console.log(`제외 사유:`);
for (const num of predictor10.killList) {
    console.log(`  - ${num}: ${predictor10.killReasons[num]}`);
}
