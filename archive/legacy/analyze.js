import { createClient } from '@supabase/supabase-js';
import LottoPredictorV4 from './src/utils/LottoPredictorV4.js';

const supabaseUrl = 'https://rncjgtyqzjewnmxycexp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuY2pndHlxempld25teHljZXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NzI4MzEsImV4cCI6MjA4NTE0ODgzMX0.kMQxGUe6BOCTlaGbEQyoeS11VUDUYoTCoTo_tw8bpxE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyze() {
    const { data } = await supabase
        .from('lotto_history')
        .select('drw_no, numbers, bonus')
        .order('drw_no', { ascending: false })
        .limit(20);

    const mappedRounds = data.map(r => ({
        drwNo: r.drw_no,
        numbers: r.numbers,
        bonus: r.bonus
    }));

    console.log("=== Last 5 Rounds Data ===");
    mappedRounds.slice(0, 5).forEach(r => console.log(r.drwNo, r.numbers, r.bonus));

    console.log("\n=== 3-KILL Strategy ===");
    const p3 = new LottoPredictorV4(mappedRounds, { killCount: 3 });
    console.log("Kills:", p3.killList);
    console.log("Reasons:", p3.killReasons);

    console.log("\n=== 5-KILL Strategy ===");
    const p5 = new LottoPredictorV4(mappedRounds, { killCount: 5 });
    console.log("Kills:", p5.killList);
    console.log("Reasons:", p5.killReasons);
}

analyze();
