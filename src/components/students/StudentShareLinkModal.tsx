import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Copy, Check, Share2, ExternalLink, QrCode,
  Sparkles, GraduationCap, Shield, MessageCircle, RefreshCw, Clock, Layers
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { WhatsAppIcon } from '../common/WhatsAppButton';
import { encodeOrgToken } from '../../utils/tokenUtils';
import type { ClassYear } from '../../types';
import Swal from 'sweetalert2';

interface StudentShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  classYears: ClassYear[];
  initialClassYearId?: string | null;
}

const EXPIRY_OPTIONS = [
  { value: 24, labelAr: '24 ساعة (يوم واحد)', labelEn: '24 Hours (1 Day)' },
  { value: 72, labelAr: '3 أيام', labelEn: '3 Days' },
  { value: 168, labelAr: '7 أيام (أسبوع)', labelEn: '7 Days (1 Week)' },
  { value: 720, labelAr: '30 يوماً (شهر)', labelEn: '30 Days (1 Month)' },
  { value: 1, labelAr: 'ساعة واحدة', labelEn: '1 Hour' },
  { value: 6, labelAr: '6 ساعات', labelEn: '6 Hours' },
  { value: null, labelAr: 'دائم (بدون انتهاء)', labelEn: 'Permanent (No Expiry)' },
];

