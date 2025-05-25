{{ ... }}
export interface Student {
  id: string;
  name: string;
  mobile: string;
  university: string;
  city: string;
  registration_status: 'registered' | 'unregistered' | 'pending';
  is_available: boolean;
  patients_in_progress: number;
  patients_completed: number;
  patient_limit: number | null;
  created_at: string;
  updated_at: string;
  working_days?: string[];
  class_year_id?: string;
  class_year?: {
    id: string;
    name: string;
  };
  working_days_relation?: WorkingDays[];
}
{{ ... }}
