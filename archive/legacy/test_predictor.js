import LottoPredictorV4 from './src/utils/LottoPredictorV4.js';
import fs from 'fs';
const history = JSON.parse(fs.readFileSync('./src/data/lottoHistory.json', 'utf8'));

const results = new Set();
for (let i = 0; i < 100; i++) {
    const p = new LottoPredictorV4(history, { killCount: 3 });
    results.add(p.killList.join(','));
}
console.log('Unique results count:', results.size);
console.log('Results output:', Array.from(results));
