-- =========================================================================
-- نظام إدارة بيانات الأطباء والشهادات والسجل الوظيفي والترقيات والدرجات المالية
-- Dental Clinic System - Doctor & Certificate Management Schema
-- =========================================================================

-- 1. Create Universities Table
CREATE TABLE IF NOT EXISTS public.universities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    country text DEFAULT 'مصر',
    created_at timestamptz DEFAULT now(),
    CONSTRAINT universities_name_country_org_unique UNIQUE NULLS NOT DISTINCT (name, country, organization_id)
);

-- 2. Create Certificate Types Table
CREATE TABLE IF NOT EXISTS public.certificate_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT certificate_types_name_org_unique UNIQUE NULLS NOT DISTINCT (name, organization_id)
);

-- 3. Create Doctors Table
CREATE TABLE IF NOT EXISTS public.doctors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    national_id text,
    birth_date date,
    graduation_date date,
    hire_date date,
    address text,
    phone text,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT doctors_national_id_org_unique UNIQUE NULLS NOT DISTINCT (national_id, organization_id)
);

-- 4. Create Doctor Employment History Table
CREATE TABLE IF NOT EXISTS public.doctor_employment_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    status_type text NOT NULL, -- 'قوة أساسية', 'انتداب', 'إعارة', 'إجازة', 'ندب', 'إنهاء خدمة', 'أخرى'
    deputation_direction text, -- 'منتدب إلى المستشفى', 'منتدب من المستشفى إلى الخارج'
    deputation_facility text, -- اسم الجهة المنتدب منها أو إليها
    start_date date NOT NULL,
    end_date date, -- NULL indicates current / ongoing
    notes text,
    created_at timestamptz DEFAULT now()
);

-- 5. Create Doctor Certificates Table
CREATE TABLE IF NOT EXISTS public.doctor_certificates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    certificate_type text NOT NULL, -- بكالوريوس, دبلوم, دبلومة, ماجستير, دكتوراه, زمالة, شهادة مهنية, دورة تدريبية, أخرى
    certificate_title text NOT NULL, -- e.g. جراحة الوجه والفكين
    university_name text NOT NULL, -- e.g. جامعة المنصورة
    university_country text DEFAULT 'مصر',
    university_id uuid REFERENCES public.universities(id) ON DELETE SET NULL,
    status text NOT NULL CHECK (status IN ('obtained', 'in_progress')),
    obtained_date date, -- Required when status is 'obtained'
    study_start_date date, -- Shown when status is 'in_progress'
    expected_date date, -- Optional when status is 'in_progress'
    file_url text,
    file_name text,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 6. Create Doctor Promotions Table
CREATE TABLE IF NOT EXISTS public.doctor_promotions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    promotion_type text NOT NULL,
    promotion_date date NOT NULL,
    notes text,
    document_url text,
    document_name text,
    created_at timestamptz DEFAULT now()
);

-- 7. Create Doctor Financial Grades Table
CREATE TABLE IF NOT EXISTS public.doctor_financial_grades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    financial_grade text NOT NULL,
    start_date date NOT NULL,
    end_date date, -- NULL indicates current
    notes text,
    created_at timestamptz DEFAULT now()
);

-- 8. Create Doctor Documents Table
CREATE TABLE IF NOT EXISTS public.doctor_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    title text NOT NULL,
    file_url text NOT NULL,
    file_name text,
    file_type text,
    notes text,
    created_at timestamptz DEFAULT now()
);

-- 9. Create Indexes for High Performance Queries & Filtering
CREATE INDEX IF NOT EXISTS idx_doctors_org ON public.doctors(organization_id);
CREATE INDEX IF NOT EXISTS idx_doctors_name ON public.doctors(name);
CREATE INDEX IF NOT EXISTS idx_doctors_national_id ON public.doctors(national_id);
CREATE INDEX IF NOT EXISTS idx_doctors_phone ON public.doctors(phone);

CREATE INDEX IF NOT EXISTS idx_universities_org ON public.universities(organization_id);
CREATE INDEX IF NOT EXISTS idx_universities_name ON public.universities(name);

CREATE INDEX IF NOT EXISTS idx_cert_types_org ON public.certificate_types(organization_id);
CREATE INDEX IF NOT EXISTS idx_cert_types_name ON public.certificate_types(name);

