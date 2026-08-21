import React, { useState, useEffect, useCallback } from 'react';
import {
  X, User, Award, Clock, TrendingUp, Layers, FileText, Plus, Edit, Trash2,
  Calendar, Phone, MapPin, CreditCard, CheckCircle2, AlertCircle, ExternalLink,
  Upload, Sparkles, Building, ChevronRight, ShieldCheck, Download, Briefcase
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type {
  Doctor, DoctorWithDetails, DoctorEmploymentHistory, DoctorCertificate,
  DoctorPromotion, DoctorFinancialGrade, DoctorDocument, University, CertificateType
} from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { WhatsAppButton } from '../common/WhatsAppButton';
import {
  formatDate, formatMonthYear, formatCertificateDate, getCertificateSummary,
  getCurrentEmploymentStatus, uploadDoctorFile, formatDisplayValue, getDoctorLastUpdated,
  touchDoctorUpdatedAt, getDoctorAge, getDoctorBirthDate
} from '../../utils/doctorUtils';
import { DoctorFormModal } from './DoctorFormModal';
import { CertificateFormModal } from './CertificateFormModal';
import { EmploymentHistoryModal } from './EmploymentHistoryModal';
import { PromotionModal } from './PromotionModal';
import { FinancialGradeModal } from './FinancialGradeModal';
import { DoctorExportModal } from './DoctorExportModal';
import { DoctorExportDropdown } from './DoctorExportDropdown';
import Swal from 'sweetalert2';

interface DoctorDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string | null;
  onDoctorUpdated: () => void;
  universities: University[];
  certificateTypes: CertificateType[];
  onUniversityAdded?: (univ: University) => void;
}

type TabType = 'basic' | 'history' | 'certificates' | 'promotions' | 'documents';

