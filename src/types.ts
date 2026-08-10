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
  registration_start_date: string | null;
  registration_end_date: string | null;
  unregistered_at: string | null;
  is_available: boolean;
  patients_in_progress: number;
  patients_completed: number;
  created_at: string;
}

export interface StudentRegistrationPeriod {
  id: string;
  student_id: string;
  organization_id: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
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

export interface WaitingListEntry {
  id: string;
  patient_name: string;
  patient_phone: string;
  city: string;
  diagnosis: 'rct' | 'operative' | 'scaling' | 'pulpotomy' | 'pulpectomy' | 'impaction';
  status: 'pending' | 'answered' | 'no_answer';
  appointment_info: string | null;
  notes: string | null;
  organization_id: string;
  created_at: string;
}

export interface StudentNote {
  id: string;
  student_id: string;
  content: string;
  created_by?: string;
  created_at: string;
  edited_at?: string | null;
}

export interface StudentAbsence {
  id: string;
  student_id: string;
  organization_id?: string | null;
  date: string;
  weight: number;
  reason?: string | null;
  created_at: string;
}

export interface StudentAbsenceExcuse {
  id: string;
  student_id: string;
  organization_id?: string | null;
  absence_date: string;
  reported_date: string;
  excuse: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string | null;
  created_at: string;
}

export type EmploymentStatusType = 
  | 'قوة أساسية'
  | 'انتداب'
  | 'إعارة'
  | 'إجازة'
  | 'ندب'
  | 'إنهاء خدمة'
  | 'أخرى';

export interface University {
  id: string;
  name: string;
  country: string;
  organization_id?: string | null;
  created_at?: string;
}

export interface CertificateType {
  id: string;
  name: string;
  organization_id?: string | null;
  created_at?: string;
}

export interface Doctor {
  id: string;
  name: string;
  national_id: string | null;
  birth_date: string | null;
  graduation_date: string | null;
  hire_date: string | null;
  address: string | null;
  phone: string | null;
  notes: string | null;
  organization_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DoctorEmploymentHistory {
  id: string;
  doctor_id: string;
  organization_id?: string | null;
  status_type: EmploymentStatusType | string;
  deputation_direction?: 'منتدب إلى المستشفى' | 'منتدب من المستشفى إلى الخارج' | 'incoming' | 'outgoing' | string | null;
  deputation_facility?: string | null;
  has_administrative_duty?: boolean | null;
  administrative_scope?: 'داخل القسم' | 'خارج القسم' | string | null;
  administrative_role?: string | null;
  administrative_facility?: string | null;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_at?: string;
}

export interface DoctorCertificate {
  id: string;
  doctor_id: string;
  organization_id?: string | null;
  certificate_type: string;
  certificate_title: string;
  university_name: string;
  university_country: string;
  university_id?: string | null;
  status: 'obtained' | 'in_progress';
  obtained_date: string | null;
  study_start_date: string | null;
  expected_date: string | null;
  file_url: string | null;
  file_name?: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DoctorPromotion {
  id: string;
  doctor_id: string;
  organization_id?: string | null;
  promotion_type: string;
  promotion_date: string;
  notes: string | null;
  document_url: string | null;
  document_name?: string | null;
  created_at?: string;
}

export interface DoctorFinancialGrade {
  id: string;
  doctor_id: string;
  organization_id?: string | null;
  financial_grade: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_at?: string;
}

export interface DoctorDocument {
  id: string;
  doctor_id: string;
  organization_id?: string | null;
  title: string;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface DoctorWithDetails extends Doctor {
  current_status?: DoctorEmploymentHistory | null;
  employment_history?: DoctorEmploymentHistory[];
  certificates?: DoctorCertificate[];
  promotions?: DoctorPromotion[];
  financial_grades?: DoctorFinancialGrade[];
  documents?: DoctorDocument[];
  current_financial_grade?: DoctorFinancialGrade | null;
}

export interface DoctorFilterState {
  search: string;
  employmentStatus: string;
  administrativeDuty: string;
  certificateType: string;
  certificateStatus: string;
  university: string;
  obtainedYear: string;
}
