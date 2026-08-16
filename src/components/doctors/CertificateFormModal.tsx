import React, { useState, useEffect } from 'react';
import { X, Award, Upload, FileText, Building, CheckCircle2, Clock, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { DoctorCertificate, University, CertificateType } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getCertificateSummary, uploadDoctorFile, touchDoctorUpdatedAt } from '../../utils/doctorUtils';
import { FlexibleDateInput } from '../common/FlexibleDateInput';
import { AutocompleteInput } from '../common/AutocompleteInput';
import { fetchHistoricalSuggestions } from '../../utils/suggestionUtils';
import Swal from 'sweetalert2';

interface CertificateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  doctorId: string;
  certificate?: DoctorCertificate | null;
  universities: University[];
  certificateTypes: CertificateType[];
  onUniversityAdded?: (univ: University) => void;
}

const DEFAULT_TYPES = [
  'بكالوريوس',
  'دبلوم',
  'دبلومة',
  'ماجستير',
  'دكتوراه',
  'زمالة',
  'شهادة مهنية',
  'دورة تدريبية',
  'أخرى'
];

const DEFAULT_COUNTRIES = [
  'مصر',
  'السعودية',
  'الإمارات',
  'الكويت',
  'الأردن',
  'سوريا',
  'العراق',
  'السودان',
  'المملكة المتحدة',
  'الولايات المتحدة الأمريكية',
  'ألمانيا',
  'كندا',
  'أخرى'
];

