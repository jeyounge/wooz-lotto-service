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
    const targets = history.filter(h => h.drwNo >= 1208); 
    console.log(`Found ${targets.length} recent rounds to sync.`);

    for (const round of targets) {
        console.log(`Syncing Round ${round.drwNo}...`);
        
        const payload = {
            drw_no: round.drwNo,
            drw_date: round.drwNoDate,
            numbers: round.numbers,
            bonus: round.bonus,
            first_win_amnt: round.firstWinamnt,
            first_przwner_co: round.firstPrzwnerCo,
            updated_at: new Date()
        };

        const { data, error } = await supabase
            .from('lotto_history')
            .upsert(payload, { onConflict: 'drw_no' })
            .select();

        if (error) {
            console.error(`Error syncing ${round.drwNo}:`, error.message);
        } else {
            console.log(`Success ${round.drwNo}:`, data);
        }
    }
}

sync();
