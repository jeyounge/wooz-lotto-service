-- FINAL FIX: Grant Table Privileges & Reload Cache

-- 1. Grant explicit privileges to the 'anon' role (API key)
-- RLS policies control *which* rows, but Grants control *if* you can access the table at all.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.lotto_history TO anon, authenticated;

-- 2. Force Schema Cache Reload
-- This tells Supabase/PostgREST to refresh its knowledge of the database structure immediately.
NOTIFY pgrst, 'reload schema';

-- 3. Re-verify Policy (Just in case)
ALTER TABLE public.lotto_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable All Access for Anon" ON public.lotto_history;
CREATE POLICY "Enable All Access for Anon" ON public.lotto_history
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);
