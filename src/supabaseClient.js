import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
        fetch: (...args) => {
            const url = new URL(args[0]);
            url.searchParams.append('_c', Date.now()); // Ultimate iOS Cache Buster
            return fetch(url.toString(), { ...args[1], cache: 'no-store' });
        }
    }
})
