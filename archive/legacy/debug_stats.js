
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function debug() {
    console.log('🔍 Debugging Global Stats...')

    // 1. Check if there are ANY winners in DB
    const { data: winners, count } = await supabase
        .from('predictions')
        .select('*', { count: 'exact' })
        .eq('status', 'win')
    
    console.log(`🏆 Total Winning Rows found in DB: ${count}`)
    
    if (winners && winners.length > 0) {
        console.log('   (Sample winner):', winners[0].prize, 'won')
        const sumJS = winners.reduce((sum, row) => sum + (row.prize || 0), 0)
        console.log(`   🧮 Calculated Sum (JS): ${sumJS}`)
    }

    // 2. Check RPC
    const { data: rpcResult, error } = await supabase.rpc('get_total_prize')
    
    if (error) {
        console.error('❌ RPC Error:', error)
    } else {
        console.log(`✅ RPC 'get_total_prize' Result:`, rpcResult)
    }
}

debug()
