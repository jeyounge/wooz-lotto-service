
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '.env')));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log('--- Checking Winning Prizes ---');
    
    // Check wins for 1209
    const { data: winners, error } = await supabase
        .from('predictions')
        .select('id, drw_no, status, rank, prize')
        .eq('status', 'win');
        
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log(`Found ${winners.length} winners.`);
    winners.forEach(w => {
        console.log(`ID: ${w.id} | Round: ${w.drw_no} | Rank: ${w.rank} | Prize: ${w.prize}`);
    });
    
    const total = winners.reduce((acc, curr) => acc + (curr.prize || 0), 0);
    console.log(`Total Calculated Prize: ${total}`);
}

check();
