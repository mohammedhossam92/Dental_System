-- Migration: Add birth_date and national_id columns to students table, and ensure working_days_id is nullable
-- Allows students to be registered without immediately choosing working days (can be chosen later).
-- Adds optional 14-digit Egyptian National ID and Date of Birth fields.

ALTER TABLE IF EXISTS public.students
ADD COLUMN IF NOT EXISTS birth_date text,
ADD COLUMN IF NOT EXISTS national_id text;

-- Ensure working_days_id is nullable so it can be chosen later
ALTER TABLE IF EXISTS public.students
ALTER COLUMN working_days_id DROP NOT NULL;

-- Index for quick lookup on national_id if provided
CREATE INDEX IF NOT EXISTS idx_students_national_id ON public.students(national_id);
