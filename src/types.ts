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
  student_id: string;
  treatment_id: string;
  tooth_number: string;
  tooth_class_id: string;
  start_date: string | null;
  end_date: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
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
  created_at: string;
}