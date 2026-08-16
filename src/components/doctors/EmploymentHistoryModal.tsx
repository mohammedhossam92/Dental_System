import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, FileText, CheckCircle2, Loader2, AlertTriangle, Building, Briefcase, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { DoctorEmploymentHistory, EmploymentStatusType } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { FlexibleDateInput } from '../common/FlexibleDateInput';
import { AutocompleteInput } from '../common/AutocompleteInput';
import { fetchHistoricalSuggestions } from '../../utils/suggestionUtils';
import { validateEmploymentPeriod, touchDoctorUpdatedAt } from '../../utils/doctorUtils';
import Swal from 'sweetalert2';

interface EmploymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  doctorId: string;
  historyRecord?: DoctorEmploymentHistory | null;
  existingHistory?: DoctorEmploymentHistory[];
}

const STATUS_OPTIONS: EmploymentStatusType[] = [
  'قوة أساسية',
  'انتداب',
  'إعارة',
  'إجازة',
  'ندب',
  'إنهاء خدمة',
  'أخرى'
];

const STANDARD_ADMIN_ROLES = [
  'رئيس القسم',
  'نائب / وكيل رئيس القسم',
  'مدير العيادات التعليمية',
  'مشرف إداري',
  'منسق الجودة والاعتماد',
  'منسق التدريب والتعليم الطبي',
  'رئيس وحدة التعقيم ومكافحة العدوى',
  'أخرى'
];

