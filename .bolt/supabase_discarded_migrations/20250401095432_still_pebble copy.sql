/*
  # Initial Schema Setup for Dental Clinic Management System

  1. New Tables
    - `working_days`
      - `id` (uuid, primary key)
      - `name` (text) - Name of the working day group
      - `days` (text[]) - Array of working days
      - `created_at` (timestamp)

    - `students`
      - `id` (uuid, primary key)
      - `name` (text)
      - `mobile` (text)
      - `city` (text)
      - `university` (text)
      - `working_days_id` (uuid, foreign key)
      - `is_available` (boolean)
      - `patients_in_progress` (integer)
      - `patients_completed` (integer)
      - `created_at` (timestamp)

    - `treatments`
      - `id` (uuid, primary key)
      - `name` (text)
      - `created_at` (timestamp)

    - `tooth_classes`
      - `id` (uuid, primary key)
      - `name` (text)
      - `created_at` (timestamp)

    - `patients`
      - `id` (uuid, primary key)
      - `ticket_number` (text)
      - `name` (text)
      - `student_id` (uuid, foreign key)
      - `treatment_id` (uuid, foreign key)
      - `tooth_number` (text)
      - `tooth_class_id` (uuid, foreign key)
      - `start_date` (timestamp)
      - `end_date` (timestamp)
      - `status` (text)
      - `created_at` (timestamp)

    - `treatment_visits`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, foreign key)
      - `visit_date` (timestamp)
      - `notes` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create working_days table
CREATE TABLE working_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  days text[] NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE working_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users" ON working_days
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create students table
CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mobile text NOT NULL,
  city text NOT NULL,
  university text NOT NULL,
  working_days_id uuid REFERENCES working_days(id),
  is_available boolean DEFAULT true,
  patients_in_progress integer DEFAULT 0,
  patients_completed integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users" ON students
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create treatments table
CREATE TABLE treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users" ON treatments
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create tooth_classes table
CREATE TABLE tooth_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tooth_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users" ON tooth_classes
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create patients table
CREATE TABLE patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  name text NOT NULL,
  student_id uuid REFERENCES students(id),
  treatment_id uuid REFERENCES treatments(id),
  tooth_number text NOT NULL,
  tooth_class_id uuid REFERENCES tooth_classes(id),
  start_date timestamptz,
  end_date timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users" ON patients
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create treatment_visits table
CREATE TABLE treatment_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id),
  visit_date timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE treatment_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users" ON treatment_visits
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default tooth classes
INSERT INTO tooth_classes (name) VALUES
  ('Class I'),
  ('Class II'),
  ('Class III'),
  ('Class IV'),
  ('Class V'),
  ('Class VI'),
  ('Complex');

-- Create function to update student availability
CREATE OR REPLACE FUNCTION update_student_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'in_progress' THEN
    UPDATE students
    SET is_available = false,
        patients_in_progress = patients_in_progress + 1
    WHERE id = NEW.student_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
    UPDATE students
    SET is_available = true,
        patients_in_progress = patients_in_progress - 1,
        patients_completed = patients_completed + 1
    WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_availability_trigger
AFTER INSERT OR UPDATE ON patients
FOR EACH ROW
EXECUTE FUNCTION update_student_availability();