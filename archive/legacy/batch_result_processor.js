
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load env vars
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY 
// NOTE: For bulk updates, using the SERVICE_ROLE key is better to bypass RLS, 
// but for now we'll try with ANON. If RLS blocks it, we might need a workaround 
// or ask user to temporarily disable RLS like before.
// ACTUALLY: The user has their own "user_id" in the script? No.
// We probably need to advise user to use Service Role Key or disable RLS for this operation.
// Let's assume user might have RLS allowed for 'update' if they previously ran SQL.

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function batchProcess() {
    console.log('🚀 Starting Batch Result Processing...')

    // 1. Fetch all official history (Draw Results)
    const { data: history, error: historyError } = await supabase
        .from('lotto_history')
        .select('*')
    
    if (historyError) {
        console.error('Failed to fetch history:', historyError)
        return
    }
    console.log(`✅ Loaded ${history.length} draw results.`)

    // Map for quick lookup:  { 1208: { numbers: [], bonus: 1, ... } }
    const historyMap = {}
    history.forEach(h => {
        historyMap[h.drw_no] = h
    })

    // 2. Fetch ALL pending predictions
    // (In production with 100k+ rows, you'd paginate this. For now, fetch all is fine)
    const { data: predictions, error: predError } = await supabase
        .from('predictions')
        .select('*')
        .eq('status', 'pending')
    
    if (predError) {
        console.error('Failed to fetch predictions:', predError)
        return
    }

    if (!predictions || predictions.length === 0) {
        console.log('✨ No pending predictions found. All up to date!')
        return
    }

    console.log(`🔍 Found ${predictions.length} pending predictions. Processing...`)

    const updates = []
    let winCount = 0
    let totalPrizeAdded = 0

    // 3. Calculate Results
    predictions.forEach(p => {
        const draw = historyMap[p.drw_no]
        if (!draw) return // Draw not happened yet

        const result = checkWin(p.numbers, draw)
        
        // Only update if result is NOT pending anymore (i.e., draw finished)
        if (result.status !== 'pending') {
            updates.push({
                id: p.id,
                status: result.status,
                rank: result.rank,
                prize: result.prize,
                // user_id is mostly needed if RLS requires it for 'using' condition, 
                // but usually for update matching ID is enough if policy allows.
            })

            if (result.status === 'win') {
                winCount++
                totalPrizeAdded += result.prize
            }
        }
    })

    // 4. Batch Update
    if (updates.length > 0) {
        console.log(`💾 Updating ${updates.length} records...`)
        
        // Supabase upsert is efficient
        // We handle in chunks of 100 to be safe
        const chunkSize = 100
        for (let i = 0; i < updates.length; i += chunkSize) {
            const chunk = updates.slice(i, i + chunkSize)
            const { error: updateError } = await supabase
                .from('predictions')
                .upsert(chunk) // Upsert updates based on PK (id)
            
            if (updateError) {
                console.error(`❌ Error updating chunk ${i}:`, updateError)
            } else {
                process.stdout.write('.')
            }
        }
        console.log('\n')
        console.log('🎉 Batch Processing Complete!')
        console.log(`- Processed: ${updates.length}`)
        console.log(`- New Winners: ${winCount}`)
        console.log(`- Global Prize Increased: +${new Intl.NumberFormat('ko-KR').format(totalPrizeAdded)} won`)
    } else {
        console.log('💤 No finished rounds found among pending predictions.')
    }
}

// Logic Copy from Client
function checkWin(numbers, drawData) {
    if (!drawData.numbers) return { status: 'pending' } // Should not happen if data integrity is good

    const matchCount = numbers.filter(n => drawData.numbers.includes(n)).length
    const isBonus = numbers.includes(drawData.bonus)

    if (matchCount === 6) return { status: 'win', rank: 1, prize: drawData.first_win_amnt }
    if (matchCount === 5 && isBonus) return { status: 'win', rank: 2, prize: drawData.second_win_amnt }
    if (matchCount === 5) return { status: 'win', rank: 3, prize: drawData.third_win_amnt }
    if (matchCount === 4) return { status: 'win', rank: 4, prize: drawData.fourth_win_amnt }
    if (matchCount === 3) return { status: 'win', rank: 5, prize: drawData.fifth_win_amnt }
    
    return { status: 'lose', rank: null, prize: 0 }
}

batchProcess()