CREATE INDEX IF NOT EXISTS idx_doc_emp_doctor ON public.doctor_employment_history(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doc_emp_status ON public.doctor_employment_history(status_type);
CREATE INDEX IF NOT EXISTS idx_doc_emp_dates ON public.doctor_employment_history(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_doc_certs_doctor ON public.doctor_certificates(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doc_certs_type ON public.doctor_certificates(certificate_type);
CREATE INDEX IF NOT EXISTS idx_doc_certs_title ON public.doctor_certificates(certificate_title);
CREATE INDEX IF NOT EXISTS idx_doc_certs_univ ON public.doctor_certificates(university_name);
CREATE INDEX IF NOT EXISTS idx_doc_certs_status ON public.doctor_certificates(status);
CREATE INDEX IF NOT EXISTS idx_doc_certs_obtained ON public.doctor_certificates(obtained_date);

CREATE INDEX IF NOT EXISTS idx_doc_promotions_doctor ON public.doctor_promotions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doc_financial_doctor ON public.doctor_financial_grades(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doc_docs_doctor ON public.doctor_documents(doctor_id);

-- 10. Enable RLS and Configure Full Access / Org Isolation
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'doctors',
        'universities',
        'certificate_types',
        'doctor_employment_history',
        'doctor_certificates',
        'doctor_promotions',
        'doctor_financial_grades',
        'doctor_documents'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = t
        ) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_full_access', t);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (true) WITH CHECK (true);', t || '_full_access', t);
        END IF;
    END LOOP;
END $$;

-- 11. Pre-seed Default Certificate Types
INSERT INTO public.certificate_types (name)
VALUES 
    ('بكالوريوس'),
    ('دبلوم'),
    ('دبلومة'),
    ('ماجستير'),
    ('دكتوراه'),
    ('زمالة'),
    ('شهادة مهنية'),
    ('دورة تدريبية'),
    ('أخرى')
ON CONFLICT DO NOTHING;

-- 12. Pre-seed Standard Universities
INSERT INTO public.universities (name, country)
VALUES
    ('جامعة القاهرة', 'مصر'),
    ('جامعة المنصورة', 'مصر'),
    ('جامعة عين شمس', 'مصر'),
    ('جامعة الإسكندرية', 'مصر'),
    ('جامعة الأزهر', 'مصر'),
    ('جامعة أسيوط', 'مصر'),
    ('جامعة طنطا', 'مصر'),
    ('جامعة الزقازيق', 'مصر'),
    ('جامعة المنيا', 'مصر'),
    ('جامعة بنها', 'مصر'),
    ('جامعة كفر الشيخ', 'مصر'),
    ('جامعة قناة السويس', 'مصر'),
    ('جامعة حلوان', 'مصر'),
    ('جامعة جنوب الوادي', 'مصر'),
    ('جامعة سوهاج', 'مصر'),
    ('جامعة الفيوم', 'مصر'),
    ('جامعة بني سويف', 'مصر'),
    ('جامعة بورسعيد', 'مصر'),
    ('جامعة أسوان', 'مصر'),
    ('جامعة السويس', 'مصر'),
    ('جامعة مطروح', 'مصر'),
    ('جامعة الوادي الجديد', 'مصر'),
    ('جامعة 6 أكتوبر', 'مصر'),
    ('جامعة مصر للعلوم والتكنولوجيا', 'مصر'),
    ('جامعة المستقبل', 'مصر'),
    ('الجامعة البريطانية في مصر', 'مصر'),
    ('جامعة بدر', 'مصر'),
    ('جامعة الدلتا للعلوم والتكنولوجيا', 'مصر'),
    ('جامعة حورس', 'مصر'),
    ('جامعة النهضة', 'مصر'),
    ('جامعة سيناء', 'مصر'),
    ('جامعة الملك سعود', 'السعودية'),
    ('جامعة الملك عبد العزيز', 'السعودية'),
    ('جامعة دمشق', 'سوريا'),
    ('جامعة بغداد', 'العراق'),
    ('جامعة الخرطوم', 'السودان'),
    ('جامعة بيروت العربية', 'لبنان'),
    ('جامعة أكسفورد', 'المملكة المتحدة'),
    ('جامعة هارفارد', 'الولايات المتحدة الأمريكية')
ON CONFLICT DO NOTHING;

-- 13. Create Storage Bucket & Policies for Doctor Files & Certificates
INSERT INTO storage.buckets (id, name, public)
VALUES ('doctor-files', 'doctor-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Doctor Files Access" ON storage.objects;
    CREATE POLICY "Public Doctor Files Access" ON storage.objects
    FOR ALL USING (bucket_id = 'doctor-files') WITH CHECK (bucket_id = 'doctor-files');
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

