
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '.env')));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function checkAnalysis() {
    console.log('--- Checking Analysis for 1209 ---');
    
    const { data: prediction } = await supabase
        .from('predictions')
        .select('analysis')
        .eq('drw_no', 1209)
        .limit(1)
        .single();
        
    if (prediction && prediction.analysis) {
        console.log('Analysis Log:', prediction.analysis);
    } else {
        console.log('No analysis found.');
    }
}

checkAnalysis();
