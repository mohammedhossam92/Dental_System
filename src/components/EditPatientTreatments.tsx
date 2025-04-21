import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DentalChartPicker } from './DentalChartPicker';
import type { Treatment, ToothClass, PatientToothTreatment } from '../types';

interface EditPatientTreatmentsProps {
  patientId: string;
  treatments: Treatment[];
  toothClasses: ToothClass[];
  onChange?: () => void; // callback to refresh parent if needed
}

const emptyTreatment = { treatment_id: '', tooth_number: '', tooth_class_id: '' };

const EditPatientTreatments: React.FC<EditPatientTreatmentsProps> = ({ patientId, treatments, toothClasses, onChange }) => {
  const [toothTreatments, setToothTreatments] = useState<PatientToothTreatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerIdx, setPickerIdx] = useState<number | null>(null);

  useEffect(() => {
    fetchToothTreatments();
    // eslint-disable-next-line
  }, [patientId]);

  async function fetchToothTreatments() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('patient_tooth_treatments')
      .select('*')
      .eq('patient_id', patientId);
    if (!error && data) setToothTreatments(data);
    setLoading(false);
  }

  function handleFieldChange(idx: number, field: keyof PatientToothTreatment, value: string) {
    setToothTreatments(tts => tts.map((tt, i) => i === idx ? { ...tt, [field]: value } : tt));
  }

  function handleAddTreatment() {
    setToothTreatments(tts => [...tts, { ...emptyTreatment, id: 'temp_' + Math.random().toString(36).substr(2, 9), patient_id: patientId, created_at: new Date().toISOString() }]);
  }

  async function handleRemoveTreatment(idx: number, tt: PatientToothTreatment) {
    if (tt.id && !tt.id.startsWith('temp')) {
      // Remove from DB
      setSaving(true);
      const { error } = await supabase.from('patient_tooth_treatments').delete().eq('id', tt.id);
      setSaving(false);
      if (error) {
        setError('Failed to remove treatment');
        return;
      }
      if (onChange) onChange();
      fetchToothTreatments();
    } else {
      // Remove from local state
      setToothTreatments(tts => tts.filter((_, i) => i !== idx));
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    // Save all new or edited treatments
    for (const tt of toothTreatments) {
      if (!tt.treatment_id || !tt.tooth_number || !tt.tooth_class_id) continue;
      if (tt.id && tt.id.startsWith('temp')) {
        // Insert new
        const { error } = await supabase.from('patient_tooth_treatments').insert({
          patient_id: patientId,
          treatment_id: tt.treatment_id,
          tooth_number: tt.tooth_number,
          tooth_class_id: tt.tooth_class_id,
        });
        if (error) setError('Failed to add treatment');
      } else if (tt.id) {
        // Update existing
        const { error } = await supabase.from('patient_tooth_treatments').update({
          treatment_id: tt.treatment_id,
          tooth_number: tt.tooth_number,
          tooth_class_id: tt.tooth_class_id,
        }).eq('id', tt.id);
        if (error) setError('Failed to update treatment');
      }
    }
    setSaving(false);
    if (onChange) onChange();
    // Do NOT reload from DB here, keep local state for new rows
    // fetchToothTreatments();
  }

  if (loading) return <div className="text-gray-500 dark:text-gray-400">Loading treatments...</div>;

  return (
    <div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <ul className="divide-y divide-gray-200 dark:divide-gray-700 mb-4">
        {toothTreatments.map((tt, idx) => (
          <li key={tt.id || idx} className="py-2 flex flex-col sm:flex-row sm:items-center sm:gap-4">
            <select
              className="mb-1 sm:mb-0 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={tt.treatment_id}
              onChange={e => handleFieldChange(idx, 'treatment_id', e.target.value)}
            >
              <option value="">Select Treatment</option>
              {treatments.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button
              type="button"
              className="mb-1 sm:mb-0 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white bg-white hover:bg-indigo-100"
              onClick={() => setPickerIdx(idx)}
            >
              {tt.tooth_number ? `Tooth: ${tt.tooth_number}` : 'Choose Tooth'}
            </button>
            {pickerIdx === idx && (
              <DentalChartPicker
                open={true}
                onClose={() => setPickerIdx(null)}
                onSelect={tooth => { handleFieldChange(idx, 'tooth_number', tooth); setPickerIdx(null); }}
              />
            )}
            <select
              className="mb-1 sm:mb-0 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={tt.tooth_class_id}
              onChange={e => handleFieldChange(idx, 'tooth_class_id', e.target.value)}
            >
              <option value="">Select Class</option>
              {toothClasses.map(tc => (
                <option key={tc.id} value={tc.id}>{tc.name}</option>
              ))}
            </select>
            <button
              type="button"
              className="ml-2 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              onClick={() => handleRemoveTreatment(idx, tt)}
              disabled={saving}
            >Remove</button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 mr-2"
        onClick={handleAddTreatment}
        disabled={saving}
      >Add Treatment</button>
      <button
        type="button"
        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        onClick={handleSave}
        disabled={saving}
      >Save Changes</button>
    </div>
  );
};

export default EditPatientTreatments;
