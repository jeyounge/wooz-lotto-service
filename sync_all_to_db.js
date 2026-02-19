/**
 * sync_all_to_db.js
 * Syncs ALL rounds from lottoHistory.json to Supabase lotto_history table.
 * Run once to backfill missing data, or any time after manual edits to the JSON.
 * Usage: node sync_all_to_db.js
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
} catch (e) {
    console.warn('Could not load .env file', e);
}

const supabase = createClient(
    envConfig.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    envConfig.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function syncRound(round) {
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
        console.error(`  ❌ Round ${round.drwNo}: ${error.message}`);
        return false;
    }
    return true;
}

async function main() {
    const historyPath = path.join(__dirname, 'src', 'data', 'lottoHistory.json');
    const history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));

    console.log(`\n📦 Total rounds to sync: ${history.length}`);
    console.log('='.repeat(50));

    let success = 0;
    let fail = 0;

    for (const round of history) {
        const ok = await syncRound(round);
        if (ok) {
            success++;
            process.stdout.write(`\r✅ Synced: ${success} / ${history.length}`);
        } else {
            fail++;
        }
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
    }

    console.log(`\n\n${'='.repeat(50)}`);
    console.log(`✅ Success: ${success}`);
    console.log(`❌ Failed:  ${fail}`);
    console.log('Done!');
}

main();
