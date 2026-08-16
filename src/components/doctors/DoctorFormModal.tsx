import React, { useState, useEffect } from 'react';
import { X, User, Phone, MapPin, Calendar, CreditCard, FileText, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Doctor } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { FlexibleDateInput } from '../common/FlexibleDateInput';
import { AutocompleteInput } from '../common/AutocompleteInput';
import { fetchHistoricalSuggestions } from '../../utils/suggestionUtils';
import { getDoctorLastUpdated } from '../../utils/doctorUtils';
import Swal from 'sweetalert2';

interface DoctorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (doctor: Doctor) => void;
  doctor?: Doctor | null;
}

export function DoctorFormModal({ isOpen, onClose, onSuccess, doctor }: DoctorFormModalProps) {
  const { t, language } = useLanguage();
  const { organizationId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    national_id: '',
    birth_date: '',
    graduation_date: '',
    hire_date: '',
    address: '',
    phone: '',
    notes: '',
    is_confirmed: false,
  });

  useEffect(() => {
    if (isOpen) {
      fetchHistoricalSuggestions().then((res) => {
        setAddressSuggestions(res.addresses);
      });
      if (doctor) {
        setFormData({
          name: doctor.name || '',
          national_id: doctor.national_id || '',
          birth_date: doctor.birth_date || '',
          graduation_date: doctor.graduation_date || '',
          hire_date: doctor.hire_date || '',
          address: doctor.address || '',
          phone: doctor.phone || '',
          notes: doctor.notes || '',
          is_confirmed: !!doctor.is_confirmed,
        });
      } else {
        setFormData({
          name: '',
          national_id: '',
          birth_date: '',
          graduation_date: '',
          hire_date: '',
          address: '',
          phone: '',
          notes: '',
          is_confirmed: false,
        });
      }
    }
  }, [isOpen, doctor]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      Swal.fire({
        icon: 'warning',
        title: language === 'ar' ? 'تنبيه' : 'Warning',
        text: language === 'ar' ? 'اسم الطبيب مطلوب' : 'Doctor name is required',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: formData.name.trim(),
        national_id: formData.national_id.trim() || null,
        birth_date: formData.birth_date ? formData.birth_date.trim() : null,
        graduation_date: formData.graduation_date ? formData.graduation_date.trim() : null,
        hire_date: formData.hire_date ? formData.hire_date.trim() : null,
        address: formData.address.trim() || null,
        phone: formData.phone.trim() || null,
        notes: formData.notes.trim() || null,
        is_confirmed: formData.is_confirmed,
        organization_id: organizationId || null,
        updated_at: new Date().toISOString(),
      };

      // Check national_id uniqueness if provided
      if (payload.national_id) {
        let query = supabase
          .from('doctors')
          .select('id, name')
          .eq('national_id', payload.national_id);
        
        if (doctor?.id) {
          query = query.neq('id', doctor.id);
        }
        if (organizationId) {
          query = query.eq('organization_id', organizationId);
        }

        const { data: existing, error: checkError } = await query;
        if (!checkError && existing && existing.length > 0) {
          Swal.fire({
            icon: 'error',
            title: language === 'ar' ? 'الرقم القومي مكرر' : 'Duplicate National ID',
            text: language === 'ar' 
              ? `الرقم القومي مسجل مسبقاً للطبيب: ${existing[0].name}` 
              : `National ID is already registered for doctor: ${existing[0].name}`,
            confirmButtonColor: '#4f46e5'
          });
          setLoading(false);
          return;
        }
      }

      if (doctor?.id) {
        // Update
        const { data, error } = await supabase
          .from('doctors')
          .update(payload)
          .eq('id', doctor.id)
          .select()
          .single();

        if (error) throw error;
        Swal.fire({
          icon: 'success',
          title: t('success'),
          text: t('doctorUpdatedSuccess'),
          timer: 1500,
          showConfirmButton: false
        });
        onSuccess(data);
      } else {
        // Insert
        const { data, error } = await supabase
          .from('doctors')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        // Automatically add default initial employment status "قوة أساسية" starting from hire_date or today
        try {
          await supabase.from('doctor_employment_history').insert([{
            doctor_id: data.id,
            organization_id: organizationId || null,
            status_type: 'قوة أساسية',
            start_date: payload.hire_date || new Date().toISOString().split('T')[0],
            end_date: null,
            notes: language === 'ar' ? 'تم التعيين / التسجيل الأولي' : 'Initial registration'
          }]);
        } catch (subErr) {
          console.warn('Initial employment history insert note:', subErr);
        }

        Swal.fire({
          icon: 'success',
          title: t('success'),
          text: t('doctorCreatedSuccess'),
          timer: 1500,
          showConfirmButton: false
        });
        onSuccess(data);
      }
      onClose();
    } catch (err: any) {
      console.error('Error saving doctor:', err);
      Swal.fire({
        icon: 'error',
        title: t('error'),
        text: err.message || t('errorSaving'),
        confirmButtonColor: '#4f46e5'
      });
    } finally {
      setLoading(false);
    }
  };

  const lastUpdated = doctor ? getDoctorLastUpdated(doctor, language) : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-1.5 sm:p-3 md:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[96vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 shrink-0">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse min-w-0">
            <div className="p-1.5 sm:p-2 bg-indigo-600 rounded-lg sm:rounded-xl text-white shrink-0">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                {doctor ? t('editDoctor') : t('addDoctor')}
              </h2>
              {lastUpdated && (
                <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                  <span>{language === 'ar' ? 'آخر تعديل:' : 'Last modified:'}</span>
                  <strong className="font-semibold text-indigo-600 dark:text-indigo-400">{lastUpdated.formatted}</strong>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto flex-1">
          {/* Doctor Name - Required */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('doctorName')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={language === 'ar' ? 'د. محمد أحمد علي' : 'Dr. John Doe'}
                className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* National ID */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('nationalId')} <span className="text-[11px] text-gray-400 font-normal">({language === 'ar' ? 'معرف فريد' : 'Unique'})</span>
              </label>
              <div className="relative">
                <CreditCard className="absolute right-3 rtl:right-3 rtl:left-auto left-auto top-2.5 sm:top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={formData.national_id}
                  onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                  placeholder="29001011234567"
                  className="w-full pl-3.5 pr-9 rtl:pr-9 rtl:pl-3.5 py-2 sm:py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('phone')}
              </label>
              <div className="relative">
                <Phone className="absolute right-3 rtl:right-3 rtl:left-auto left-auto top-2.5 sm:top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="01012345678"
                  className="w-full pl-3.5 pr-9 rtl:pr-9 rtl:pl-3.5 py-2 sm:py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Birth Date */}
            <FlexibleDateInput
              label={t('birthDate')}
              value={formData.birth_date}
              onChange={(val) => setFormData({ ...formData, birth_date: val })}
              minYear={1940}
              maxYear={new Date().getFullYear()}
              accentColor="indigo"
            />

            {/* Graduation Date */}
            <FlexibleDateInput
              label={t('graduationDate')}
              value={formData.graduation_date}
              onChange={(val) => setFormData({ ...formData, graduation_date: val })}
              minYear={1960}
              maxYear={new Date().getFullYear() + 2}
              accentColor="indigo"
            />

            {/* Hire Date / Employment commencement */}
            <FlexibleDateInput
              label={t('hireDate')}
              value={formData.hire_date}
              onChange={(val) => setFormData({ ...formData, hire_date: val })}
              minYear={1960}
              maxYear={new Date().getFullYear() + 2}
              accentColor="indigo"
            />

            {/* Address with Autocomplete */}
            <AutocompleteInput
              label={t('address')}
              value={formData.address}
              onChange={(val) => setFormData({ ...formData, address: val })}
              options={addressSuggestions}
              placeholder={language === 'ar' ? 'المنصورة، الدقهلية' : 'Mansoura, Egypt'}
              accentColor="indigo"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('notes')}
            </label>
            <div className="relative">
              <FileText className="absolute right-3 rtl:right-3 rtl:left-auto left-auto top-2.5 sm:top-3 w-4 h-4 text-gray-400 pointer-events-none" />
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={language === 'ar' ? 'ملاحظات إضافية عن الطبيب...' : 'Additional notes...'}
                className="w-full pl-3.5 pr-9 rtl:pr-9 rtl:pl-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="pt-1">
            <label className={`flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
              formData.is_confirmed
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-400/30'
                : 'bg-gray-50/70 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:border-gray-300'
            }`}>
              <input
                type="checkbox"
                checked={formData.is_confirmed}
                onChange={(e) => setFormData({ ...formData, is_confirmed: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 accent-emerald-600 cursor-pointer shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${formData.is_confirmed ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`} />
                  <span>{language === 'ar' ? 'تم تدقيق وتأكيد صحة بيانات ومستندات الطبيب' : 'Doctor data and documents are verified & confirmed'}</span>
                </div>
                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  {language === 'ar'
                    ? 'ضع علامة في هذا المربع إذا تمت مراجعة كافة بيانات وسجلات الطبيب واعتماد صحتها.'
                    : 'Check this box if all records, credentials, and details have been reviewed and verified.'}
                </p>
              </div>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-2 sm:space-x-3 rtl:space-x-reverse pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs sm:text-sm font-medium transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center space-x-1.5 sm:space-x-2 rtl:space-x-reverse shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{doctor ? t('saveChanges') : t('save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
