-- Migration: Add administrative work fields to doctor employment history
-- Adds has_administrative_duty, administrative_scope, administrative_role, and administrative_facility columns

ALTER TABLE IF EXISTS public.doctor_employment_history
ADD COLUMN IF NOT EXISTS has_administrative_duty boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS administrative_scope text, -- 'داخل القسم', 'خارج القسم'
ADD COLUMN IF NOT EXISTS administrative_role text, -- 'رئيس القسم', 'نائب رئيس القسم', etc.
ADD COLUMN IF NOT EXISTS administrative_facility text; -- اسم الجهة / الإدارة في حال كان خارج القسم

-- Create indexes for administrative role queries and fast filtering
CREATE INDEX IF NOT EXISTS idx_doc_emp_admin_duty ON public.doctor_employment_history(has_administrative_duty);
CREATE INDEX IF NOT EXISTS idx_doc_emp_admin_scope ON public.doctor_employment_history(administrative_scope);
CREATE INDEX IF NOT EXISTS idx_doc_emp_admin_role ON public.doctor_employment_history(administrative_role);
