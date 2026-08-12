-- Migration: Add is_confirmed column to doctors table
-- Adds a boolean flag to track whether a doctor's data and documents have been audited and confirmed.

ALTER TABLE IF EXISTS public.doctors
ADD COLUMN IF NOT EXISTS is_confirmed boolean DEFAULT false;

-- Create an index for quick filtering by confirmation status
CREATE INDEX IF NOT EXISTS idx_doctors_is_confirmed ON public.doctors(is_confirmed);
