import React, { useState, useEffect } from 'react';
import { X, Layers, Calendar, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { DoctorFinancialGrade } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { FlexibleDateInput } from '../common/FlexibleDateInput';
import Swal from 'sweetalert2';

interface FinancialGradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  doctorId: string;
  gradeRecord?: DoctorFinancialGrade | null;
}

const FINANCIAL_GRADES = [
  'الدرجة الثالثة',
  'الدرجة الثانية',
  'الدرجة الأولى',
  'كبير أخصائيين',
  'مدير عام',
  'الدرجة العالية',
  'الدرجة الممتازة',
  'أخرى'
];

export function FinancialGradeModal({
  isOpen,
  onClose,
  onSuccess,
  doctorId,
  gradeRecord
}: FinancialGradeModalProps) {
  const { t, language } = useLanguage();
  const { organizationId } = useAuth();
  const [loading, setLoading] = useState(false);

  const [financialGrade, setFinancialGrade] = useState('الدرجة الثالثة');
  const [customGrade, setCustomGrade] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isOngoing, setIsOngoing] = useState(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (gradeRecord) {
      if (FINANCIAL_GRADES.includes(gradeRecord.financial_grade)) {
        setFinancialGrade(gradeRecord.financial_grade);
        setCustomGrade('');
      } else {
        setFinancialGrade('أخرى');
        setCustomGrade(gradeRecord.financial_grade);
      }
      setStartDate(gradeRecord.start_date || '');
      setEndDate(gradeRecord.end_date || '');
      setIsOngoing(!gradeRecord.end_date);
      setNotes(gradeRecord.notes || '');
    } else {
      setFinancialGrade('الدرجة الثالثة');
      setCustomGrade('');
      setStartDate('');
      setEndDate('');
      setIsOngoing(true);
      setNotes('');
    }
  }, [gradeRecord, isOpen]);

  if (!isOpen) return null;

  const finalGrade = financialGrade === 'أخرى' && customGrade.trim() ? customGrade.trim() : financialGrade;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const payload = {
        doctor_id: doctorId,
        organization_id: organizationId || null,
        financial_grade: finalGrade,
        start_date: startDate ? startDate.trim() : null,
        end_date: isOngoing ? null : (endDate ? endDate.trim() : null),
        notes: notes.trim() || null
      };

      if (gradeRecord?.id) {
        const { error } = await supabase
          .from('doctor_financial_grades')
          .update(payload)
          .eq('id', gradeRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('doctor_financial_grades')
          .insert([payload]);
        if (error) throw error;
      }

      Swal.fire({
        icon: 'success',
        title: t('success'),
        text: t('successSaved'),
        timer: 1500,
        showConfirmButton: false
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving financial grade:', err);
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="p-2 bg-amber-600 rounded-lg text-white">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {gradeRecord ? t('edit') : t('addFinancialGrade')}
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
          {/* Financial Grade */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('financialGrade')} <span className="text-red-500">*</span>
            </label>
            <select
              value={financialGrade}
              onChange={(e) => setFinancialGrade(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            >
              {FINANCIAL_GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>

          {financialGrade === 'أخرى' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {language === 'ar' ? 'حدد الدرجة المالية' : 'Specify Grade'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customGrade}
                onChange={(e) => setCustomGrade(e.target.value)}
                placeholder={language === 'ar' ? 'مثال: الدرجة الرابعة' : 'e.g. Grade 4'}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}

          {/* Start Date */}
          <FlexibleDateInput
            label={t('startDate')}
            required={false}
            value={startDate}
            onChange={(val) => setStartDate(val)}
            minYear={1970}
            maxYear={new Date().getFullYear() + 2}
            accentColor="amber"
          />

          {/* Ongoing Checkbox */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse pt-1">
            <input
              type="checkbox"
              id="isOngoingGradeCheck"
              checked={isOngoing}
              onChange={(e) => {
                setIsOngoing(e.target.checked);
                if (e.target.checked) setEndDate('');
              }}
              className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
            />
            <label htmlFor="isOngoingGradeCheck" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              {t('isCurrentStatus')} ({language === 'ar' ? 'الدرجة المالية الحالية' : 'Current Grade'})
            </label>
          </div>

          {/* End Date */}
          {!isOngoing && (
            <FlexibleDateInput
              label={t('endDate')}
              required={false}
              value={endDate}
              onChange={(val) => setEndDate(val)}
              minYear={1970}
              maxYear={new Date().getFullYear() + 5}
              accentColor="amber"
            />
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('notes')}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === 'ar' ? 'ملاحظات حول الدرجة المالية...' : 'Notes...'}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500"
            />
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
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center space-x-2 rtl:space-x-reverse shadow-lg shadow-amber-600/30 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{gradeRecord ? t('saveChanges') : t('save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
