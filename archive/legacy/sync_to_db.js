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

    console.log(`-- INSERT STATEMENTS FOR 1210, 1211`);
    console.log(`-- Run this in Supabase SQL Editor to manually fix the missing data`);
    console.log(``);

    for (const round of targets) {
        // SQL string construction
        const cols = [
            'drw_no', 'drw_no_date', 'numbers', 'bonus', 
            'first_win_amnt', 'first_przwner_co', 
            'second_win_amnt', 'second_przwner_co',
            'third_win_amnt', 'third_przwner_co',
            'fourth_win_amnt', 'fourth_przwner_co',
            'fifth_win_amnt', 'fifth_przwner_co',
            'total_sell_amnt', 'first_how'
        ];
        
        // Escape helper (simple)
        const fmt = (v) => {
            if (v === null || v === undefined) return 'NULL';
            if (typeof v === 'string') return `'${v}'`;
            if (Array.isArray(v)) return `'${JSON.stringify(v).replace('[','{').replace(']','}')}'`; // Postgres Array format
            return v;
        };

        const vals = [
            round.drwNo, 
            fmt(round.drwNoDate), 
            fmt(round.numbers), 
            round.bonus,
            round.firstWinamnt || 0,
            round.firstPrzwnerCo || 0,
            round.secondWinamnt || 0,
            round.secondPrzwnerCo || 0,
            round.thirdWinamnt || 0,
            round.thirdPrzwnerCo || 0,
            round.fourthWinamnt || 50000,
            round.fourthPrzwnerCo || 0,
            round.fifthWinamnt || 5000,
            round.fifthPrzwnerCo || 0,
            round.totalSellAmnt || 0,
            fmt(round.firstHow || '')
        ];

        const sql = `INSERT INTO public.lotto_history (${cols.join(',')}) VALUES (${vals.join(',')}) ON CONFLICT (drw_no) DO UPDATE SET updated_at = now();`;
        console.log(sql);
    }
}

sync();
