/*
  # Add Class Years Table

  1. New Tables
    - `class_years`
      - `id` (uuid, primary key)
      - `year_range` (text) - Academic year range (e.g., "2024-2025")
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on class_years table
    - Add policy for authenticated users
*/

CREATE TABLE class_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_range text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE class_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all actions for authenticated users"
  ON class_years
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);