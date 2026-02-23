import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rncjgtyqzjewnmxycexp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuY2pndHlxempld25teHljZXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NzI4MzEsImV4cCI6MjA4NTE0ODgzMX0.kMQxGUe6BOCTlaGbEQyoeS11VUDUYoTCoTo_tw8bpxE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function debug() {
    console.log("Debugging Writes...");

    // Test 1: Simple Insert (Round 9999)
    console.log("Test 1: Simple INSERT (Round 9999)...");
    const { error: insertError } = await supabase
        .from('lotto_history')
        .insert([{ drw_no: 9999, first_win_amnt: 0 }]); // Minimal payload
    
    if (insertError) {
        console.error("❌ INSERT Failed:", insertError.message);
    } else {
        console.log("✅ INSERT Success!");
        // Cleanup
        await supabase.from('lotto_history').delete().eq('drw_no', 9999);
    }

    // Test 2: Update (Round 1209)
    console.log("Test 2: UPDATE (Round 1209)...");
    const { error: updateError } = await supabase
        .from('lotto_history')
        .update({ updated_at: new Date() })
        .eq('drw_no', 1209);

    if (updateError) {
        console.error("❌ UPDATE Failed:", updateError.message);
    } else {
        console.log("✅ UPDATE Success!");
    }
}

debug();
