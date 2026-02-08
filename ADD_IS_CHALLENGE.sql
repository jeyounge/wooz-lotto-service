
-- Add is_challenge column
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS is_challenge BOOLEAN DEFAULT FALSE;

-- Force permissions (Just in case RLS or Grants need refresh)
GRANT ALL ON predictions TO postgres;
GRANT ALL ON predictions TO anon;
GRANT ALL ON predictions TO authenticated;
GRANT ALL ON predictions TO service_role;

-- Ensure RLS allows insert inclusive of new column (Usually automatic, but good to be safe)
-- Note: Existing policies usually cover 'ALL' columns. 
-- If there's a specific 'insert' policy restricting columns, it might need update.
-- Given previous files, the user likely uses standard Supabase RLS.

COMMENT ON COLUMN predictions.is_challenge IS 'True if prediction was made in 5-KILL Challenge Mode';
