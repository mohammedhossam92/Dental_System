import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Sparkles, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface AutocompleteInputProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  helperText?: string;
  accentColor?: 'indigo' | 'emerald' | 'blue' | 'purple' | 'amber';
  className?: string;
  showChips?: boolean;
}

export function AutocompleteInput({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  helperText,
  accentColor = 'indigo',
  className = '',
  showChips = true,
}: AutocompleteInputProps) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize and deduplicate suggestions list
  const uniqueOptions = useMemo(() => {
    const set = new Set<string>();
    options.forEach((opt) => {
      if (opt && typeof opt === 'string') {
        const trimmed = opt.trim();
        if (trimmed) set.add(trimmed);
      }
    });
    return Array.from(set);
  }, [options]);

  // Filter options based on typed query
  const filteredOptions = useMemo(() => {
    if (!value || !value.trim()) {
      return uniqueOptions.slice(0, 8);
    }
    const query = value.toLowerCase().trim();
    return uniqueOptions
      .filter((opt) => opt.toLowerCase().includes(query))
      .slice(0, 8);
  }, [uniqueOptions, value]);

  // Close suggestions when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOption = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredOptions.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        e.preventDefault();
        handleSelectOption(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const getFocusRing = () => {
    switch (accentColor) {
      case 'emerald':
        return 'focus:ring-emerald-500 focus:border-emerald-500';
      case 'blue':
        return 'focus:ring-blue-500 focus:border-blue-500';
      case 'purple':
        return 'focus:ring-purple-500 focus:border-purple-500';
      case 'amber':
        return 'focus:ring-amber-500 focus:border-amber-500';
      default:
        return 'focus:ring-indigo-500 focus:border-indigo-500';
    }
  };

  const getBadgeColor = () => {
    switch (accentColor) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'blue':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'purple':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'amber':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
    }
  };

  return (
    <div ref={containerRef} className={`relative space-y-1 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          {uniqueOptions.length > 0 && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1 font-medium">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>{language === 'ar' ? `${uniqueOptions.length} اقتراح سابق` : `${uniqueOptions.length} suggestions`}</span>
            </span>
          )}
        </div>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          required={required}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 ${getFocusRing()} transition-all shadow-sm`}
        />

        {uniqueOptions.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              inputRef.current?.focus();
            }}
            className="absolute left-3 rtl:left-3 rtl:right-auto top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            tabIndex={-1}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* Floating Suggestions Dropdown */}
        {isOpen && filteredOptions.length > 0 && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 font-semibold">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>{language === 'ar' ? 'اقتراحات مسجلة مسبقاً (اختر لتوحيد الكتابة)' : 'Recorded suggestions (Select to unify)'}</span>
              </span>
              <span>{filteredOptions.length}</span>
            </div>

            <ul className="py-1 divide-y divide-gray-50 dark:divide-gray-700/50">
              {filteredOptions.map((opt, idx) => {
                const isSelected = opt.toLowerCase() === value.toLowerCase().trim();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li key={`${opt}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => handleSelectOption(opt)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`w-full text-start px-3.5 py-2 text-xs sm:text-sm font-medium flex items-center justify-between transition-colors ${
                        isHighlighted
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="truncate">{opt}</span>
                      {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Quick Pills / Suggestions Chips below input */}
      {showChips && uniqueOptions.length > 0 && uniqueOptions.length <= 6 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] text-gray-400 dark:text-gray-500">{language === 'ar' ? 'سريع:' : 'Quick:'}</span>
          {uniqueOptions.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelectOption(opt)}
              className={`text-[11px] px-2 py-0.5 rounded-md border font-medium transition-all hover:scale-105 active:scale-95 ${
                opt === value ? getBadgeColor() : 'bg-gray-100 dark:bg-gray-750 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200'
              }`}
            >
              {opt}
            </button>
          ))}
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
