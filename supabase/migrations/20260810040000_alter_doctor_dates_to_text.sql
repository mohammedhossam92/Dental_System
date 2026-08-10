-- Migration: Convert doctor date columns to text and drop NOT NULL constraints
-- Allows storing Year Only ('YYYY'), Month & Year ('YYYY-MM'), Full Date ('YYYY-MM-DD'), or NULL (Optional)

-- 1. جدول بيانات الأطباء (Doctors)
ALTER TABLE IF EXISTS public.doctors
ALTER COLUMN birth_date TYPE text,
ALTER COLUMN birth_date DROP NOT NULL,
ALTER COLUMN graduation_date TYPE text,
ALTER COLUMN graduation_date DROP NOT NULL,
ALTER COLUMN hire_date TYPE text,
ALTER COLUMN hire_date DROP NOT NULL;

-- 2. جدول السجل الوظيفي والحالات الوظيفية (Employment History)
ALTER TABLE IF EXISTS public.doctor_employment_history
ALTER COLUMN start_date TYPE text,
ALTER COLUMN start_date DROP NOT NULL,
ALTER COLUMN end_date TYPE text,
ALTER COLUMN end_date DROP NOT NULL;

-- 3. جدول الشهادات والدرجات العلمية (Certificates)
ALTER TABLE IF EXISTS public.doctor_certificates
ALTER COLUMN obtained_date TYPE text,
ALTER COLUMN obtained_date DROP NOT NULL,
ALTER COLUMN study_start_date TYPE text,
ALTER COLUMN study_start_date DROP NOT NULL,
ALTER COLUMN expected_date TYPE text,
ALTER COLUMN expected_date DROP NOT NULL;

-- 4. جدول الترقيات والدرجات المهنية (Promotions)
ALTER TABLE IF EXISTS public.doctor_promotions
ALTER COLUMN promotion_date TYPE text,
ALTER COLUMN promotion_date DROP NOT NULL;

-- 5. جدول التدرج والدرجات المالية (Financial Grades)
ALTER TABLE IF EXISTS public.doctor_financial_grades
ALTER COLUMN start_date TYPE text,
ALTER COLUMN start_date DROP NOT NULL,
ALTER COLUMN end_date TYPE text,
ALTER COLUMN end_date DROP NOT NULL;
