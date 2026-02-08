
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv'; // Use dotenv

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '.env')));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);
const HISTORY_FILE = path.join(__dirname, 'src', 'data', 'lottoHistory.json');

console.log('Connecting to:', envConfig.VITE_SUPABASE_URL);

async function updateDB() {
    console.log('Loading local history...');
    const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    
    // Find Round 1209
    const round1209 = history.find(h => h.drwNo === 1209);
    
    if (!round1209) {
        console.error('Round 1209 not found in local file!');
        return;
    }
    
    console.log('Inserting Round 1209:', round1209);
    
    // Check if exists
    console.log('Checking if round 1209 exists...');
    const { data: existing, error: selectError } = await supabase
        .from('lotto_history')
        .select('drw_no')
        .eq('drw_no', 1209)
        .maybeSingle(); // Use maybeSingle to avoid error on empty

    if (selectError) {
        console.error('Select Failed:', selectError);
    }
    
    if (existing) {
        console.log('Round 1209 already exists in DB. Skipping insert.');
        return;
    }
    console.log('Round 1209 not found in DB. Proceeding to insert...');
    
    // Insert
    const { error } = await supabase
        .from('lotto_history')
        .insert({
            drw_no: round1209.drwNo,
            drw_date: round1209.drwNoDate.replace(/\./g, '-'), // Correct column: drw_date
            numbers: round1209.numbers,
            bonus: round1209.bonus,
            first_win_amnt: round1209.firstWinamnt,
            first_przwner_co: round1209.firstPrzwnerCo,
            // Only fields we have in simple JSON, hopefully DB doesn't require others to be non-null
            // If simple scraper didn't get details (sellAmnt etc), they might be missing. 
            // Collector.js simple scraper gathers basics.
        });
        
    if (error) {
        console.error('Insert Failed:', error);
    } else {
        console.log('Success! Round 1209 inserted.');
    }
}

updateDB();
