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
    <div className="container mx-auto px-4 sm:px-6 py-6">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 sm:p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Reports</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Start Date:</label>
            <input
              type="date"
              className="w-full p-2 rounded-lg border bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">End Date:</label>
            <input
              type="date"
              className="w-full p-2 rounded-lg border bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">Treatment Statistics</h2>
            <div className="grid gap-4">
              {treatments.map((treatment) => (
                <div
                  key={treatment.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  <span className="text-gray-700 dark:text-gray-300">{treatment.name}</span>
                  <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                    {treatmentStats[treatment.id] || 0} patients
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">Student Performance</h2>
            <div className="grid gap-4">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{student.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {student.patients_completed} completed / {student.patients_in_progress} in progress
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}