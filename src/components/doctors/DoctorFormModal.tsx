import React, { useState, useEffect } from 'react';
import { X, User, Phone, MapPin, Calendar, CreditCard, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Doctor } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { FlexibleDateInput } from '../common/FlexibleDateInput';
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

  const [formData, setFormData] = useState({
    name: '',
    national_id: '',
    birth_date: '',
    graduation_date: '',
    hire_date: '',
    address: '',
    phone: '',
    notes: '',
  });

  useEffect(() => {
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
      });
    }
  }, [doctor, isOpen]);

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {doctor ? t('editDoctor') : t('addDoctor')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Doctor Name - Required */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('doctorName')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={language === 'ar' ? 'د. محمد أحمد علي' : 'Dr. John Doe'}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* National ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('nationalId')} <span className="text-xs text-gray-400 font-normal">({language === 'ar' ? 'معرف فريد' : 'Unique'})</span>
              </label>
              <div className="relative">
                <CreditCard className="absolute right-3 rtl:right-3 rtl:left-auto left-auto top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={formData.national_id}
                  onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                  placeholder="29001011234567"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('phone')}
              </label>
              <div className="relative">
                <Phone className="absolute right-3 rtl:right-3 rtl:left-auto left-auto top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="01012345678"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('address')}
              </label>
              <div className="relative">
                <MapPin className="absolute right-3 rtl:right-3 rtl:left-auto left-auto top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={language === 'ar' ? 'المنصورة، الدقهلية' : 'Mansoura, Egypt'}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('notes')}
            </label>
            <div className="relative">
              <FileText className="absolute right-3 rtl:right-3 rtl:left-auto left-auto top-3 w-4 h-4 text-gray-400 pointer-events-none" />
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={language === 'ar' ? 'ملاحظات إضافية عن الطبيب...' : 'Additional notes...'}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 rtl:space-x-reverse pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center space-x-2 rtl:space-x-reverse shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
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
