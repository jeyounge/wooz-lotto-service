import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIG ---
const SUPABASE_URL = 'https://rncjgtyqzjewnmxycexp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuY2pndHlxempld25teHljZXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NzI4MzEsImV4cCI6MjA4NTE0ODgzMX0.kMQxGUe6BOCTlaGbEQyoeS11VUDUYoTCoTo_tw8bpxE';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JSON_PATH = path.join(__dirname, 'src', 'data', 'lottoHistory.json');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Prizes for 1210 (Approx - 4th/5th are fixed)
// 1st/2nd/3rd depend on actual data, but for now we set fixed values or 0 if unknown
const PRIZES_FIXED = {
    4: 50000,
    5: 5000
};

async function updateRound(roundData) {
    const { drwNo, numbers, bonus, firstWinamnt } = roundData;
    console.log(`\nProcessing Round ${drwNo}...`);
    console.log(`Winning Numbers: ${numbers.join(',')} + ${bonus}`);

    // Fetch Predictions
    const { data: predictions, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('drw_no', drwNo);

    if (error) {
        console.error(`Error fetching predictions for ${drwNo}:`, error.message);
        return;
    }

    console.log(`Found ${predictions.length} predictions.`);
    let updates = 0;
    let winners = 0;

    for (const p of predictions) {
        const matchCount = p.numbers.filter(n => numbers.includes(n)).length;
        const isBonus = p.numbers.includes(bonus);

        let rank = null;
        let status = 'lose';
        let prize = 0;

        // Rank Logic
        if (matchCount === 6) { rank = 1; prize = firstWinamnt; } // Use actual 1st prize if avail
        else if (matchCount === 5 && isBonus) { rank = 2; prize = 50000000; } // Approx
        else if (matchCount === 5) { rank = 3; prize = 1500000; } // Approx
        else if (matchCount === 4) { rank = 4; prize = 50000; }
        else if (matchCount === 3) { rank = 5; prize = 5000; }

        if (rank) {
            status = 'win';
            winners++;
        }

        // Update DB
        const { error: upError } = await supabase
            .from('predictions')
            .update({
                rank: rank,
                status: status,
                prize: prize
            })
            .eq('id', p.id);

        if (upError) console.error(`Failed update ${p.id}:`, upError.message);
        else updates++;
    }
    console.log(`Updated ${updates} records. Winners: ${winners}`);
}

async function main() {
    // Load History
    const raw = fs.readFileSync(JSON_PATH, 'utf-8');
    const history = JSON.parse(raw);

    // Find 1210 and 1211
    const round1210 = history.find(h => h.drwNo === 1210);
    const round1211 = history.find(h => h.drwNo === 1211);

    if (round1210) await updateRound(round1210);
    else console.log("Round 1210 data not found in JSON");

    if (round1211) await updateRound(round1211);
    else console.log("Round 1211 data not found in JSON");
}

main();
