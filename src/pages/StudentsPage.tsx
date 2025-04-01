import React, { useState, useEffect } from 'react';
import { Plus, Upload, Search, X, Filter, Edit, Trash2, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Student, WorkingDays, ClassYear } from '../types';
import * as XLSX from 'xlsx';

export function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [workingDays, setWorkingDays] = useState<WorkingDays[]>([]);
  const [classYears, setClassYears] = useState<ClassYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [error, setError] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'name', 'mobile', 'university', 'city', 'working_days', 'status', 'registration'
  ]);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const [newStudent, setNewStudent] = useState({
    name: '',
    mobile: '',
    city: '',
    university: '',
    working_days_id: '',
    class_year_id: '',
    registration_status: 'pending' as const,
    registration_end_date: ''
  });

  const availableColumns = [
    { id: 'name', label: 'Name' },
    { id: 'mobile', label: 'Mobile' },
    { id: 'university', label: 'University' },
    { id: 'city', label: 'City' },
    { id: 'working_days', label: 'Working Days' },
    { id: 'status', label: 'Status' },
    { id: 'registration', label: 'Registration' }
  ];

  useEffect(() => {
    fetchData();
    // Check registration status daily at midnight
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      checkRegistrationStatus();
      // After first check, run daily
      setInterval(checkRegistrationStatus, 24 * 60 * 60 * 1000);
    }, timeUntilMidnight);
  }, []);

  async function checkRegistrationStatus() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: expiredStudents, error } = await supabase
        .from('students')
        .select('id')
        .eq('registration_status', 'registered')
        .lte('registration_end_date', today.toISOString());

      if (error) throw error;

      if (expiredStudents && expiredStudents.length > 0) {
        const { error: updateError } = await supabase
          .from('students')
          .update({ registration_status: 'unregistered' })
          .in('id', expiredStudents.map(s => s.id));

        if (updateError) throw updateError;
        fetchData();
      }
    } catch (error) {
      console.error('Error checking registration status:', error);
    }
  }

  async function fetchData() {
    try {
      const [studentsResult, workingDaysResult, classYearsResult] = await Promise.all([
        supabase
          .from('students')
          .select(`
            *,
            working_days (
              name,
              days
            )
          `)
          .order('created_at', { ascending: false }),
        supabase.from('working_days').select('*'),
        supabase.from('class_years').select('*')
      ]);

      if (studentsResult.error) throw studentsResult.error;
      if (workingDaysResult.error) throw workingDaysResult.error;
      if (classYearsResult.error) throw classYearsResult.error;

      setStudents(studentsResult.data || []);
      setWorkingDays(workingDaysResult.data || []);
      setClassYears(classYearsResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const requiredFields = ['name', 'mobile', 'city', 'university', 'working_days_id'];
    const missingFields = requiredFields.filter(field => !newStudent[field as keyof typeof newStudent]);

    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    const studentData = {
      ...newStudent,
      registration_end_date: newStudent.registration_status === 'registered' ? newStudent.registration_end_date : null
    };

    try {
      if (isEditMode && selectedStudent) {
        const { error } = await supabase
          .from('students')
          .update(studentData)
          .eq('id', selectedStudent.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('students')
          .insert([studentData]);

        if (error) throw error;
      }

      fetchData();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving student:', error);
      setError('Failed to save student');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this student?')) return;

    try {
      // First, delete related records in patients table
      const { error: patientsError } = await supabase
        .from('patients')
        .delete()
        .eq('student_id', id);

      if (patientsError) throw patientsError;

      // Then delete the student
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchData();
    } catch (error) {
      console.error('Error deleting student:', error);
      setError('Failed to delete student');
    }
  }

  function handleEdit(student: Student) {
    setSelectedStudent(student);
    setNewStudent({
      name: student.name,
      mobile: student.mobile,
      city: student.city,
      university: student.university,
      working_days_id: student.working_days_id,
      class_year_id: student.class_year_id || '',
      registration_status: student.registration_status,
      registration_end_date: student.registration_end_date || ''
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  }

  function resetForm() {
    setNewStudent({
      name: '',
      mobile: '',
      city: '',
      university: '',
      working_days_id: '',
      class_year_id: '',
      registration_status: 'pending',
      registration_end_date: ''
    });
    setSelectedStudent(null);
    setIsEditMode(false);
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        for (const row of jsonData) {
          const student = {
            name: row['Name'],
            mobile: row['Mobile'],
            city: row['City'],
            university: row['University'],
            working_days_id: workingDays[0]?.id,
            registration_status: 'pending'
          };

          const { error } = await supabase
            .from('students')
            .insert([student]);

          if (error) throw error;
        }

        fetchData();
      } catch (error) {
        console.error('Error processing Excel file:', error);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  const filteredStudents = students.filter(student => {
    if (!searchTerm) return true;

    const searchTermLower = searchTerm.toLowerCase();
    return selectedColumns.some(column => {
      switch (column) {
        case 'name':
          return student.name.toLowerCase().includes(searchTermLower);
        case 'mobile':
          return student.mobile.includes(searchTerm);
        case 'university':
          return student.university.toLowerCase().includes(searchTermLower);
        case 'city':
          return student.city.toLowerCase().includes(searchTermLower);
        case 'status':
          return student.registration_status.toLowerCase().includes(searchTermLower) ||
                 (student.is_available ? 'available' : 'busy').includes(searchTermLower);
        default:
          return false;
      }
    });
  });

  const openInfoModal = (student: Student) => {
    setSelectedStudent(student);
    setIsInfoModalOpen(true);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Students Management</h1>
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer transition-colors duration-200">
            <Upload className="h-5 w-5 mr-2" />
            Import Excel
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
            />
          </label>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Student
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={`Search by ${selectedColumns.join(', ')}...`}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="flex items-center justify-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
        >
          <Filter className="h-5 w-5 mr-2" />
          Filter Columns
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
        <div className="overflow-x-auto relative">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {selectedColumns.includes('name') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Name</th>
                )}
                {selectedColumns.includes('mobile') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Mobile</th>
                )}
                {selectedColumns.includes('city') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">City</th>
                )}
                {selectedColumns.includes('university') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">University</th>
                )}
                {selectedColumns.includes('working_days') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Working Days</th>
                )}
                {selectedColumns.includes('status') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Status</th>
                )}
                {selectedColumns.includes('registration') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Registration</th>
                )}
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={selectedColumns.length + 1} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={selectedColumns.length + 1} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No students found
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                    {selectedColumns.includes('name') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{student.name}</td>
                    )}
                    {selectedColumns.includes('mobile') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{student.mobile}</td>
                    )}
                    {selectedColumns.includes('city') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{student.city}</td>
                    )}
                    {selectedColumns.includes('university') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{student.university}</td>
                    )}
                    {selectedColumns.includes('working_days') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {(student as any).working_days?.days.join(', ')}
                      </td>
                    )}
                    {selectedColumns.includes('status') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex text-xs leading-5 font-semibold rounded-full px-2 py-1 ${
                          student.is_available
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {student.is_available ? 'Available' : 'Busy'}
                        </span>
                      </td>
                    )}
                    {selectedColumns.includes('registration') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex text-xs leading-5 font-semibold rounded-full px-2 py-1 ${
                          student.registration_status === 'registered'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : student.registration_status === 'unregistered'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {student.registration_status.charAt(0).toUpperCase() + student.registration_status.slice(1)}
                        </span>
                      </td>
                    )}
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(student)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200"
                          title="Edit"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => openInfoModal(student)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
                          title="Info"
                        >
                          <Info className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter Columns Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Filter Columns</h2>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 max-h-80 overflow-y-auto">
              {availableColumns.map((column) => (
                <label key={column.id} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedColumns([...selectedColumns, column.id]);
                      } else {
                        setSelectedColumns(selectedColumns.filter(c => c !== column.id));
                      }
                    }}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{column.label}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => {
                  // Select all columns
                  setSelectedColumns(availableColumns.map(col => col.id));
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Select All
              </button>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isEditMode ? 'Edit Student' : 'Add New Student'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Enter student name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mobile
                  </label>
                  <input
                    type="text"
                    value={newStudent.mobile}
                    onChange={(e) => setNewStudent({ ...newStudent, mobile: e.target.value })}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Enter mobile number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={newStudent.city}
                    onChange={(e) => setNewStudent({ ...newStudent, city: e.target.value })}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Enter city"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    University
                  </label>
                  <input
                    type="text"
                    value={newStudent.university}
                    onChange={(e) => setNewStudent({ ...newStudent, university: e.target.value })}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Enter university"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Working Days
                  </label>
                  <select
                    value={newStudent.working_days_id}
                    onChange={(e) => setNewStudent({ ...newStudent, working_days_id: e.target.value })}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select working days</option>
                    {workingDays.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.days.join(', ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Class Year
                  </label>
                  <select
                    value={newStudent.class_year_id}
                    onChange={(e) => setNewStudent({ ...newStudent, class_year_id: e.target.value })}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select class year</option>
                    {classYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.year_range}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Registration Status
                  </label>
                  <select
                    value={newStudent.registration_status}
                    onChange={(e) => setNewStudent({
                      ...newStudent,
                      registration_status: e.target.value as typeof newStudent.registration_status,
                      registration_end_date: e.target.value !== 'registered' ? '' : newStudent.registration_end_date
                    })}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="registered">Registered</option>
                    <option value="unregistered">Unregistered</option>
                  </select>
                </div>

                {newStudent.registration_status === 'registered' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Registration End Date
                    </label>
                    <input
                      type="date"
                      value={newStudent.registration_end_date}
                      onChange={(e) => setNewStudent({ ...newStudent, registration_end_date: e.target.value })}
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  {isEditMode ? 'Save Changes' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Info Modal */}
      {isInfoModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-3 z-50 transition-opacity duration-300 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 w-full max-w-lg mx-2 sm:mx-4 shadow-2xl transform transition-transform duration-300 scale-100 my-4">
            <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3 mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Student Profile</h2>
              <button
                onClick={() => setIsInfoModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 p-1 sm:p-2"
                aria-label="Close"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            {/* On mobile, display a profile summary at the top */}
            <div className="md:hidden mb-4 flex flex-col items-center border-b dark:border-gray-700 pb-4">
              <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">{selectedStudent.name}</p>
              <div className="flex space-x-3 mb-3">
                <span className={`inline-flex text-xs font-semibold rounded-full px-2 py-1 ${
                  selectedStudent.registration_status === 'registered'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : selectedStudent.registration_status === 'unregistered'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {selectedStudent.registration_status.charAt(0).toUpperCase() + selectedStudent.registration_status.slice(1)}
                </span>
                <span className={`inline-flex text-xs font-semibold rounded-full px-2 py-1 ${
                  selectedStudent.is_available
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {selectedStudent.is_available ? 'Available' : 'Busy'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-3 sm:space-y-4">
                <div className="hidden md:block">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedStudent.name}</p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Mobile</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">{selectedStudent.mobile}</p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">University</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">{selectedStudent.university}</p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">City</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">{selectedStudent.city}</p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Working Days</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">
                    {workingDays.find(wd => wd.id === selectedStudent.working_days_id)?.name || 'N/A'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Class Year</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">
                    {classYears.find(cy => cy.id === selectedStudent.class_year_id)?.year_range || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="hidden md:block">
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Registration Status</label>
                  <span className={`inline-flex text-xs font-semibold rounded-full px-2 py-1 ${
                    selectedStudent.registration_status === 'registered'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : selectedStudent.registration_status === 'unregistered'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {selectedStudent.registration_status.charAt(0).toUpperCase() + selectedStudent.registration_status.slice(1)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Registration End Date</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">
                    {selectedStudent.registration_end_date ? new Date(selectedStudent.registration_end_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>

                <div className="hidden md:block">
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Availability Status</label>
                  <span className={`inline-flex text-xs font-semibold rounded-full px-2 py-1 ${
                    selectedStudent.is_available
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {selectedStudent.is_available ? 'Available' : 'Busy'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Patients in Progress</label>
                  <div className="flex items-center">
                    <span className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400">{selectedStudent.patients_in_progress}</span>
                    <span className="ml-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">patients</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Patients Completed</label>
                  <div className="flex items-center">
                    <span className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">{selectedStudent.patients_completed}</span>
                    <span className="ml-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">patients</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t dark:border-gray-700">
              <button
                onClick={() => setIsInfoModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200 flex items-center text-sm sm:text-base"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
