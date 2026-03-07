import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'src', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'lottoHistory.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load Env manually to avoid dotenv issues in ESM
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
} catch (e) {
    console.warn("Could not load .env file", e);
}

// Setup Supabase (Force URLs from env if possible, or fallback)
const supabase = createClient(
    envConfig.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    envConfig.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

// ... (existing code)

const BASE_URL = 'https://data.soledot.com/lottowinnumber/fo/lottowinnumberlist.sd';

/**
 * LottoPredictorV4 Logic Ported for Node.js
 */
function computeKillStrategy(history, killCount) {
    if (!history || history.length < 15) {
        return { killList: [], killReasons: {} };
    }

    const sorted = [...history].sort((a, b) => b.drwNo - a.drwNo);
    const kills = new Set();
    const killReasons = {};

    // Hot Safety Valve
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

    // Priority 1: 3-Consecutive
    const r0 = sorted[0].numbers;
    const r1 = sorted[1].numbers;
    const r2 = sorted[2].numbers;
    for (let i = 1; i <= 45; i++) {
        if (r0.includes(i) && r1.includes(i) && r2.includes(i)) {
            addKill(i, '3-Consecutive (3주 연속 출현)');
            break;
        }
    }

    // Priority 2: Last Bonus
    if (kills.size < killCount) {
        const lastBonus = sorted[0].bonus;
        if (lastBonus) addKill(lastBonus, 'Last Bonus (직전 보너스)');
    }

    // Priority 3: Weakest of Hot Digit
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

    // Priority 4: Coldest Numbers
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

async function syncToDB(round, fullHistory) {
    console.log(`[DB Sync] Syncing Round ${round.drwNo}...`);
    const params = {
        p_drw_no: round.drwNo,
        p_drw_date: round.drwNoDate,
        p_numbers: round.numbers,
        p_bonus: round.bonus,
        p_first_win_amnt: round.firstWinamnt || 0,
        p_first_przwner_co: round.firstPrzwnerCo || 0,
        p_second_win_amnt: round.secondWinamnt || 0,
        p_second_przwner_co: round.secondPrzwnerCo || 0,
        p_third_win_amnt: round.thirdWinamnt || 0,
        p_third_przwner_co: round.thirdPrzwnerCo || 0,
        p_fourth_win_amnt: round.fourthWinamnt || 50000,
        p_fourth_przwner_co: round.fourthPrzwnerCo || 0,
        p_fifth_win_amnt: round.fifthWinamnt || 5000,
        p_fifth_przwner_co: round.fifthPrzwnerCo || 0,
        p_total_sell_amnt: round.totalSellAmnt || 0,
        p_first_how: round.firstHow || ''
    };

    const { error } = await supabase.rpc('sync_lotto_round', params);

    if (error) {
        console.error(`❌ [DB Sync] Error ${round.drwNo}:`, error.message);
    } else {
        console.log(`✅ [DB Sync] Success ${round.drwNo}`);

        // --- ALSO SYNC KILL RECORDS ---
        if (fullHistory) {
            // Filter history strictly BEFORE this round
            const prevData = fullHistory.filter(h => h.drwNo < round.drwNo);

            if (prevData.length >= 15) {
                // 3-Kill
                const kill3 = computeKillStrategy(prevData, 3);
                const kill3HitCount = kill3.killList.filter(k => round.numbers.includes(k)).length;
                const kill3Success = kill3HitCount === 0;

                // 5-Kill
                const kill5 = computeKillStrategy(prevData, 5);
                const kill5HitCount = kill5.killList.filter(k => round.numbers.includes(k)).length;
                const kill5Success = kill5HitCount === 0;

                const killParams = {
                    p_drw_no: round.drwNo,
                    p_actual_numbers: round.numbers,
                    p_kill3_list: kill3.killList,
                    p_kill3_reasons: kill3.killReasons,
                    p_kill3_hit_count: kill3HitCount,
                    p_kill3_success: kill3Success,
                    p_kill5_list: kill5.killList,
                    p_kill5_reasons: kill5.killReasons,
                    p_kill5_hit_count: kill5HitCount,
                    p_kill5_success: kill5Success,
                };

                const { error: killErr } = await supabase.rpc('upsert_kill_record', killParams);
                if (killErr) {
                    console.error(`⚠️ [Kill Sync] Error ${round.drwNo}:`, killErr.message);
                } else {
                    console.log(`🛡️ [Kill Sync] Success ${round.drwNo} (3-Kill: ${kill3Success ? '✅' : '❌'})`);
                }
            } else {
                console.log(`⚠️ [Kill Sync] Skipped ${round.drwNo} (Not enough history)`);
            }
        }
    }
}

async function scrape() {
    console.log('Starting Scraper for data.soledot.com...');
    let history = [];

    // Load existing data
    if (fs.existsSync(OUTPUT_FILE)) {
        try {
            history = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
            console.log(`Loaded ${history.length} existing records.`);
        } catch (e) {
            console.error('Failed to load existing history:', e);
        }
    }

    let newItems = [];

    // Optimized: Check only first page for quick update
    for (let page = 1; page <= 1; page++) {
        try {
            console.log(`Fetching Page ${page}...`);
            const response = await axios.get(`${BASE_URL}?s_pagenum=${page}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const rows = $('#table1 tbody tr');

            if (rows.length === 0) {
                console.log('No more rows found. Stopping.');
                break;
            }

            // Iterate rows
            for (let i = 0; i < rows.length; i++) {
                const el = rows[i];
                const tds = $(el).find('td');
                if (tds.length === 0) continue;

                const roundStr = $(tds[0]).text().trim();
                const round = parseInt(roundStr, 10);
                if (!round) continue;

                // Numbers
                const numberDivs = $(tds[1]).find('.circleNumber');
                const numbers = [];
                numberDivs.each((j, numEl) => {
                    numbers.push(parseInt($(numEl).text().trim(), 10));
                });
                numbers.sort((a, b) => a - b);

                const bonusStr = $(tds[2]).find('.circleNumber').text().trim();
                const bonus = parseInt(bonusStr, 10);

                if (numbers.length < 6 || numbers.some(n => isNaN(n) || !n)) {
                    console.log(`Skipping round ${round} as numbers are not fully drawn yet.`);
                    continue;
                }

                const winnersStr = $(tds[3]).text().trim().replace(/,/g, '');
                const winners = parseInt(winnersStr, 10);

                const prizeStr = $(tds[4]).text().trim().replace(/,/g, '').replace(/원/g, '');
                const prize = parseInt(prizeStr, 10);

                const date = $(tds[5]).text().trim();

                const record = {
                    drwNo: round,
                    drwNoDate: date,
                    numbers: numbers,
                    bonus: bonus,
                    firstWinamnt: prize,
                    firstPrzwnerCo: winners
                };

                // Add to history if new
                if (!history.find(h => h.drwNo === round)) {
                    history.push(record);
                    newItems.push(record);
                } else {
                    // Update existing record if needed (e.g. pending prize became fixed)
                    const existing = history.find(h => h.drwNo === round);
                    if (existing.firstPrzwnerCo === 0 && winners > 0) {
                        Object.assign(existing, record);
                        newItems.push(record); // Treat as new for sync
                    }
                }
            }

            await new Promise(r => setTimeout(r, 200));

        } catch (e) {
            console.error(`Error on page ${page}:`, e.message);
        }
    }

    // Sort
    history.sort((a, b) => b.drwNo - a.drwNo);
    history = history.filter((v, i, a) => a.findIndex(t => (t.drwNo === v.drwNo)) === i);

    console.log(`\nCollected ${history.length} records.`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(history, null, 2), 'utf-8');
    console.log(`Saved to ${OUTPUT_FILE}`);

    // SYNC TO DB
    if (newItems.length > 0) {
        // Optional: Force sync latest round just in case (useful for dev/debugging)
        if (history.length > 0) {
            // Uncomment to force re-sync latest round for kill stats testing
            // await syncToDB(history[0], history);
        }
        for (const item of newItems) {
            await syncToDB(item, history);
        }
        console.log('✅ New data synced! Exiting with success.');
        process.exit(0); // Signal success to GitHub Actions
    } else {
        console.log('⚠️  No new rounds found. Data may not be available yet.');
        process.exit(1); // Signal to retry
    }
}

scrape().catch(err => {
    console.error('❌ Scrape failed:', err.message);
    process.exit(1); // Retry on unexpected error
});
