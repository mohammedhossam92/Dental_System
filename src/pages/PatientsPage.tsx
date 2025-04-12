import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, X, Edit, Trash2, RotateCcw, RotateCw, Filter, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Patient, Student, Treatment, ToothClass, ClassYear } from '../types';

export function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [toothClasses, setToothClasses] = useState<ToothClass[]>([]);
  const [classYears, setClassYears] = useState<ClassYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedClassYear, setSelectedClassYear] = useState<string>('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);

  // Column visibility state
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'ticket', 'name', 'doctor', 'treatment', 'tooth_number', 'start_date', 'end_date', 'status'
  ]);

  const availableColumns = [
    { id: 'ticket', label: 'Ticket' },
    { id: 'name', label: 'Name' },
    { id: 'mobile', label: 'Mobile' },
    { id: 'doctor', label: 'Doctor' },
    { id: 'class_year', label: 'Class Year' },
    { id: 'treatment', label: 'Treatment' },
    { id: 'tooth_number', label: 'Tooth Number' },
    { id: 'tooth_class', label: 'Tooth Class' },
    { id: 'start_date', label: 'Start Date' },
    { id: 'end_date', label: 'End Date' },
    { id: 'status', label: 'Status' }
  ];

  // Initialize state for new patient
  const [newPatient, setNewPatient] = useState<Omit<Patient, 'id' | 'created_at' | 'start_date' | 'end_date' | 'student'>>({
    ticket_number: '',
    name: '',
    mobile: null,
    class_year_id: '',
    student_id: '',
    treatment_id: '',
    tooth_number: '',
    tooth_class_id: '',
    status: 'pending'
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
        toothClassesResult,
        classYearsResult
      ] = await Promise.all([
        supabase.from('patients').select('*, student:student_id(id, name)'),
        supabase.from('students').select('*').eq('is_available', true),
        supabase.from('treatments').select('*'),
        supabase.from('tooth_classes').select('*'),
        supabase.from('class_years').select('*')
      ]);

      if (patientsResult.error) throw patientsResult.error;
      if (studentsResult.error) throw studentsResult.error;
      if (treatmentsResult.error) throw treatmentsResult.error;
      if (toothClassesResult.error) throw toothClassesResult.error;
      if (classYearsResult.error) throw classYearsResult.error;

      setPatients(patientsResult.data || []);
      setStudents(studentsResult.data || []);
      setTreatments(treatmentsResult.data || []);
      setToothClasses(toothClassesResult.data || []);
      setClassYears(classYearsResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPatient(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!newPatient.ticket_number || !newPatient.name || !newPatient.class_year_id ||
        !newPatient.student_id || !newPatient.treatment_id || !newPatient.tooth_number || !newPatient.tooth_class_id) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate mobile number if provided
    if (newPatient.mobile && newPatient.mobile.length !== 11) {
      setError('Mobile number must be exactly 11 digits');
      return;
    }

    // Check if ticket number is unique
    const { data: existingTicket, error: ticketError } = await supabase
      .from('patients')
      .select('id')
      .eq('ticket_number', newPatient.ticket_number)
      .maybeSingle();

    if (ticketError) {
      console.error('Error checking ticket number:', ticketError);
      setError('Failed to check ticket number');
      return;
    }

    if (existingTicket) {
      setError('Ticket number already exists');
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
        mobile: null,
        class_year_id: '',
        student_id: '',
        treatment_id: '',
        tooth_number: '',
        tooth_class_id: '',
        status: 'pending'
      });
      setSelectedClassYear('');
      setStudentSearchTerm('');
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

  async function handleEditPatient(e: React.FormEvent) {
    e.preventDefault();
    if (!editPatient) return;

    try {
      const { error } = await supabase
        .from('patients')
        .update({
          ticket_number: editPatient.ticket_number,
          name: editPatient.name,
          mobile: editPatient.mobile,
          class_year_id: editPatient.class_year_id,
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

  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      const searchTermLower = searchTerm.toLowerCase();
      return (
        patient.name.toLowerCase().includes(searchTermLower) ||
        patient.ticket_number.includes(searchTerm) ||
        (patient.mobile && patient.mobile.includes(searchTerm)) ||
        (patient.student?.name && patient.student.name.toLowerCase().includes(searchTermLower))
      );
    });
  }, [patients, searchTerm]);

  // Filter students based on class year and search term
  const filteredStudents = useMemo(() => {
    let filtered = students.filter(student => student.is_available);
    
    // Filter by selected class year if one is selected
    if (selectedClassYear) {
      filtered = filtered.filter(student => student.class_year_id === selectedClassYear);
    }
    
    // Filter by search term if one is entered
    if (studentSearchTerm) {
      const searchTermLower = studentSearchTerm.toLowerCase();
      filtered = filtered.filter(student => 
        student.name.toLowerCase().includes(searchTermLower) ||
        (student.mobile && student.mobile.toLowerCase().includes(searchTermLower))
      );
    }
    
    return filtered;
  }, [students, selectedClassYear, studentSearchTerm]);

  const openInfoModal = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsInfoModalOpen(true);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Patients Management</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
          >
            <Filter className="h-5 w-5 mr-2" />
            Filter Columns
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Patient
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, ticket number, mobile or doctor..."
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
                {selectedColumns.includes('ticket') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ticket #</th>
                )}
                {selectedColumns.includes('name') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Patient Name</th>
                )}
                {selectedColumns.includes('mobile') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mobile</th>
                )}
                {selectedColumns.includes('doctor') && (
                  <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Doctor</th>
                )}
                {selectedColumns.includes('class_year') && (
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Class Year</th>
                )}
                {selectedColumns.includes('treatment') && (
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Treatment</th>
                )}
                {selectedColumns.includes('tooth_number') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tooth Number</th>
                )}
                {selectedColumns.includes('tooth_class') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tooth Class</th>
                )}
                {selectedColumns.includes('start_date') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Start Date</th>
                )}
                {selectedColumns.includes('end_date') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">End Date</th>
                )}
                {selectedColumns.includes('status') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                )}
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={selectedColumns.length + 1} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={selectedColumns.length + 1} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No patients found
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                    {selectedColumns.includes('ticket') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{patient.ticket_number}</td>
                    )}
                    {selectedColumns.includes('name') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{patient.name}</td>
                    )}
                    {selectedColumns.includes('mobile') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{patient.mobile}</td>
                    )}
                    {selectedColumns.includes('doctor') && (
                      <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {patient.student?.name || 'Unassigned'}
                      </td>
                    )}
                    {selectedColumns.includes('class_year') && (
                      <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {classYears.find(cy => cy.id === patient.class_year_id)?.name}
                      </td>
                    )}
                    {selectedColumns.includes('treatment') && (
                      <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {treatments.find(t => t.id === patient.treatment_id)?.name}
                      </td>
                    )}
                    {selectedColumns.includes('tooth_number') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{patient.tooth_number}</td>
                    )}
                    {selectedColumns.includes('tooth_class') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {toothClasses.find(tc => tc.id === patient.tooth_class_id)?.name}
                      </td>
                    )}
                    {selectedColumns.includes('start_date') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {patient.start_date ? new Date(patient.start_date).toLocaleDateString() : '-'}
                      </td>
                    )}
                    {selectedColumns.includes('end_date') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {patient.end_date ? new Date(patient.end_date).toLocaleDateString() : '-'}
                      </td>
                    )}
                    {selectedColumns.includes('status') && (
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
                    )}
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
                          onClick={() => openInfoModal(patient)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
                          title="Info"
                        >
                          <Info className="h-5 w-5" />
                        </button>
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
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Patient</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"
                >
                  <X size={24} />
                </button>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleAddPatient} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      value={newPatient.mobile === null ? '' : newPatient.mobile}
                      onChange={(e) => {
                        // Validate for exactly 11 digits if not empty
                        const value = e.target.value;
                        if (value === '' || /^\d{0,11}$/.test(value)) {
                          setNewPatient({ ...newPatient, mobile: value || null });
                        }
                      }}
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                      placeholder="Enter mobile number (optional)"
                      maxLength={11}
                    />
                    <p className="text-xs text-gray-500 mt-1">Mobile number must be exactly 11 digits if provided</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Class Year
                    </label>
                    <select
                      value={newPatient.class_year_id || ''}
                      onChange={(e) => {
                        const selectedValue = e.target.value;
                        setNewPatient({ ...newPatient, class_year_id: selectedValue || null, student_id: '' });
                        setSelectedClassYear(selectedValue);
                      }}
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                    >
                      <option value="">Select class year</option>
                      {classYears.map((classYear) => (
                        <option key={classYear.id} value={classYear.id}>
                          {classYear.year_range}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assigned Student
                  </label>
                  <div className="relative">
                    <div className="flex">
                      <input
                        type="text"
                        placeholder="Search students..."
                        value={studentSearchTerm}
                        onChange={(e) => {
                          setStudentSearchTerm(e.target.value);
                          if (!isStudentDropdownOpen) {
                            setIsStudentDropdownOpen(true);
                          }
                        }}
                        onClick={() => setIsStudentDropdownOpen(true)}
                        className="w-full p-2 pl-8 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                        <Search size={16} className="text-gray-400" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                        className="p-2 border border-l-0 rounded-r-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                      >
                        {isStudentDropdownOpen ? <X size={16} /> : <Search size={16} />}
                      </button>
                    </div>
                    
                    {isStudentDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:text-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600  rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map((student) => (
                            <div
                              key={student.id}
                              className="p-2 hover:bg-gray-100  dark:hover:bg-gray-600 cursor-pointer"
                              onClick={() => {
                                setNewPatient({ ...newPatient, student_id: student.id });
                                setStudentSearchTerm(student.name);
                                setIsStudentDropdownOpen(false);
                              }}
                            >
                              {student.name}
                            </div>
                          ))
                        ) : (
                          <div className="p-2 text-gray-500 dark:text-white-400">No students found</div>
                        )}
                      </div>
                    )}
                    
                    {/* Hidden input to store the selected value */}
                    <input type="hidden" value={newPatient.student_id} />
                  </div>
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
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
                  >
                    Add Patient
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Patient Modal */}
      {isEditModalOpen && editPatient && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Patient</h2>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"
                >
                  <X size={24} />
                </button>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleEditPatient} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ticket Number
                    </label>
                    <input
                      type="text"
                      value={editPatient.ticket_number}
                      onChange={(e) => setEditPatient({ ...editPatient, ticket_number: e.target.value })}
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                      disabled
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
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      value={editPatient.mobile === null ? '' : editPatient.mobile}
                      onChange={(e) => {
                        // Validate for exactly 11 digits if not empty
                        const value = e.target.value;
                        if (value === '' || /^\d{0,11}$/.test(value)) {
                          setEditPatient({ ...editPatient, mobile: value || null });
                        }
                      }}
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                      maxLength={11}
                    />
                    <p className="text-xs text-gray-500 mt-1">Mobile number must be exactly 11 digits if provided</p>
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
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assigned Student
                  </label>
                  <div className="relative">
                    <div className="flex">
                      <input
                        type="text"
                        placeholder="Search students..."
                        value={studentSearchTerm}
                        onChange={(e) => {
                          setStudentSearchTerm(e.target.value);
                          if (!isStudentDropdownOpen) {
                            setIsStudentDropdownOpen(true);
                          }
                        }}
                        onClick={() => setIsStudentDropdownOpen(true)}
                        className="w-full p-2 pl-8 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                        <Search size={16} className="text-gray-400" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                        className="p-2 border border-l-0 rounded-r-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                      >
                        {isStudentDropdownOpen ? <X size={16} /> : <Search size={16} />}
                      </button>
                    </div>
                    
                    {isStudentDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map((student) => (
                            <div
                              key={student.id}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                              onClick={() => {
                                setEditPatient({ ...editPatient, student_id: student.id });
                                setStudentSearchTerm(student.name);
                                setIsStudentDropdownOpen(false);
                              }}
                            >
                              {student.name}
                            </div>
                          ))
                        ) : (
                          <div className="p-2 text-gray-500 dark:text-gray-400">No students found</div>
                        )}
                      </div>
                    )}
                    
                    {/* Hidden input to store the selected value */}
                    <input type="hidden" value={editPatient.student_id} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tooth Number
                  </label>
                  <select
                    value={editPatient.tooth_number}
                    onChange={(e) => setEditPatient({ ...editPatient, tooth_number: e.target.value })}
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      Status
                    </label>
                    <select
                      value={editPatient.status}
                      onChange={(e) => setEditPatient({ ...editPatient, status: e.target.value as Patient['status'] })}
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={editPatient.start_date || ''}
                      onChange={(e) => setEditPatient({ ...editPatient, start_date: e.target.value || null })}
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={editPatient.end_date || ''}
                      onChange={(e) => setEditPatient({ ...editPatient, end_date: e.target.value || null })}
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
                  >
                    Update Patient
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Filter Columns Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Filter Columns</h2>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"
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

      {/* Patient Info Modal */}
      {isInfoModalOpen && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-3 z-50 transition-opacity duration-300 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 w-full max-w-lg mx-2 sm:mx-4 shadow-2xl transform transition-transform duration-300 scale-100 my-4">
            <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3 mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Patient Details</h2>
              <button
                onClick={() => setIsInfoModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 p-1 sm:p-2"
                aria-label="Close"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Ticket Number</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">{selectedPatient.ticket_number}</p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">{selectedPatient.name}</p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Mobile</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">{selectedPatient.mobile || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Class Year</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">
                    {classYears.find(cy => cy.id === selectedPatient.class_year_id)?.year_range || 'N/A'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Doctor</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">
                    {selectedPatient.student?.name || 'Unassigned'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Treatment</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">
                    {treatments.find(t => t.id === selectedPatient.treatment_id)?.name || 'N/A'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Tooth Number</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">{selectedPatient.tooth_number}</p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Tooth Class</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">
                    {toothClasses.find(tc => tc.id === selectedPatient.tooth_class_id)?.name || 'N/A'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">
                    {selectedPatient.start_date ? new Date(selectedPatient.start_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">End Date</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">
                    {selectedPatient.end_date ? new Date(selectedPatient.end_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                  <span className={`inline-flex text-xs font-semibold rounded-full px-2 py-1 ${
                    selectedPatient.status === 'completed'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : selectedPatient.status === 'in_progress'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {selectedPatient.status.charAt(0).toUpperCase() + selectedPatient.status.slice(1).replace('_', ' ')}
                  </span>
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
