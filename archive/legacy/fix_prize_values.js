
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '.env')));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function fixPrizes() {
    console.log('--- Fixing Prize Values for 1209 ---');
    
    // 1. Get Draw Info
    const { data: draw } = await supabase
        .from('lotto_history')
        .select('*')
        .eq('drw_no', 1209)
        .single();
        
    if (!draw) return;
    
    const prizes = {
        1: draw.first_win_amnt,
        2: draw.second_win_amnt,
        3: draw.third_win_amnt,
        4: draw.fourth_win_amnt,
        5: draw.fifth_win_amnt
    };
    
    // 2. Get Winners with NULL prize
    const { data: winners } = await supabase
        .from('predictions')
        .select('*')
        .eq('status', 'win');
        // .is('prize', null); // Fix all just in case
        
    console.log(`Found ${winners.length} winners to update.`);
    
    for (const w of winners) {
        const correctPrize = prizes[w.rank] || 0;
        console.log(`Updating winner ${w.id} (Rank ${w.rank}) -> Prize: ${correctPrize}`);
        
        await supabase
            .from('predictions')
            .update({ prize: correctPrize })
            .eq('id', w.id);
    }
    
    console.log('Done.');
}

fixPrizes();
