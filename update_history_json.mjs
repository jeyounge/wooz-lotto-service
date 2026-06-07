/**
 * update_history_json.mjs
 * lottoHistory.json을 최신 회차까지 업데이트합니다.
 * Supabase 불필요, JSON 파일만 수정.
 *
 * 실행: node update_history_json.mjs
 */
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_PATH = path.join(__dirname, 'src', 'data', 'lottoHistory.json');

// 동행복권 공식 API
const OFFICIAL_API = (drwNo) =>
    `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${drwNo}`;

async function fetchJson(url) {
    const res = await axios.get(url, {
        maxRedirects: 5,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'application/json, text/javascript, */*',
            'Referer': 'https://www.dhlottery.co.kr/',
        },
        timeout: 10000,
    });
    if (typeof res.data === 'string') return JSON.parse(res.data);
    return res.data;
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// 현재 토요일 기준 예상 최신 회차 계산
function estimateLatestDrwNo() {
    // 1회차: 2002-12-07 토요일
    const first = new Date('2002-12-07');
    const now = new Date();
    const diffMs = now - first;
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    return diffWeeks + 1;
}

async function main() {
    // 1. 기존 히스토리 로드
    const existing = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
    const existingNos = new Set(existing.map(d => d.drwNo));
    const latestExisting = Math.max(...existingNos);
    const estimatedLatest = estimateLatestDrwNo();

    console.log(`현재 JSON 최신 회차: ${latestExisting}`);
    console.log(`예상 최신 회차: ${estimatedLatest}`);
    console.log(`업데이트 필요 회차: ${latestExisting + 1} ~ ${estimatedLatest}`);
    console.log('');

    const toFetch = [];
    for (let n = latestExisting + 1; n <= estimatedLatest; n++) {
        if (!existingNos.has(n)) toFetch.push(n);
    }

    if (toFetch.length === 0) {
        console.log('✅ 이미 최신 상태입니다.');
        return;
    }

    const newEntries = [];
    let failed = [];

    for (const drwNo of toFetch) {
        process.stdout.write(`  ${drwNo}회차 가져오는 중...`);
        try {
            const data = await fetchJson(OFFICIAL_API(drwNo));

            if (data.returnValue !== 'success') {
                console.log(` ⚠️ 아직 미개최 (returnValue: ${data.returnValue})`);
                break; // 아직 없는 회차면 이후도 없음
            }

            const entry = {
                drwNo: data.drwNo,
                drwNoDate: data.drwNoDate,
                numbers: [
                    data.drwtNo1, data.drwtNo2, data.drwtNo3,
                    data.drwtNo4, data.drwtNo5, data.drwtNo6
                ].sort((a, b) => a - b),
                bonus: data.bnusNo,
                firstWinamnt: data.firstWinamnt || 0,
                firstPrzwnerCo: data.firstPrzwnerCo || 0,
                secondWinamnt: data.secondWinamnt || 0,
                secondPrzwnerCo: data.secondPrzwnerCo || 0,
                thirdWinamnt: data.thirdWinamnt || 0,
                thirdPrzwnerCo: data.thirdPrzwnerCo || 0,
                fourthWinamnt: data.fourthWinamnt || 0,
                fourthPrzwnerCo: data.fourthPrzwnerCo || 0,
                fifthWinamnt: data.fifthWinamnt || 0,
                fifthPrzwnerCo: data.fifthPrzwnerCo || 0,
            };

            newEntries.push(entry);
            console.log(` ✅ ${data.drwNoDate} ${JSON.stringify(entry.numbers)} bonus:${entry.bonus}`);
            await sleep(300); // 서버 부하 방지
        } catch (e) {
            console.log(` ❌ 실패: ${e.message}`);
            failed.push(drwNo);
        }
    }

    if (newEntries.length === 0) {
        console.log('\n추가된 데이터가 없습니다.');
        return;
    }

    // 2. 기존 데이터 + 신규 데이터 병합 후 정렬
    const merged = [...existing, ...newEntries]
        .sort((a, b) => b.drwNo - a.drwNo); // 최신순

    // 3. JSON 파일 저장
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(merged, null, 2), 'utf8');

    console.log(`\n✅ ${newEntries.length}개 회차 추가 완료.`);
    console.log(`   파일: ${HISTORY_PATH}`);
    if (failed.length > 0) {
        console.log(`⚠️  실패한 회차: ${failed.join(', ')}`);
    }
}

main().catch(console.error);
