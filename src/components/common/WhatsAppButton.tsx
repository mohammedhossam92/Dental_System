import React from 'react';
import { formatWhatsAppUrl } from '../../utils/phoneUtils';
import { useLanguage } from '../../context/LanguageContext';

export function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
  );
}

interface WhatsAppButtonProps {
  phone: string | null | undefined;
  label?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'badge' | 'button';
  showPhone?: boolean;
  className?: string;
}

export function WhatsAppButton({
  phone,
  label,
  size = 'sm',
  variant = 'icon',
  showPhone = false,
  className = ''
}: WhatsAppButtonProps) {
  const { language } = useLanguage();

  if (!phone || !phone.trim()) return null;

  const url = formatWhatsAppUrl(phone);
  const defaultTitle = language === 'ar' ? `مراسلة عبر واتساب (${phone})` : `Message via WhatsApp (${phone})`;

  if (variant === 'button') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={defaultTitle}
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-sm shadow-emerald-600/20 transition-all ${className}`}
      >
        <WhatsAppIcon className="w-4 h-4" />
        <span>{label || (language === 'ar' ? 'واتساب' : 'WhatsApp')}</span>
        {showPhone && <span className="font-mono text-xs opacity-90">({phone})</span>}
      </a>
    );
  }

  if (variant === 'badge') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={defaultTitle}
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/80 transition-colors ${className}`}
      >
        <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        {showPhone ? (
          <span className="font-mono">{phone}</span>
        ) : (
          <span>{label || (language === 'ar' ? 'واتساب' : 'WhatsApp')}</span>
        )}
      </a>
    );
  }

  // Variant === 'icon' (Default)
  const iconSizeClass = size === 'xs' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  const paddingClass = size === 'xs' ? 'p-1' : size === 'lg' ? 'p-2' : 'p-1.5';

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={defaultTitle}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center justify-center rounded-lg text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-600 dark:bg-emerald-950/50 dark:hover:bg-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition-all hover:scale-105 active:scale-95 shadow-sm ${paddingClass} ${className}`}
    >
      <WhatsAppIcon className={iconSizeClass} />
    </a>
  );
}
