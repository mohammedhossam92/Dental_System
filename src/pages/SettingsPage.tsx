import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { WorkingDays, ToothClass, Treatment, ClassYear, Student } from '../types';
import { Trash2, Plus, X, Users, Settings, Edit3, RotateCcw } from 'lucide-react';

export function SettingsPage() {
  const [workingDays, setWorkingDays] = useState<WorkingDays[]>([]);
  const [toothClasses, setToothClasses] = useState<ToothClass[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [classYears, setClassYears] = useState<ClassYear[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [globalLimit, setGlobalLimit] = useState<number>(1);
  const [studentLimits, setStudentLimits] = useState<{[key: string]: number}>({});
  const [error, setError] = useState('');

  // Modal states
  const [isWorkingDaysModalOpen, setIsWorkingDaysModalOpen] = useState(false);
  const [isToothClassModalOpen, setIsToothClassModalOpen] = useState(false);
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
  const [isClassYearModalOpen, setIsClassYearModalOpen] = useState(false);
  const [isGlobalLimitModalOpen, setIsGlobalLimitModalOpen] = useState(false);
  const [isStudentLimitModalOpen, setIsStudentLimitModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form states
  const [newWorkingDays, setNewWorkingDays] = useState({ name: '', days: [] as string[] });
  const [newToothClass, setNewToothClass] = useState('');
  const [newTreatment, setNewTreatment] = useState('');
  const [newClassYear, setNewClassYear] = useState({ startYear: '', endYear: '' });
  const [newGlobalLimit, setNewGlobalLimit] = useState<number>(1);
  const [newStudentLimit, setNewStudentLimit] = useState<number>(1);

  // Add these new states near the top of the component with other state declarations
  const [editingItem, setEditingItem] = useState<{
    type: 'workingDays' | 'toothClass' | 'treatment' | 'classYear' | null,
    id?: string,
    data: any
  }>({ type: null, data: null });
  const [selectedClassYear, setSelectedClassYear] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState({
    workingDays: false,
    toothClasses: false,
    treatments: false,
    classYears: false,
    studentLimits: false
  });

  useEffect(() => {
    fetchSettings();
    fetchStudents();
    fetchLimits(); // This fetches the limit on initial mount
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

  async function fetchStudents() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  }

  async function fetchLimits() {
    try {
      // Always try to fetch the single settings row
      const { data: globalData, error: globalError } = await supabase
        .from('organization_settings')
        .select('global_patient_limit')
        .single();

      // If there's no row (PGRST116), create a default one and fetch its data
      if (globalError && globalError.code === 'PGRST116') {
        const defaultLimit = 10;
        const { data: newData, error: insertError } = await supabase
          .from('organization_settings')
          .insert([{ global_patient_limit: defaultLimit }])
          .select('global_patient_limit')
          .single();

        if (insertError) throw insertError;

        // Use the data from the newly inserted row
        const limit = newData?.global_patient_limit ?? 10;
        setGlobalLimit(limit);
        setNewGlobalLimit(limit);

      } else if (globalError) {
        // If there's any other error during the initial fetch, throw it
        throw globalError;
      } else {
        // If the initial fetch was successful, use the fetched limit
        // Use nullish coalescing ?? to fall back to 10 if the field is null/undefined
        const limit = globalData?.global_patient_limit ?? 10;
        setGlobalLimit(limit);
        setNewGlobalLimit(limit);
      }

      // Fetch individual student limits
      const { data: limitsData, error: limitsError } = await supabase
        .from('student_limits')
        .select('student_id, max_patients');

      if (!limitsError && limitsData) {
        const limits: {[key: string]: number} = {};
        limitsData.forEach(limit => {
          limits[limit.student_id] = limit.max_patients;
        });
        setStudentLimits(limits);
      }
    } catch (error) {
      console.error('Error fetching limits:', error);
      setError('Failed to load patient limits');
    }
  }

  async function handleUpdateGlobalLimit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      // First, check if we have any existing settings
      const { data: existingSettings, error: fetchError } = await supabase
        .from('organization_settings')
        .select('id')
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') { // Ignore "no rows" error
        throw fetchError;
      }

      // Update or insert the settings
      const { data: updatedSettings, error } = await supabase
        .from('organization_settings')
        .upsert({
          ...(existingSettings?.id && { id: existingSettings.id }), // Include ID if it exists
          global_patient_limit: newGlobalLimit,
          updated_at: new Date().toISOString()
        })
        .select('global_patient_limit')
        .single();

      if (error) throw error;

      // Update the state with the new value from the database
      if (updatedSettings) {
        setGlobalLimit(updatedSettings.global_patient_limit);
        setNewGlobalLimit(updatedSettings.global_patient_limit);
      }
      
      setIsGlobalLimitModalOpen(false);
    } catch (error) {
      console.error('Error updating global limit:', error);
      setError('Failed to update global limit');
    }
  }

  async function handleUpdateStudentLimit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!selectedStudent) return;

    try {
      const { error } = await supabase
        .from('student_limits')
        .upsert({
          student_id: selectedStudent.id,
          max_patients: newStudentLimit
        });

      if (error) throw error;

      setStudentLimits(prev => ({
        ...prev,
        [selectedStudent.id]: newStudentLimit
      }));
      setIsStudentLimitModalOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error('Error updating student limit:', error);
      setError('Failed to update student limit');
    }
  }

  async function handleRemoveStudentLimit(studentId: string) {
    try {
      const { error } = await supabase
        .from('student_limits')
        .delete()
        .eq('student_id', studentId);

      if (error) throw error;

      setStudentLimits(prev => {
        const updated = { ...prev };
        delete updated[studentId];
        return updated;
      });
    } catch (error) {
      console.error('Error removing student limit:', error);
      setError('Failed to remove student limit');
    }
  }

  // Update the openStudentLimitModal function to handle class year
  function openStudentLimitModal(student: Student) {
    setSelectedStudent(student);
    setNewStudentLimit(studentLimits[student.id] || globalLimit);
    setIsStudentLimitModalOpen(true);
  }

  // Add these new functions for handling edit operations
  function handleEditItem(type: 'workingDays' | 'toothClass' | 'treatment' | 'classYear', item: any) {
    setEditingItem({ type, id: item.id, data: { ...item } });

    // Open the appropriate modal based on the type
    switch (type) {
      case 'workingDays':
        setNewWorkingDays({ ...item });
        setIsWorkingDaysModalOpen(true);
        break;
      case 'toothClass':
        setNewToothClass(item.name);
        setIsToothClassModalOpen(true);
        break;
      case 'treatment':
        setNewTreatment(item.name);
        setIsTreatmentModalOpen(true);
        break;
      case 'classYear':
        setNewClassYear({
          startYear: item.start_year || parseInt(item.year_range?.split('-')[0]) || new Date().getFullYear(),
          endYear: item.end_year || parseInt(item.year_range?.split('-')[1]) || new Date().getFullYear()
        });
        setIsClassYearModalOpen(true);
        break;
    }
  }

  // Update the add/update handlers to handle both create and update operations
  async function handleAddWorkingDays(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!newWorkingDays.name || newWorkingDays.days.length === 0) {
      setError('Please enter a name and select at least one day');
      return;
    }

    try {
      if (editingItem.type === 'workingDays' && editingItem.id) {
        const { error } = await supabase
          .from('working_days')
          .update(newWorkingDays)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('working_days')
          .insert([newWorkingDays]);
        if (error) throw error;
      }

      fetchSettings();
      setIsWorkingDaysModalOpen(false);
      setNewWorkingDays({ name: '', days: [] });
      setEditingItem({ type: null, data: null });
    } catch (error) {
      console.error('Error saving working days:', error);
      setError('Failed to save working days');
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
      if (editingItem.type === 'toothClass' && editingItem.id) {
        const { error } = await supabase
          .from('tooth_classes')
          .update({ name: newToothClass })
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tooth_classes')
          .insert([{ name: newToothClass }]);
        if (error) throw error;
      }

      fetchSettings();
      setIsToothClassModalOpen(false);
      setNewToothClass('');
      setEditingItem({ type: null, data: null });
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
      if (editingItem.type === 'treatment' && editingItem.id) {
        const { error } = await supabase
          .from('treatments')
          .update({ name: newTreatment })
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('treatments')
          .insert([{ name: newTreatment }]);
        if (error) throw error;
      }

      fetchSettings();
      setIsTreatmentModalOpen(false);
      setNewTreatment('');
      setEditingItem({ type: null, data: null });
    } catch (error) {
      console.error('Error adding treatment:', error);
      setError('Failed to add treatment');
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
      if (editingItem.type === 'classYear' && editingItem.id) {
        const { error } = await supabase
          .from('class_years')
          .update({ year_range: yearRange })
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('class_years')
          .insert([{ year_range: yearRange }]);
        if (error) throw error;
      }

      fetchSettings();
      setIsClassYearModalOpen(false);
      setNewClassYear({ startYear: '', endYear: '' });
      setEditingItem({ type: null, data: null });
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

  const handleResetAllCustomLimits = async () => {
    if (!window.confirm('Are you sure you want to reset all custom student limits to the global limit? This action cannot be undone.')) {
      return;
    }

    try {
      setError('');

      // Delete all student limits (this will make them use the global limit)
      const { error } = await supabase
        .from('student_limits')
        .delete()
        .not('student_id', 'is', null);

      if (error) throw error;

      // Refresh the limits
      await fetchLimits();

      // Show success message
      alert('All custom student limits have been reset to the global limit.');
    } catch (error) {
      console.error('Error resetting student limits:', error);
      setError('Failed to reset student limits');
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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

      {/* Patient Limits Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg border border-blue-200 dark:border-gray-600">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Users className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Patient Limits Management</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Global Limit Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Global Limit</h3>
              </div>
              <button
                onClick={() => {
                  setNewGlobalLimit(globalLimit);
                  setIsGlobalLimitModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </button>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {globalLimit}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Maximum patients per doctor (default)
              </p>
            </div>
          </div>

          {/* Individual Limits Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Individual Limits</h3>
              <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-sm font-medium">
                {Object.keys(studentLimits).length} Custom
              </span>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {students.filter(student => studentLimits[student.id]).map(student => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{student.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Limit: {studentLimits[student.id]} patients</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openStudentLimitModal(student)}
                      className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-full transition-colors duration-200"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveStudentLimit(student.id)}
                      className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-full transition-colors duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {Object.keys(studentLimits).length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                  No individual limits set
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Students without custom limits */}
        <div className="mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Set Individual Limits</h4>
            <div className="relative w-full sm:w-64">
              <select
                className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedClassYear}
                onChange={(e) => setSelectedClassYear(e.target.value)}
              >
                <option value="">Select a class year</option>
                {classYears.map(year => (
                  <option key={year.id} value={year.id}>
                    {year.year_range || year.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative w-full sm:w-64">
              <select
                className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value=""
                onChange={(e) => {
                  const student = students.find(s => s.id === e.target.value);
                  if (student) openStudentLimitModal(student);
                }}
              >
                <option value="">Select a student to set limit</option>
                {students
                  .filter(student => !studentLimits[student.id] && (selectedClassYear ? student.class_year_id === selectedClassYear : true))
                  .map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          {students.filter(student => !studentLimits[student.id] && (selectedClassYear ? student.class_year_id === selectedClassYear : true)).length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              All students have custom limits set.
            </p>
          )}
        </div>

        {Object.keys(studentLimits).length > 0 && (
          <div className="mt-4">
            <button
              onClick={handleResetAllCustomLimits}
              className="w-full sm:w-auto flex items-center justify-center px-4 py-2 text-sm text-red-600 hover:text-white border border-red-600 hover:bg-red-600 rounded-md transition-colors duration-200"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All Custom Limits to Global
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Working Days Groups Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-200 hover:shadow-md dark:hover:border-gray-600">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Working Days</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {workingDays.length} Groups
              </span>
            </div>

            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 -mr-2">
              {(expandedSections.workingDays ? workingDays : workingDays.slice(0, 3)).map((group) => (
                <div key={group.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{group.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{group.days.join(', ')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditItem('workingDays', group)}
                      className="ml-2 p-1 text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWorkingDays(group.id);
                      }}
                      className="ml-2 p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {workingDays.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2 text-center">No working day groups</p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 sm:px-6 flex justify-between border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => toggleSection('workingDays')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {expandedSections.workingDays ? 'Show Less' : `View All ${workingDays.length} Groups`}
            </button>
            <button
              onClick={() => setIsWorkingDaysModalOpen(true)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add
            </button>
          </div>
        </div>

        {/* Tooth Classes Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-200 hover:shadow-md dark:hover:border-gray-600">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tooth Classes</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                {toothClasses.length} Classes
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(expandedSections.toothClasses ? toothClasses : toothClasses.slice(0, 5)).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditItem('toothClass', item)}
                      className="ml-2 p-1 text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteToothClass(item.id);
                      }}
                      className="ml-2 p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {toothClasses.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2 text-center">No tooth classes</p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 sm:px-6 flex justify-between border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => toggleSection('toothClasses')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {expandedSections.toothClasses ? 'Show Less' : `View All ${toothClasses.length} Classes`}
            </button>
            <button
              onClick={() => setIsToothClassModalOpen(true)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add
            </button>
          </div>
        </div>

        {/* Treatments Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-200 hover:shadow-md dark:hover:border-gray-600">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Treatments</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                {treatments.length} Treatments
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(expandedSections.treatments ? treatments : treatments.slice(0, 5)).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditItem('treatment', item)}
                      className="ml-2 p-1 text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTreatment(item.id);
                      }}
                      className="ml-2 p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {treatments.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2 text-center">No treatments</p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 sm:px-6 flex justify-between border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => toggleSection('treatments')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {expandedSections.treatments ? 'Show Less' : `View All ${treatments.length} Treatments`}
            </button>
            <button
              onClick={() => setIsTreatmentModalOpen(true)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add
            </button>
          </div>
        </div>

        {/* Class Years Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-200 hover:shadow-md dark:hover:border-gray-600">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Class Years</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                {classYears.length} Years
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(expandedSections.classYears ? classYears : classYears.slice(0, 5)).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{item.year_range || item.name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditItem('classYear', item)}
                      className="ml-2 p-1 text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClassYear(item.id);
                      }}
                      className="ml-2 p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {classYears.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2 text-center">No class years</p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 sm:px-6 flex justify-between border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => toggleSection('classYears')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {expandedSections.classYears ? 'Show Less' : `View All ${classYears.length} Years`}
            </button>
            <button
              onClick={() => setIsClassYearModalOpen(true)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Global Limit Modal */}
      {isGlobalLimitModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Update Global Patient Limit</h2>
              <button
                onClick={() => setIsGlobalLimitModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateGlobalLimit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum Patients per Doctor
                </label>
                <input
                  type="number"
                  min="1"
                  value={newGlobalLimit}
                  onChange={(e) => setNewGlobalLimit(parseInt(e.target.value) || 1)}
                  className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                  placeholder="Enter maximum patients"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsGlobalLimitModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                >
                  Update Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Limit Modal */}
      {isStudentLimitModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Set Patient Limit for {selectedStudent.name}
              </h2>
              <button
                onClick={() => {
                  setIsStudentLimitModalOpen(false);
                  setSelectedStudent(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudentLimit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum Patients
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={newStudentLimit}
                    onChange={(e) => setNewStudentLimit(parseInt(e.target.value) || 1)}
                    className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                    placeholder="Enter maximum patients"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Current global limit: {globalLimit} patients
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setIsStudentLimitModalOpen(false);
                    setSelectedStudent(null);
                  }}
                  className="w-full sm:w-auto px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                >
                  Update Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                        className="rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 h-4 w-4"
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
