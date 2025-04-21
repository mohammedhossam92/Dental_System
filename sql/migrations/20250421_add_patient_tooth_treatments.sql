-- 1. Create the new table for multiple tooth treatments per patient
CREATE TABLE IF NOT EXISTS patient_tooth_treatments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
    treatment_id uuid REFERENCES treatments(id),
    tooth_number text,
    tooth_class_id uuid REFERENCES tooth_classes(id),
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Migrate existing data (if any)
INSERT INTO patient_tooth_treatments (patient_id, treatment_id, tooth_number, tooth_class_id, created_at)
SELECT id, treatment_id, tooth_number, tooth_class_id, created_at FROM patients
WHERE treatment_id IS NOT NULL AND tooth_number IS NOT NULL AND tooth_class_id IS NOT NULL;

-- 3. (Optional) Remove old columns from patients table
-- ALTER TABLE patients DROP COLUMN treatment_id;
-- ALTER TABLE patients DROP COLUMN tooth_number;
-- ALTER TABLE patients DROP COLUMN tooth_class_id;
