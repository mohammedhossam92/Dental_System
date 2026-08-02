-- Create student_absences table
CREATE TABLE IF NOT EXISTS public.student_absences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weight NUMERIC(3, 1) DEFAULT 1.0 NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for faster queries by student_id and date
CREATE INDEX IF NOT EXISTS idx_student_absences_student_id ON public.student_absences(student_id);
CREATE INDEX IF NOT EXISTS idx_student_absences_date ON public.student_absences(date);

-- Enable Row Level Security (RLS)
ALTER TABLE public.student_absences ENABLE ROW LEVEL SECURITY;

-- Allow full access policy
DROP POLICY IF EXISTS "student_absences_full_access" ON public.student_absences;
CREATE POLICY "student_absences_full_access" ON public.student_absences
    FOR ALL
    USING (true)
    WITH CHECK (true);
