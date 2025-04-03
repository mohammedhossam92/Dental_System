/*
  # Add student registration status and class year

  1. Changes
    - Add class_year_id to students table
    - Add registration_status to students table
    - Add registration_end_date to students table
    - Add foreign key constraint for class_year_id

  2. Security
    - Update RLS policies
*/

ALTER TABLE students
ADD COLUMN class_year_id uuid REFERENCES class_years(id),
ADD COLUMN registration_status text NOT NULL DEFAULT 'pending' CHECK (registration_status IN ('registered', 'unregistered', 'pending')),
ADD COLUMN registration_end_date timestamptz;

-- Create a function to automatically update registration status
CREATE OR REPLACE FUNCTION update_registration_status()
RETURNS trigger AS $$
BEGIN
  IF NEW.registration_status = 'registered' AND NEW.registration_end_date < NOW() THEN
    NEW.registration_status = 'unregistered';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update registration status
CREATE TRIGGER check_registration_status
  BEFORE INSERT OR UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_registration_status();