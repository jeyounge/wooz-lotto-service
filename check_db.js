import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');
let envConfig = {};
try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim();
            envConfig[key] = val;
        }
    });
} catch (e) {
    console.warn("Could not load .env file", e);
}

const supabase = createClient(
    envConfig.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    envConfig.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function check() {
    const { data: history } = await supabase
        .from('lotto_history')
        .select('*')
        .order('drw_no', { ascending: false })
        .limit(3);
    console.log("Latest History:", JSON.stringify(history, null, 2));

    const { data: predictions } = await supabase
        .from('predictions')
        .select('drw_no, status, rank, prize')
        .eq('drw_no', 1214)
        .limit(10);
    console.log("Predictions for 1214:", predictions);

    const { data: winners } = await supabase
        .from('predictions')
        .select('prize, drw_no, status, rank')
        .eq('status', 'win');
    console.log("Winning Predictions:", winners);
}

check();
