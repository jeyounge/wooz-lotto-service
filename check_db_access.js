import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rncjgtyqzjewnmxycexp.supabase.co';
// Using the ANON key from .env
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuY2pndHlxempld25teHljZXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NzI4MzEsImV4cCI6MjA4NTE0ODgzMX0.kMQxGUe6BOCTlaGbEQyoeS11VUDUYoTCoTo_tw8bpxE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    console.log("Checking 'lotto_history' table access...");

    // 1. Try READ
    const { data: readData, error: readError } = await supabase
        .from('lotto_history')
        .select('*')
        .order('drw_no', { ascending: false })
        .limit(3);

    if (readError) {
        console.error("❌ READ Failed:", readError.message);
    } else {
        console.log("✅ READ Success!");
        if (readData.length > 0) {
            console.log("Sample Row Keys:", Object.keys(readData[0]));
        }
    }

    // 2. Try WRITE (Disabled for schema check)
    /*
    if (!readError) {
       console.log("Attempting Write Test (Upsert 1209)...");
       // ...
    }
    */
}

check();
