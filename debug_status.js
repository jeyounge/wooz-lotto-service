
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function check() {
    console.log('🔍 Checking Predictions Status...')

    // Group by round and status
    const { data, error } = await supabase
        .from('predictions')
        .select('drw_no, status')
    
    if (error) {
        console.error(error)
        return
    }

    const summary = {} // { '1208-pending': 5, '1208-win': 0 }
    
    data.forEach(p => {
        const key = `${p.drw_no} [${p.status || 'null'}]`
        summary[key] = (summary[key] || 0) + 1
    })

    console.log('📊 Stats Summary:', summary)
}

check()
