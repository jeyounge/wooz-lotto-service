
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '.env')));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

const verify = async () => {
    const { data } = await supabase
        .from('lotto_history')
        .select('drw_no, total_sell_amnt, first_how')
        .eq('drw_no', 1209)
        .single();
    
    console.log('Round 1209 Data:', data);
    
    if (data.total_sell_amnt > 0 && data.first_how) {
        console.log('VERIFICATION PASSED');
    } else {
        console.log('VERIFICATION FAILED');
    }
};

verify();
