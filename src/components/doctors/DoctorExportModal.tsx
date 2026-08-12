import React, { useState, useEffect, useRef } from 'react';
import {
  X, Download, Copy, Printer, FileSpreadsheet, FileText, Image as ImageIcon,
  Check, RefreshCw, Eye, Sparkles, ShieldCheck, Share2
} from 'lucide-react';
import type { DoctorWithDetails } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import {
  generateDoctorCardCanvas,
  exportDoctorAsImage,
  copyDoctorCardImageToClipboard,
  exportDoctorAsExcel,
  exportDoctorAsText,
  copyDoctorTextToClipboard,
  printDoctorCard,
  generateDoctorTextDossier
} from '../../utils/doctorExportUtils';

interface DoctorExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: DoctorWithDetails | null;
}

type ExportTab = 'card' | 'excel' | 'text';

export function DoctorExportModal({ isOpen, onClose, doctor }: DoctorExportModalProps) {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<ExportTab>('card');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState<boolean>(true);
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Generate image preview whenever doctor or language changes
  useEffect(() => {
    if (isOpen && doctor) {
      setGenerating(true);
      // Small timeout to allow font rendering / DOM stabilization
      const timer = setTimeout(() => {
        try {
          const canvas = generateDoctorCardCanvas(doctor, language);
          setPreviewDataUrl(canvas.toDataURL('image/png'));
        } catch (err) {
          console.error('Failed to generate card preview:', err);
        } finally {
          setGenerating(false);
        }
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setPreviewDataUrl(null);
    }
  }, [isOpen, doctor, language]);

  if (!isOpen || !doctor) return null;

  const handleCopyImage = async () => {
    const success = await copyDoctorCardImageToClipboard(doctor, language);
    if (success) {
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2000);
    }
  };

  const handleCopyText = async () => {
    const success = await copyDoctorTextToClipboard(doctor, language);
    if (success) {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-1.5 sm:p-3 md:p-4">
      <div className="bg-white dark:bg-gray-850 dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[96vh] sm:max-h-[94vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-slate-50/50 dark:from-gray-900/60 dark:to-gray-800/60 gap-2">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white shadow-sm shrink-0">
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-1.5 sm:gap-2 truncate">
                <span className="truncate">{isAr ? 'تصدير ملف وسجل الطبيب' : 'Export Doctor Dossier'}</span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800 truncate max-w-[140px] sm:max-w-none">
                  {doctor.name}
                </span>
              </h2>
              <p className="text-[10.5px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 hidden xs:block sm:block">
                {isAr
                  ? 'اختر الصيغة المناسبة لتصدير بيانات وسجل الطبيب (صورة بطاقة، ملف Excel، أو ملف نصي)'
                  : 'Choose the format to export doctor data (Image Card, Excel workbook, or Text dossier)'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-3 sm:px-6 bg-slate-50/60 dark:bg-gray-900/40 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('card')}
            className={`flex items-center space-x-1.5 rtl:space-x-reverse py-2.5 sm:py-3 px-2.5 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'card'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 bg-white dark:bg-gray-800 shadow-sm'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{isAr ? 'بطاقة الطبيب (صورة PNG)' : 'Doctor Card (Image PNG)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('excel')}
            className={`flex items-center space-x-1.5 rtl:space-x-reverse py-2.5 sm:py-3 px-2.5 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'excel'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400 bg-white dark:bg-gray-800 shadow-sm'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{isAr ? 'ملف Excel مفصل (.xlsx)' : 'Excel Dossier (.xlsx)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center space-x-1.5 rtl:space-x-reverse py-2.5 sm:py-3 px-2.5 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'text'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 bg-white dark:bg-gray-800 shadow-sm'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{isAr ? 'ملف نصي (.txt / نسخ)' : 'Text Dossier (.txt)'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3 sm:p-5 md:p-6 overflow-y-auto flex-1 bg-slate-50/30 dark:bg-gray-900/20">
          
          {/* TAB 1: IMAGE CARD PREVIEW */}
          {activeTab === 'card' && (
            <div className="space-y-4 sm:space-y-5">
              {/* Quick Actions Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white dark:bg-gray-800 p-2.5 sm:p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
                  <span className="truncate">{isAr ? 'بطاقة عالية الدقة Retina 2x جاهزة للمشاركة' : 'High-DPI 2x Retina card ready for sharing'}</span>
                </div>

                <div className="flex items-center space-x-1.5 rtl:space-x-reverse flex-wrap gap-1.5 sm:gap-2 justify-end">
                  <button
                    onClick={() => exportDoctorAsImage(doctor, language)}
                    className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{isAr ? 'تحميل PNG' : 'Download PNG'}</span>
                  </button>

                  <button
                    onClick={handleCopyImage}
                    className="px-2.5 sm:px-3.5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all"
                    title={isAr ? 'نسخ الصورة للحافظة' : 'Copy Image to Clipboard'}
                  >
                    {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedImage ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ' : 'Copy')}</span>
                  </button>

                  <button
                    onClick={() => printDoctorCard(doctor, language)}
                    className="px-2.5 sm:px-3.5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all"
                    title={isAr ? 'طباعة البطاقة' : 'Print Card'}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{isAr ? 'طباعة' : 'Print'}</span>
                  </button>
                </div>
              </div>

              {/* Visual Card Preview Container */}
              <div className="flex justify-center p-2 sm:p-4 bg-slate-900/5 dark:bg-black/30 rounded-xl sm:rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 overflow-hidden">
                {generating ? (
                  <div className="py-16 sm:py-20 flex flex-col items-center justify-center space-y-3 text-gray-500">
                    <RefreshCw className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600 animate-spin" />
                    <span className="text-xs font-semibold">{isAr ? 'جاري تجهيز بطاقة الطبيب بدقة عالية...' : 'Generating high-res doctor card...'}</span>
                  </div>
                ) : previewDataUrl ? (
                  <div className="max-w-xl w-full rounded-xl sm:rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-all hover:shadow-2xl">
                    <img
                      src={previewDataUrl}
                      alt={doctor.name}
                      className="w-full h-auto object-contain block"
                    />
                  </div>
                ) : (
                  <div className="py-16 text-center text-xs text-gray-400">
                    {isAr ? 'فشل عرض المعاينة' : 'Preview generation failed'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EXCEL DOSSIER */}
          {activeTab === 'excel' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3 sm:space-y-4">
                <div className="flex items-start space-x-3 sm:space-x-4 rtl:space-x-reverse">
                  <div className="p-2.5 sm:p-3.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl sm:rounded-2xl text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                    <FileSpreadsheet className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                      {isAr ? 'تصدير ملف إكسيل مخصص للطبيب' : 'Custom Doctor Excel Workbook (.xlsx)'}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xl leading-relaxed">
                      {isAr
                        ? 'يحتوي ملف الإكسيل على 4 صفحات عمل منسقة ومفصلة: البيانات الشخصية والأساسية، الشهادات والدرجات العلمية والجامعات، السجل الوظيفي وتكليفات الإدارة والانتداب، والترقيات والدرجات المالية.'
                        : 'The Excel workbook includes 4 well-structured sheets: Basic & Personal Info, Academic Degrees & Universities, Employment Timeline & Admin Roles, and Promotions & Financial Grades.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-2">
                  <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600 text-xs space-y-1">
                    <span className="font-bold text-gray-800 dark:text-gray-200 block">📊 {isAr ? 'صفحة 1: البيانات الأساسية' : 'Sheet 1: Basic Profile'}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-[11px] sm:text-xs">{isAr ? 'الرقم القومي، الهاتف، الحالة الحالية، المنصب الإداري، الدرجة المالية' : 'National ID, phone, address, status, admin role'}</span>
                  </div>

                  <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600 text-xs space-y-1">
                    <span className="font-bold text-gray-800 dark:text-gray-200 block">🎓 {isAr ? 'صفحة 2: الشهادات العلمية' : 'Sheet 2: Academic Degrees'}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-[11px] sm:text-xs">{isAr ? `${doctor.certificates?.length || 0} شهادة مسجلة مع الجامعة والتواريخ والحالة` : `${doctor.certificates?.length || 0} registered degrees with university & dates`}</span>
                  </div>

                  <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600 text-xs space-y-1">
                    <span className="font-bold text-gray-800 dark:text-gray-200 block">💼 {isAr ? 'صفحة 3: السجل الوظيفي' : 'Sheet 3: Employment History'}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-[11px] sm:text-xs">{isAr ? `${doctor.employment_history?.length || 0} فترات وظيفية وانتدابات وتكليفات إدارية` : `${doctor.employment_history?.length || 0} employment periods & admin duty timeline`}</span>
                  </div>

                  <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600 text-xs space-y-1">
                    <span className="font-bold text-gray-800 dark:text-gray-200 block">⭐ {isAr ? 'صفحة 4: الترقيات والدرجات المالية' : 'Sheet 4: Promotions & Grades'}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-[11px] sm:text-xs">{isAr ? 'سجل التدرج في الدرجات المالية والترقيات الفنية' : 'Record of technical promotions and financial grades'}</span>
                  </div>
                </div>

                <div className="pt-3 sm:pt-4 flex justify-end">
                  <button
                    onClick={() => exportDoctorAsExcel(doctor, language)}
                    className="w-full sm:w-auto px-5 sm:px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isAr ? 'تحميل ملف Excel (.xlsx)' : 'Download Excel (.xlsx)'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TEXT DOSSIER */}
          {activeTab === 'text' && (
            <div className="space-y-4 sm:space-y-5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white dark:bg-gray-800 p-2.5 sm:p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                  {isAr ? 'تقرير نصي شامل بصيغة UTF-8 متوافق مع كافة برامج النصوص' : 'Comprehensive UTF-8 plain text report for text editors & notes'}
                </span>

                <div className="flex items-center space-x-1.5 sm:space-x-2 rtl:space-x-reverse justify-end">
                  <button
                    onClick={handleCopyText}
                    className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ النص' : 'Copy Text')}</span>
                  </button>

                  <button
                    onClick={() => exportDoctorAsText(doctor, language)}
                    className="px-3.5 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{isAr ? 'تحميل .txt' : 'Download .txt'}</span>
                  </button>
                </div>
              </div>

              {/* Text Preview Box */}
              <div className="bg-slate-900 text-slate-100 p-3.5 sm:p-4 rounded-xl font-mono text-[11px] sm:text-xs overflow-x-auto max-h-[300px] sm:max-h-[380px] leading-relaxed shadow-inner border border-slate-800 select-all">
                <pre className="whitespace-pre-wrap font-mono">
                  {generateDoctorTextDossier(doctor, language)}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex items-center justify-between text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
          <span className="truncate max-w-[200px] sm:max-w-none">
            {isAr ? 'سجل الطبيب: ' : 'Doctor Dossier: '}
            <strong className="text-gray-700 dark:text-gray-200">{doctor.name}</strong>
          </span>

          <button
            onClick={onClose}
            className="px-3.5 sm:px-4 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold transition-colors"
          >
            {t('cancel')}
          </button>
        </div>

      </div>
    </div>
  );
}
