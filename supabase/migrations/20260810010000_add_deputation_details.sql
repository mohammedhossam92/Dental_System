-- Migration: Add deputation details to doctor employment history
-- Adds deputation_direction and deputation_facility columns to doctor_employment_history

ALTER TABLE IF EXISTS public.doctor_employment_history
ADD COLUMN IF NOT EXISTS deputation_direction text,
ADD COLUMN IF NOT EXISTS deputation_facility text;

-- Add index for deputation direction
CREATE INDEX IF NOT EXISTS idx_doc_emp_deputation_dir ON public.doctor_employment_history(deputation_direction);
