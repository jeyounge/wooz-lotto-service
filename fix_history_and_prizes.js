
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '.env')));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function fixHistoryAndPrizes() {
    console.log('--- Fixing History & Prizes for 1209 ---');
    
    // 1. Force Update Lotto History (Inputting known defaults for Rank 4/5)
    // 1209 Data from recent check: 1st=1,371,910,466. 
    // We assume standard fixed prizes for 4th(50k) and 5th(5k) if null.
    
    const updatePayload = {
        fourth_win_amnt: 50000,
        fifth_win_amnt: 5000
    };

    console.log('Updating lotto_history 1209 defaults...');
    const { error: hErr } = await supabase
        .from('lotto_history')
        .update(updatePayload)
        .eq('drw_no', 1209);
        
    if (hErr) console.error('History Update Error:', hErr);
    else console.log('History Updated.');
    
    // 2. Refresh Draw Data
    const { data: draw } = await supabase
        .from('lotto_history')
        .select('*')
        .eq('drw_no', 1209)
        .single();

    // 3. Update Winners Again
    const prizes = {
        1: draw.first_win_amnt,
        2: draw.second_win_amnt,
        3: draw.third_win_amnt,
        4: draw.fourth_win_amnt || 50000,
        5: draw.fifth_win_amnt || 5000
    };
    
    const { data: winners } = await supabase
        .from('predictions')
        .select('*')
        .eq('status', 'win');
        
    console.log(`Updating ${winners.length} winners...`);
    
    for (const w of winners) {
        const correctPrize = prizes[w.rank];
        console.log(`Winner ${w.id} (Rank ${w.rank}) => Prize: ${correctPrize}`);
        
        const { error: uErr } = await supabase
            .from('predictions')
            .update({ prize: correctPrize })
            .eq('id', w.id);
            
        if (uErr) console.error(`Failed to update winner ${w.id}:`, uErr);
    }
    
    console.log('Done!');
}

fixHistoryAndPrizes();