export function StudentShareLinkModal({
  isOpen,
  onClose,
  classYears,
  initialClassYearId
}: StudentShareLinkModalProps) {
  const { language } = useLanguage();
  const { organizationId } = useAuth();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'qr' | 'whatsapp'>('link');

  // Configuration options chosen before generating / copying
  const [expiresInHours, setExpiresInHours] = useState<number | null>(168); // 7 days default
  const [selectedClassYearId, setSelectedClassYearId] = useState<string>(initialClassYearId || '');

  useEffect(() => {
    if (initialClassYearId) {
      setSelectedClassYearId(initialClassYearId);
    }
  }, [initialClassYearId]);

  // Find selected class year object
  const selectedClassYear = useMemo(() => {
    return classYears.find(cy => cy.id === selectedClassYearId) || null;
  }, [classYears, selectedClassYearId]);

  // Compute registration link using masked token with expiry and predefined class year
  const token = useMemo(() => {
    return encodeOrgToken(organizationId, {
      type: 'std_reg',
      expiresInHours,
      classYearId: selectedClassYearId || null,
    });
  }, [organizationId, expiresInHours, selectedClassYearId]);

  const registrationUrl = useMemo(() => {
    return `${window.location.origin}/register-student${
      token ? `?token=${encodeURIComponent(token)}` : ''
    }`;
  }, [token]);

  // Formatted expiration string
  const expiryFormatted = useMemo(() => {
    if (!expiresInHours) return null;
    const d = new Date(Date.now() + expiresInHours * 3600 * 1000);
    return d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [expiresInHours, language]);

  const defaultWhatsAppMsg = useMemo(() => {
    const classYearNote = selectedClassYear
      ? (language === 'ar' ? ` الخاصة بالفرقة الدراسية (${selectedClassYear.year_range})` : ` for Class Year (${selectedClassYear.year_range})`)
      : '';

    const expiryNote = expiresInHours && expiryFormatted
      ? (language === 'ar' ? `\n\n⏳ صلاحية هذا الرابط: حتى ${expiryFormatted}` : `\n\n⏳ Link valid until: ${expiryFormatted}`)
      : '';

    return language === 'ar'
      ? `السلام عليكم زملاءنا الطلبة الأعزاء 👨‍🎓👩‍🎓\n\nيرجى التكرم بتسجيل وتحديث بياناتكم في منظومة العيادات${classYearNote} عبر الرابط المعتمد التالي:\n\n🔗 ${registrationUrl}${expiryNote}\n\nنتمنى لكم دوام التوفيق والنجاح.`
      : `Dear Students,\n\nPlease register your profile in the Dental Clinic System${classYearNote} via the official link below:\n\n🔗 ${registrationUrl}${expiryNote}\n\nBest regards!`;
  }, [registrationUrl, language, selectedClassYear, expiresInHours, expiryFormatted]);

  const [whatsappMsg, setWhatsappMsg] = useState(defaultWhatsAppMsg);

  useEffect(() => {
    setWhatsappMsg(defaultWhatsAppMsg);
  }, [defaultWhatsAppMsg]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);

      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      });
      Toast.fire({
        icon: 'success',
        title: language === 'ar' ? 'تم نسخ الرابط بنجاح!' : 'Link copied to clipboard!'
      });
    } catch {
      prompt(language === 'ar' ? 'انسخ الرابط التالي:' : 'Copy link:', registrationUrl);
    }
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(whatsappMsg);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleDownloadQr = () => {
    const svgElement = document.getElementById('student-reg-qr-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20, 360, 360);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `student_registration_qr${selectedClassYear ? `_${selectedClassYear.year_range}` : ''}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700 transition-all flex flex-col max-h-[92dvh] sm:max-h-[90vh]"
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="relative px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 bg-white/15 backdrop-blur-md rounded-xl border border-white/20 shadow-inner shrink-0">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-100" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-xl font-bold text-white flex items-center gap-1.5 sm:gap-2 truncate">
                <span>{language === 'ar' ? 'رابط استمارة تسجيل الطلاب' : 'Student Registration Link'}</span>
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
              </h3>
              <p className="text-[11px] sm:text-xs text-indigo-100/90 mt-0.5 truncate">
                {language === 'ar'
                  ? 'توليد ومشاركة رابط التسجيل مع تحديد الصلاحية والفرقة الدراسية'
                  : 'Generate student registration link with custom expiry and class year'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 sm:p-2 rounded-xl hover:bg-white/15 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/50 p-1 sm:p-1.5 gap-1 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'link'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-gray-200/50 dark:border-gray-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>{language === 'ar' ? 'الرابط المباشر' : 'Direct Link'}</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'whatsapp'
                ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm border border-gray-200/50 dark:border-gray-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <WhatsAppIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
            <span>{language === 'ar' ? 'مشاركة واتساب' : 'WhatsApp'}</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'qr'
                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm border border-gray-200/50 dark:border-gray-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>{language === 'ar' ? 'رمز QR' : 'QR Code'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* CONFIGURATION SECTION: CLASS YEAR & EXPIRY CHOICES BEFORE COPYING */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-br from-indigo-50/90 via-purple-50/70 to-pink-50/50 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-pink-950/20 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl space-y-3.5">
            {/* 1. Predefined Class Year Selector */}
            <div>
              <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5 mb-1.5">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>{language === 'ar' ? 'تحديد الفرقة الدراسية مسبقاً (Predefined Class Year):' : 'Predefined Class Year:'}</span>
              </label>
              <select
                value={selectedClassYearId}
                onChange={(e) => setSelectedClassYearId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-gray-700 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
              >
                <option value="">{language === 'ar' ? 'بدون تحديد مسبق (يختار الطالب فرقته الدراسية)' : 'No predefinition (Student selects class year)'}</option>
                {classYears.map((cy) => (
                  <option key={cy.id} value={cy.id}>
                    {cy.year_range}
                  </option>
                ))}
              </select>
              <p className="text-[10.5px] text-indigo-700/80 dark:text-indigo-300/80 mt-1">
                {selectedClassYear
                  ? (language === 'ar' ? `سيتم تثبيت وتحديد الفرقة (${selectedClassYear.year_range}) تلقائياً لأي طالب يسجل عبر هذا الرابط.` : `Students registering via this link will automatically belong to (${selectedClassYear.year_range}).`)
                  : (language === 'ar' ? 'سيتمكن الطالب من اختيار فرقته الدراسية بنفسه أثناء ملء الاستمارة.' : 'Students can choose their own class year upon registration.')}
              </p>
            </div>

            {/* 2. Expiry Period Selector */}
            <div className="pt-2 border-t border-indigo-200/70 dark:border-indigo-800/50">
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>{language === 'ar' ? 'فترة صلاحية الرابط:' : 'Link Expiration Period:'}</span>
                </label>
                {expiryFormatted && (
                  <span className="text-[10.5px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-900/40 px-2 py-0.5 rounded-md border border-purple-300 dark:border-purple-800">
                    {language === 'ar' ? 'ينتهي في:' : 'Expires:'} {expiryFormatted}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {EXPIRY_OPTIONS.map((opt) => {
                  const isSelected = expiresInHours === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setExpiresInHours(opt.value)}
                      className={`py-1.5 px-2 text-[11px] sm:text-xs font-semibold rounded-lg border transition-all text-center ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-600/30'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-purple-50 dark:hover:bg-gray-650'
                      }`}
                    >
                      {language === 'ar' ? opt.labelAr : opt.labelEn}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* TAB 1: DIRECT LINK */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div className="p-3.5 sm:p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/60 rounded-2xl">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-indigo-100 dark:bg-indigo-900/60 rounded-xl text-indigo-700 dark:text-indigo-300 shrink-0">
                    <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-indigo-950 dark:text-indigo-200 text-xs sm:text-sm">
                      {language === 'ar' ? 'رابط التسجيل الذاتي للطلاب' : 'Student Self-Registration URL'}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-indigo-800/80 dark:text-indigo-300/80 mt-1 leading-relaxed">
                      {language === 'ar'
                        ? 'يمكن للطلاب فتح هذا الرابط وإدخال بياناتهم الشخصية وأرقام هواتفهم. تضاف البيانات مباشرة لقائمة الطلاب في حسابكم بحالة قيد الانتظار (Pending).'
                        : 'Students can open this link to register their contact info, university, and status without login.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* URL Display & Action Box */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  {language === 'ar' ? 'عنوان الرابط المجهز:' : 'Generated URL Link:'}
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <input
                    type="text"
                    readOnly
                    value={registrationUrl}
                    className="w-full bg-transparent text-xs text-gray-800 dark:text-gray-200 outline-none font-mono selection:bg-indigo-500 selection:text-white px-2 py-1"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs transition-all shrink-0 ${
                      copied
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-95'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'تم النسخ' : 'Copied'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'نسخ الرابط' : 'Copy'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-1">
                <a
                  href={registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2 sm:py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl font-bold text-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                  <span>{language === 'ar' ? 'معاينة الاستمارة' : 'Preview Form'}</span>
                </a>

                <button
                  onClick={() => setActiveTab('whatsapp')}
                  className="flex items-center justify-center gap-2 py-2 sm:py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl font-bold text-xs transition-colors"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{language === 'ar' ? 'إرسال عبر واتساب' : 'Send via WhatsApp'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: WHATSAPP SHARING */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div className="p-3.5 sm:p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 rounded-2xl">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-emerald-100 dark:bg-emerald-900/60 rounded-xl text-emerald-700 dark:text-emerald-300 shrink-0">
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-950 dark:text-emerald-200 text-xs sm:text-sm">
                      {language === 'ar' ? 'دعوة الطلاب عبر واتساب' : 'WhatsApp Invitation'}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-1 leading-relaxed">
                      {language === 'ar'
                        ? 'يمكنك تعديل نص الرسالة أدناه ثم الضغط على زر الإرسال لفتح واتساب مباشرة ومشاركتها في مجموعات الطلاب.'
                        : 'Edit the message below and share it directly into student groups via WhatsApp.'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  {language === 'ar' ? 'نص الرسالة المجهزة:' : 'Message Text:'}
                </label>
                <textarea
                  rows={5}
                  value={whatsappMsg}
                  onChange={(e) => setWhatsappMsg(e.target.value)}
                  className="w-full p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <button
                  onClick={handleOpenWhatsApp}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 active:scale-98 transition-all"
                >
                  <WhatsAppIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>{language === 'ar' ? 'إرسال الرسالة إلى واتساب' : 'Open WhatsApp'}</span>
                </button>

                <button
                  onClick={() => setWhatsappMsg(defaultWhatsAppMsg)}
                  title={language === 'ar' ? 'استعادة النص الافتراضي' : 'Reset default'}
                  className="py-2.5 sm:py-3 px-3 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-xl transition-colors flex items-center justify-center gap-1 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="sm:hidden">{language === 'ar' ? 'استعادة النص' : 'Reset'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: QR CODE */}
          {activeTab === 'qr' && (
            <div className="space-y-4 text-center">
              <div className="p-3.5 sm:p-4 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/60 rounded-2xl text-start">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-purple-100 dark:bg-purple-900/60 rounded-xl text-purple-700 dark:text-purple-300 shrink-0">
                    <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-purple-950 dark:text-purple-200 text-xs sm:text-sm">
                      {language === 'ar' ? 'مسح رمز الاستجابة السريعة (QR Code)' : 'Scan QR Code'}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-purple-800/80 dark:text-purple-300/80 mt-1 leading-relaxed">
                      {language === 'ar'
                        ? 'يمكن طباعة هذا الرمز أو عرضه في الكلية ليقوم الطالب بمسحه بالهاتف والتسجيل فوراً.'
                        : 'Print this QR code or project it in lectures for students to scan and register directly.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* QR Display Card */}
              <div className="inline-block p-3 sm:p-4 bg-white rounded-2xl shadow-md border-2 border-gray-100 dark:border-gray-700 mx-auto">
                <QRCodeSVG
                  id="student-reg-qr-svg"
                  value={registrationUrl}
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={handleDownloadQr}
                  className="inline-flex items-center gap-2 py-2 sm:py-2.5 px-4 sm:px-5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md shadow-purple-600/20 active:scale-95 transition-all"
                >
                  <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{language === 'ar' ? 'تحميل صورة الـ QR' : 'Download QR Image'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Security & Organization note */}
          <div className="p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-2 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
            <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              {language === 'ar'
                ? 'حماية وأمان: تسجل بيانات الطلاب مباشرة تحت منظومتكم بحالة "قيد الانتظار" لحين مراجعتها من إدارة العيادة.'
                : 'Secure: Registered students are tied to your clinic and stored as pending until verified.'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-xl transition-colors shadow-sm text-center"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
