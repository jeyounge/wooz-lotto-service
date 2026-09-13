/**
 * backfill_kill_stats.js
 * 
 * 전체 로또 히스토리에 대해 3-kill / 5-kill 전략을 역산하고
 * Supabase kill_records 테이블에 저장합니다.
 * 
 * Usage: node backfill_kill_stats.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
const envPath = path.join(__dirname, '.env');
let envConfig = {};
try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim();
            envConfig[key] = val;
        }
    });
} catch (e) { console.warn('Could not load .env', e); }

const supabase = createClient(
    envConfig.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    envConfig.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

/**
 * LottoPredictorV4의 applyKillStrategy 순수 함수 버전
 * @param {Array} history - 과거 회차 배열 (drwNo 내림차순 정렬됨)
 * @param {number} killCount - 킬 번호 개수 (3 or 5)
 * @returns {{ killList: number[], killReasons: object }}
 */
function computeKillStrategy(history, killCount) {
    if (!history || history.length < 15) {
        return { killList: [], killReasons: {} };
    }

    const sorted = [...history].sort((a, b) => b.drwNo - a.drwNo);
    const kills = new Set();
    const killReasons = {};

    // Hot Safety Valve: 최근 10주에 3회 이상 출현 = HOT
    const last10 = sorted.slice(0, 10);
    const counts10 = {};
    last10.forEach(r => r.numbers.forEach(n => counts10[n] = (counts10[n] || 0) + 1));
    const isHot = (num) => (counts10[num] || 0) >= 3;

    const addKill = (num, reason) => {
        if (kills.size >= killCount) return;
        if (!kills.has(num)) {
            kills.add(num);
            killReasons[num] = reason;
        }
    };

    // Priority 1: 3-Consecutive (최근 3회 연속 출현)
    const r0 = sorted[0].numbers;
    const r1 = sorted[1].numbers;
    const r2 = sorted[2].numbers;
    for (let i = 1; i <= 45; i++) {
        if (r0.includes(i) && r1.includes(i) && r2.includes(i)) {
            addKill(i, '3-Consecutive (3주 연속 출현)');
            break;
        }
    }

    // Priority 2: Last Bonus Number
    if (kills.size < killCount) {
        const lastBonus = sorted[0].bonus;
        if (lastBonus) addKill(lastBonus, 'Last Bonus (직전 보너스)');
    }

    // Priority 3: Weakest of Hot Digit (안전장치 적용)
    if (kills.size < killCount) {
        const last5 = sorted.slice(0, 5);
        const digitsCount = {};
        const numCounts = {};
        last5.forEach(r => {
            r.numbers.forEach(n => {
                const digit = n % 10;
                digitsCount[digit] = (digitsCount[digit] || 0) + 1;
                numCounts[n] = (numCounts[n] || 0) + 1;
            });
        });

        const hottestDigitEntry = Object.entries(digitsCount).sort((a, b) => b[1] - a[1])[0];
        if (hottestDigitEntry) {
            const targetDigit = parseInt(hottestDigitEntry[0]);
            const candidates = [];
            for (let i = 1; i <= 45; i++) {
                if (i % 10 === targetDigit) candidates.push(i);
            }
            candidates.sort((a, b) => (numCounts[a] || 0) - (numCounts[b] || 0));
            for (const cand of candidates) {
                if (isHot(cand)) continue;
                addKill(cand, `Weakest of Hot Digit ${targetDigit}`);
                if (kills.size >= killCount) break;
            }
        }
    }

    // Priority 4: Coldest Numbers (Filler)
    if (kills.size < killCount) {
        const allNums = Array.from({ length: 45 }, (_, i) => i + 1);
        allNums.sort((a, b) => (counts10[a] || 0) - (counts10[b] || 0));
        for (const cand of allNums) {
            if (isHot(cand)) continue;
            addKill(cand, `Coldest Number (최근 10주 ${counts10[cand] || 0}회)`);
            if (kills.size >= killCount) break;
        }
    }

    return { killList: Array.from(kills), killReasons };
}

async function main() {
    const historyPath = path.join(__dirname, 'src', 'data', 'lottoHistory.json');
    const history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
    // 오름차순 정렬 (오래된 것부터)
    const sorted = [...history].sort((a, b) => a.drwNo - b.drwNo);

    console.log(`\n📦 Total rounds: ${sorted.length}`);
    console.log('Computing kill stats for each round...\n');

    let success = 0;
    let fail = 0;
    const MIN_HISTORY = 15; // 최소 15개 회차 이후부터 계산

    for (let idx = MIN_HISTORY; idx < sorted.length; idx++) {
        const round = sorted[idx];
        // 이 회차 직전까지의 데이터만 사용 (당시 조건 재현)
        const prevData = sorted.slice(0, idx);

        // 3-kill 계산
        const kill3 = computeKillStrategy(prevData, 3);
        const kill3HitCount = kill3.killList.filter(k => round.numbers.includes(k)).length;
        const kill3Success = kill3HitCount === 0;

        // 5-kill 계산
        const kill5 = computeKillStrategy(prevData, 5);
        const kill5HitCount = kill5.killList.filter(k => round.numbers.includes(k)).length;
        const kill5Success = kill5HitCount === 0;

        const payload = {
            drw_no:          round.drwNo,
            actual_numbers:  round.numbers,

            kill3_list:      kill3.killList,
            kill3_reasons:   kill3.killReasons,
            kill3_hit_count: kill3HitCount,
            kill3_success:   kill3Success,

            kill5_list:      kill5.killList,
            kill5_reasons:   kill5.killReasons,
            kill5_hit_count: kill5HitCount,
            kill5_success:   kill5Success,
        };

        const { error } = await supabase.rpc('upsert_kill_record', {
            p_drw_no:          payload.drw_no,
            p_actual_numbers:  payload.actual_numbers,
            p_kill3_list:      payload.kill3_list,
            p_kill3_reasons:   payload.kill3_reasons,
            p_kill3_hit_count: payload.kill3_hit_count,
            p_kill3_success:   payload.kill3_success,
            p_kill5_list:      payload.kill5_list,
            p_kill5_reasons:   payload.kill5_reasons,
            p_kill5_hit_count: payload.kill5_hit_count,
            p_kill5_success:   payload.kill5_success,
        });

        if (error) {
            console.error(`  ❌ Round ${round.drwNo}:`, error.message);
            fail++;
        } else {
            success++;
            process.stdout.write(`\r✅ Processed: ${success} / ${sorted.length - MIN_HISTORY}`);
        }

        // Rate limit 방지
        await new Promise(r => setTimeout(r, 50));
    }

    // 통계 요약 출력
    const allRecords = sorted.slice(MIN_HISTORY);
    const kill3SuccessCount = allRecords.filter((r, i) => {
        const prevData = sorted.slice(0, i + MIN_HISTORY);
        const kill3 = computeKillStrategy(prevData, 3);
        return kill3.killList.filter(k => r.numbers.includes(k)).length === 0;
    }).length;

    console.log(`\n\n${'='.repeat(50)}`);
    console.log(`✅ Success: ${success} / Failed: ${fail}`);
    console.log(`${'='.repeat(50)}`);
    console.log('\n🎉 Done! kill_records table populated.');
}

main();
