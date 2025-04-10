import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Edit, Trash2, RotateCcw, RotateCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Patient, Student, Treatment, ToothClass } from '../types';

export function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [toothClasses, setToothClasses] = useState<ToothClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);

  const [newPatient, setNewPatient] = useState({
    ticket_number: '',
    name: '',
    student_id: '',
    treatment_id: '',
    tooth_number: '',
    tooth_class_id: '',
    status: 'pending' as const
  });

  const adultTeeth = [
    '11','12','13','14','15','16','17','18',
    '21','22','23','24','25','26','27','28',
    '31','32','33','34','35','36','37','38',
    '41','42','43','44','45','46','47','48'
  ];

  const pediatricTeeth = [
    '51','52','53','54','55',
    '61','62','63','64','65',
    '71','72','73','74','75',
    '81','82','83','84','85'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [
        patientsResult,
        studentsResult,
        treatmentsResult,
        toothClassesResult
      ] = await Promise.all([
        supabase.from('patients').select('*, student:students(name), start_date, end_date'),
        supabase.from('students').select('*').eq('is_available', true),
        supabase.from('treatments').select('*'),
        supabase.from('tooth_classes').select('*')
      ]);

      if (patientsResult.error) throw patientsResult.error;
      if (studentsResult.error) throw studentsResult.error;
      if (treatmentsResult.error) throw treatmentsResult.error;
      if (toothClassesResult.error) throw toothClassesResult.error;

      setPatients(patientsResult.data || []);
      setStudents(studentsResult.data || []);
      setTreatments(treatmentsResult.data || []);
      setToothClasses(toothClassesResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPatient(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!newPatient.ticket_number || !newPatient.name || !newPatient.student_id ||
        !newPatient.treatment_id || !newPatient.tooth_number || !newPatient.tooth_class_id) {
      setError('Please fill in all fields');
      return;
    }

    try {
      // Insert the new patient
      const { error: insertError } = await supabase
        .from('patients')
        .insert([newPatient]);

      if (insertError) throw insertError;

      // Update the student's availability status
      const { error: updateError } = await supabase
        .from('students')
        .update({ is_available: false })
        .eq('id', newPatient.student_id);

      if (updateError) throw updateError;

      fetchData();
      setIsModalOpen(false);
      setNewPatient({
        ticket_number: '',
        name: '',
        student_id: '',
        treatment_id: '',
        tooth_number: '',
        tooth_class_id: '',
        status: 'pending'
      });
    } catch (error) {
      console.error('Error adding patient:', error);
      setError('Failed to add patient');
    }
  }

  async function handleStatusChange(patientId: string, newStatus: Patient['status']) {
    try {
      let updates: Partial<Patient> = { status: newStatus };

      if (newStatus === 'in_progress') {
        updates.start_date = updates.start_date || new Date().toISOString();
        updates.end_date = null;
      } else if (newStatus === 'completed') {
        updates.end_date = new Date().toISOString();
      } else if (newStatus === 'pending') {
        updates.start_date = null;
        updates.end_date = null;
      }

      const { error: patientError } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', patientId);

      if (patientError) throw patientError;

      const { data: patientData, error: fetchError } = await supabase
        .from('patients')
        .select('student_id')
        .eq('id', patientId)
        .single();

      if (fetchError) throw fetchError;

      const isAvailable = newStatus === 'completed';
      const { error: studentError } = await supabase
        .from('students')
        .update({ is_available: isAvailable })
        .eq('id', patientData.student_id);

      if (studentError) throw studentError;

      fetchData();
    } catch (error) {
      console.error('Error updating patient status:', error);
    }
  }

  const openEditModal = (patient: Patient) => {
    setEditPatient(patient);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPatient) return;

    try {
      const { error } = await supabase
        .from('patients')
        .update({
          ticket_number: editPatient.ticket_number,
          name: editPatient.name,
          student_id: editPatient.student_id,
          treatment_id: editPatient.treatment_id,
          tooth_number: editPatient.tooth_number,
          tooth_class_id: editPatient.tooth_class_id,
          start_date: editPatient.start_date,
          end_date: editPatient.end_date,
          status: editPatient.status
        })
        .eq('id', editPatient.id);

      if (error) throw error;

      setIsEditModalOpen(false);
      fetchData(); // Refresh the data
    } catch (error) {
      console.error('Error updating patient:', error);
    }
  };

  async function handleDeletePatient(patientId: string) {
    if (!window.confirm('Are you sure you want to delete this patient?')) return;

    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (error) throw error;

      fetchData();
    } catch (error) {
      console.error('Error deleting patient:', error);
      setError('Failed to delete patient');
    }
  }

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.ticket_number.includes(searchTerm)
  );

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Patients Management</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Patient
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search patients..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ticket #</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Patient Name</th>
                <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Student</th>
                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Treatment</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Start Date</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">End Date</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No patients found
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{patient.ticket_number}</td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{patient.name}</td>
                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {patient.student?.name || 'Unassigned'}
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {treatments.find(t => t.id === patient.treatment_id)?.name}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {patient.start_date ? new Date(patient.start_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {patient.end_date ? new Date(patient.end_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex text-xs leading-5 font-semibold rounded-full px-2 py-1 ${
                        patient.status === 'completed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : patient.status === 'in_progress'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {patient.status.charAt(0).toUpperCase() + patient.status.slice(1).replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                        {patient.status === 'pending' && (
                          <button
                            onClick={() => handleStatusChange(patient.id, 'in_progress')}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200"
                          >
                            <RotateCw className="h-5 w-5" />
                          </button>
                        )}
                        {patient.status === 'in_progress' && (
                          <button
                            onClick={() => handleStatusChange(patient.id, 'completed')}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors duration-200"
                          >
                            <RotateCw className="h-5 w-5" />
                          </button>
                        )}
                        {patient.status === 'completed' && (
                          <button
                            onClick={() => handleStatusChange(patient.id, 'in_progress')}
                            className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 transition-colors duration-200"
                          >
                            <RotateCcw className="h-5 w-5" />
                          </button>
                        )}
                        {patient.status === 'in_progress' && (
                          <button
                            onClick={() => handleStatusChange(patient.id, 'pending')}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-200"
                          >
                            <RotateCcw className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(patient)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeletePatient(patient.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
                        >
                          <Trash2 className="h-5 w-5" />
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

      {/* Add Patient Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Patient</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleAddPatient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ticket Number
                </label>
                <input
                  type="text"
                  value={newPatient.ticket_number}
                  onChange={(e) => setNewPatient({ ...newPatient, ticket_number: e.target.value })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                  placeholder="Enter ticket number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Patient Name
                </label>
                <input
                  type="text"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                  placeholder="Enter patient name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assigned Student
                </label>
                <select
                  value={newPatient.student_id}
                  onChange={(e) => setNewPatient({ ...newPatient, student_id: e.target.value })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                >
                  <option value="">Select student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Treatment
                </label>
                <select
                  value={newPatient.treatment_id}
                  onChange={(e) => setNewPatient({ ...newPatient, treatment_id: e.target.value })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                >
                  <option value="">Select treatment</option>
                  {treatments.map((treatment) => (
                    <option key={treatment.id} value={treatment.id}>
                      {treatment.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tooth Number
                </label>
                <select
                  value={newPatient.tooth_number}
                  onChange={(e) => setNewPatient({ ...newPatient, tooth_number: e.target.value })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                >
                  <option value="">Select tooth number</option>
                  <optgroup label="Adult Teeth">
                    {adultTeeth.map((tooth) => (
                      <option key={tooth} value={tooth}>
                        {tooth}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Pediatric Teeth">
                    {pediatricTeeth.map((tooth) => (
                      <option key={tooth} value={tooth}>
                        {tooth}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tooth Class
                </label>
                <select
                  value={newPatient.tooth_class_id}
                  onChange={(e) => setNewPatient({ ...newPatient, tooth_class_id: e.target.value })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                >
                  <option value="">Select tooth class</option>
                  {toothClasses.map((toothClass) => (
                    <option key={toothClass.id} value={toothClass.id}>
                      {toothClass.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
                >
                  Add Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {isEditModalOpen && editPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Patient</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ticket Number
                </label>
                <input
                  type="text"
                  value={editPatient.ticket_number}
                  onChange={(e) => setEditPatient({ ...editPatient, ticket_number: e.target.value })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Patient Name
                </label>
                <input
                  type="text"
                  value={editPatient.name}
                  onChange={(e) => setEditPatient({ ...editPatient, name: e.target.value })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assigned Student
                </label>
                <select
                  value={editPatient.student_id}
                  onChange={(e) => setEditPatient({ ...editPatient, student_id: e.target.value })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                >
                  <option value="">Select student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Treatment
                </label>
                <select
                  value={editPatient.treatment_id}
                  onChange={(e) => setEditPatient({ ...editPatient, treatment_id: e.target.value })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                >
                  <option value="">Select treatment</option>
                  {treatments.map((treatment) => (
                    <option key={treatment.id} value={treatment.id}>
                      {treatment.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tooth Number
                </label>
                <input
                  type="text"
                  value={editPatient.tooth_number}
                  onChange={(e) => setEditPatient({ ...editPatient, tooth_number: e.target.value })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tooth Class
                </label>
                <select
                  value={editPatient.tooth_class_id}
                  onChange={(e) => setEditPatient({ ...editPatient, tooth_class_id: e.target.value })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                >
                  <option value="">Select tooth class</option>
                  {toothClasses.map((toothClass) => (
                    <option key={toothClass.id} value={toothClass.id}>
                      {toothClass.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={editPatient.start_date ? new Date(editPatient.start_date).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditPatient({ ...editPatient, start_date: e.target.value })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={editPatient.end_date ? new Date(editPatient.end_date).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditPatient({ ...editPatient, end_date: e.target.value })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
