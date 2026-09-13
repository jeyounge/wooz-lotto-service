import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const envPath = path.join(__dirname, '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ROUND = 1210;
const WINNING_NUMBERS = [1, 7, 9, 17, 27, 38];
const BONUS_NUMBER = 31;

// Prize Table (Approx)
const PRIZES = {
    1: 0, // Unknown dynamic
    2: 0,
    3: 0,
    4: 50000,
    5: 5000
};

async function updateResults() {
    console.log(`Checking predictions for Round ${ROUND}...`);

    // 1. Fetch All Predictions for Round 1210
    const { data: predictions, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('drw_no', ROUND);

    if (error) {
        console.error("Fetch error:", error);
        return;
    }

    console.log(`Found ${predictions.length} predictions.`);

    let successCount = 0;
    let winCount = 0;

    for (const p of predictions) {
        // Calculate Rank
        const matchCount = p.numbers.filter(n => WINNING_NUMBERS.includes(n)).length;
        const isBonus = p.numbers.includes(BONUS_NUMBER);

        let rank = null;
        let status = 'lose';
        let prize = 0;

        if (matchCount === 6) rank = 1;
        else if (matchCount === 5 && isBonus) rank = 2;
        else if (matchCount === 5) rank = 3;
        else if (matchCount === 4) rank = 4;
        else if (matchCount === 3) rank = 5;

        if (rank) {
            status = 'win';
            prize = PRIZES[rank] || 0;
        }

        // Only update if changed (or force update to ensure consistency)
        // We just update everyone to be safe
        const { error: updateError } = await supabase
            .from('predictions')
            .update({ 
                status: status, 
                rank: rank, 
                prize: prize 
            })
            .eq('id', p.id);

        if (updateError) {
            console.error(`Failed to update ${p.id}:`, updateError);
        } else {
            successCount++;
            if (status === 'win') winCount++;
        }
    }

    console.log(`Update Complete.`);
    console.log(`- Processed: ${successCount}`);
    console.log(`- Winners Found: ${winCount}`);
}

updateResults();
