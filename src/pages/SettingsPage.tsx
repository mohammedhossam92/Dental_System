import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { WorkingDays, ToothClass, Treatment, ClassYear } from '../types';
import { Trash2, Plus, X } from 'lucide-react';

export function SettingsPage() {
  const [workingDays, setWorkingDays] = useState<WorkingDays[]>([]);
  const [toothClasses, setToothClasses] = useState<ToothClass[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [classYears, setClassYears] = useState<ClassYear[]>([]);
  const [error, setError] = useState('');

  // Modal states
  const [isWorkingDaysModalOpen, setIsWorkingDaysModalOpen] = useState(false);
  const [isToothClassModalOpen, setIsToothClassModalOpen] = useState(false);
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
  const [isClassYearModalOpen, setIsClassYearModalOpen] = useState(false);

  // Form states
  const [newWorkingDays, setNewWorkingDays] = useState({ name: '', days: [] as string[] });
  const [newToothClass, setNewToothClass] = useState('');
  const [newTreatment, setNewTreatment] = useState('');
  const [newClassYear, setNewClassYear] = useState({ startYear: '', endYear: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const [workingDaysResult, toothClassesResult, treatmentsResult, classYearsResult] = await Promise.all([
        supabase.from('working_days').select('*'),
        supabase.from('tooth_classes').select('*'),
        supabase.from('treatments').select('*'),
        supabase.from('class_years').select('*')
      ]);

      if (workingDaysResult.error) throw workingDaysResult.error;
      if (toothClassesResult.error) throw toothClassesResult.error;
      if (treatmentsResult.error) throw treatmentsResult.error;
      if (classYearsResult.error) throw classYearsResult.error;

      setWorkingDays(workingDaysResult.data || []);
      setToothClasses(toothClassesResult.data || []);
      setTreatments(treatmentsResult.data || []);
      setClassYears(classYearsResult.data || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Failed to load settings');
    }
  }

  async function handleAddWorkingDays(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!newWorkingDays.name || newWorkingDays.days.length === 0) {
      setError('Please enter a name and select at least one day');
      return;
    }

    try {
      const { error } = await supabase
        .from('working_days')
        .insert([newWorkingDays]);

      if (error) throw error;

      fetchSettings();
      setIsWorkingDaysModalOpen(false);
      setNewWorkingDays({ name: '', days: [] });
    } catch (error) {
      console.error('Error adding working days:', error);
      setError('Failed to add working days');
    }
  }

  async function handleAddToothClass(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!newToothClass.trim()) {
      setError('Please enter a tooth class name');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('tooth_classes')
        .insert([{ name: newToothClass }]);

      if (error) throw error;

      fetchSettings();
      setIsToothClassModalOpen(false);
      setNewToothClass('');
    } catch (error) {
      console.error('Error adding tooth class:', error);
      setError('Failed to add tooth class');
    }
  }

  async function handleAddTreatment(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!newTreatment.trim()) {
      setError('Please enter a treatment name');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('treatments')
        .insert([{ name: newTreatment }]);

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || 'Failed to add treatment');
      }

      fetchSettings();
      setIsTreatmentModalOpen(false);
      setNewTreatment('');
    } catch (error) {
      console.error('Error adding treatment:', error);
      setError(error instanceof Error ? error.message : 'Failed to add treatment');
    }
  }

  async function handleAddClassYear(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!newClassYear.startYear || !newClassYear.endYear) {
      setError('Please select both years');
      return;
    }

    const yearRange = `${newClassYear.startYear}-${newClassYear.endYear}`;

    try {
      const { error } = await supabase
        .from('class_years')
        .insert([{ year_range: yearRange }]);

      if (error) throw error;

      fetchSettings();
      setIsClassYearModalOpen(false);
      setNewClassYear({ startYear: '', endYear: '' });
    } catch (error) {
      console.error('Error adding class year:', error);
      setError('Failed to add class year');
    }
  }

  async function handleDeleteTreatment(id: string) {
    try {
      const { error } = await supabase
        .from('treatments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchSettings();
    } catch (error) {
      console.error('Error deleting treatment:', error);
      setError('Failed to delete treatment');
    }
  }

  async function handleDeleteToothClass(id: string) {
    try {
      const { error } = await supabase
        .from('tooth_classes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchSettings();
    } catch (error) {
      console.error('Error deleting tooth class:', error);
      setError('Failed to delete tooth class');
    }
  }

  async function handleDeleteWorkingDays(id: string) {
    try {
      const { error } = await supabase
        .from('working_days')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchSettings();
    } catch (error) {
      console.error('Error deleting working days:', error);
      setError('Failed to delete working days group');
    }
  }

  async function handleDeleteClassYear(id: string) {
    try {
      const { error } = await supabase
        .from('class_years')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchSettings();
    } catch (error) {
      console.error('Error deleting class year:', error);
      setError('Failed to delete class year');
    }
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-0">Settings</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Working Days Groups */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Working Days Groups</h2>
            <button
              onClick={() => setIsWorkingDaysModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Group
            </button>
          </div>

          <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
            {workingDays.map((group) => (
              <div key={group.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-md dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                <div className="mb-2 sm:mb-0">
                  <h3 className="font-medium text-gray-900 dark:text-white">{group.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{group.days.join(', ')}</p>
                </div>
                <button
                  onClick={() => handleDeleteWorkingDays(group.id)}
                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tooth Classes */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Tooth Classes</h2>
            <button
              onClick={() => setIsToothClassModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Class
            </button>
          </div>

          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
            {toothClasses.map((toothClass) => (
              <div key={toothClass.id} className="flex justify-between items-center p-3 border rounded-md dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                <span className="text-gray-900 dark:text-white font-medium">{toothClass.name}</span>
                <button
                  onClick={() => handleDeleteToothClass(toothClass.id)}
                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Treatments */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Treatments</h2>
            <button
              onClick={() => setIsTreatmentModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Treatment
            </button>
          </div>

          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
            {treatments.map((treatment) => (
              <div key={treatment.id} className="flex justify-between items-center p-3 border rounded-md dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                <span className="text-gray-900 dark:text-white font-medium">{treatment.name}</span>
                <button
                  onClick={() => handleDeleteTreatment(treatment.id)}
                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Class Years */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Class Years</h2>
            <button
              onClick={() => setIsClassYearModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Class Year
            </button>
          </div>

          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
            {classYears.map((classYear) => (
              <div key={classYear.id} className="flex justify-between items-center p-3 border rounded-md dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                <span className="text-gray-900 dark:text-white font-medium">{classYear.year_range}</span>
                <button
                  onClick={() => handleDeleteClassYear(classYear.id)}
                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Working Days Modal */}
      {isWorkingDaysModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Working Days Group</h2>
              <button
                onClick={() => setIsWorkingDaysModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddWorkingDays} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newWorkingDays.name}
                  onChange={(e) => setNewWorkingDays({ ...newWorkingDays, name: e.target.value })}
                  className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                  placeholder="Enter group name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Working Days
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                    <label key={day} className="flex items-center space-x-3 p-2 border rounded-md dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                      <input
                        type="checkbox"
                        checked={newWorkingDays.days.includes(day)}
                        onChange={(e) => {
                          const days = e.target.checked
                            ? [...newWorkingDays.days, day]
                            : newWorkingDays.days.filter(d => d !== day);
                          setNewWorkingDays({ ...newWorkingDays, days });
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsWorkingDaysModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                >
                  Add Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tooth Class Modal */}
      {isToothClassModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Tooth Class</h2>
              <button
                onClick={() => setIsToothClassModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddToothClass} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Class Name
                </label>
                <input
                  type="text"
                  value={newToothClass}
                  onChange={(e) => setNewToothClass(e.target.value)}
                  className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                  placeholder="Enter tooth class name"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsToothClassModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                >
                  Add Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Treatment Modal */}
      {isTreatmentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Treatment</h2>
              <button
                onClick={() => setIsTreatmentModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddTreatment} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Treatment Name
                </label>
                <input
                  type="text"
                  value={newTreatment}
                  onChange={(e) => setNewTreatment(e.target.value)}
                  className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                  placeholder="Enter treatment name"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsTreatmentModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                >
                  Add Treatment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class Year Modal */}
      {isClassYearModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Class Year</h2>
              <button
                onClick={() => setIsClassYearModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddClassYear} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Year
                  </label>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={newClassYear.startYear}
                    onChange={(e) => setNewClassYear({ ...newClassYear, startYear: e.target.value })}
                    className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                    placeholder="2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Year
                  </label>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={newClassYear.endYear}
                    onChange={(e) => setNewClassYear({ ...newClassYear, endYear: e.target.value })}
                    className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                    placeholder="2025"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsClassYearModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                >
                  Add Class Year
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}