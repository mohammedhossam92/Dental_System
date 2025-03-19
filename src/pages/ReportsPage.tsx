import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Patient, Treatment, Student } from '../types';

export function ReportsPage() {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [treatmentStats, setTreatmentStats] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch treatments without date filtering since we don't have a date column
        const { data: treatmentsData, error: treatmentsError } = await supabase
          .from('treatments')
          .select('*');

        if (treatmentsError) {
          throw treatmentsError;
        }
        setTreatments(treatmentsData || []);

        // Fetch patients with date filtering to get treatment statistics
        const { data: patientsData, error: patientsError } = await supabase
          .from('patients')
          .select('*, treatment_id')
          .gte('created_at', dateRange.start || '1970-01-01')
          .lte('created_at', dateRange.end || new Date().toISOString());

        if (patientsError) {
          throw patientsError;
        }

        // Calculate treatment statistics
        const stats: { [key: string]: number } = {};
        patientsData?.forEach(patient => {
          if (patient.treatment_id) {
            stats[patient.treatment_id] = (stats[patient.treatment_id] || 0) + 1;
          }
        });
        setTreatmentStats(stats);

        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('*');

        if (studentsError) {
          throw studentsError;
        }
        setStudents(studentsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }

    fetchData();
  }, [dateRange]);

  return (
    <div className="p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Reports</h1>

      <div className="mb-4 flex gap-4">
        <div>
          <label className="block text-gray-700 dark:text-gray-300">Start Date:</label>
          <input
            type="date"
            className="border p-2 rounded w-full bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-gray-700 dark:text-gray-300">End Date:</label>
          <input
            type="date"
            className="border p-2 rounded w-full bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">Treatment Statistics</h2>
        <div className="grid gap-4">
          {treatments.map((treatment) => (
            <div
              key={treatment.id}
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex justify-between items-center"
            >
              <span className="text-gray-700 dark:text-gray-300">{treatment.name}</span>
              <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                {treatmentStats[treatment.id] || 0} patients
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">Student Performance</h2>
        <div className="grid gap-4">
          {students.map((student) => (
            <div
              key={student.id}
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700 dark:text-gray-300">{student.name}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {student.patients_completed} completed / {student.patients_in_progress} in progress
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}