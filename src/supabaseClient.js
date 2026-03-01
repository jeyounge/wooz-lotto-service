import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
        fetch: (...args) => {
            return fetch(args[0], { ...args[1], cache: 'no-store' });
        }
    }
})
