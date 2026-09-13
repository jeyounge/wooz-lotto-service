
-- Add is_hidden column
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Force permissions
GRANT ALL ON predictions TO postgres;
GRANT ALL ON predictions TO anon;
GRANT ALL ON predictions TO authenticated;
GRANT ALL ON predictions TO service_role;

COMMENT ON COLUMN predictions.is_hidden IS 'True for Admin Hidden Predictions (Crowd Logic)';
