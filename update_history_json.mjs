/**
 * update_history_json.mjs
 * data.soledot.com에서 최신 회차 데이터를 가져와 lottoHistory.json에 추가합니다.
 * 실행: node update_history_json.mjs
 */
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_PATH = path.join(__dirname, 'src', 'data', 'lottoHistory.json');
const BASE_URL = 'https://data.soledot.com/lottowinnumberdetail/fo';

function estimateLatestDrwNo() {
    const baseRound = 1100;
    const baseDate = new Date('2023-12-30T20:45:00+09:00');
    const diffWeeks = Math.floor((Date.now() - baseDate) / (7 * 24 * 60 * 60 * 1000));
    return baseRound + diffWeeks;
}

async function fetchRound(drwNo) {
    const url = `${BASE_URL}/${drwNo}/lottowinnumberdetailview.sd`;
    const res = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'ko-KR,ko;q=0.9',
            'Referer': 'https://data.soledot.com/',
        },
        timeout: 15000,
    });

    const html = res.data;

    // 번호 추출: <strong>숫자</strong> inside circleNumber
    const numMatches = [...html.matchAll(/class="[^"]*circleNumber[^"]*"[^>]*><strong>(\d{1,2})<\/strong>/g)];
    if (numMatches.length < 7) {
        // 아직 미개최 회차이거나 페이지 구조 다름
        return null;
    }

    const allNums = numMatches.map(m => parseInt(m[1]));
    const numbers = allNums.slice(0, 6).sort((a, b) => a - b);
    const bonus = allNums[6];

    // 날짜 추출: 발표일 다음 td
    const dateMatch = html.match(/발표일<\/th>\s*<td[^>]*>([\d\-\.]+)/);
    const drwNoDate = dateMatch ? dateMatch[1].trim().replace(/\./g, '-') : '';

    // 1등 정보
    const firstPrizeMatch = html.match(/1등[\s\S]*?<span class="text-success">(\d[\d,]*)\s*명?<\/span>[\s\S]*?<span class="text-success">([\d,]+)/);
    const firstPrzwnerCo = firstPrizeMatch ? parseInt(firstPrizeMatch[1].replace(/,/g, '')) : 0;
    const firstWinamnt   = firstPrizeMatch ? parseInt(firstPrizeMatch[2].replace(/,/g, '')) : 0;

    return { drwNo: parseInt(drwNo), drwNoDate, numbers, bonus, firstWinamnt, firstPrzwnerCo };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    const existing = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
    const existingNos = new Set(existing.map(d => d.drwNo));
    const latestExisting = Math.max(...existingNos);
    const estimatedLatest = estimateLatestDrwNo();

    console.log(`현재 JSON 최신 회차: ${latestExisting}`);
    console.log(`예상 최신 회차: ${estimatedLatest}`);

    const toFetch = [];
    for (let n = latestExisting + 1; n <= estimatedLatest; n++) {
        if (!existingNos.has(n)) toFetch.push(n);
    }

    if (toFetch.length === 0) {
        console.log('✅ 이미 최신 상태입니다.');
        return;
    }
    console.log(`업데이트 필요: ${toFetch[0]} ~ ${toFetch[toFetch.length - 1]} (${toFetch.length}회차)\n`);

    const newEntries = [];
    for (const drwNo of toFetch) {
        process.stdout.write(`  ${drwNo}회차 가져오는 중...`);
        try {
            const data = await fetchRound(drwNo);
            if (!data) {
                console.log(` ⚠️ 아직 미개최 또는 데이터 없음`);
                break;
            }
            newEntries.push(data);
            console.log(` ✅ ${data.drwNoDate}  ${data.numbers.join(', ')}  보너스:${data.bonus}`);
            await sleep(400);
        } catch (e) {
            console.log(` ❌ 실패: ${e.message}`);
        }
    }

    if (newEntries.length === 0) {
        console.log('\n추가된 데이터 없음.');
        return;
    }

    const merged = [...existing, ...newEntries].sort((a, b) => b.drwNo - a.drwNo);
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(merged, null, 2), 'utf8');
    console.log(`\n✅ ${newEntries.length}개 추가 완료. 총 ${merged.length}회차.`);
}

main().catch(console.error);
