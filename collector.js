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

async function syncToDB(round) {
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
    history = history.filter((v,i,a)=>a.findIndex(t=>(t.drwNo === v.drwNo))===i);

    console.log(`\nCollected ${history.length} records.`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(history, null, 2), 'utf-8');
    console.log(`Saved to ${OUTPUT_FILE}`);

    // SYNC TO DB
    if (newItems.length > 0) {
        console.log(`Syncing ${newItems.length} new/updated rounds to DB...`);
        for (const item of newItems) {
            await syncToDB(item);
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
