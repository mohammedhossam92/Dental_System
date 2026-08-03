-- Create student_absence_excuses table
CREATE TABLE IF NOT EXISTS public.student_absence_excuses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    absence_date DATE NOT NULL,
    reported_date DATE NOT NULL,
    excuse TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for faster queries by student_id and dates
CREATE INDEX IF NOT EXISTS idx_student_absence_excuses_student_id ON public.student_absence_excuses(student_id);
CREATE INDEX IF NOT EXISTS idx_student_absence_excuses_absence_date ON public.student_absence_excuses(absence_date);

-- Enable Row Level Security (RLS)
ALTER TABLE public.student_absence_excuses ENABLE ROW LEVEL SECURITY;

-- Allow full access policy
DROP POLICY IF EXISTS "student_absence_excuses_full_access" ON public.student_absence_excuses;
CREATE POLICY "student_absence_excuses_full_access" ON public.student_absence_excuses
    FOR ALL
    USING (true)
    WITH CHECK (true);
