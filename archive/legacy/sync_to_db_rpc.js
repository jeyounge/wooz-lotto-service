import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SUPABASE_URL = 'https://rncjgtyqzjewnmxycexp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuY2pndHlxempld25teHljZXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NzI4MzEsImV4cCI6MjA4NTE0ODgzMX0.kMQxGUe6BOCTlaGbEQyoeS11VUDUYoTCoTo_tw8bpxE';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JSON_PATH = path.join(__dirname, 'src', 'data', 'lottoHistory.json');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sync() {
    console.log('Reading lottoHistory.json...');
    const raw = fs.readFileSync(JSON_PATH, 'utf-8');
    const history = JSON.parse(raw);
    
    // Filter relevant rounds (Latest ones first)
    const targets = history.filter(h => [1210, 1211].includes(h.drwNo)); 
    console.log(`Found ${targets.length} rounds to sync (1210, 1211).`);

    for (const round of targets) {
        console.log(`Syncing Round ${round.drwNo} via RPC...`);
        
        const params = {
            p_drw_no: round.drwNo,
            p_drw_date: round.drwNoDate,
            p_numbers: round.numbers,
            p_bonus: round.bonus,
            p_first_win_amnt: round.firstWinamnt || 0,
            p_first_przwner_co: round.firstPrzwnerCo || 0,
            p_second_win_amnt: round.secondWinamnt || 0,
            p_second_przwner_co: round.secondPrzwnerCo || 0,
            p_third_win_amnt: round.thirdWinamnt || 0,
            p_third_przwner_co: round.thirdPrzwnerCo || 0,
            p_fourth_win_amnt: round.fourthWinamnt || 50000,
            p_fourth_przwner_co: round.fourthPrzwnerCo || 0,
            p_fifth_win_amnt: round.fifthWinamnt || 5000,
            p_fifth_przwner_co: round.fifthPrzwnerCo || 0,
            p_total_sell_amnt: round.totalSellAmnt || 0,
            p_first_how: round.firstHow || ''
        };

        const { data, error } = await supabase.rpc('sync_lotto_round', params);

        if (error) {
            console.error(`❌ Error syncing ${round.drwNo}:`, error.message);
        } else {
            console.log(`✅ Success ${round.drwNo}!`);
        }
    }
}

sync();
