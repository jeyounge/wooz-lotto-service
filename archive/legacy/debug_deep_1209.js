
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '.env')));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function deepCheck() {
    console.log('=== Deep Debug 1209 ===');
    
    // 1. Check History Prize Data
    const { data: history } = await supabase
        .from('lotto_history')
        .select('*')
        .eq('drw_no', 1209)
        .single();
        
    console.log(`[History 1209]`);
    console.log(`- Rank 1 Prize: ${history?.first_win_amnt}`);
    console.log(`- Rank 5 Prize: ${history?.fifth_win_amnt}`); // Key check
    
    if (!history) {
        console.error('CRITICAL: History 1209 missing!');
        return;
    }

    // 2. Check Winners
    const { data: winners, error } = await supabase
        .from('predictions')
        .select('id, user_id, status, rank, prize, numbers')
        .eq('drw_no', 1209)
        // .eq('status', 'win'); // Fetch everything that LOOKS like a win
        .or('status.eq.win,rank.not.is.null'); 
        
    if (error) console.error(error);
    
    console.log(`\n[Winners Found: ${winners?.length}]`);
    winners?.forEach((w, i) => {
        console.log(`${i+1}. ID: ${w.id} | Status: ${w.status} | Rank: ${w.rank} | Prize: ${w.prize}`);
        
        // Validation
        if (w.status === 'win' && w.prize === 0) {
            console.log(`   -> WARNING: Prize is 0! Should be ${w.rank === 5 ? history.fifth_win_amnt : '?'}`);
        }
    });
}

deepCheck();
