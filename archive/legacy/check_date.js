import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'src', 'data', 'lottoHistory.json');

function analyzeDates() {
    try {
        const fileData = fs.readFileSync(DATA_FILE, 'utf-8');
        const history = JSON.parse(fileData);

        let totalDraws = history.length;
        let monthHit = 0;
        let dayHit = 0;
        let bothHit = 0;
        let eitherHit = 0;

        let recentHits = [];

        history.forEach(draw => {
            const dateStr = draw.drwNoDate || draw.drw_date;
            if (!dateStr) return;

            // Expected format: YYYY-MM-DD
            const parts = dateStr.split('-');
            if (parts.length !== 3) return;

            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);

            const hasMonth = draw.numbers.includes(month);
            const hasDay = draw.numbers.includes(day);

            if (hasMonth) monthHit++;
            if (hasDay) dayHit++;
            if (hasMonth && hasDay) bothHit++;
            if (hasMonth || hasDay) eitherHit++;

            if ((hasMonth || hasDay) && recentHits.length < 5) {
                recentHits.push({
                    round: draw.drwNo,
                    date: dateStr,
                    numbers: draw.numbers,
                    month,
                    day,
                    hasMonth,
                    hasDay
                });
            }
        });

        console.log(`\n=== 추첨일(월/일) 적중 분석 결과 ===`);
        console.log(`분석 대상: 총 ${totalDraws}회차`);
        console.log(`-----------------------------------`);
        console.log(`- 월(${monthHit}회) 일치 확률: ${((monthHit / totalDraws) * 100).toFixed(2)}%`);
        console.log(`- 일(${dayHit}회) 일치 확률: ${((dayHit / totalDraws) * 100).toFixed(2)}%`);
        console.log(`- 월, 일 모두 일치 확률: ${((bothHit / totalDraws) * 100).toFixed(2)}%`);
        console.log(`- 월 또는 일 중 하나라도 일치 확률: ${((eitherHit / totalDraws) * 100).toFixed(2)}%`);
        console.log(`\n[최근 적중 회차 예시 (Top 5)]`);
        recentHits.forEach(hit => {
            console.log(`- ${hit.round}회 (${hit.date}): 당첨번호 [${hit.numbers.join(', ')}] -> ${hit.hasMonth ? `월(${hit.month}) 적중 ` : ''}${hit.hasDay ? `일(${hit.day}) 적중` : ''}`);
        });

    } catch (e) {
        console.error("데이터 분석 실패:", e);
    }
}

analyzeDates();
