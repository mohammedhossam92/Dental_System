-- Migration: Add date_mode column to doctor_certificates
-- Allows recording certificate date as 'month' (Month & Year) or 'full' (Day, Month, and Year)

ALTER TABLE IF EXISTS public.doctor_certificates
ADD COLUMN IF NOT EXISTS date_mode text DEFAULT 'month';
