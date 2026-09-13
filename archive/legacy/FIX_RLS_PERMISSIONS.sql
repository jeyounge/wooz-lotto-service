-- RLS Policy Fix for lotto_history
-- This allows the 'Anon' key (public API key) to INSERT and UPDATE rows in the lotto_history table.
-- WARNING: In a strict production environment, this should be restricted to authenticated users or service roles only.
-- But to fix the current blockage for the sync script, we enable it for Anon temporarily.

-- Enable RLS (Should be already enabled, but just in case)
ALTER TABLE public.lotto_history ENABLE ROW LEVEL SECURITY;

-- Allow Anon Insert/Update
CREATE POLICY "Allow Anon Upsert on Lotto History" ON public.lotto_history
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow Anon Update on Lotto History" ON public.lotto_history
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Or simpler "ALL" policy if preferred for debug
-- CREATE POLICY "Allow Anon All" ON public.lotto_history FOR ALL USING (true) WITH CHECK (true);
