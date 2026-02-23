import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rncjgtyqzjewnmxycexp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuY2pndHlxempld25teHljZXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NzI4MzEsImV4cCI6MjA4NTE0ODgzMX0.kMQxGUe6BOCTlaGbEQyoeS11VUDUYoTCoTo_tw8bpxE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspect() {
    const { data, error } = await supabase
        .from('lotto_history')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error:", error.message);
    } else if (data.length > 0) {
        console.log("Keys:");
        Object.keys(data[0]).sort().forEach(k => console.log(k));
    } else {
        console.log("Table empty, cannot infer schema.");
    }
}

inspect();
