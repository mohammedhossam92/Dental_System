import React, { useState, useRef, useEffect } from 'react';
import {
  Download, FileSpreadsheet, FileText, Image as ImageIcon,
  Copy, ChevronDown, Sparkles, Share2
} from 'lucide-react';
import type { DoctorWithDetails } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import {
  exportDoctorAsImage,
  exportDoctorAsExcel,
  exportDoctorAsText,
  copyDoctorTextToClipboard
} from '../../utils/doctorExportUtils';

interface DoctorExportDropdownProps {
  doctor: DoctorWithDetails;
  onOpenPreviewModal?: () => void;
  variant?: 'icon' | 'button';
  size?: 'sm' | 'md';
}

export function DoctorExportDropdown({
  doctor,
  onOpenPreviewModal,
  variant = 'icon',
  size = 'md'
}: DoctorExportDropdownProps) {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-right rtl:text-right ltr:text-left" ref={dropdownRef}>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(prev => !prev);
          }}
          className={`p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-950/50 rounded-xl transition-all ${
            isOpen ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20' : ''
          }`}
          title={isAr ? 'تصدير بيانات وبطاقة الطبيب' : 'Export Doctor Dossier'}
        >
          <Download className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(prev => !prev);
          }}
          className={`px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all ${
            isOpen ? 'ring-2 ring-indigo-500/20 border-indigo-500 text-indigo-600 dark:text-indigo-400' : ''
          }`}
        >
          <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>{isAr ? 'تصدير الملف' : 'Export Profile'}</span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>
      )}

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 mt-1.5 w-60 rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 py-2 ltr:right-0 rtl:left-0 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-700/60 mb-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              {isAr ? 'تصدير ملف الطبيب' : 'Export Doctor Data'}
            </span>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate block">
              {doctor.name}
            </span>
          </div>

          {/* Option 1: Card Preview & Image */}
          {onOpenPreviewModal ? (
            <button
              onClick={(e) => handleAction(e, onOpenPreviewModal)}
              className="w-full px-3.5 py-2.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-300 flex items-center gap-2.5 font-medium transition-colors text-right rtl:text-right ltr:text-left"
            >
              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <ImageIcon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">{isAr ? 'معاينة وبطاقة الطبيب (صورة)' : 'Doctor Card (Image Preview)'}</div>
                <div className="text-[10px] text-gray-400">{isAr ? 'عرض بطاقة ملونة PNG عالية الدقة' : 'High-res printable PNG card'}</div>
              </div>
            </button>
          ) : (
            <button
              onClick={(e) => handleAction(e, () => exportDoctorAsImage(doctor, language))}
              className="w-full px-3.5 py-2.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-300 flex items-center gap-2.5 font-medium transition-colors text-right rtl:text-right ltr:text-left"
            >
              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <ImageIcon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">{isAr ? 'تحميل بطاقة الطبيب (PNG)' : 'Download Doctor Card (PNG)'}</div>
                <div className="text-[10px] text-gray-400">{isAr ? 'صورة ملونة عالية الدقة' : 'High-res image'}</div>
              </div>
            </button>
          )}

          {/* Option 2: Excel Workbook */}
          <button
            onClick={(e) => handleAction(e, () => exportDoctorAsExcel(doctor, language))}
            className="w-full px-3.5 py-2.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-300 flex items-center gap-2.5 font-medium transition-colors text-right rtl:text-right ltr:text-left"
          >
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">{isAr ? 'تصدير ملف Excel (.xlsx)' : 'Export Excel (.xlsx)'}</div>
              <div className="text-[10px] text-gray-400">{isAr ? 'شامل الشهادات والسجل والترقيات' : 'Multi-sheet workbook'}</div>
            </div>
          </button>

          {/* Option 3: Text File */}
          <button
            onClick={(e) => handleAction(e, () => exportDoctorAsText(doctor, language))}
            className="w-full px-3.5 py-2.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-300 flex items-center gap-2.5 font-medium transition-colors text-right rtl:text-right ltr:text-left"
          >
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">{isAr ? 'تصدير ملف نصي (.txt)' : 'Export Text (.txt)'}</div>
              <div className="text-[10px] text-gray-400">{isAr ? 'ملف نصي منسق UTF-8' : 'Plain text dossier'}</div>
            </div>
          </button>

          {/* Option 4: Copy to Clipboard */}
          <div className="pt-1 border-t border-gray-100 dark:border-gray-700/60 mt-1">
            <button
              onClick={(e) => handleAction(e, () => copyDoctorTextToClipboard(doctor, language))}
              className="w-full px-3.5 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 font-medium transition-colors text-right rtl:text-right ltr:text-left"
            >
              <Copy className="w-3.5 h-3.5 text-gray-400" />
              <span>{isAr ? 'نسخ النص للحافظة' : 'Copy Text to Clipboard'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
