-- Create student_notes table
CREATE TABLE IF NOT EXISTS public.student_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    edited_at TIMESTAMPTZ
);

-- Index for faster queries by student_id
CREATE INDEX IF NOT EXISTS idx_student_notes_student_id ON public.student_notes(student_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;

-- Allow full access policy
DROP POLICY IF EXISTS "student_notes_full_access" ON public.student_notes;
CREATE POLICY "student_notes_full_access" ON public.student_notes
    FOR ALL
    USING (true)
    WITH CHECK (true);
