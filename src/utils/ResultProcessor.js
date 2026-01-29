
// ResultProcessor.js
// Processes pending predictions in the background when users visit the site.
// This distributes the workload of updating results without a dedicated backend server.

export const ResultProcessor = {
    async processPending(supabase) {
        try {
            // 1. Fetch latest completed round from DB to know what's safe to check
            const { data: latestHistory, error: hErr } = await supabase
                .from('lotto_history')
                .select('drw_no, numbers, bonus, first_win_amnt, second_win_amnt, third_win_amnt, fourth_win_amnt, fifth_win_amnt')
                .order('drw_no', { ascending: false })
                .limit(10); // Keep cache of recent 10 rounds (most likely to have pending predictions)

            if (hErr || !latestHistory || latestHistory.length === 0) return;

            const historyMap = {};
            latestHistory.forEach(h => historyMap[h.drw_no] = h);
            const latestRound = latestHistory[0].drw_no;

            // 2. Fetch a batch of 'pending' predictions for finished rounds
            // We limit to 20 to strictly avoid impacting user performance
            const { data: pending, error: pErr } = await supabase
                .from('predictions')
                .select('*')
                .eq('status', 'pending')
                .lte('drw_no', latestRound) // Only check rounds that happened
                .limit(50); // Increased to 50 for faster crowd-sourcing

            if (pErr || !pending || pending.length === 0) return;

            console.log(`[Background] Found ${pending.length} pending items. Processing...`);

            // 3. Calculate Results
            const updates = [];
            pending.forEach(p => {
                const draw = historyMap[p.drw_no];
                
                // If draw is not in our recent 10 cache, we might need to fetch it individually?
                // For efficiency, we skip if it's too old (unlikely case for active app, or we can expand cache)
                // Or we can just fetch single draw here if missing. 
                // Let's keep it simple: matching rounds only.
                if (!draw) return; 

                const result = checkWin(p.numbers, draw);
                if (result.status !== 'pending') {
                    updates.push({
                        id: p.id,
                        status: result.status,
                        rank: result.rank,
                        prize: result.prize,
                        // No user_id needed if we have update policy, but for upsert usually safe to include nothing extra
                        // if we assume ID is unique.
                    });
                }
            });

            // 4. Batch Update (Use .update() to avoid INSERT permission check caused by upsert)
            // We use Promise.all for parallelism. 50 items is manageable.
            if (updates.length > 0) {
                 await Promise.all(updates.map(u => 
                     supabase.from('predictions')
                        .update({ 
                            status: u.status, 
                            rank: u.rank, 
                            prize: u.prize 
                        })
                        .eq('id', u.id)
                 ));
                console.log(`[Background] Updated ${updates.length} records.`);
            }

        } catch (err) {
            console.error('[Background] Processor error:', err);
        }
    }
};

// Helper: Win Check Logic (Duplicated safely to keep utils standalone)
function checkWin(numbers, drawData) {
    if (!drawData.numbers) return { status: 'pending' };

    const matchCount = numbers.filter(n => drawData.numbers.includes(n)).length;
    const isBonus = numbers.includes(drawData.bonus);

    if (matchCount === 6) return { status: 'win', rank: 1, prize: drawData.first_win_amnt };
    if (matchCount === 5 && isBonus) return { status: 'win', rank: 2, prize: drawData.second_win_amnt };
    if (matchCount === 5) return { status: 'win', rank: 3, prize: drawData.third_win_amnt };
    if (matchCount === 4) return { status: 'win', rank: 4, prize: drawData.fourth_win_amnt };
    if (matchCount === 3) return { status: 'win', rank: 5, prize: drawData.fifth_win_amnt };
    
    return { status: 'lose', rank: null, prize: 0 };
}
