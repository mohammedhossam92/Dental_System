-- Add unregistered_at column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS unregistered_at timestamptz;

-- Populate unregistered_at for existing unregistered students with their created_at as a fallback
UPDATE students 
SET unregistered_at = created_at 
WHERE registration_status = 'unregistered' AND unregistered_at IS NULL;

-- Create an index on unregistered_at for performance when filtering
CREATE INDEX IF NOT EXISTS idx_students_unregistered_at ON students(unregistered_at);
