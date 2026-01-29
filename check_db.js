
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

const check = async () => {
    // 1. Count
    const { count, error: countErr } = await supabase
        .from('lotto_history')
        .select('*', { count: 'exact', head: true });
    
    if (countErr) console.error('Count Error:', countErr);
    console.log(`Total Rows in 'lotto_history': ${count}`);

    // 2. Check 1208
    const { data, error } = await supabase
        .from('lotto_history')
        .select('*')
        .eq('drw_no', 1208)
        .single();

    if (error) console.error('Fetch 1208 Error:', error);
    else console.log('Round 1208 Data:', data);
};

check();
