import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import LottoPredictorV3 from './src/utils/LottoPredictorV3.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const historyPath = path.join(__dirname, 'src/data/lottoHistory.json');
const rawHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

// Use FULL history (up to 1208) to predict for next round (1209)
const predictor = new LottoPredictorV3(rawHistory);

console.log(`KILL_NUMBERS: ${predictor.killList.join(', ')}`);
console.log(`REASONS:`);
Object.entries(predictor.killReasons).forEach(([k, v]) => console.log(`- ${k}: ${v}`));
