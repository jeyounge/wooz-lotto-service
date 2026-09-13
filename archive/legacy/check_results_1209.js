
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '.env')));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log('--- Checking Round 1209 ---');
    
    // 1. Get Winning Numbers
    const { data: roundData, error: roundH } = await supabase
        .from('lotto_history')
        .select('*')
        .eq('drw_no', 1209)
        .single();
        
    if (roundH || !roundData) {
        console.error('Failed to fetch Round 1209 history:', roundH);
        return;
    }
    
    console.log(`Winning Numbers: ${roundData.numbers.join(', ')} + Bonus: ${roundData.bonus}`);
    
    // 2. Count Predictions
    const { count: total, error: cErr } = await supabase
        .from('predictions')
        .select('*', { count: 'exact', head: true })
        .eq('drw_no', 1209);
        
    console.log(`Total Predictions for 1209: ${total}`);
    
    // 3. Status Breakdown
    const { count: wins } = await supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('drw_no', 1209).eq('status', 'win');
    
    console.log(`\n### FINAL RESULT ###`);
    console.log(`WIN COUNT: ${wins}`);
    console.log(`####################\n`);
}

check();
