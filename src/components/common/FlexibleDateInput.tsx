import React, { useState, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export type DateInputMode = 'year' | 'month' | 'full';

export interface FlexibleDateInputProps {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  required?: boolean;
  minYear?: number;
  maxYear?: number;
  accentColor?: 'emerald' | 'blue' | 'indigo' | 'purple' | 'amber';
  helperText?: string;
  className?: string;
}

const MONTHS = [
  { value: '01', labelAr: '01 - يناير', labelEn: '01 - January' },
  { value: '02', labelAr: '02 - فبراير', labelEn: '02 - February' },
  { value: '03', labelAr: '03 - مارس', labelEn: '03 - March' },
  { value: '04', labelAr: '04 - أبريل', labelEn: '04 - April' },
  { value: '05', labelAr: '05 - مايو', labelEn: '05 - May' },
  { value: '06', labelAr: '06 - يونيو', labelEn: '06 - June' },
  { value: '07', labelAr: '07 - يوليو', labelEn: '07 - July' },
  { value: '08', labelAr: '08 - أغسطس', labelEn: '08 - August' },
  { value: '09', labelAr: '09 - سبتمبر', labelEn: '09 - September' },
  { value: '10', labelAr: '10 - أكتوبر', labelEn: '10 - October' },
  { value: '11', labelAr: '11 - نوفمبر', labelEn: '11 - November' },
  { value: '12', labelAr: '12 - ديسمبر', labelEn: '12 - December' }
];

export function FlexibleDateInput({
  label,
  value,
  onChange,
  required = false,
  minYear = 1940,
  maxYear = new Date().getFullYear() + 10,
  accentColor = 'indigo',
  helperText,
  className = ''
}: FlexibleDateInputProps) {
  const { language } = useLanguage();
  const currentYear = new Date().getFullYear();

  // Mode: 'year' (سنة فقط) vs 'month' (شهر وسنة) vs 'full' (يوم وشهر وسنة)
  const [mode, setMode] = useState<DateInputMode>('month');

  // Internal states
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [fullDateValue, setFullDateValue] = useState<string>('');

  // Generate Year options
  const yearsList = React.useMemo(() => {
    const list: string[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      list.push(String(y));
    }
    return list;
  }, [minYear, maxYear]);

  // Sync internal state when value prop changes
  useEffect(() => {
    if (value && value.trim()) {
      const trimmed = value.trim();
      const parts = trimmed.split('-');

      if (parts.length === 1) {
        // Year only e.g. "2024"
        setMode('year');
        setSelectedYear(parts[0]);
        setSelectedMonth('');
        setFullDateValue('');
      } else if (parts.length === 2) {
        // Month and Year e.g. "2024-08"
        setMode('month');
        setSelectedYear(parts[0]);
        setSelectedMonth(parts[1].padStart(2, '0'));
        setFullDateValue('');
      } else if (parts.length >= 3) {
        // Full date e.g. "2024-08-15"
        setMode('full');
        setSelectedYear(parts[0]);
        setSelectedMonth(parts[1].padStart(2, '0'));
        setFullDateValue(trimmed);
      }
    } else {
      // Empty / Null by default
      setSelectedYear('');
      setSelectedMonth('');
      setFullDateValue('');
    }
  }, [value]);

  // Clear date to null/empty
  const handleClear = () => {
    setSelectedYear('');
    setSelectedMonth('');
    setFullDateValue('');
    onChange('');
  };

  // When changing year in Year Only mode
  const handleYearOnlyChange = (y: string) => {
    setSelectedYear(y);
    onChange(y ? y : '');
  };

  // When changing month in Month & Year mode
  const handleMonthChange = (m: string) => {
    setSelectedMonth(m);
    const yr = selectedYear || String(currentYear);
    if (!selectedYear) setSelectedYear(yr);
    if (m && yr) {
      onChange(`${yr}-${m}`);
    } else {
      onChange('');
    }
  };

  // When changing year in Month & Year mode
  const handleMonthYearChange = (y: string) => {
    setSelectedYear(y);
    const mo = selectedMonth || '01';
    if (!selectedMonth) setSelectedMonth(mo);
    if (y && mo) {
      onChange(`${y}-${mo}`);
    } else {
      onChange('');
    }
  };

  // When changing full date input
  const handleFullDateChange = (val: string) => {
    setFullDateValue(val);
    if (val) {
      const parts = val.split('-');
      if (parts[0]) setSelectedYear(parts[0]);
      if (parts[1]) setSelectedMonth(parts[1].padStart(2, '0'));
    }
    onChange(val);
  };

  // Switch to Year mode
  const handleSwitchToYear = () => {
    setMode('year');
    const yr = selectedYear || (fullDateValue ? fullDateValue.split('-')[0] : '');
    if (yr) {
      setSelectedYear(yr);
      onChange(yr);
    }
  };

  // Switch to Month mode
  const handleSwitchToMonth = () => {
    setMode('month');
    const yr = selectedYear || (fullDateValue ? fullDateValue.split('-')[0] : '');
    const mo = selectedMonth || (fullDateValue && fullDateValue.split('-')[1] ? fullDateValue.split('-')[1] : '');
    if (yr && mo) {
      setSelectedYear(yr);
      setSelectedMonth(mo);
      onChange(`${yr}-${mo}`);
    } else if (yr) {
      setSelectedYear(yr);
    }
  };

  // Switch to Full date mode
  const handleSwitchToFull = () => {
    setMode('full');
    if (selectedYear && selectedMonth) {
      const full = `${selectedYear}-${selectedMonth}-01`;
      setFullDateValue(full);
      onChange(full);
    } else if (selectedYear) {
      const full = `${selectedYear}-01-01`;
      setFullDateValue(full);
      onChange(full);
    }
  };

  const getAccentButtonActive = () => {
    switch (accentColor) {
      case 'emerald':
        return 'bg-emerald-600 text-white shadow-sm';
      case 'blue':
        return 'bg-blue-600 text-white shadow-sm';
      case 'purple':
        return 'bg-purple-600 text-white shadow-sm';
      case 'amber':
        return 'bg-amber-600 text-white shadow-sm';
      default:
        return 'bg-indigo-600 text-white shadow-sm';
    }
  };

  const getFocusRing = () => {
    switch (accentColor) {
      case 'emerald':
        return 'focus:ring-emerald-500';
      case 'blue':
        return 'focus:ring-blue-500';
      case 'purple':
        return 'focus:ring-purple-500';
      case 'amber':
        return 'focus:ring-amber-500';
      default:
        return 'focus:ring-indigo-500';
    }
  };

  const hasValue = Boolean(value && value.trim());

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Top Header: Label + Clear Button + 3-Way Segmented Pills Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <div className="flex items-center gap-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          {hasValue && !required && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-red-500 hover:text-red-700 dark:text-red-400 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 transition-colors"
              title={language === 'ar' ? 'تفريغ / مسح التاريخ' : 'Clear Date'}
            >
              <X className="w-3 h-3" />
              <span>{language === 'ar' ? 'مسح' : 'Clear'}</span>
            </button>
          )}
        </div>

        {/* 3-Option Mode Selector Toggle */}
        <div className="inline-flex items-center bg-gray-100 dark:bg-gray-700/80 p-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold self-start sm:self-auto">
          {/* 1. Year Only */}
          <button
            type="button"
            onClick={handleSwitchToYear}
            className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 ${
              mode === 'year'
                ? getAccentButtonActive()
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <span>🏛️</span>
            <span>{language === 'ar' ? 'سنة فقط' : 'Year'}</span>
          </button>

          {/* 2. Month & Year */}
          <button
            type="button"
            onClick={handleSwitchToMonth}
            className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 ${
              mode === 'month'
                ? getAccentButtonActive()
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <span>🗓️</span>
            <span>{language === 'ar' ? 'شهر/سنة' : 'Month/Year'}</span>
          </button>

          {/* 3. Full Date */}
          <button
            type="button"
            onClick={handleSwitchToFull}
            className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 ${
              mode === 'full'
                ? getAccentButtonActive()
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <span>📅</span>
            <span>{language === 'ar' ? 'تاريخ كامل' : 'Full Date'}</span>
          </button>
        </div>
      </div>

      {/* Input Controls based on Mode */}
      {mode === 'year' ? (
        /* Year Only Mode */
        <div className="animate-in fade-in duration-150">
          <select
            value={selectedYear}
            onChange={(e) => handleYearOnlyChange(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm font-medium font-mono focus:ring-2 ${getFocusRing()} transition-all`}
          >
            <option value="">{language === 'ar' ? '-- اختر السنة (غير محدد) --' : '-- Select Year (Unset) --'}</option>
            {yearsList.map((y) => (
              <option key={y} value={y}>
                {language === 'ar' ? `عام ${y}` : `Year ${y}`}
              </option>
            ))}
          </select>
        </div>
      ) : mode === 'month' ? (
        /* Month & Year Mode */
        <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-150">
          {/* Month Dropdown */}
          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 ${getFocusRing()} transition-all`}
          >
            <option value="">{language === 'ar' ? '-- اختر الشهر --' : '-- Select Month --'}</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {language === 'ar' ? m.labelAr : m.labelEn}
              </option>
            ))}
          </select>

          {/* Year Dropdown */}
          <select
            value={selectedYear}
            onChange={(e) => handleMonthYearChange(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm font-medium font-mono focus:ring-2 ${getFocusRing()} transition-all`}
          >
            <option value="">{language === 'ar' ? '-- اختر السنة --' : '-- Select Year --'}</option>
            {yearsList.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      ) : (
        /* Full Date Input Mode */
        <div className="relative animate-in fade-in duration-150">
          <Calendar className="absolute right-3 rtl:right-3 rtl:left-auto left-auto top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="date"
            required={required}
            value={fullDateValue}
            onChange={(e) => handleFullDateChange(e.target.value)}
            className={`w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm font-mono focus:ring-2 ${getFocusRing()} transition-all`}
          />
        </div>
      )}

      {helperText && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
          {helperText}
        </p>
      )}
    </div>
  );
}
