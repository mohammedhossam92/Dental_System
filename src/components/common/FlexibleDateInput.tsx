import React, { useState, useEffect } from 'react';
import { Calendar, CalendarDays } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface FlexibleDateInputProps {
  label: string;
  value: string;
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

  // Mode: 'month' (شهر وسنة) vs 'full' (يوم وشهر وسنة)
  const [mode, setMode] = useState<'month' | 'full'>('month');

  // Month & Year state
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState<string>('01');
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
    if (value) {
      const parts = value.split('-');
      const y = parts[0] || String(currentYear);
      const m = parts[1] || '01';
      const d = parts[2];

      setSelectedYear(y);
      setSelectedMonth(m.padStart(2, '0'));

      if (d && d !== '01') {
        setMode('full');
        setFullDateValue(value);
      } else {
        setFullDateValue(value.length === 7 ? `${value}-01` : value);
      }
    } else {
      setSelectedYear(String(currentYear));
      setSelectedMonth('01');
      setFullDateValue('');
    }
  }, [value, currentYear]);

  // When changing month
  const handleMonthChange = (m: string) => {
    setSelectedMonth(m);
    const newVal = `${selectedYear}-${m}-01`;
    setFullDateValue(newVal);
    onChange(newVal);
  };

  // When changing year
  const handleYearChange = (y: string) => {
    setSelectedYear(y);
    const newVal = `${y}-${selectedMonth}-01`;
    setFullDateValue(newVal);
    onChange(newVal);
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

  // Switch to Month mode
  const handleSwitchToMonth = () => {
    setMode('month');
    const newVal = `${selectedYear}-${selectedMonth}-01`;
    setFullDateValue(newVal);
    onChange(newVal);
  };

  // Switch to Full date mode
  const handleSwitchToFull = () => {
    setMode('full');
    const newVal = fullDateValue || `${selectedYear}-${selectedMonth}-01`;
    setFullDateValue(newVal);
    onChange(newVal);
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

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Top Header: Label + Segmented Pills Toggle */}
      <div className="flex items-center justify-between gap-2">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>

        {/* Mode Selector Toggle */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-700/80 p-0.5 rounded-lg text-[11px] font-bold">
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
      {mode === 'month' ? (
        <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-150">
          {/* Month Dropdown */}
          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 ${getFocusRing()} transition-all`}
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {language === 'ar' ? m.labelAr : m.labelEn}
              </option>
            ))}
          </select>

          {/* Year Dropdown */}
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm font-medium font-mono focus:ring-2 ${getFocusRing()} transition-all`}
          >
            {yearsList.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      ) : (
        /* Full Date Input */
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
