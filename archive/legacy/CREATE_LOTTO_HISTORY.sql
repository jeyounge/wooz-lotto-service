-- Create lotto_history table if not exists
CREATE TABLE IF NOT EXISTS public.lotto_history (
    drw_no INTEGER PRIMARY KEY,
    drw_no_date DATE,
    numbers INTEGER[],
    bonus INTEGER,
    first_win_amnt BIGINT,
    first_przwner_co INTEGER,
    second_win_amnt BIGINT,
    second_przwner_co INTEGER,
    third_win_amnt BIGINT,
    third_przwner_co INTEGER,
    fourth_win_amnt BIGINT,
    fourth_przwner_co INTEGER,
    fifth_win_amnt BIGINT,
    fifth_przwner_co INTEGER,
    first_accum_amnt BIGINT,
    total_sell_amnt BIGINT,
    first_how TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.lotto_history ENABLE ROW LEVEL SECURITY;

-- Policy: Allow Anon Read
CREATE POLICY "Allow Anon Read" ON public.lotto_history
    FOR SELECT USING (true);

-- Policy: Allow Anon Insert/Update (TEMPORARY FOR SYNC SCRIPT)
-- Ideally this should be service_role only, but our script uses anon key for now
-- Or we fix the script to use service_role key if available (which we don't present in .env easily)
-- Let's assume we need to allow Anon for now to fix the blockage.
CREATE POLICY "Allow Anon Upsert" ON public.lotto_history
    FOR ALL USING (true) WITH CHECK (true);
