import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envPath = 'c:\\project\\wooz-lotto-service\\.env';
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
    envConfig.VITE_SUPABASE_URL,
    envConfig.VITE_SUPABASE_ANON_KEY
);

async function check() {
    const { data, error } = await supabase
        .from('lotto_history')
        .select('*')
        .eq('drw_no', 1214);

    console.log("DB DATA:", JSON.stringify(data, null, 2));
    if (error) console.error("DB ERROR:", error);
}

check();
