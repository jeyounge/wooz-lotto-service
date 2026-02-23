-- FORCE ENABLE ALL ACCESS for Anon (Temporary Fix)
-- This drops existing policies to ensure no conflicts, then adds a wide-open policy.

ALTER TABLE public.lotto_history ENABLE ROW LEVEL SECURITY;

-- 1. Drop potentially conflicting policies
DROP POLICY IF EXISTS "Allow Anon Read" ON public.lotto_history;
DROP POLICY IF EXISTS "Allow Anon Upsert" ON public.lotto_history;
DROP POLICY IF EXISTS "Allow Anon Upsert on Lotto History" ON public.lotto_history;
DROP POLICY IF EXISTS "Allow Anon Update on Lotto History" ON public.lotto_history;

-- 2. Create a single ALL policy
CREATE POLICY "Enable All Access for Anon" ON public.lotto_history
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);
    
-- Verify: Check if table exists and is visible
COMMENT ON TABLE public.lotto_history IS 'Lotto Winning History (Synced)';
