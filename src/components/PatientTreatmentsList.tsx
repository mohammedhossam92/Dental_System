import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Treatment, ToothClass } from '../types';

interface PatientTreatmentsListProps {
  patientId: string;
  treatments: Treatment[];
  toothClasses: ToothClass[];
}

interface PatientToothTreatment {
  id: string;
  treatment_id: string;
  tooth_number: string;
  tooth_class_id: string;
}

const PatientTreatmentsList: React.FC<PatientTreatmentsListProps> = ({ patientId, treatments, toothClasses }) => {
  const [toothTreatments, setToothTreatments] = useState<PatientToothTreatment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchToothTreatments = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('patient_tooth_treatments')
        .select('*')
        .eq('patient_id', patientId);
      if (!error && data) {
        setToothTreatments(data);
      }
      setLoading(false);
    };
    if (patientId) fetchToothTreatments();
  }, [patientId]);

  if (loading) return <div className="text-gray-500 dark:text-gray-400">Loading treatments...</div>;
  if (toothTreatments.length === 0) return <div className="text-gray-500 dark:text-gray-400">No treatments found.</div>;

  return (
    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
      {toothTreatments.map((tt) => (
        <li key={tt.id} className="py-2 flex flex-col sm:flex-row sm:items-center sm:gap-4">
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {treatments.find(t => t.id === tt.treatment_id)?.name || 'Unknown Treatment'}
          </span>
          <span className="text-gray-600 dark:text-gray-400 text-sm">
            Tooth: <span className="font-semibold">{tt.tooth_number}</span>
            {tt.tooth_class_id && (
              <>
                {' '}|
                Class: <span className="font-semibold">{toothClasses.find(tc => tc.id === tt.tooth_class_id)?.name || tt.tooth_class_id}</span>
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
};

export default PatientTreatmentsList;
