import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Trash2, Clock, Loader2, X, PhoneCall, UserCheck, Edit3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { WaitingListEntry, Student, Treatment, ToothClass } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

const DIAGNOSES = ['rct', 'operative', 'scaling', 'pulpotomy', 'pulpectomy', 'impaction'] as const;

export function WaitingListPage() {
  const { t, language } = useLanguage();
  const { organizationId } = useAuth();
  
  // Lists data
  const [entries, setEntries] = useState<WaitingListEntry[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [toothClasses, setToothClasses] = useState<ToothClass[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Add Patient form states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [city, setCity] = useState('');
  const [diagnosis, setDiagnosis] = useState<typeof DIAGNOSES[number]>('rct');

  // Edit Call details state
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [selectedEntryForCall, setSelectedEntryForCall] = useState<WaitingListEntry | null>(null);
  const [callStatus, setCallStatus] = useState<'pending' | 'answered' | 'no_answer'>('pending');
  const [appointmentInfo, setAppointmentInfo] = useState('');
  const [notes, setNotes] = useState('');

  // Assign to Student state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedEntryForAssign, setSelectedEntryForAssign] = useState<WaitingListEntry | null>(null);
  const [ticketNumber, setTicketNumber] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedTreatmentId, setSelectedTreatmentId] = useState('');
  const [toothNumber, setToothNumber] = useState('');
  const [selectedToothClassId, setSelectedToothClassId] = useState('');
  const [payment, setPayment] = useState<'free' | 'economical' | 'unknown'>('unknown');

  useEffect(() => {
    if (organizationId) {
      fetchWaitingList();
      fetchMetadata();
    }
  }, [organizationId]);

  async function fetchWaitingList() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('waiting_list')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching waiting list:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMetadata() {
    try {
      const [studentsRes, treatmentsRes, toothClassesRes] = await Promise.all([
        supabase
          .from('students')
          .select('*')
          .eq('registration_status', 'registered')
          .eq('is_available', true)
          .eq('organization_id', organizationId),
        supabase.from('treatments').select('*'),
        supabase.from('tooth_classes').select('*')
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (treatmentsRes.error) throw treatmentsRes.error;
      if (toothClassesRes.error) throw toothClassesRes.error;

      setStudents(studentsRes.data || []);
      setTreatments(treatmentsRes.data || []);
      setToothClasses(toothClassesRes.data || []);
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  }

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!organizationId) return;

    if (!patientName.trim() || !patientPhone.trim() || !city.trim()) {
      Swal.fire({
        icon: 'error',
        title: t('error'),
        text: language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill in all required fields',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('waiting_list')
        .insert({
          patient_name: patientName,
          patient_phone: patientPhone,
          city,
          diagnosis,
          organization_id: organizationId
        });

      if (error) throw error;

      Swal.fire({
        icon: 'success',
        title: t('success'),
        text: t('patientAddedWaitingSuccess'),
        confirmButtonColor: '#4f46e5',
        timer: 2000
      });

      setPatientName('');
      setPatientPhone('');
      setCity('');
      setDiagnosis('rct');
      setIsAddModalOpen(false);

      fetchWaitingList();
    } catch (error) {
      console.error('Error adding patient to waiting list:', error);
      Swal.fire({
        icon: 'error',
        title: t('error'),
        text: t('patientAddedWaitingError'),
        confirmButtonColor: '#4f46e5'
      });
    } finally {
      setSubmitting(false);
    }
  }

  function openCallModal(entry: WaitingListEntry) {
    setSelectedEntryForCall(entry);
    setCallStatus(entry.status);
    setAppointmentInfo(entry.appointment_info || '');
    setNotes(entry.notes || '');
    setIsCallModalOpen(true);
  }

  async function handleUpdateCallDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEntryForCall) return;

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('waiting_list')
        .update({
          status: callStatus,
          appointment_info: appointmentInfo || null,
          notes: notes || null
        })
        .eq('id', selectedEntryForCall.id);

      if (error) throw error;

      Swal.fire({
        icon: 'success',
        title: t('success'),
        text: t('successSaved'),
        confirmButtonColor: '#4f46e5',
        timer: 1500
      });

      // Update state locally
      setEntries(prev => prev.map(entry => 
        entry.id === selectedEntryForCall.id 
          ? { ...entry, status: callStatus, appointment_info: appointmentInfo || null, notes: notes || null }
          : entry
      ));

      setIsCallModalOpen(false);
      setSelectedEntryForCall(null);
    } catch (error) {
      console.error('Error updating call details:', error);
      Swal.fire({
        icon: 'error',
        title: t('error'),
        text: t('errorSaving'),
        confirmButtonColor: '#4f46e5'
      });
    } finally {
      setSubmitting(false);
    }
  }

  function openAssignModal(entry: WaitingListEntry) {
    setSelectedEntryForAssign(entry);
    setTicketNumber('');
    setAge('');
    setSelectedStudentId('');
    setSelectedTreatmentId('');
    setToothNumber('');
    setSelectedToothClassId('');
    setPayment('unknown');
    
    // Attempt to auto-match treatment from diagnosis
    const diagnosisToTreatment = treatments.find(t => 
      t.name.toLowerCase().includes(entry.diagnosis) || 
      (entry.diagnosis === 'rct' && t.name.toLowerCase().includes('root canal'))
    );
    if (diagnosisToTreatment) {
      setSelectedTreatmentId(diagnosisToTreatment.id);
    }

    setIsAssignModalOpen(true);
    fetchMetadata(); // Refresh available students list
  }

  async function handleAssignPatient(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEntryForAssign || !organizationId) return;

    if (!ticketNumber.trim() || !selectedStudentId || !selectedTreatmentId || !selectedToothClassId) {
      Swal.fire({
        icon: 'error',
        title: t('error'),
        text: language === 'ar' ? 'يرجى إدخال جميع الحقول المطلوبة للتعيين' : 'Please fill all required fields to assign',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    // Validate tooth number for non-pediatric
    if (toothNumber.trim() === '' && selectedToothClassId !== 'pediatric' && selectedToothClassId !== 'a6b61882-9014-41d5-bc4e-862d64a055a4') {
      // Note: 'a6b61882-9014-41d5-bc4e-862d64a055a4' check is a fallback pediatric ID if string check is pediatric
      const selectedClass = toothClasses.find(tc => tc.id === selectedToothClassId);
      if (selectedClass && !selectedClass.name.toLowerCase().includes('pediatric')) {
        Swal.fire({
          icon: 'error',
          title: t('error'),
          text: language === 'ar' ? 'رقم السن مطلوب للحالات غير الأطفال' : 'Tooth number is required for non-pediatric cases',
          confirmButtonColor: '#4f46e5'
        });
        return;
      }
    }

    try {
      setAssigning(true);

      // Check for duplicate ticket number
      const { data: existingTicket, error: ticketError } = await supabase
        .from('patients')
        .select('id')
        .eq('ticket_number', ticketNumber)
        .maybeSingle();

      if (ticketError) throw ticketError;
      if (existingTicket) {
        Swal.fire({
          icon: 'error',
          title: t('error'),
          text: language === 'ar' ? 'رقم التذكرة هذا مستخدم بالفعل' : 'This ticket number is already in use',
          confirmButtonColor: '#4f46e5'
        });
        return;
      }

      // Fetch student details to get their class_year_id and working_days_id
      const assignedStudent = students.find(s => s.id === selectedStudentId);
      if (!assignedStudent) throw new Error('Selected student not found');

      // 1. Insert patient
      const { data: insertedPatient, error: insertError } = await supabase
        .from('patients')
        .insert({
          ticket_number: ticketNumber,
          name: selectedEntryForAssign.patient_name,
          mobile: selectedEntryForAssign.patient_phone,
          age: age ? Number(age) : null,
          student_id: selectedStudentId,
          class_year_id: assignedStudent.class_year_id || null,
          working_days_id: assignedStudent.working_days_id || null,
          treatment_id: selectedTreatmentId,
          tooth_number: toothNumber || '',
          tooth_class_id: selectedToothClassId,
          status: 'in_progress',
          payment: payment
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // 2. Insert patient tooth treatment row
      const { error: treatmentRowError } = await supabase
        .from('patient_tooth_treatments')
        .insert({
          patient_id: insertedPatient.id,
          treatment_id: selectedTreatmentId,
          tooth_number: toothNumber || '',
          tooth_class_id: selectedToothClassId
        });

      if (treatmentRowError) throw treatmentRowError;

      // 3. Mark Student as unavailable
      const { error: studentUpdateError } = await supabase
        .from('students')
        .update({ is_available: false })
        .eq('id', selectedStudentId);

      if (studentUpdateError) throw studentUpdateError;

      // 4. Delete entry from waiting list
      const { error: deleteError } = await supabase
        .from('waiting_list')
        .delete()
        .eq('id', selectedEntryForAssign.id);

      if (deleteError) throw deleteError;

      // Finish successfully
      Swal.fire({
        icon: 'success',
        title: t('success'),
        text: t('waitingPatientConverted'),
        confirmButtonColor: '#4f46e5',
        timer: 2000
      });

      setIsAssignModalOpen(false);
      setSelectedEntryForAssign(null);
      
      // Refresh Waiting List and available students
      fetchWaitingList();
      fetchMetadata();
    } catch (error) {
      console.error('Error converting patient:', error);
      Swal.fire({
        icon: 'error',
        title: t('error'),
        text: language === 'ar' ? 'فشل تعيين المريض. يرجى المحاولة مرة أخرى.' : 'Failed to assign patient. Please try again.',
        confirmButtonColor: '#4f46e5'
      });
    } finally {
      setAssigning(false);
    }
  }

  async function handleDeleteEntry(id: string) {
    const result = await Swal.fire({
      title: t('areYouSure'),
      text: t('deleteWaitingConfirm'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t('yesDelete'),
      cancelButtonText: t('cancel')
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('waiting_list')
          .delete()
          .eq('id', id);

        if (error) throw error;

        Swal.fire({
          title: t('deleted'),
          icon: 'success',
          confirmButtonColor: '#4f46e5',
          timer: 1500
        });

        setEntries(prev => prev.filter(entry => entry.id !== id));
      } catch (error) {
        console.error('Error deleting waiting list entry:', error);
        Swal.fire({
          icon: 'error',
          title: t('error'),
          text: t('errorSaving'),
          confirmButtonColor: '#4f46e5'
        });
      }
    }
  }

  const filteredEntries = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return entries;
    return entries.filter(entry =>
      entry.patient_name.toLowerCase().includes(term) ||
      entry.patient_phone.includes(term) ||
      entry.city.toLowerCase().includes(term) ||
      (entry.appointment_info && entry.appointment_info.toLowerCase().includes(term)) ||
      (entry.notes && entry.notes.toLowerCase().includes(term))
    );
  }, [entries, searchTerm]);

  const getDiagnosisLabel = (diag: typeof DIAGNOSES[number]) => {
    const key = `diag${diag.charAt(0).toUpperCase()}${diag.slice(1)}`;
    return t(key);
  };

  const formatAppointmentDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  const getStatusBadge = (status: 'pending' | 'answered' | 'no_answer') => {
    switch (status) {
      case 'answered':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            {t('waitingStatusAnswered')}
          </span>
        );
      case 'no_answer':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
            {t('waitingStatusNoAnswer')}
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
            {t('waitingStatusPending')}
          </span>
        );
    }
  };

  const formatAddedDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (language === 'ar') {
      return d.toLocaleString('ar-EG');
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hoursStr}:${minutes} ${ampm}`;
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white font-sans">
          {t('waitingListTitle')}
        </h1>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors duration-200 shadow"
        >
          <Plus className="h-6 w-6 mr-2 ml-2" />
          {t('addPatientToWaitingList')}
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder={t('searchWaitingList')}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t('loading')}</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <Clock className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{t('noWaitingPatients')}</p>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW */}
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('patientName')}
                    </th>
                    <th className="px-4 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('patientPhone')}
                    </th>
                    <th className="px-4 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('city')}
                    </th>
                    <th className="px-4 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('diagnosis')}
                    </th>
                    <th className="px-4 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('callStatus')}
                    </th>
                    <th className="px-4 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('appointmentInfo')}
                    </th>
                    <th className="px-4 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('notes')}
                    </th>
                    <th className="px-4 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('addedDate')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        {entry.patient_name}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {entry.patient_phone}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {entry.city}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {getDiagnosisLabel(entry.diagnosis)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(entry.status)}
                          <button
                            onClick={() => openCallModal(entry)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            title={t('updateCallDetails')}
                          >
                            <PhoneCall className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-300 whitespace-nowrap" title={entry.appointment_info || ''}>
                        {entry.appointment_info ? formatAppointmentDate(entry.appointment_info) : <span className="text-gray-400 dark:text-gray-600">N/A</span>}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-300 max-w-xs truncate" title={entry.notes || ''}>
                        {entry.notes || <span className="text-gray-400 dark:text-gray-600">N/A</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {formatAddedDate(entry.created_at)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => openAssignModal(entry)}
                            className="flex items-center justify-center p-1.5 bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-900/50 rounded text-green-600 dark:text-green-400"
                            title={t('assignToStudent')}
                          >
                            <UserCheck className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded text-red-600 dark:text-red-400"
                            title={t('delete')}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARD VIEW */}
          <div className="sm:hidden space-y-4">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">{entry.patient_name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-450 mt-0.5">{entry.city}</p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {getDiagnosisLabel(entry.diagnosis)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-b dark:border-gray-750 py-2.5 my-2.5">
                  <div>
                    <span className="block text-gray-400 dark:text-gray-500 mb-0.5">{t('patientPhone')}</span>
                    <a href={`tel:${entry.patient_phone}`} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                      {entry.patient_phone}
                    </a>
                  </div>
                  <div>
                    <span className="block text-gray-400 dark:text-gray-500 mb-0.5">{t('addedDate')}</span>
                    <span className="text-gray-700 dark:text-gray-300">{formatAddedDate(entry.created_at)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-gray-400 dark:text-gray-500 mb-1">{t('callStatus')}</span>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(entry.status)}
                      <button
                        onClick={() => openCallModal(entry)}
                        className="p-1 hover:bg-gray-250 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-450"
                        title={t('updateCallDetails')}
                      >
                        <PhoneCall className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {entry.appointment_info && (
                    <div className="col-span-2">
                      <span className="block text-gray-400 dark:text-gray-500 mb-0.5">{t('appointmentInfo')}</span>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{formatAppointmentDate(entry.appointment_info)}</span>
                    </div>
                  )}
                  {entry.notes && (
                    <div className="col-span-2">
                      <span className="block text-gray-400 dark:text-gray-500 mb-0.5">{t('notes')}</span>
                      <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-2 rounded text-xs whitespace-pre-wrap">
                        {entry.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => openAssignModal(entry)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    <UserCheck className="h-4 w-4" />
                    {t('assignToStudent')}
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="flex items-center justify-center p-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    title={t('delete')}
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal - Add Patient to Waiting List */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-6 py-4 bg-indigo-600 text-white">
              <h3 className="text-xl font-bold">{t('addPatientToWaitingList')}</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-white hover:text-gray-200">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('patientName')} *
                </label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('patientPhone')} *
                </label>
                <input
                  type="tel"
                  required
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('city')} *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('diagnosis')} *
                </label>
                <select
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value as typeof DIAGNOSES[number])}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  {DIAGNOSES.map((diag) => (
                    <option key={diag} value={diag}>
                      {getDiagnosisLabel(diag)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  disabled={submitting}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  disabled={submitting}
                >
                  {submitting ? t('loading') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Update Call details & Notes */}
      {isCallModalOpen && selectedEntryForCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-6 py-4 bg-indigo-600 text-white">
              <h3 className="text-xl font-bold">{t('updateCallDetails')}</h3>
              <button onClick={() => { setIsCallModalOpen(false); setSelectedEntryForCall(null); }} className="text-white hover:text-gray-200">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateCallDetails} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('callStatus')} *
                </label>
                <select
                  value={callStatus}
                  onChange={(e) => setCallStatus(e.target.value as 'pending' | 'answered' | 'no_answer')}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="pending">{t('waitingStatusPending')}</option>
                  <option value="answered">{t('waitingStatusAnswered')}</option>
                  <option value="no_answer">{t('waitingStatusNoAnswer')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('appointmentInfo')}
                </label>
                <input
                  type="date"
                  value={appointmentInfo}
                  onChange={(e) => setAppointmentInfo(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('notes')}
                </label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={language === 'ar' ? 'ملاحظات أخرى...' : 'Any other notes...'}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => { setIsCallModalOpen(false); setSelectedEntryForCall(null); }}
                  className="px-4 py-2 border rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  disabled={submitting}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  disabled={submitting}
                >
                  {submitting ? t('loading') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Assign Waiting List Patient to Student */}
      {isAssignModalOpen && selectedEntryForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-6 py-4 bg-indigo-600 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <UserCheck className="h-6 w-6" />
                {t('assignToStudent')}
              </h3>
              <button onClick={() => { setIsAssignModalOpen(false); setSelectedEntryForAssign(null); }} className="text-white hover:text-gray-200">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAssignPatient} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="bg-indigo-50 dark:bg-indigo-950/20 p-3 rounded-lg text-sm text-indigo-900 dark:text-indigo-200">
                <p><strong>{t('patientName')}:</strong> {selectedEntryForAssign.patient_name}</p>
                <p><strong>{t('patientPhone')}:</strong> {selectedEntryForAssign.patient_phone}</p>
                <p><strong>{t('city')}:</strong> {selectedEntryForAssign.city}</p>
                <p><strong>{t('diagnosis')} {language === 'ar' ? 'المطلوب' : 'Requested'}:</strong> {getDiagnosisLabel(selectedEntryForAssign.diagnosis)}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('ticketNumber')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={ticketNumber}
                    onChange={(e) => setTicketNumber(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'ar' ? 'العمر' : 'Age'}
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('assignedStudent')} *
                </label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{language === 'ar' ? 'اختر الطالب...' : 'Select student...'}</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({language === 'ar' ? 'المدينة' : 'City'}: {s.city || 'N/A'})
                    </option>
                  ))}
                </select>
                {students.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    {language === 'ar' ? 'لا يوجد طلاب متاحين حالياً.' : 'No available registered students found.'}
                  </p>
                )}
              </div>

              <div className="border-t dark:border-gray-700 my-4 pt-3">
                <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  {language === 'ar' ? 'تفاصيل السن والعلاج' : 'Tooth & Treatment Details'}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('treatmentName')} *
                    </label>
                    <select
                      required
                      value={selectedTreatmentId}
                      onChange={(e) => setSelectedTreatmentId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">{language === 'ar' ? 'اختر العلاج...' : 'Select treatment...'}</option>
                      {treatments.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('toothClass')} *
                    </label>
                    <select
                      required
                      value={selectedToothClassId}
                      onChange={(e) => setSelectedToothClassId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">{language === 'ar' ? 'اختر التصنيف...' : 'Select class...'}</option>
                      {toothClasses.map(tc => (
                        <option key={tc.id} value={tc.id}>
                          {tc.name === 'pediatric' ? (language === 'ar' ? 'أطفال' : 'pediatric') : tc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'ar' ? 'رقم السن' : 'Tooth Number'} (أدخل رقم السن أو اتركه فارغاً للأطفال)
                    </label>
                    <input
                      type="text"
                      value={toothNumber}
                      onChange={(e) => setToothNumber(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'ar' ? 'طريقة الدفع' : 'Payment Type'}
                    </label>
                    <select
                      value={payment}
                      onChange={(e) => setPayment(e.target.value as 'free' | 'economical' | 'unknown')}
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="unknown">{language === 'ar' ? 'غير معروف' : 'Unknown'}</option>
                      <option value="free">{language === 'ar' ? 'مجاني' : 'Free'}</option>
                      <option value="economical">{language === 'ar' ? 'اقتصادي' : 'Economical'}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => { setIsAssignModalOpen(false); setSelectedEntryForAssign(null); }}
                  className="px-4 py-2 border rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  disabled={assigning}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  disabled={assigning}
                >
                  {assigning ? t('loading') : t('assignToStudent')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
