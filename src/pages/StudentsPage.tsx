import React, { useState, useEffect } from 'react';
import { Plus, Upload, Search, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Student, WorkingDays } from '../types';
import * as XLSX from 'xlsx';

export function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [workingDays, setWorkingDays] = useState<WorkingDays[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    mobile: '',
    city: '',
    university: '',
    working_days_id: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudents();
    fetchWorkingDays();
  }, []);

  async function fetchStudents() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchWorkingDays() {
    try {
      const { data, error } = await supabase
        .from('working_days')
        .select('*');

      if (error) throw error;
      setWorkingDays(data || []);
    } catch (error) {
      console.error('Error fetching working days:', error);
    }
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!newStudent.name || !newStudent.mobile || !newStudent.city || !newStudent.university || !newStudent.working_days_id) {
      setError('Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('students')
        .insert([newStudent]);

      if (error) throw error;

      fetchStudents();
      setIsModalOpen(false);
      setNewStudent({
        name: '',
        mobile: '',
        city: '',
        university: '',
        working_days_id: ''
      });
    } catch (error) {
      console.error('Error adding student:', error);
      setError('Failed to add student');
    }
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

        // Process and upload students
        for (const row of jsonData) {
          const student = {
            name: row['Name'],
            mobile: row['Mobile'],
            city: row['City'],
            university: row['University'],
            working_days_id: workingDays[0]?.id // Default to first working days group
          };

          const { error } = await supabase
            .from('students')
            .insert([student]);

          if (error) throw error;
        }

        fetchStudents();
      } catch (error) {
        console.error('Error processing Excel file:', error);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.mobile.includes(searchTerm) ||
    student.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Students Management</h1>
        <div className="flex space-x-4">
          <label className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer transition-colors duration-200">
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
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Student
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search students..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mobile</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">City</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">University</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  No students found
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{student.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{student.mobile}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{student.city}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{student.university}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      student.is_available
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {student.is_available ? 'Available' : 'Busy'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4">
                      Edit
                    </button>
                    <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Student</h2>
              <button
                onClick={() => setIsModalOpen(false)}
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

            <form onSubmit={handleAddStudent} className="space-y-4">
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

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}