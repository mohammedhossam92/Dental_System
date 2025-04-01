import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Patient, Treatment, Student } from '../types';
import { Calendar, Users, Activity } from 'lucide-react';

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
    <div className="container mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-white mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Track treatment progress and student performance</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex items-center mb-4">
          <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Date Range</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Start Date</label>
            <input
              type="date"
              className="w-full px-4 py-2 rounded-xl border bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">End Date</label>
            <input
              type="date"
              className="w-full px-4 py-2 rounded-xl border bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div className="flex items-center mb-6">
            <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Treatment Statistics</h2>
          </div>
          <div className="space-y-4">
            {treatments.map((treatment) => (
              <div
                key={treatment.id}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 transform hover:scale-[1.02]"
              >
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{treatment.name}</span>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {treatmentStats[treatment.id] || 0}
                    </span>
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">patients</span>
                  </div>
                </div>
                <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full"
                    style={{ width: `${Math.min(100, ((treatmentStats[treatment.id] || 0) / Math.max(...Object.values(treatmentStats))) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div className="flex items-center mb-6">
            <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Student Performance</h2>
          </div>
          <div className="space-y-4">
            {students.map((student) => (
              <div
                key={student.id}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 transform hover:scale-[1.02]"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <span className="text-gray-800 dark:text-white font-medium block">{student.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Total Cases: {student.patients_completed + student.patients_in_progress}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <span className="block text-2xl font-bold text-green-600 dark:text-green-400">
                        {student.patients_completed}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Completed</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {student.patients_in_progress}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">In Progress</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 dark:bg-green-400 rounded-full"
                    style={{
                      width: `${(student.patients_completed / (student.patients_completed + student.patients_in_progress)) * 100}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
