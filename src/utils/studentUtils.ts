// src/utils/studentUtils.ts
import { supabase } from '../lib/supabase';

export async function updateStudentPatientCounts(studentId: string) {
  if (!studentId) return;

  try {
    // Get counts of patients in different statuses for this student
    const { data: counts, error } = await supabase
      .from('patients')
      .select('status')
      .eq('student_id', studentId);

    if (error) throw error;

    // Calculate the new counts
    const inProgressCount = counts?.filter(p => p.status === 'in_progress').length || 0;
    const completedCount = counts?.filter(p => p.status === 'completed').length || 0;

    // Update the student's record
    const { error: updateError } = await supabase
      .from('students')
      .update({
        patients_in_progress: inProgressCount,
        patients_completed: completedCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', studentId);

    if (updateError) throw updateError;

    return { inProgressCount, completedCount };
  } catch (error) {
    console.error('Error updating student patient counts:', error);
    throw error;
  }
}

export async function handlePatientStatusChange(
  patientId: string,
  newStatus: string,
  currentPatient: any,
  onSuccess?: () => void
) {
  try {
    // Update the patient's status
    const updates = {
      status: newStatus,
      end_date: newStatus === 'completed' ? new Date().toISOString() : currentPatient.end_date
    };

    const { error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', patientId);

    if (error) throw error;

    // If the patient is assigned to a student, update their counts
    if (currentPatient.student_id) {
      await updateStudentPatientCounts(currentPatient.student_id);
    }

    // If the status changed to/from completed and the patient is reassigned, update the previous student's counts
    if (currentPatient.previousStudentId && currentPatient.previousStudentId !== currentPatient.student_id) {
      await updateStudentPatientCounts(currentPatient.previousStudentId);
    }

    if (onSuccess) onSuccess();

    return true;
  } catch (error) {
    console.error('Error updating patient status:', error);
    throw error;
  }
}