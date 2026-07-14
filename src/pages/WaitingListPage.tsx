import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Trash2, Clock, Loader2, Filter, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { WaitingListEntry } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

const DIAGNOSES = ['rct', 'operative', 'scaling', 'pulpotomy', 'pulpectomy', 'impaction'] as const;

export function WaitingListPage() {
  const { t, language } = useLanguage();
  const { organizationId } = useAuth();
  const [entries, setEntries] = useState<WaitingListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [city, setCity] = useState('');
  const [diagnosis, setDiagnosis] = useState<typeof DIAGNOSES[number]>('rct');

  useEffect(() => {
    if (organizationId) {
      fetchWaitingList();
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

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!organizationId) return;

    if (!patientName.trim() || !patientPhone.trim() || !city.trim()) {
      Swal.fire({
        icon: 'error',
        title: t('error'),
        text: t('fillAllFields'),
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

      // Reset form
      setPatientName('');
      setPatientPhone('');
      setCity('');
      setDiagnosis('rct');
      setIsModalOpen(false);

      // Refresh list
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

        // Update state locally
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
      entry.city.toLowerCase().includes(term)
    );
  }, [entries, searchTerm]);

  const getDiagnosisLabel = (diag: typeof DIAGNOSES[number]) => {
    const key = `diag${diag.charAt(0).toUpperCase()}${diag.slice(1)}`;
    return t(key);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {t('waitingListTitle')}
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
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
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('patientName')}
                  </th>
                  <th className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('patientPhone')}
                  </th>
                  <th className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('city')}
                  </th>
                  <th className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('diagnosis')}
                  </th>
                  <th className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('addedDate')}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                      {entry.patient_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {entry.patient_phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {entry.city}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {getDiagnosisLabel(entry.diagnosis)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {new Date(entry.created_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title={t('delete')}
                      >
                        <Trash2 className="h-5 w-5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-6 py-4 bg-indigo-600 text-white">
              <h3 className="text-xl font-bold">{t('addPatientToWaitingList')}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white hover:text-gray-200"
              >
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
                  onClick={() => setIsModalOpen(false)}
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
    </div>
  );
}
