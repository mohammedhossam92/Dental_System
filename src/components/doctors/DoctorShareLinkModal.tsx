import React, { useState, useEffect } from 'react';
import {
  X, Copy, Check, Share2, ExternalLink, QrCode,
  Sparkles, Stethoscope, Shield, MessageCircle, RefreshCw
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { WhatsAppIcon } from '../common/WhatsAppButton';
import { encodeOrgToken } from '../../utils/tokenUtils';
import Swal from 'sweetalert2';

interface DoctorShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DoctorShareLinkModal({ isOpen, onClose }: DoctorShareLinkModalProps) {
  const { language } = useLanguage();
  const { organizationId } = useAuth();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'qr' | 'whatsapp'>('link');

  // Compute registration link using masked token
  const token = encodeOrgToken(organizationId);
  const registrationUrl = `${window.location.origin}/register-doctor${
    token ? `?token=${encodeURIComponent(token)}` : ''
  }`;

  const defaultWhatsAppMsg = language === 'ar'
    ? `السلام عليكم دكتورنا الفاضل 👨‍⚕️🩺\n\nنرجو من سيادتكم التكرم بتسجيل وتحديث بياناتكم والموقف الوظيفي والشهادات والمؤهلات والدرجات العلمية عبر الرابط المعتمد التالي:\n\n🔗 ${registrationUrl}\n\nشاكرين ومقدرين حسن تعاونكم الدائم.`
    : `Hello Doctor,\n\nPlease register and update your personal data, employment status, qualifications, and certificates via the following link:\n\n🔗 ${registrationUrl}\n\nThank you!`;

  const [whatsappMsg, setWhatsappMsg] = useState(defaultWhatsAppMsg);

  useEffect(() => {
    setWhatsappMsg(defaultWhatsAppMsg);
  }, [registrationUrl, language]);

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
      // Fallback
      prompt(language === 'ar' ? 'انسخ الرابط التالي:' : 'Copy link:', registrationUrl);
    }
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(whatsappMsg);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleDownloadQr = () => {
    const svgElement = document.getElementById('doctor-reg-qr-svg');
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
        downloadLink.download = 'doctor_registration_qr.png';
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700 transition-all flex flex-col max-h-[90vh]"
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-md rounded-xl border border-white/20 shadow-inner">
              <Share2 className="w-6 h-6 text-teal-100" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {language === 'ar' ? 'رابط استمارة تسجيل الأطباء' : 'Doctor Registration Link'}
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              </h3>
              <p className="text-xs text-teal-100/90 mt-0.5">
                {language === 'ar'
                  ? 'أرسل الرابط للطبيب لملء بياناته ومؤهلاته ذاتياً'
                  : 'Share link with doctors to submit their data and credentials'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/15 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/50 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'link'
                ? 'bg-white dark:bg-gray-700 text-teal-600 dark:text-teal-400 shadow-sm border border-gray-200/50 dark:border-gray-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>{language === 'ar' ? 'الرابط المباشر' : 'Direct Link'}</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'whatsapp'
                ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm border border-gray-200/50 dark:border-gray-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <WhatsAppIcon className="w-4 h-4 text-emerald-500" />
            <span>{language === 'ar' ? 'مشاركة واتساب' : 'WhatsApp'}</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'qr'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-gray-200/50 dark:border-gray-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>{language === 'ar' ? 'رمز QR' : 'QR Code'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* TAB 1: DIRECT LINK */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div className="p-4 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-800/60 rounded-2xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-teal-100 dark:bg-teal-900/60 rounded-xl text-teal-700 dark:text-teal-300 shrink-0">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-teal-950 dark:text-teal-200 text-sm">
                      {language === 'ar' ? 'رابط التسجيل العام للأطباء' : 'Public Registration URL'}
                    </h4>
                    <p className="text-xs text-teal-800/80 dark:text-teal-300/80 mt-1 leading-relaxed">
                      {language === 'ar'
                        ? 'يمكن للطبيب فتح هذا الرابط من أي هاتف أو حاسوب دون الحاجة لتسجيل دخول، وملء بياناته وشهاداته العلمية. تصل البيانات مباشرة إلى حسابكم بانتظار الاعتماد.'
                        : 'Doctors can access this form from any device without login. Data is saved as unconfirmed until your review.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* URL Display & Action Box */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'عنوان الرابط:' : 'URL Link:'}
                </label>
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <input
                    type="text"
                    readOnly
                    value={registrationUrl}
                    className="w-full bg-transparent text-xs text-gray-800 dark:text-gray-200 outline-none font-mono selection:bg-teal-500 selection:text-white px-2"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs transition-all shrink-0 ${
                      copied
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 active:scale-95'
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
              <div className="grid grid-cols-2 gap-3 pt-2">
                <a
                  href={registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl font-bold text-xs transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span>{language === 'ar' ? 'معاينة الاستمارة' : 'Preview Form'}</span>
                </a>

                <button
                  onClick={() => setActiveTab('whatsapp')}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl font-bold text-xs transition-colors"
                >
                  <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                  <span>{language === 'ar' ? 'إرسال عبر واتساب' : 'Send via WhatsApp'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: WHATSAPP SHARING */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 rounded-2xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/60 rounded-xl text-emerald-700 dark:text-emerald-300 shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-950 dark:text-emerald-200 text-sm">
                      {language === 'ar' ? 'دعوة الطبيب عبر واتساب' : 'WhatsApp Invitation'}
                    </h4>
                    <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-1 leading-relaxed">
                      {language === 'ar'
                        ? 'يمكنك تعديل نص الرسالة أدناه ثم الضغط على زر الإرسال لفتح واتساب مباشرة ومشاركتها مع الطبيب أو في مجموعة الأطباء.'
                        : 'Edit the message below and share it directly via WhatsApp.'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'ar' ? 'نص الرسالة المجهزة:' : 'Message Text:'}
                </label>
                <textarea
                  rows={6}
                  value={whatsappMsg}
                  onChange={(e) => setWhatsappMsg(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleOpenWhatsApp}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/25 active:scale-98 transition-all"
                >
                  <WhatsAppIcon className="w-5 h-5" />
                  <span>{language === 'ar' ? 'إرسال الرسالة إلى واتساب' : 'Open WhatsApp'}</span>
                </button>

                <button
                  onClick={() => setWhatsappMsg(defaultWhatsAppMsg)}
                  title={language === 'ar' ? 'استعادة النص الافتراضي' : 'Reset default'}
                  className="p-3 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-xl transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: QR CODE */}
          {activeTab === 'qr' && (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/60 rounded-2xl text-start">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/60 rounded-xl text-indigo-700 dark:text-indigo-300 shrink-0">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-indigo-950 dark:text-indigo-200 text-sm">
                      {language === 'ar' ? 'مسح رمز الاستجابة السريعة (QR Code)' : 'Scan QR Code'}
                    </h4>
                    <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 mt-1 leading-relaxed">
                      {language === 'ar'
                        ? 'يمكن للطبيب توجيه كاميرا الهاتف نحو الرمز لفتح استمارة التسجيل فوراً دون كتابة أي رابط.'
                        : 'Doctors can scan this QR code with their mobile camera to open the form immediately.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* QR Display Card */}
              <div className="inline-block p-4 bg-white rounded-2xl shadow-md border-2 border-gray-100 dark:border-gray-700 mx-auto">
                <QRCodeSVG
                  id="doctor-reg-qr-svg"
                  value={registrationUrl}
                  size={190}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={handleDownloadQr}
                  className="inline-flex items-center gap-2 py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{language === 'ar' ? 'تحميل صورة الـ QR' : 'Download QR Image'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Security & Organization note */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Shield className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              {language === 'ar'
                ? 'حماية وأمان: يتم ربط أي بيانات يتم إدخالها عبر هذا الرابط بمنظومتكم وتظل في حالة "غير معتمد" حتى تقوموا بمراجعتها.'
                : 'Secure: Any submitted doctor profiles remain "unconfirmed" until reviewed and approved by management.'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-xl transition-colors shadow-sm"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
