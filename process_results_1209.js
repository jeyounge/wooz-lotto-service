
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '.env')));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

function checkWin(numbers, drawData) {
    const matchCount = numbers.filter(n => drawData.numbers.includes(n)).length;
    const isBonus = numbers.includes(drawData.bonus);

    if (matchCount === 6) return { status: 'win', rank: 1, prize: drawData.first_win_amnt };
    if (matchCount === 5 && isBonus) return { status: 'win', rank: 2, prize: drawData.second_win_amnt };
    if (matchCount === 5) return { status: 'win', rank: 3, prize: drawData.third_win_amnt };
    if (matchCount === 4) return { status: 'win', rank: 4, prize: drawData.fourth_win_amnt };
    if (matchCount === 3) return { status: 'win', rank: 5, prize: drawData.fifth_win_amnt };
    
    return { status: 'lose', rank: null, prize: 0 };
}

async function processResults() {
    console.log('--- Processing Results for Round 1209 ---');
    
    // 1. Get History
    const { data: history } = await supabase
        .from('lotto_history')
        .select('*')
        .eq('drw_no', 1209)
        .single();
        
    if (!history) {
        console.error('History for 1209 not found!');
        return;
    }
    console.log(`History Loaded: ${history.numbers} + ${history.bonus}`);
    
    // 2. Get Pending
    const { data: pending, error: pErr } = await supabase
        .from('predictions')
        .select('*')
        .eq('drw_no', 1209)
        .eq('status', 'pending');
        
    if (pErr) {
        console.error('Fetch pending error:', pErr);
        return;
    }
    
    console.log(`Found ${pending.length} pending predictions.`);
    if (pending.length === 0) return;
    
    // 3. Calc & Update
    const updates = [];
    let winCount = 0;
    
    for (const p of pending) {
        const result = checkWin(p.numbers, history);
        
        // Only update if status changed (it will)
        updates.push(
            supabase
                .from('predictions')
                .upsert({ 
                    id: p.id,
                    user_id: p.user_id, // Include required fields if needed
                    drw_no: p.drw_no,
                    numbers: p.numbers,
                    created_at: p.created_at, // timestamps might be needed if not default
                    status: result.status, 
                    rank: result.rank, 
                    prize: result.prize 
                })
        );
        
        if (result.status === 'win') winCount++;
    }
    
    console.log(`Calculated ${winCount} wins. Updating DB...`);
    
    // Execute in batches of 10 to be safe
    for (let i = 0; i < updates.length; i += 10) {
        const batch = updates.slice(i, i + 10);
        const results = await Promise.all(batch);
        
        results.forEach(r => {
            if (r.error) console.error('Update Error:', r.error.message);
        });
        
        process.stdout.write('.');
    }
    console.log('\nDone!');
}

processResults();
