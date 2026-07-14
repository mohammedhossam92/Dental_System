-- Update waiting_list table with call status, appointment info, and notes fields
ALTER TABLE waiting_list 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS appointment_info text,
ADD COLUMN IF NOT EXISTS notes text;
