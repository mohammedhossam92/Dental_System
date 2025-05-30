export interface Student {
  id: string;
  name: string;
  mobile: string;
  city: string;
  university: string;
  university_type: 'حكومي' | 'خاص' | 'اخري';
  working_days_id: string;
  class_year_id: string | null;
  organization_id: string;
  registration_status: 'registered' | 'unregistered' | 'pending';
  registration_end_date: string | null;
  is_available: boolean;
  patients_in_progress: number;
  patients_completed: number;
  created_at: string;
}

export interface WorkingDays {
  id: string;
  name: string;
  days: string[];
  created_at: string;
}

export interface Treatment {
  id: string;
  name: string;
  created_at: string;
}

export interface ToothClass {
  id: string;
  name: string;
  created_at: string;
}

export interface Patient {
  id: string;
  ticket_number: string;
  name: string;
  mobile: string | null;
  class_year_id: string | null;
  student_id: string;
  student?: { id: string; name: string };
  start_date: string | null;
  end_date: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  age?: number | null;
  treatment_id: string;
  tooth_number: string;
  tooth_class_id: string;
  working_days_id?: string | null;
  payment: 'free' | 'economical' | 'unknown' | null;
}

export type PatientForm = Omit<Patient, 'id' | 'created_at' | 'payment'> & {
  payment: 'free' | 'economical' | 'unknown';
};

export interface PatientToothTreatment {
  id: string;
  patient_id: string;
  treatment_id: string;
  tooth_number: string;
  tooth_class_id: string;
  created_at: string;
}

export interface TreatmentVisit {
  id: string;
  patient_id: string;
  visit_date: string;
  notes: string | null;
  created_at: string;
}

export interface StudentWithDetails extends Student {
  working_days: WorkingDays;
}

export interface ClassYear {
  id: string;
  year_range: string;
  name: string;
  created_at: string;
}
