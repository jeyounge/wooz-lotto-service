import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xxyrcmsxevrtjnyvqwxx.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
    const { data, error } = await supabase
        .from('lotto_history')
        .select('drw_no, drw_no_date, first_przwner_co')
        .order('drw_no', { ascending: false })
        .limit(5);

    console.log("DB lotto_history:", data);
}

checkDb();
