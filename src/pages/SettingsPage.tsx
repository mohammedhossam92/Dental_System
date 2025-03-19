import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { WorkingDays, ToothClass, Treatment } from '../types';
import { Trash2, Plus, X } from 'lucide-react';

export function SettingsPage() {
  const [workingDays, setWorkingDays] = useState<WorkingDays[]>([]);
  const [toothClasses, setToothClasses] = useState<ToothClass[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [error, setError] = useState('');

  // Modal states
  const [isWorkingDaysModalOpen, setIsWorkingDaysModalOpen] = useState(false);
  const [isToothClassModalOpen, setIsToothClassModalOpen] = useState(false);
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);

  // Form states
  const [newWorkingDays, setNewWorkingDays] = useState({ name: '', days: [] as string[] });
  const [newToothClass, setNewToothClass] = useState('');
  const [newTreatment, setNewTreatment] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const [workingDaysResult, toothClassesResult, treatmentsResult] = await Promise.all([
        supabase.from('working_days').select('*'),
        supabase.from('tooth_classes').select('*'),
        supabase.from('treatments').select('*')
      ]);

      if (workingDaysResult.error) throw workingDaysResult.error;
      if (toothClassesResult.error) throw toothClassesResult.error;
      if (treatmentsResult.error) throw treatmentsResult.error;

      setWorkingDays(workingDaysResult.data || []);
      setToothClasses(toothClassesResult.data || []);
      setTreatments(treatmentsResult.data || []);
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

      if (error) throw error;

      fetchSettings();
      setIsTreatmentModalOpen(false);
      setNewTreatment('');
    } catch (error) {
      console.error('Error adding treatment:', error);
      setError('Failed to add treatment');
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

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Working Days Groups</h2>
            <button
              onClick={() => setIsWorkingDaysModalOpen(true)}
              className="flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Group
            </button>
          </div>

          <div className="space-y-4">
            {workingDays.map((group) => (
              <div key={group.id} className="flex justify-between items-center p-4 border rounded-md dark:border-gray-700">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{group.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{group.days.join(', ')}</p>
                </div>
                <button
                  onClick={() => handleDeleteWorkingDays(group.id)}
                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Tooth Classes</h2>
            <button
              onClick={() => setIsToothClassModalOpen(true)}
              className="flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Class
            </button>
          </div>

          <div className="space-y-2">
            {toothClasses.map((toothClass) => (
              <div key={toothClass.id} className="flex justify-between items-center p-2 border rounded-md dark:border-gray-700">
                <span className="text-gray-900 dark:text-white">{toothClass.name}</span>
                <button
                  onClick={() => handleDeleteToothClass(toothClass.id)}
                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Treatments</h2>
            <button
              onClick={() => setIsTreatmentModalOpen(true)}
              className="flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Treatment
            </button>
          </div>

          <div className="space-y-2">
            {treatments.map((treatment) => (
              <div key={treatment.id} className="flex justify-between items-center p-2 border rounded-md dark:border-gray-700">
                <span className="text-gray-900 dark:text-white">{treatment.name}</span>
                <button
                  onClick={() => handleDeleteTreatment(treatment.id)}
                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Working Days Modal */}
      {isWorkingDaysModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Working Days Group</h2>
              <button
                onClick={() => setIsWorkingDaysModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddWorkingDays} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newWorkingDays.name}
                  onChange={(e) => setNewWorkingDays({ ...newWorkingDays, name: e.target.value })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter group name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Working Days
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                    <label key={day} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newWorkingDays.days.includes(day)}
                        onChange={(e) => {
                          const days = e.target.checked
                            ? [...newWorkingDays.days, day]
                            : newWorkingDays.days.filter(d => d !== day);
                          setNewWorkingDays({ ...newWorkingDays, days });
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsWorkingDaysModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Tooth Class</h2>
              <button
                onClick={() => setIsToothClassModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddToothClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Class Name
                </label>
                <input
                  type="text"
                  value={newToothClass}
                  onChange={(e) => setNewToothClass(e.target.value)}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter tooth class name"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsToothClassModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Treatment</h2>
              <button
                onClick={() => setIsTreatmentModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddTreatment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Treatment Name
                </label>
                <input
                  type="text"
                  value={newTreatment}
                  onChange={(e) => setNewTreatment(e.target.value)}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter treatment name"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsTreatmentModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add Treatment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}