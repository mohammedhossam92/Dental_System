import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Calendar, Upload, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { DoctorPromotion } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { FlexibleDateInput } from '../common/FlexibleDateInput';
import { AutocompleteInput } from '../common/AutocompleteInput';
import { fetchHistoricalSuggestions } from '../../utils/suggestionUtils';
import { uploadDoctorFile, touchDoctorUpdatedAt } from '../../utils/doctorUtils';
import Swal from 'sweetalert2';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  doctorId: string;
  promotion?: DoctorPromotion | null;
}

const PROMOTION_TYPES = [
  'مساعد أخصائي',
  'أخصائي',
  'أخصائي أول',
  'استشاري مساعد',
  'استشاري',
  'استشاري أول',
  'رئيس قسم',
  'أخرى'
];

export function PromotionModal({
  isOpen,
  onClose,
  onSuccess,
  doctorId,
  promotion
}: PromotionModalProps) {
  const { t, language } = useLanguage();
  const { organizationId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [promotionSuggestions, setPromotionSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchHistoricalSuggestions().then((res) => {
        setPromotionSuggestions(res.promotionTypes);
      });
    }
  }, [isOpen]);

  const [promotionType, setPromotionType] = useState('أخصائي');
  const [customPromotion, setCustomPromotion] = useState('');
  const [promotionDate, setPromotionDate] = useState('');
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (promotion) {
      if (PROMOTION_TYPES.includes(promotion.promotion_type)) {
        setPromotionType(promotion.promotion_type);
        setCustomPromotion('');
      } else {
        setPromotionType('أخرى');
        setCustomPromotion(promotion.promotion_type);
      }
      setPromotionDate(promotion.promotion_date || '');
      setDocumentUrl(promotion.document_url || null);
      setDocumentName(promotion.document_name || null);
      setNotes(promotion.notes || '');
    } else {
      setPromotionType('أخصائي');
      setCustomPromotion('');
      setPromotionDate('');
      setDocumentUrl(null);
      setDocumentName(null);
      setNotes('');
    }
  }, [promotion, isOpen]);

  if (!isOpen) return null;

  const finalType = promotionType === 'أخرى' && customPromotion.trim() ? customPromotion.trim() : promotionType;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      const result = await uploadDoctorFile(file, 'promotions');
      if (result.error && !result.url) {
        throw new Error(result.error);
      }
      setDocumentUrl(result.url);
      setDocumentName(result.fileName || file.name);
    } catch (err: any) {
      console.error('Upload failed:', err);
      Swal.fire({
        icon: 'error',
        title: t('error'),
        text: err.message || 'فشل رفع المستند',
        confirmButtonColor: '#4f46e5'
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const payload = {
        doctor_id: doctorId,
        organization_id: organizationId || null,
        promotion_type: finalType,
        promotion_date: promotionDate ? promotionDate.trim() : null,
        document_url: documentUrl,
        document_name: documentName,
        notes: notes.trim() || null
      };

      if (promotion?.id) {
        const { error } = await supabase
          .from('doctor_promotions')
          .update(payload)
          .eq('id', promotion.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('doctor_promotions')
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
      console.error('Error saving promotion:', err);
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
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[96vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-800 shrink-0">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <div className="p-1.5 sm:p-2 bg-purple-600 rounded-lg sm:rounded-xl text-white">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
              {promotion ? t('edit') : t('addPromotion')}
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
          {/* Promotion Type */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('promotionType')} <span className="text-red-500">*</span>
            </label>
            <select
              value={promotionType}
              onChange={(e) => setPromotionType(e.target.value)}
              className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            >
              {PROMOTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {promotionType === 'أخرى' && (
            <div>
              <AutocompleteInput
                label={language === 'ar' ? 'حدد نوع الترقية' : 'Specify Type'}
                required
                value={customPromotion}
                onChange={setCustomPromotion}
                options={promotionSuggestions}
                placeholder={language === 'ar' ? 'مثال: استشاري دقيق' : 'e.g. Sub-specialist consultant'}
                accentColor="purple"
              />
            </div>
          )}

          {/* Promotion Date */}
          <FlexibleDateInput
            label={t('promotionDate')}
            required={false}
            value={promotionDate}
            onChange={(val) => setPromotionDate(val)}
            minYear={1970}
            maxYear={new Date().getFullYear() + 2}
            accentColor="purple"
          />

          {/* Document Attachment */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {language === 'ar' ? 'المستند المرفق (قرار الترقية)' : 'Attachment Document'}
            </label>
            <div className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse">
              <label className="flex-1 cursor-pointer flex items-center justify-center px-3.5 sm:px-4 py-2 sm:py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-purple-500 dark:hover:border-purple-400 bg-gray-50 dark:bg-gray-700/50 hover:bg-purple-50/50 transition-colors">
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 rtl:mr-0 rtl:ml-1.5 text-gray-500 shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                  {uploadingFile ? t('uploading') : (documentName || t('uploadFile'))}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingFile}
                />
              </label>
              {documentUrl && (
                <a
                  href={documentUrl}
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

          {/* Notes */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('notes')}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === 'ar' ? 'ملاحظات حول الترقية...' : 'Notes...'}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-purple-500"
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
              disabled={loading || uploadingFile}
              className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-semibold flex items-center space-x-1.5 sm:space-x-2 rtl:space-x-reverse shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{promotion ? t('saveChanges') : t('save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