export function DoctorDetailsModal({
  isOpen,
  onClose,
  doctorId,
  onDoctorUpdated,
  universities,
  certificateTypes,
  onUniversityAdded
}: DoctorDetailsModalProps) {
  const { t, language } = useLanguage();
  const { organizationId } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [loading, setLoading] = useState(true);
  const [doctorDetails, setDoctorDetails] = useState<DoctorWithDetails | null>(null);

  // Sub-modal states
  const [isEditDoctorOpen, setIsEditDoctorOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<DoctorCertificate | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<DoctorEmploymentHistory | null>(null);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<DoctorPromotion | null>(null);
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
  const [selectedFinancial, setSelectedFinancial] = useState<DoctorFinancialGrade | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Document upload state
  const [newDocTitle, setNewDocTitle] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const fetchFullDoctor = useCallback(async () => {
    if (!doctorId) return;
    try {
      setLoading(true);
      const [
        docRes,
        historyRes,
        certsRes,
        promotionsRes,
        financialRes,
        docsRes
      ] = await Promise.all([
        supabase.from('doctors').select('*').eq('id', doctorId).single(),
        supabase.from('doctor_employment_history').select('*').eq('doctor_id', doctorId).order('start_date', { ascending: false }),
        supabase.from('doctor_certificates').select('*').eq('doctor_id', doctorId).order('created_at', { ascending: false }),
        supabase.from('doctor_promotions').select('*').eq('doctor_id', doctorId).order('promotion_date', { ascending: false }),
        supabase.from('doctor_financial_grades').select('*').eq('doctor_id', doctorId).order('start_date', { ascending: false }),
        supabase.from('doctor_documents').select('*').eq('doctor_id', doctorId).order('created_at', { ascending: false })
      ]);

      if (docRes.error) throw docRes.error;

      const employment_history = historyRes.data || [];
      const certificates = certsRes.data || [];
      const promotions = promotionsRes.data || [];
      const financial_grades = financialRes.data || [];
      const documents = docsRes.data || [];

      const current_status = getCurrentEmploymentStatus(employment_history);
      const current_financial_grade = financial_grades.find(g => !g.end_date) || financial_grades[0] || null;

      setDoctorDetails({
        ...docRes.data,
        employment_history,
        certificates,
        promotions,
        financial_grades,
        documents,
        current_status,
        current_financial_grade
      });
    } catch (err: any) {
      console.error('Error fetching doctor details:', err);
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    if (isOpen && doctorId) {
      fetchFullDoctor();
    }
  }, [isOpen, doctorId, fetchFullDoctor]);

  if (!isOpen || !doctorId) return null;

  // Delete helpers
  const handleDeleteItem = async (table: string, id: string, name: string) => {
    const result = await Swal.fire({
      title: t('areYouSure'),
      text: `${t('delete')} ${name}؟`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t('yesDelete'),
      cancelButtonText: t('cancel')
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        await touchDoctorUpdatedAt(doctorId);
        Swal.fire({
          icon: 'success',
          title: t('deleted'),
          timer: 1200,
          showConfirmButton: false
        });
        fetchFullDoctor();
        onDoctorUpdated();
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: t('error'),
          text: err.message,
          confirmButtonColor: '#4f46e5'
        });
      }
    }
  };

  // Upload Generic Document
  const handleUploadGenericDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!newDocTitle.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'تنبيه',
        text: 'يرجى كتابة مسمى أو وصف المستند أولاً',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    try {
      setUploadingDoc(true);
      const uploadRes = await uploadDoctorFile(file, 'documents');
      if (uploadRes.error && !uploadRes.url) throw new Error(uploadRes.error);

      const { error } = await supabase.from('doctor_documents').insert([{
        doctor_id: doctorId,
        organization_id: organizationId || null,
        title: newDocTitle.trim(),
        file_url: uploadRes.url,
        file_name: uploadRes.fileName,
        file_type: file.type
      }]);

      if (error) throw error;

      await touchDoctorUpdatedAt(doctorId);
      setNewDocTitle('');
      Swal.fire({
        icon: 'success',
        title: t('success'),
        text: 'تم رفع المستند بنجاح',
        timer: 1300,
        showConfirmButton: false
      });
      fetchFullDoctor();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: t('error'),
        text: err.message || 'فشل رفع المستند',
        confirmButtonColor: '#4f46e5'
      });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleToggleConfirmation = async () => {
    if (!doctorDetails) return;
    const newStatus = !doctorDetails.is_confirmed;
    try {
      const { error } = await supabase
        .from('doctors')
        .update({ is_confirmed: newStatus, updated_at: new Date().toISOString() })
        .eq('id', doctorDetails.id);

      if (error) throw error;

      setDoctorDetails((prev) => (prev ? { ...prev, is_confirmed: newStatus } : null));
      onDoctorUpdated();

      const toast = Swal.mixin({
        toast: true,
        position: language === 'ar' ? 'top-start' : 'top-end',
        showConfirmButton: false,
        timer: 1500,
      });
      toast.fire({
        icon: newStatus ? 'success' : 'info',
        title: newStatus ? t('doctorConfirmedSuccess') : t('doctorUnconfirmedSuccess')
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: t('error'),
        text: err.message,
        confirmButtonColor: '#4f46e5'
      });
    }
  };

  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case 'قوة أساسية':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'انتداب':
      case 'ندب':
        return 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800';
      case 'إعارة':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'إجازة':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'إنهاء خدمة':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-1.5 sm:p-3 md:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-5xl max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Card */}
        <div className="px-3.5 sm:px-6 py-3.5 sm:py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white font-bold text-base sm:text-xl shadow-sm shrink-0">
              {doctorDetails?.name?.charAt(0) || <User className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 rtl:space-x-reverse flex-wrap gap-1">
                <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {doctorDetails?.name || t('loading')}
                </h1>
                {doctorDetails?.current_status && (
                  <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold border ${getStatusBadgeColor(doctorDetails.current_status.status_type)}`}>
                    {doctorDetails.current_status.status_type}
                    {doctorDetails.current_status.deputation_direction ? ` (${doctorDetails.current_status.deputation_direction})` : ''}
                  </span>
                )}
                {doctorDetails?.current_status?.has_administrative_duty && (
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                    <Briefcase className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>{doctorDetails.current_status.administrative_role || t('administrativeDuty')}</span>
                    <span className="text-[9px] sm:text-[11px] opacity-80">
                      ({doctorDetails.current_status.administrative_scope === 'خارج القسم' 
                        ? `${t('outsideDepartment')}${doctorDetails.current_status.administrative_facility ? `: ${doctorDetails.current_status.administrative_facility}` : ''}`
                        : t('insideDepartment')})
                    </span>
                  </span>
                )}
                {doctorDetails?.is_confirmed && (
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>{t('dataConfirmed')}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1">
                {doctorDetails?.national_id && <span>{t('nationalId')}: <strong className="text-gray-700 dark:text-gray-200 font-mono">{doctorDetails.national_id}</strong></span>}
                {doctorDetails?.phone && (
                  <span className="inline-flex items-center gap-1">
                    <span>{t('phone')}:</span>
                    <strong className="text-gray-700 dark:text-gray-200 font-mono">{doctorDetails.phone}</strong>
                    <WhatsAppButton phone={doctorDetails.phone} size="xs" />
                  </span>
                )}
                {doctorDetails && (
                  <span className="inline-flex items-center gap-1 text-[10.5px] sm:text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/50" title={getDoctorLastUpdated(doctorDetails, language).formatted}>
                    <Clock className="w-3 h-3 text-indigo-500" />
                    <span>{language === 'ar' ? 'آخر تعديل:' : 'Last updated:'}</span>
                    <strong className="font-semibold">{getDoctorLastUpdated(doctorDetails, language).formatted}</strong>
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 rtl:space-x-reverse self-end sm:self-center shrink-0 flex-wrap gap-1.5">
            {/* Confirmation Toggle Button */}
            <button
              onClick={handleToggleConfirmation}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1 sm:gap-1.5 border transition-all ${
                doctorDetails?.is_confirmed
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 shadow-sm'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-650'
              }`}
              title={doctorDetails?.is_confirmed ? t('unconfirmData') : t('confirmData')}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${doctorDetails?.is_confirmed ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`} />
              <span className="whitespace-nowrap">{doctorDetails?.is_confirmed ? t('dataConfirmed') : t('confirmData')}</span>
            </button>

            {doctorDetails && (
              <DoctorExportDropdown
                doctor={doctorDetails}
                onOpenPreviewModal={() => setIsExportModalOpen(true)}
                variant="button"
              />
            )}
            <button
              onClick={() => setIsEditDoctorOpen(true)}
              className="px-2.5 sm:px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1 sm:gap-1.5 shadow-sm transition-colors"
            >
              <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{t('edit')}</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-3 sm:px-6 bg-slate-50/70 dark:bg-gray-900/50 overflow-x-auto gap-1">
          {[
            { id: 'basic', label: t('basicInfo'), icon: User },
            { id: 'history', label: `${t('statusHistory')} (${doctorDetails?.employment_history?.length || 0})`, icon: Clock },
            { id: 'certificates', label: `${t('certificates')} (${doctorDetails?.certificates?.length || 0})`, icon: Award },
            { id: 'promotions', label: `${t('promotions')} & ${t('financialGrades')}`, icon: TrendingUp },
            { id: 'documents', label: `${t('documents')} (${doctorDetails?.documents?.length || 0})`, icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center space-x-1.5 rtl:space-x-reverse py-2.5 sm:py-3 px-2.5 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 bg-white dark:bg-gray-800 shadow-sm'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-3 sm:p-5 md:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              {t('loading')}
            </div>
          ) : (
            <>
              {/* TAB 1: BASIC INFO */}
              {activeTab === 'basic' && (
                <div className="space-y-4 sm:space-y-6">
                  {/* Status Banner */}
                  <div className={`grid grid-cols-1 sm:grid-cols-2 ${doctorDetails?.current_status?.has_administrative_duty ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-2.5 sm:gap-4`}>
                    <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{t('currentStatus')}</span>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                          {formatDisplayValue(doctorDetails?.current_status?.status_type, language, language === 'ar' ? 'قوة أساسية' : 'Core Staff')}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {doctorDetails?.current_status ? (
                            doctorDetails.current_status.end_date 
                              ? `${doctorDetails.current_status.start_date} -> ${doctorDetails.current_status.end_date}`
                              : `${doctorDetails.current_status.start_date} -> ${t('ongoing')}`
                          ) : t('ongoing')}
                        </p>
                      </div>
                      <div className="p-3 bg-indigo-600/10 dark:bg-indigo-400/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                    </div>

                    {doctorDetails?.current_status?.has_administrative_duty && (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-950/30 dark:to-fuchsia-950/30 border border-purple-100 dark:border-purple-800/40 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">{t('administrativeDuty')}</span>
                          <h3 className="text-base font-bold text-gray-900 dark:text-white mt-0.5 truncate max-w-[170px]" title={doctorDetails.current_status.administrative_role || ''}>
                            {formatDisplayValue(doctorDetails.current_status.administrative_role, language, t('administrativeDuty'))}
                          </h3>
                          <p className="text-xs text-purple-700 dark:text-purple-300 mt-1 flex items-center gap-1">
                            <span>{formatDisplayValue(doctorDetails.current_status.administrative_scope, language, t('insideDepartment'))}</span>
                            {doctorDetails.current_status.administrative_facility && doctorDetails.current_status.administrative_facility !== 'null' && (
                              <span className="text-[11px] opacity-80 truncate max-w-[100px]">({doctorDetails.current_status.administrative_facility})</span>
                            )}
                          </p>
                        </div>
                        <div className="p-3 bg-purple-600/10 dark:bg-purple-400/10 rounded-xl text-purple-600 dark:text-purple-400">
                          <Briefcase className="w-6 h-6" />
                        </div>
                      </div>
                    )}

                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-100 dark:border-amber-800/40 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">{t('financialGrade')}</span>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                          {formatDisplayValue(doctorDetails?.current_financial_grade?.financial_grade, language)}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {doctorDetails?.current_financial_grade?.start_date ? `منذ ${doctorDetails.current_financial_grade.start_date}` : (language === 'ar' ? 'غير محدد' : 'undefined')}
                        </p>
                      </div>
                      <div className="p-3 bg-amber-600/10 dark:bg-amber-400/10 rounded-xl text-amber-600 dark:text-amber-400">
                        <Layers className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{t('certificates')}</span>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                          {doctorDetails?.certificates?.length || 0} {language === 'ar' ? 'شهادة علمية' : 'Degrees'}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {doctorDetails?.certificates?.filter(c => c.status === 'in_progress').length || 0} {language === 'ar' ? 'قيد الدراسة' : 'In progress'}
                        </p>
                      </div>
                      <div className="p-3 bg-emerald-600/10 dark:bg-emerald-400/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                        <Award className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  {/* Doctor Data Grid */}
                  <div className="bg-gray-50 dark:bg-gray-700/40 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <span className="text-xs font-semibold text-gray-400 block mb-1">{t('doctorName')}</span>
                      <p className="text-base font-bold text-gray-900 dark:text-white">{doctorDetails?.name}</p>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-gray-400 block mb-1">{t('nationalId')}</span>
                      <p className="text-base font-mono font-bold text-gray-900 dark:text-white">{formatDisplayValue(doctorDetails?.national_id, language)}</p>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-gray-400 block mb-1">{t('phone')}</span>
                      {doctorDetails?.phone && doctorDetails.phone !== 'null' && doctorDetails.phone !== 'undefined' ? (
                        <div className="flex items-center gap-2">
                          <p className="text-base font-mono font-bold text-gray-900 dark:text-white">{doctorDetails.phone}</p>
                          <WhatsAppButton phone={doctorDetails.phone} variant="button" size="sm" />
                        </div>
                      ) : (
                        <p className="text-base font-medium text-gray-400">{language === 'ar' ? 'غير محدد' : 'undefined'}</p>
                      )}
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-gray-400 block mb-1">{t('birthDate')}</span>
                      <p className="text-base font-medium text-gray-900 dark:text-white">
                        {formatDate(getDoctorBirthDate(doctorDetails) || doctorDetails?.birth_date || null, language)}
                        {(() => {
                          const age = getDoctorAge(doctorDetails);
                          if (age !== null) {
                            return (
                              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mr-2 rtl:mr-2 rtl:ml-0 inline-block">
                                ({language === 'ar' ? `${age} سنة` : `${age} years old`})
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-gray-400 block mb-1">{t('graduationDate')}</span>
                      <p className="text-base font-medium text-gray-900 dark:text-white">{formatDate(doctorDetails?.graduation_date || null, language)}</p>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-gray-400 block mb-1">{t('hireDate')}</span>
                      <p className="text-base font-medium text-gray-900 dark:text-white">{formatDate(doctorDetails?.hire_date || null, language)}</p>
                    </div>

                    <div className="md:col-span-2 lg:col-span-3">
                      <span className="text-xs font-semibold text-gray-400 block mb-1">{t('address')}</span>
                      <p className="text-base font-medium text-gray-900 dark:text-white">{formatDisplayValue(doctorDetails?.address, language)}</p>
                    </div>

                    <div className="md:col-span-2 lg:col-span-3 pt-3 border-t border-gray-200 dark:border-gray-700/60 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{language === 'ar' ? 'تاريخ إنشاء السجل:' : 'Record created:'}</span>
                        <strong className="text-gray-700 dark:text-gray-300 font-mono">
                          {doctorDetails?.created_at ? new Date(doctorDetails.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : (language === 'ar' ? 'غير متوفر' : 'N/A')}
                        </strong>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{language === 'ar' ? 'آخر تعديل وتحديث للبيانات:' : 'Last modified:'}</span>
                        <strong className="text-indigo-600 dark:text-indigo-400 font-semibold font-mono">
                          {doctorDetails ? getDoctorLastUpdated(doctorDetails, language).formatted : ''}
                        </strong>
                        {doctorDetails && getDoctorLastUpdated(doctorDetails, language).relative && (
                          <span className="text-[11px] text-gray-400">({getDoctorLastUpdated(doctorDetails, language).relative})</span>
                        )}
                      </div>
                    </div>

                    {doctorDetails?.notes && doctorDetails.notes !== 'null' && doctorDetails.notes !== 'undefined' && (
                      <div className="md:col-span-2 lg:col-span-3">
                        <span className="text-xs font-semibold text-gray-400 block mb-1">{t('notes')}</span>
                        <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-600">
                          {doctorDetails.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: EMPLOYMENT HISTORY TIMELINE */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        {t('statusHistory')}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {language === 'ar' ? 'سجل كامل للفترات الوظيفية دون حذف السجلات السابقة' : 'Complete chronological history'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedHistory(null);
                        setIsHistoryModalOpen(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t('addStatusPeriod')}</span>
                    </button>
                  </div>

                  {doctorDetails?.employment_history?.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
                      <Clock className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">{language === 'ar' ? 'لا توجد فترات وظيفية مسجلة' : 'No history periods recorded'}</p>
                    </div>
                  ) : (
                    <div className="relative border-r-2 border-indigo-200 dark:border-gray-700 mr-4 rtl:mr-4 rtl:border-r-2 rtl:border-l-0 ltr:border-l-2 ltr:ml-4 ltr:border-r-0 space-y-6 py-2">
                      {doctorDetails?.employment_history?.map((period, idx) => {
                        const isCurrent = !period.end_date || new Date(period.end_date).getTime() >= new Date().getTime();
                        return (
                          <div key={period.id} className="relative pr-6 rtl:pr-6 ltr:pl-6 ltr:pr-0">
                            {/* Dot on timeline */}
                            <span className={`absolute top-1.5 right-[-7px] rtl:right-[-7px] ltr:left-[-7px] w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${
                              isCurrent ? 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950' : 'bg-gray-400'
                            }`} />

                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-600 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                              <div>
                                <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1 flex-wrap gap-1">
                                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${getStatusBadgeColor(period.status_type)}`}>
                                    {period.status_type}
                                  </span>
                                  {period.has_administrative_duty && (
                                    <span className="text-xs bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 px-2 py-0.5 rounded-md font-semibold border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                                      <Briefcase className="w-3 h-3" />
                                      <span>{period.administrative_role || t('administrativeDuty')}</span>
                                      <span className="text-[11px] opacity-80">
                                        ({period.administrative_scope === 'خارج القسم'
                                          ? `${t('outsideDepartment')}${period.administrative_facility ? `: ${period.administrative_facility}` : ''}`
                                          : t('insideDepartment')})
                                      </span>
                                    </span>
                                  )}
                                  {period.deputation_direction && (
                                    <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 px-2 py-0.5 rounded-md font-semibold border border-blue-200 dark:border-blue-800">
                                      {period.deputation_direction}
                                      {period.deputation_facility ? ` (${period.deputation_facility})` : ''}
                                    </span>
                                  )}
                                  {isCurrent && (
                                    <span className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-md font-semibold">
                                      {t('ongoing')}
                                    </span>
                                  )}
                                </div>

                                <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                  <span>{formatDate(period.start_date, language)}</span>
                                  <span>&rarr;</span>
                                  <span>{period.end_date ? formatDate(period.end_date, language) : (language === 'ar' ? 'مستمر حتى الآن' : 'Present')}</span>
                                </p>

                                {period.notes && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {period.notes}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center space-x-2 rtl:space-x-reverse self-end sm:self-center">
                                <button
                                  onClick={() => {
                                    setSelectedHistory(period);
                                    setIsHistoryModalOpen(true);
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                                  title={t('edit')}
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem('doctor_employment_history', period.id, period.status_type)}
                                  className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                                  title={t('delete')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CERTIFICATES & DEGREES */}
              {activeTab === 'certificates' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        {t('certificates')}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {language === 'ar' ? 'الشهادات المنظمة مع التلخيص التلقائي' : 'Structured degrees & certificates'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCert(null);
                        setIsCertModalOpen(true);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t('addCertificate')}</span>
                    </button>
                  </div>

                  {doctorDetails?.certificates?.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
                      <Award className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">{language === 'ar' ? 'لا توجد شهادات مسجلة للطبيب' : 'No certificates recorded'}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right rtl:text-right ltr:text-left">
                        <thead className="bg-slate-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">{t('certificateType')}</th>
                            <th className="px-4 py-3">{t('certificateTitle')}</th>
                            <th className="px-4 py-3">{t('university')}</th>
                            <th className="px-4 py-3">{t('certificateStatus')}</th>
                            <th className="px-4 py-3">{t('startDate')} / {t('obtainedDate')}</th>
                            <th className="px-4 py-3">{t('generatedSummary')}</th>
                            <th className="px-4 py-3 text-center">{t('actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                          {doctorDetails?.certificates?.map((cert) => {
                            const summaryText = getCertificateSummary(cert, language);
                            const isObtained = cert.status === 'obtained';
                            return (
                              <tr key={cert.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors">
                                <td className="px-4 py-3.5 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                  {cert.certificate_type}
                                </td>
                                <td className="px-4 py-3.5 font-bold text-indigo-600 dark:text-indigo-400">
                                  {cert.certificate_title}
                                </td>
                                <td className="px-4 py-3.5 text-gray-800 dark:text-gray-200">
                                  <div className="font-medium">{cert.university_name}</div>
                                  {cert.university_country && (
                                    <span className="text-xs text-gray-400 font-normal">({cert.university_country})</span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap">
                                  {isObtained ? (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 rtl:mr-0 rtl:ml-1 text-emerald-600 dark:text-emerald-400" />
                                      {t('obtained')}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                      <Clock className="w-3.5 h-3.5 mr-1 rtl:mr-0 rtl:ml-1 text-blue-600 dark:text-blue-400" />
                                      {t('inProgress')}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-gray-700 dark:text-gray-200 whitespace-nowrap font-medium font-mono text-xs">
                                  {isObtained ? (
                                    formatCertificateDate(cert.obtained_date, cert.date_mode, language)
                                  ) : (
                                    <span className="space-y-0.5 block">
                                      {cert.study_start_date && (
                                        <span className="block">{language === 'ar' ? 'بدء:' : 'Start:'} {formatCertificateDate(cert.study_start_date, cert.date_mode, language)}</span>
                                      )}
                                      {cert.expected_date && (
                                        <span className="block text-blue-600 dark:text-blue-400">{language === 'ar' ? 'متوقع:' : 'Exp:'} {formatCertificateDate(cert.expected_date, cert.date_mode, language)}</span>
                                      )}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 max-w-sm">
                                  <div className="p-2 bg-slate-100/90 dark:bg-gray-700/80 rounded-xl border border-slate-200 dark:border-gray-600 text-xs font-medium text-slate-800 dark:text-slate-100 shadow-sm leading-relaxed">
                                    "{summaryText}"
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center space-x-1.5 rtl:space-x-reverse">
                                    {cert.file_url && (
                                      <a
                                        href={cert.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors"
                                        title={t('viewFile')}
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                      </a>
                                    )}
                                    <button
                                      onClick={() => {
                                        setSelectedCert(cert);
                                        setIsCertModalOpen(true);
                                      }}
                                      className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                                      title={t('edit')}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteItem('doctor_certificates', cert.id, cert.certificate_title)}
                                      className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                                      title={t('delete')}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: PROMOTIONS & FINANCIAL GRADES */}
              {activeTab === 'promotions' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Technical Promotions Section */}
                  <div className="space-y-3.5 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400 shrink-0" />
                        <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">{t('promotions')}</h3>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPromotion(null);
                          setIsPromotionModalOpen(true);
                        }}
                        className="px-2.5 sm:px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t('addPromotion')}</span>
                      </button>
                    </div>

                    {doctorDetails?.promotions?.length === 0 ? (
                      <div className="text-center py-6 sm:py-8 bg-gray-50 dark:bg-gray-700/30 rounded-xl sm:rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
                        <p className="text-xs text-gray-500">{language === 'ar' ? 'لا توجد ترقيات فنية مسجلة' : 'No promotions'}</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 sm:space-y-3">
                        {doctorDetails?.promotions?.map(p => (
                          <div key={p.id} className="p-3 sm:p-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm truncate">
                                {p.promotion_type}
                              </div>
                              <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {t('promotionDate')}: {formatDate(p.promotion_date, language)}
                              </div>
                              {p.notes && <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 mt-1">{p.notes}</p>}
                            </div>
                            <div className="flex items-center space-x-1 sm:space-x-2 rtl:space-x-reverse shrink-0">
                              {p.document_url && (
                                <a
                                  href={p.document_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 sm:p-1.5 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-950 rounded-lg text-xs"
                                  title={t('viewFile')}
                                >
                                  <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </a>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedPromotion(p);
                                  setIsPromotionModalOpen(true);
                                }}
                                className="p-1 text-gray-500 hover:text-blue-600"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem('doctor_promotions', p.id, p.promotion_type)}
                                className="p-1 text-gray-500 hover:text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Financial Grades Section */}
                  <div className="space-y-3.5 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">{t('financialGrades')}</h3>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedFinancial(null);
                          setIsFinancialModalOpen(true);
                        }}
                        className="px-2.5 sm:px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t('addFinancialGrade')}</span>
                      </button>
                    </div>

                    {doctorDetails?.financial_grades?.length === 0 ? (
                      <div className="text-center py-6 sm:py-8 bg-gray-50 dark:bg-gray-700/30 rounded-xl sm:rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
                        <p className="text-xs text-gray-500">{language === 'ar' ? 'لا توجد درجات مالية مسجلة' : 'No financial grades'}</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 sm:space-y-3">
                        {doctorDetails?.financial_grades?.map(g => {
                          const isCurrent = !g.end_date;
                          return (
                            <div key={g.id} className="p-3 sm:p-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center space-x-1.5 rtl:space-x-reverse flex-wrap">
                                  <span className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm">
                                    {g.financial_grade}
                                  </span>
                                  {isCurrent && (
                                    <span className="text-[9px] sm:text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded-full">
                                      {t('currentStatus')}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {formatDate(g.start_date, language)} &rarr; {g.end_date ? formatDate(g.end_date, language) : t('ongoing')}
                                </div>
                                {g.notes && <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 mt-1">{g.notes}</p>}
                              </div>
                              <div className="flex items-center space-x-1 sm:space-x-2 rtl:space-x-reverse shrink-0">
                                <button
                                  onClick={() => {
                                    setSelectedFinancial(g);
                                    setIsFinancialModalOpen(true);
                                  }}
                                  className="p-1 text-gray-500 hover:text-blue-600"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem('doctor_financial_grades', g.id, g.financial_grade)}
                                  className="p-1 text-gray-500 hover:text-red-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: GENERAL DOCUMENTS */}
              {activeTab === 'documents' && (
                <div className="space-y-4 sm:space-y-6">
                  {/* Upload Box */}
                  <div className="p-3.5 sm:p-5 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-gray-800 dark:to-gray-800 rounded-xl sm:rounded-2xl border border-blue-200 dark:border-gray-700">
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">
                      {language === 'ar' ? 'إضافة وثيقة أو مستند جديد' : 'Upload New Document'}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 items-center">
                      <input
                        type="text"
                        value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                        placeholder={language === 'ar' ? 'مسمى الوثيقة (مثل: بطاقة الرقم القومي، كارنيه النقابة)' : 'Document title (e.g. Syndicate ID)'}
                        className="sm:col-span-2 px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs sm:text-sm text-gray-900 dark:text-white"
                      />
                      <label className="cursor-pointer px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm transition-colors">
                        <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>{uploadingDoc ? t('uploading') : (language === 'ar' ? 'اختر الملف للرفع' : 'Choose File')}</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleUploadGenericDoc}
                          className="hidden"
                          disabled={uploadingDoc}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Documents List */}
                  {doctorDetails?.documents?.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 bg-gray-50 dark:bg-gray-700/30 rounded-xl sm:rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
                      <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs sm:text-sm text-gray-500">{language === 'ar' ? 'لا توجد وثائق أو مستندات مرفوعة' : 'No documents uploaded'}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {doctorDetails?.documents?.map((doc) => (
                        <div key={doc.id} className="p-3.5 sm:p-4 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2.5 rtl:space-x-reverse min-w-0">
                              <div className="p-2 sm:p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                              </div>
                              <div className="min-w-0">
                                <h5 className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm truncate">{doc.title}</h5>
                                <span className="text-[10px] sm:text-[11px] text-gray-400">{formatDate(doc.created_at || null, language)}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteItem('doctor_documents', doc.id, doc.title)}
                              className="text-gray-400 hover:text-red-600 p-1 shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </div>

                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full py-1.5 sm:py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{t('viewFile')}</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sub Modals */}
      {isEditDoctorOpen && doctorDetails && (
        <DoctorFormModal
          isOpen={isEditDoctorOpen}
          onClose={() => setIsEditDoctorOpen(false)}
          onSuccess={(updated) => {
            fetchFullDoctor();
            onDoctorUpdated();
          }}
          doctor={doctorDetails}
        />
      )}

      {isCertModalOpen && (
        <CertificateFormModal
          isOpen={isCertModalOpen}
          onClose={() => setIsCertModalOpen(false)}
          onSuccess={() => {
            fetchFullDoctor();
            onDoctorUpdated();
          }}
          doctorId={doctorId}
          certificate={selectedCert}
          universities={universities}
          certificateTypes={certificateTypes}
          onUniversityAdded={onUniversityAdded}
        />
      )}

      {isHistoryModalOpen && (
        <EmploymentHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          onSuccess={() => {
            fetchFullDoctor();
            onDoctorUpdated();
          }}
          doctorId={doctorId}
          historyRecord={selectedHistory}
          existingHistory={doctorDetails?.employment_history || []}
        />
      )}

      {isPromotionModalOpen && (
        <PromotionModal
          isOpen={isPromotionModalOpen}
          onClose={() => setIsPromotionModalOpen(false)}
          onSuccess={() => {
            fetchFullDoctor();
            onDoctorUpdated();
          }}
          doctorId={doctorId}
          promotion={selectedPromotion}
        />
      )}

      {isFinancialModalOpen && (
        <FinancialGradeModal
          isOpen={isFinancialModalOpen}
          onClose={() => setIsFinancialModalOpen(false)}
          onSuccess={() => {
            fetchFullDoctor();
            onDoctorUpdated();
          }}
          doctorId={doctorId}
          gradeRecord={selectedFinancial}
        />
      )}

      {isExportModalOpen && doctorDetails && (
        <DoctorExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          doctor={doctorDetails}
        />
      )}
    </div>
  );
}