export function EmploymentHistoryModal({
  isOpen,
  onClose,
  onSuccess,
  doctorId,
  historyRecord,
  existingHistory = []
}: EmploymentHistoryModalProps) {
  const { t, language } = useLanguage();
  const { organizationId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [adminRoleSuggestions, setAdminRoleSuggestions] = useState<string[]>([]);
  const [facilitySuggestions, setFacilitySuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchHistoricalSuggestions().then((res) => {
        setAdminRoleSuggestions(res.administrativeRoles);
        setFacilitySuggestions(res.administrativeFacilities);
      });
    }
  }, [isOpen]);

  const [statusType, setStatusType] = useState<EmploymentStatusType | string>('قوة أساسية');
  const [customStatus, setCustomStatus] = useState('');
  const [deputationDirection, setDeputationDirection] = useState<'منتدب إلى المستشفى' | 'منتدب من المستشفى إلى الخارج'>('منتدب إلى المستشفى');
  const [deputationFacility, setDeputationFacility] = useState('');

  // Administrative Work Fields
  const [hasAdministrativeDuty, setHasAdministrativeDuty] = useState(false);
  const [administrativeScope, setAdministrativeScope] = useState<'داخل القسم' | 'خارج القسم'>('داخل القسم');
  const [administrativeRole, setAdministrativeRole] = useState('رئيس القسم');
  const [customAdminRole, setCustomAdminRole] = useState('');
  const [administrativeFacility, setAdministrativeFacility] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isOngoing, setIsOngoing] = useState(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (historyRecord) {
      if (STATUS_OPTIONS.includes(historyRecord.status_type as EmploymentStatusType)) {
        setStatusType(historyRecord.status_type);
        setCustomStatus('');
      } else {
        setStatusType('أخرى');
        setCustomStatus(historyRecord.status_type);
      }
      setDeputationDirection((historyRecord.deputation_direction as any) || 'منتدب إلى المستشفى');
      setDeputationFacility(historyRecord.deputation_facility || '');

      setHasAdministrativeDuty(!!historyRecord.has_administrative_duty);
      setAdministrativeScope((historyRecord.administrative_scope as any) || 'داخل القسم');
      if (historyRecord.administrative_role) {
        if (STANDARD_ADMIN_ROLES.includes(historyRecord.administrative_role)) {
          setAdministrativeRole(historyRecord.administrative_role);
          setCustomAdminRole('');
        } else {
          setAdministrativeRole('أخرى');
          setCustomAdminRole(historyRecord.administrative_role);
        }
      } else {
        setAdministrativeRole('رئيس القسم');
        setCustomAdminRole('');
      }
      setAdministrativeFacility(historyRecord.administrative_facility || '');

      setStartDate(historyRecord.start_date || '');
      setEndDate(historyRecord.end_date || '');
      setIsOngoing(!historyRecord.end_date);
      setNotes(historyRecord.notes || '');
    } else {
      setStatusType('قوة أساسية');
      setCustomStatus('');
      setDeputationDirection('منتدب إلى المستشفى');
      setDeputationFacility('');

      setHasAdministrativeDuty(false);
      setAdministrativeScope('داخل القسم');
      setAdministrativeRole('رئيس القسم');
      setCustomAdminRole('');
      setAdministrativeFacility('');

      setStartDate('');
      setEndDate('');
      setIsOngoing(true);
      setNotes('');
    }
  }, [historyRecord, isOpen]);

  if (!isOpen) return null;

  const isDeputation = statusType === 'انتداب' || statusType === 'ندب';
  const finalStatusType = statusType === 'أخرى' && customStatus.trim() ? customStatus.trim() : statusType;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasAdministrativeDuty && administrativeRole === 'أخرى' && !customAdminRole.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'تنبيه',
        text: language === 'ar' ? 'يرجى كتابة المسمى الإداري المخصص' : 'Please enter the custom administrative title',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    const finalEndDate = isOngoing ? null : (endDate || null);

    // Validate period overlaps
    const validation = validateEmploymentPeriod(existingHistory, {
      id: historyRecord?.id,
      start_date: startDate,
      end_date: finalEndDate,
      status_type: finalStatusType
    });

    if (!validation.valid) {
      Swal.fire({
        icon: 'warning',
        title: 'تنبيه تعارض التواريخ',
        text: validation.message || 'يوجد تعارض في التواريخ مع فترة وظيفية أخرى',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    try {
      setLoading(true);

      const finalAdminRole = hasAdministrativeDuty
        ? (administrativeRole === 'أخرى' ? customAdminRole.trim() : administrativeRole)
        : null;

      const payload = {
        doctor_id: doctorId,
        organization_id: organizationId || null,
        status_type: finalStatusType,
        deputation_direction: isDeputation ? deputationDirection : null,
        deputation_facility: isDeputation ? (deputationFacility.trim() || null) : null,
        has_administrative_duty: hasAdministrativeDuty,
        administrative_scope: hasAdministrativeDuty ? administrativeScope : null,
        administrative_role: hasAdministrativeDuty ? finalAdminRole : null,
        administrative_facility: (hasAdministrativeDuty && administrativeScope === 'خارج القسم') ? (administrativeFacility.trim() || null) : null,
        start_date: startDate ? startDate.trim() : null,
        end_date: finalEndDate ? finalEndDate.trim() : null,
        notes: notes.trim() || null
      };

      if (historyRecord?.id) {
        const { error } = await supabase
          .from('doctor_employment_history')
          .update(payload)
          .eq('id', historyRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('doctor_employment_history')
          .insert([payload]);
        if (error) throw error;
      }

      await touchDoctorUpdatedAt(doctorId);

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
      console.error('Error saving employment history:', err);
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-1.5 sm:p-3 md:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[96vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 shrink-0">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <div className="p-1.5 sm:p-2 bg-blue-600 rounded-lg sm:rounded-xl text-white">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
              {historyRecord ? t('editStatusPeriod') : t('addStatusPeriod')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto flex-1">
          
          {/* Status Type */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('statusType')} <span className="text-red-500">*</span>
            </label>
            <select
              value={statusType}
              onChange={(e) => setStatusType(e.target.value as EmploymentStatusType)}
              className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* If Deputation (انتداب أو ندب): Show Direction and Facility */}
          {isDeputation && (
            <div className="p-3 sm:p-4 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/60 space-y-2.5 sm:space-y-3 animate-in fade-in duration-200">
              <label className="block text-xs font-bold text-blue-900 dark:text-blue-200">
                {t('deputationDirection')} <span className="text-red-500">*</span>
              </label>

              <div className="space-y-1.5 sm:space-y-2">
                <label
                  onClick={() => setDeputationDirection('منتدب إلى المستشفى')}
                  className={`flex items-center p-2 sm:p-2.5 rounded-lg border cursor-pointer text-xs font-semibold transition-colors ${
                    deputationDirection === 'منتدب إلى المستشفى'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="deputation_direction"
                    checked={deputationDirection === 'منتدب إلى المستشفى'}
                    onChange={() => setDeputationDirection('منتدب إلى المستشفى')}
                    className="hidden"
                  />
                  <span>👉 {t('incomingDeputation')}</span>
                </label>

                <label
                  onClick={() => setDeputationDirection('منتدب من المستشفى إلى الخارج')}
                  className={`flex items-center p-2 sm:p-2.5 rounded-lg border cursor-pointer text-xs font-semibold transition-colors ${
                    deputationDirection === 'منتدب من المستشفى إلى الخارج'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="deputation_direction"
                    checked={deputationDirection === 'منتدب من المستشفى إلى الخارج'}
                    onChange={() => setDeputationDirection('منتدب من المستشفى إلى الخارج')}
                    className="hidden"
                  />
                  <span>👈 {t('outgoingDeputation')}</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('deputationFacility')}
                </label>
                <input
                  type="text"
                  value={deputationFacility}
                  onChange={(e) => setDeputationFacility(e.target.value)}
                  placeholder={
                    deputationDirection === 'منتدب إلى المستشفى'
                      ? (language === 'ar' ? 'الجهة الأصلية للطبيب (مثال: مستشفى المنصورة العام)' : 'Original facility name')
                      : (language === 'ar' ? 'الجهة المنتدب إليها (مثال: مستشفى الطوارئ الجامعي)' : 'Target facility name')
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {statusType === 'أخرى' && (
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {language === 'ar' ? 'حدد نوع الحالة' : 'Specify Status'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                placeholder={language === 'ar' ? 'مثال: منتدب جزئي / منحة دراسية' : 'e.g. Partial secondment'}
                className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* ========================================================== */}
          {/* ADMINISTRATIVE WORK SECTION (العمل الإداري داخل أو خارج القسم) */}
          {/* ========================================================== */}
          <div className="p-3 sm:p-4 bg-gradient-to-br from-purple-50/80 to-indigo-50/80 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-xl sm:rounded-2xl border border-purple-200/80 dark:border-purple-800/60 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <label htmlFor="adminDutyToggle" className="flex items-center space-x-2.5 rtl:space-x-reverse cursor-pointer">
                <input
                  type="checkbox"
                  id="adminDutyToggle"
                  checked={hasAdministrativeDuty}
                  onChange={(e) => setHasAdministrativeDuty(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                />
                <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                  <Briefcase className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                    {t('hasAdministrativeDuty')}
                  </span>
                </div>
              </label>
            </div>

            {hasAdministrativeDuty && (
              <div className="space-y-3 pt-2 border-t border-purple-200/60 dark:border-purple-800/50 animate-in fade-in duration-200">
                {/* Administrative Scope (داخل القسم أم خارج القسم) */}
                <div>
                  <label className="block text-xs font-bold text-purple-900 dark:text-purple-200 mb-1.5">
                    {t('administrativeScope')} <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdministrativeScope('داخل القسم')}
                      className={`flex items-center justify-center p-2 sm:p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        administrativeScope === 'داخل القسم'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-purple-50'
                      }`}
                    >
                      <Building className="w-3.5 h-3.5 mr-1 rtl:mr-0 rtl:ml-1" />
                      <span>{t('insideDepartment')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdministrativeScope('خارج القسم')}
                      className={`flex items-center justify-center p-2 sm:p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        administrativeScope === 'خارج القسم'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-purple-50'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5 mr-1 rtl:mr-0 rtl:ml-1" />
                      <span>{t('outsideDepartment')}</span>
                    </button>
                  </div>
                </div>

                {/* Administrative Role / Title */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('administrativeRole')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={administrativeRole}
                    onChange={(e) => setAdministrativeRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  >
                    {STANDARD_ADMIN_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Role Input with Autocomplete */}
                {administrativeRole === 'أخرى' && (
                  <div>
                    <AutocompleteInput
                      label={t('specifyCustomRole')}
                      required={hasAdministrativeDuty && administrativeRole === 'أخرى'}
                      value={customAdminRole}
                      onChange={setCustomAdminRole}
                      options={adminRoleSuggestions}
                      placeholder={language === 'ar' ? 'مثال: مدير وحدة الرنين / منسق الامتحانات' : 'e.g. Exam Coordinator'}
                      accentColor="purple"
                    />
                  </div>
                )}

                {/* If Outside Department: Facility / Entity name with Autocomplete */}
                {administrativeScope === 'خارج القسم' && (
                  <div className="animate-in fade-in duration-200">
                    <AutocompleteInput
                      label={t('administrativeFacility')}
                      value={administrativeFacility}
                      onChange={setAdministrativeFacility}
                      options={facilitySuggestions}
                      placeholder={language === 'ar' ? 'مثال: عمادة الكلية / إدارة المستشفى / المجلس الصحي' : 'e.g. College Deanery / Hospital Admin'}
                      accentColor="purple"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Start Date */}
          <FlexibleDateInput
            label={t('startDate')}
            required={false}
            value={startDate}
            onChange={(val) => setStartDate(val)}
            minYear={1970}
            maxYear={new Date().getFullYear() + 2}
            accentColor="blue"
          />

          {/* Ongoing Checkbox */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse pt-1">
            <input
              type="checkbox"
              id="isOngoingCheck"
              checked={isOngoing}
              onChange={(e) => {
                setIsOngoing(e.target.checked);
                if (e.target.checked) setEndDate('');
              }}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="isOngoingCheck" className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              {t('isCurrentStatus')} ({language === 'ar' ? 'مستمر حتى الآن' : 'Ongoing'})
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
              accentColor="blue"
            />
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('notes')}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === 'ar' ? 'ملاحظات حول هذه الفترة والتكليف...' : 'Notes...'}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
            />
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
              className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold flex items-center space-x-1.5 sm:space-x-2 rtl:space-x-reverse shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{historyRecord ? t('saveChanges') : t('save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