export function CertificateFormModal({
  isOpen,
  onClose,
  onSuccess,
  doctorId,
  certificate,
  universities,
  certificateTypes,
  onUniversityAdded
}: CertificateFormModalProps) {
  const { t, language } = useLanguage();
  const { organizationId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [univSuggestions, setUnivSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchHistoricalSuggestions().then((res) => {
        setTitleSuggestions(res.certificateTitles);
        setUnivSuggestions(res.universities);
      });
    }
  }, [isOpen]);

  // Form State
  const [certificateType, setCertificateType] = useState('ماجستير');
  const [customType, setCustomType] = useState('');
  const [certificateTitle, setCertificateTitle] = useState('');
  
  // University & Country State (Completely Optional / Nullable)
  const [universityName, setUniversityName] = useState('');
  const [universityCountry, setUniversityCountry] = useState('مصر');

  // Status & Date States
  const [status, setStatus] = useState<'obtained' | 'in_progress'>('obtained');
  const [obtainedDate, setObtainedDate] = useState('');
  const [studyStartDate, setStudyStartDate] = useState('');
  const [expectedDate, setExpectedDate] = useState('');

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // List of all certificate types (database + defaults)
  const allTypes = Array.from(
    new Set([...certificateTypes.map(c => c.name), ...DEFAULT_TYPES])
  );

  useEffect(() => {
    if (certificate) {
      setCertificateType(certificate.certificate_type || 'ماجستير');
      setCertificateTitle(certificate.certificate_title || '');
      setUniversityName(certificate.university_name || '');
      setUniversityCountry(certificate.university_country || 'مصر');

      setStatus(certificate.status || 'obtained');
      setObtainedDate(certificate.obtained_date || '');
      setStudyStartDate(certificate.study_start_date || '');
      setExpectedDate(certificate.expected_date || '');

      setFileUrl(certificate.file_url || null);
      setFileName(certificate.file_name || null);
      setNotes(certificate.notes || '');
    } else {
      // Default reset
      setCertificateType(allTypes[0] || 'ماجستير');
      setCustomType('');
      setCertificateTitle('');
      setUniversityName('');
      setUniversityCountry('مصر');
      setStatus('obtained');

      setObtainedDate('');
      setStudyStartDate('');
      setExpectedDate('');

      setFileUrl(null);
      setFileName(null);
      setNotes('');
    }
  }, [certificate, isOpen]);

  if (!isOpen) return null;

  // Compute final values
  const finalType = certificateType === 'أخرى' && customType.trim() ? customType.trim() : certificateType;
  const finalUnivName = universityName.trim() || null;
  const finalCountry = finalUnivName ? (universityCountry.trim() || 'مصر') : null;

  // Live Generated Display Text
  const liveSummary = getCertificateSummary({
    certificate_type: finalType || (language === 'ar' ? 'نوع الشهادة' : 'Degree'),
    certificate_title: certificateTitle || (language === 'ar' ? 'مسمى الشهادة' : 'Major'),
    university_name: finalUnivName || '',
    university_country: finalCountry || '',
    status,
    obtained_date: obtainedDate,
    study_start_date: studyStartDate,
    expected_date: expectedDate,
  }, language);

  const handleUniversitySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') {
      setIsCustomUniversity(true);
      setSelectedUniversity('custom');
    } else {
      setIsCustomUniversity(false);
      setSelectedUniversity(val);
      const found = universities.find(u => u.name === val);
      if (found?.country) {
        setUniversityCountry(found.country);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      const result = await uploadDoctorFile(file, 'certificates');
      if (result.error && !result.url) {
        throw new Error(result.error);
      }
      setFileUrl(result.url);
      setFileName(result.fileName || file.name);
    } catch (err: any) {
      console.error('Upload failed:', err);
      Swal.fire({
        icon: 'error',
        title: t('error'),
        text: err.message || 'فشل رفع الملف',
        confirmButtonColor: '#4f46e5'
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!finalType) {
      Swal.fire({ icon: 'warning', title: 'تنبيه', text: 'يرجى تحديد نوع الشهادة', confirmButtonColor: '#4f46e5' });
      return;
    }
    try {
      setLoading(true);

      // If user typed a university, check if known or persist
      let matchedUnivId: string | null = null;
      if (finalUnivName) {
        const found = universities.find(u => u.name.toLowerCase() === finalUnivName.toLowerCase());
        if (found) {
          matchedUnivId = found.id;
        } else {
          try {
            const { data: newUniv } = await supabase
              .from('universities')
              .upsert([{
                name: finalUnivName,
                country: finalCountry || 'مصر',
                organization_id: organizationId || null
              }], { onConflict: 'name, country, organization_id' })
              .select()
              .single();

            if (newUniv) {
              matchedUnivId = newUniv.id;
              if (onUniversityAdded) onUniversityAdded(newUniv);
            }
          } catch (uErr) {
            console.warn('Auto insert university caught:', uErr);
          }
        }
      }

      const getDateMode = (d: string | null | undefined): 'year' | 'month' | 'full' => {
        if (!d) return 'month';
        const p = d.trim().split('-');
        if (p.length === 1) return 'year';
        if (p.length === 2) return 'month';
        return 'full';
      };

      const finalObtainedDate = status === 'obtained' ? (obtainedDate ? obtainedDate.trim() : null) : null;
      const finalStudyStartDate = status === 'in_progress' ? (studyStartDate ? studyStartDate.trim() : null) : null;
      const finalExpectedDate = status === 'in_progress' ? (expectedDate ? expectedDate.trim() : null) : null;
      const dateMode = getDateMode(finalObtainedDate || finalExpectedDate || finalStudyStartDate);

      const payload = {
        doctor_id: doctorId,
        organization_id: organizationId || null,
        certificate_type: finalType,
        certificate_title: certificateTitle.trim(),
        university_name: finalUnivName,
        university_country: finalCountry || 'مصر',
        university_id: matchedUnivId,
        status,
        date_mode: dateMode,
        obtained_date: finalObtainedDate,
        study_start_date: finalStudyStartDate,
        expected_date: finalExpectedDate,
        file_url: fileUrl,
        file_name: fileName,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString()
      };

      if (certificate?.id) {
        const { error } = await supabase
          .from('doctor_certificates')
          .update(payload)
          .eq('id', certificate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('doctor_certificates')
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
      console.error('Error saving certificate:', err);
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
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-800 shrink-0">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <div className="p-1.5 sm:p-2 bg-emerald-600 rounded-lg sm:rounded-xl text-white">
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
              {certificate ? t('editCertificate') : t('addCertificate')}
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
          
          {/* Certificate Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('certificateType')} <span className="text-red-500">*</span>
              </label>
              <select
                value={certificateType}
                onChange={(e) => setCertificateType(e.target.value)}
                className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              >
                {allTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {certificateType === 'أخرى' && (
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'ar' ? 'حدد نوع الشهادة' : 'Specify Type'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: زمالة الكلية الملكية' : 'e.g. Royal Fellowship'}
                  className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            )}

            {/* Certificate Title / Major with Autocomplete */}
            <div className={certificateType === 'أخرى' ? 'sm:col-span-2' : ''}>
              <AutocompleteInput
                label={t('certificateTitle')}
                required
                value={certificateTitle}
                onChange={setCertificateTitle}
                options={titleSuggestions}
                placeholder={language === 'ar' ? 'مثال: جراحة الوجه والفكين / علاج الجذور' : 'e.g. Maxillofacial Surgery'}
                accentColor="emerald"
              />
            </div>
          </div>

          {/* University & Country (Completely Optional with Autocomplete) */}
          <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 space-y-2.5 sm:space-y-3">
            <div className="flex items-center space-x-1.5 sm:space-x-2 rtl:space-x-reverse text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">
              <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{language === 'ar' ? 'الجامعة / الجهة المانحة (اختياري)' : 'University / Granting Body (Optional)'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {/* University with Autocomplete */}
              <div className={universityName.trim() ? '' : 'sm:col-span-2'}>
                <AutocompleteInput
                  label={language === 'ar' ? 'اسم الجامعة أو الجهة المانحة' : 'University / Granting Body'}
                  value={universityName}
                  onChange={(val) => {
                    setUniversityName(val);
                    const found = universities.find(u => u.name.toLowerCase() === val.toLowerCase().trim());
                    if (found?.country) {
                      setUniversityCountry(found.country);
                    }
                  }}
                  options={univSuggestions}
                  placeholder={language === 'ar' ? 'اختر من المقترحات أو اكتب اسم الجامعة (أو اتركها فارغة)...' : 'Type or select university (or leave blank)...'}
                  accentColor="emerald"
                  helperText={language === 'ar' ? 'اختياري: يمكنك تركها فارغة والتعديل لاحقاً عند التأكد' : 'Optional: can be left empty'}
                />
              </div>

              {/* Country Selection (shown when university is entered) */}
              {universityName.trim() && (
                <div className="animate-in fade-in duration-150">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('universityCountry')}
                  </label>
                  <select
                    value={universityCountry}
                    onChange={(e) => setUniversityCountry(e.target.value)}
                    className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    {DEFAULT_COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Certificate Status Radio */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('certificateStatus')} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <label
                onClick={() => setStatus('obtained')}
                className={`flex items-center justify-center p-2.5 sm:p-3 rounded-xl border-2 cursor-pointer transition-all text-xs sm:text-sm ${
                  status === 'obtained'
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 font-bold'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 sm:w-5 sm:h-5 mr-1.5 rtl:mr-0 rtl:ml-1.5 ${status === 'obtained' ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span>{t('obtained')}</span>
              </label>

              <label
                onClick={() => setStatus('in_progress')}
                className={`flex items-center justify-center p-2.5 sm:p-3 rounded-xl border-2 cursor-pointer transition-all text-xs sm:text-sm ${
                  status === 'in_progress'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-300 font-bold'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Clock className={`w-4 h-4 sm:w-5 sm:h-5 mr-1.5 rtl:mr-0 rtl:ml-1.5 ${status === 'in_progress' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span>{t('inProgress')}</span>
              </label>
            </div>
          </div>

          {/* Flexible Date Fields */}
          {status === 'obtained' ? (
            <FlexibleDateInput
              label={t('obtainedDate')}
              required={false}
              value={obtainedDate}
              onChange={(val) => setObtainedDate(val)}
              minYear={1960}
              maxYear={new Date().getFullYear() + 1}
              accentColor="emerald"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <FlexibleDateInput
                label={t('studyStartDate')}
                value={studyStartDate}
                onChange={(val) => setStudyStartDate(val)}
                minYear={1970}
                maxYear={new Date().getFullYear() + 2}
                accentColor="blue"
              />

              <FlexibleDateInput
                label={`${t('expectedDate')} (${language === 'ar' ? 'اختياري' : 'Optional'})`}
                value={expectedDate}
                onChange={(val) => setExpectedDate(val)}
                minYear={new Date().getFullYear() - 1}
                maxYear={new Date().getFullYear() + 10}
                accentColor="blue"
              />
            </div>
          )}

          {/* Certificate File Upload */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('certificateFile')}
            </label>
            <div className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse">
              <label className="flex-1 cursor-pointer flex items-center justify-center px-3.5 sm:px-4 py-2 sm:py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-emerald-500 dark:hover:border-emerald-400 bg-gray-50 dark:bg-gray-700/50 hover:bg-emerald-50/50 transition-colors">
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 rtl:mr-0 rtl:ml-1.5 text-gray-500 shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                  {uploadingFile ? t('uploading') : (fileName || t('uploadFile'))}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingFile}
                />
              </label>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 sm:py-2.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-xl text-xs font-semibold flex items-center transition-colors shrink-0"
                >
                  <FileText className="w-3.5 h-3.5 mr-1 rtl:mr-0 rtl:ml-1" />
                  <span>{t('viewFile')}</span>
                </a>
              )}
            </div>
          </div>

          {/* Live Generated Summary Box with High Contrast */}
          <div className="p-3 sm:p-4 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl sm:rounded-2xl border border-emerald-200 dark:border-emerald-800/80 shadow-sm space-y-1 sm:space-y-1.5">
            <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-[11px] sm:text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{t('generatedSummary')}:</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-relaxed">
              {liveSummary || '...'}
            </p>
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
              disabled={loading || uploadingFile}
              className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold flex items-center space-x-1.5 sm:space-x-2 rtl:space-x-reverse shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{certificate ? t('saveChanges') : t('save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
