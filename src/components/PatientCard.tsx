import React, { useState } from 'react';
import { Edit, Trash2, Info, Plus, RotateCw, RotateCcw } from 'lucide-react';
import type { Patient, Student, Treatment, ToothClass, ClassYear, WorkingDays } from '../types';

interface PatientCardProps {
  patient: Patient;
  doctorName?: string;
  classYear?: string;
  treatmentName?: string;
  toothClassName?: string;
  onEdit: (patient: Patient) => void;
  onDelete: (id: string) => void;
  onInfo: (patient: Patient) => void;
  onNotes: (patient: Patient) => void;
  hasNotes?: boolean;
  onStatusChange?: (patientId: string, newStatus: Patient['status']) => void;
}

export function PatientCard({
  patient,
  doctorName,
  classYear,
  treatmentName,
  toothClassName,
  onEdit,
  onDelete,
  onInfo,
  onNotes,
  hasNotes,
  onStatusChange
}: PatientCardProps) {
  const [showMore, setShowMore] = useState(false);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-3 mx-1 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-2">
        <div>
          <div className="space-y-2">
            <div className="font-bold text-lg text-gray-900 dark:text-white">{patient.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-300">Doctor: <span className="font-semibold text-blue-600 dark:text-blue-400">{doctorName || 'Unassigned'}</span></div>
            <div className="text-sm text-gray-500 dark:text-gray-300">Treatment: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{treatmentName || 'N/A'}</span></div>
            <div className="text-xs">
              <span className="font-semibold text-gray-600 dark:text-gray-300">Start:</span> <span className="font-semibold text-blue-600 dark:text-blue-400">{patient.start_date ? new Date(patient.start_date).toLocaleDateString('en-GB') : '-'}</span>
              <span className="mx-2">|</span>
              <span className="font-semibold text-gray-600 dark:text-gray-300">End:</span> <span className="font-semibold text-orange-500 dark:text-orange-400">{patient.end_date ? new Date(patient.end_date).toLocaleDateString('en-GB') : '-'}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className="flex flex-col gap-2">
            {/* Status-changing buttons (icons only) */}
            {onStatusChange && patient.status === 'pending' && (
              <button
                onClick={() => onStatusChange(patient.id, 'in_progress')}
                title="Start Treatment"
                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                <RotateCw className="h-5 w-5" />
              </button>
            )}
            {onStatusChange && patient.status === 'in_progress' && (
              <>
                <button
                  onClick={() => onStatusChange(patient.id, 'completed')}
                  title="Complete Treatment"
                  className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                >
                  <RotateCw className="h-5 w-5" />
                </button>
                <button
                  onClick={() => onStatusChange(patient.id, 'pending')}
                  title="Rewind to Pending"
                  className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
              </>
            )}
            {onStatusChange && patient.status === 'completed' && (
              <button
                onClick={() => onStatusChange(patient.id, 'in_progress')}
                title="Rewind to In Progress"
                className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            )}
            {/* Main action buttons (icons only) */}
            <button onClick={() => onEdit(patient)} title="Edit" className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"><Edit className="h-5 w-5" /></button>
            <button onClick={() => onDelete(patient.id)} title="Delete" className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"><Trash2 className="h-5 w-5" /></button>
            <button onClick={() => onInfo(patient)} title="Info" className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"><Info className="h-5 w-5" /></button>
            <button onClick={() => onNotes(patient)} title="Notes" className="text-yellow-500 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300"><span role="img" aria-label="Notes">📝</span></button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className={`inline-flex text-xs font-semibold rounded-full px-2 py-1 ${patient.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : patient.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>{patient.status.charAt(0).toUpperCase() + patient.status.slice(1).replace('_', ' ')}</span>
        {hasNotes && <span className="ml-2 text-yellow-500" title="This patient has notes">📝</span>}
      </div>
      <button className="mt-2 text-xs text-indigo-600 dark:text-indigo-300 underline" onClick={() => setShowMore(m => !m)}>{showMore ? 'Show Less' : 'Show More'}</button>
      {showMore && (
        <div className="mt-2 text-sm text-gray-700 dark:text-gray-200 space-y-1">
          <div><span className="font-semibold">Class Year:</span> <span className="font-bold text-purple-600 dark:text-purple-400">{classYear || 'N/A'}</span></div>
          <div><span className="font-semibold">Tooth Number:</span> <span className="font-bold text-pink-600 dark:text-pink-400">{patient.tooth_number || 'N/A'}</span></div>
          <div><span className="font-semibold">Tooth Class:</span> <span className="font-bold text-green-600 dark:text-green-400">{toothClassName || 'N/A'}</span></div>
          <div><span className="font-semibold">Age:</span> <span className="font-bold text-orange-600 dark:text-orange-400">{patient.age ? patient.age.toString() : 'N/A'}</span></div>
        </div>
      )}
    </div>
  );
}

export default PatientCard;
