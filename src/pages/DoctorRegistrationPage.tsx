import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Stethoscope, Award, GraduationCap, Briefcase, Building,
  Calendar, Phone, CreditCard, MapPin, User, Plus, Trash2,
  CheckCircle2, Sparkles, AlertCircle, ArrowRight, ArrowLeft,
  ChevronDown, ChevronUp, ShieldCheck, HeartPulse, Send,
  FileCheck, BookOpen, Layers, Check, ExternalLink, HelpCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { EmploymentStatusType, University, CertificateType } from '../types';
import {
  DEFAULT_CERTIFICATE_TITLES,
  DEFAULT_UNIVERSITIES,
  DEFAULT_FINANCIAL_GRADES,
  DEFAULT_PROMOTION_TYPES,
  DEFAULT_ADMINISTRATIVE_ROLES,
  DEFAULT_ADMINISTRATIVE_FACILITIES,
  DEFAULT_ADDRESS_SUGGESTIONS,
  fetchHistoricalSuggestions
} from '../utils/suggestionUtils';
import {
  extractBirthDateFromNationalId,
  calculateAge,
  formatDate
} from '../utils/doctorUtils';
import { decodeOrgToken, verifyOrgToken } from '../utils/tokenUtils';
import { cleanPhoneNumber, isValid11DigitPhone } from '../utils/phoneUtils';
import { FlexibleDateInput } from '../components/common/FlexibleDateInput';
import Swal from 'sweetalert2';

interface CertificateDraft {
  id: string;
  certificate_type: string;
  certificate_title: string;
  university_name: string;
  university_country: string;
  status: 'obtained' | 'in_progress';
  obtained_date: string;
  study_start_date: string;
  expected_date: string;
  notes: string;
}

interface PromotionDraft {
  id: string;
  promotion_type: string;
  promotion_date: string;
  notes: string;
}

export function DoctorRegistrationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenParam = searchParams.get('token');
  const orgParam = searchParams.get('org');
  const tokenResult = useMemo(() => {
    return verifyOrgToken(tokenParam || orgParam);
  }, [tokenParam, orgParam]);

  const orgFromUrl = tokenResult.organizationId;
  const isLinkExpired = tokenResult.isExpired;

  // Loading & submission state
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [submittedDoctorName, setSubmittedDoctorName] = useState('');

  // Suggestions state
  const [univSuggestions, setUnivSuggestions] = useState<string[]>(DEFAULT_UNIVERSITIES);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>(DEFAULT_CERTIFICATE_TITLES);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>(DEFAULT_ADDRESS_SUGGESTIONS);

  // Active step / tab for smooth mobile friendly navigation
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State: 1. Personal & Basic
  const [name, setName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [graduationDate, setGraduationDate] = useState('');
  const [notes, setNotes] = useState('');

  // Form State: 2. Employment Status
  const [statusType, setStatusType] = useState<EmploymentStatusType | string>('قوة أساسية');
  const [deputationDirection, setDeputationDirection] = useState<'منتدب إلى المستشفى' | 'منتدب من المستشفى إلى الخارج' | ''>('');
  const [deputationFacility, setDeputationFacility] = useState('');
  const [hasAdminDuty, setHasAdminDuty] = useState(false);
  const [adminScope, setAdminScope] = useState<'داخل القسم' | 'خارج القسم'>('داخل القسم');
  const [adminRole, setAdminRole] = useState('');
  const [adminFacility, setAdminFacility] = useState('');
  const [employmentStartDate, setEmploymentStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [employmentNotes, setEmploymentNotes] = useState('');

  // Form State: 3. Certificates & Qualifications (Dynamic List)
  const [certificates, setCertificates] = useState<CertificateDraft[]>([
    {
      id: 'cert_1',
      certificate_type: 'بكالوريوس',
      certificate_title: 'طب وجراحة الفم والأسنان',
      university_name: 'جامعة المنصورة',
      university_country: 'مصر',
      status: 'obtained',
      obtained_date: '',
      study_start_date: '',
      expected_date: '',
      notes: ''
    }
  ]);

  // Form State: 4. Financial Grade & Promotions
  const [financialGrade, setFinancialGrade] = useState('');
  const [financialGradeStartDate, setFinancialGradeStartDate] = useState('');
  const [promotions, setPromotions] = useState<PromotionDraft[]>([]);

  // Load historical suggestions on mount
  useEffect(() => {
    fetchHistoricalSuggestions().then((res) => {
      if (res.universities?.length) setUnivSuggestions(res.universities);
      if (res.certificateTitles?.length) setTitleSuggestions(res.certificateTitles);
      if (res.addresses?.length) setAddressSuggestions(res.addresses);
    });
  }, []);

  // Auto-detect birth date when national ID changes
  const autoExtractedBirthDate = useMemo(() => {
    return extractBirthDateFromNationalId(nationalId);
  }, [nationalId]);

  useEffect(() => {
    if (autoExtractedBirthDate && !birthDate) {
      setBirthDate(autoExtractedBirthDate);
    }
  }, [autoExtractedBirthDate]);

  const calculatedAge = useMemo(() => {
    return calculateAge(birthDate || autoExtractedBirthDate);
  }, [birthDate, autoExtractedBirthDate]);

  // Certificate helpers
  const handleAddCertificate = () => {
    const newCert: CertificateDraft = {
      id: 'cert_' + Date.now(),
      certificate_type: 'ماجستير',
      certificate_title: '',
      university_name: 'جامعة المنصورة',
      university_country: 'مصر',
      status: 'obtained',
      obtained_date: '',
      study_start_date: '',
      expected_date: '',
      notes: ''
    };
    setCertificates((prev) => [...prev, newCert]);
  };

  const handleRemoveCertificate = (id: string) => {
    if (certificates.length === 1) {
      Swal.fire({
        icon: 'info',
        title: 'تنبيه',
        text: 'يجب الإبقاء على شهادة أو مؤهل واحد على الأقل (مثل البكالوريوس).'
      });
      return;
    }
    setCertificates((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdateCertificate = (id: string, field: keyof CertificateDraft, val: any) => {
    setCertificates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: val } : c))
    );
  };

  // Promotion helpers
  const handleAddPromotion = () => {
    const newProm: PromotionDraft = {
      id: 'prom_' + Date.now(),
      promotion_type: 'طبيب مقيم',
      promotion_date: new Date().toISOString().split('T')[0],
      notes: ''
    };
    setPromotions((prev) => [...prev, newProm]);
  };

  const handleRemovePromotion = (id: string) => {
    setPromotions((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdatePromotion = (id: string, field: keyof PromotionDraft, val: any) => {
    setPromotions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );
  };

  // Step navigation validations
  const validateStep1 = () => {
    // 1. Validate full name (at least 4 words/names)
    const cleanName = name.trim();
    if (!cleanName) {
      Swal.fire({
        icon: 'warning',
        title: 'الاسم مطلوب',
        text: 'يرجى إدخال الاسم الرباعي للطبيب.'
      });
      return false;
    }
    const nameParts = cleanName.split(/\s+/).filter(Boolean);
    if (nameParts.length < 4) {
      Swal.fire({
        icon: 'warning',
        title: 'الاسم غير مكتمل',
        text: `يجب كتابة الاسم رباعياً على الأقل (أدخلت ${nameParts.length} أسماء - مثال: د. محمد أحمد محمود إبراهيم).`
      });
      return false;
    }

    // 2. Validate national ID (14 digits)
    const cleanNationalId = cleanPhoneNumber(nationalId);
    if (!cleanNationalId) {
      Swal.fire({
        icon: 'warning',
        title: 'الرقم القومي مطلوب',
        text: 'يرجى إدخال الرقم القومي المكون من 14 رقماً.'
      });
      return false;
    }
    if (cleanNationalId.length !== 14 || !/^\d{14}$/.test(cleanNationalId)) {
      Swal.fire({
        icon: 'warning',
        title: 'الرقم القومي غير صحيح',
        text: `يجب أن يتكون الرقم القومي من 14 رقماً بالضبط (أدخلت ${cleanNationalId.length} رقماً).`
      });
      return false;
    }

    // 3. Validate phone number (11 digits)
    const cleanPhone = cleanPhoneNumber(phone);
    if (!cleanPhone) {
      Swal.fire({
        icon: 'warning',
        title: 'رقم الهاتف مطلوب',
        text: 'يرجى إدخال رقم الموبايل أو الواتساب للتواصل (11 رقماً).'
      });
      return false;
    }
    if (!isValid11DigitPhone(cleanPhone)) {
      Swal.fire({
        icon: 'warning',
        title: 'رقم الموبايل غير صحيح',
        text: `يجب أن يتكون رقم الموبايل من 11 رقماً بالضبط (أدخلت ${cleanPhone.length} رقماً - مثال: 01012345678).`
      });
      return false;
    }

    return true;
  };

  const validateAll = () => {
    if (!validateStep1()) {
      setActiveStep(1);
      return false;
    }

    // Validate certificates
    for (let i = 0; i < certificates.length; i++) {
      const cert = certificates[i];
      if (!cert.certificate_title.trim()) {
        Swal.fire({
          icon: 'warning',
          title: `عنوان الشهادة رقم ${i + 1} مطلوب`,
          text: 'يرجى تحديد التخصص أو عنوان الشهادة العلمية.'
        });
        setActiveStep(3);
        return false;
      }
      if (!cert.university_name.trim()) {
        Swal.fire({
          icon: 'warning',
          title: `اسم الجامعة في الشهادة رقم ${i + 1} مطلوب`,
          text: 'يرجى إدخال اسم الجامعة أو المؤسسة المانحة للشهادة.'
        });
        setActiveStep(3);
        return false;
      }
    }

    return true;
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;

    try {
      setSubmitting(true);

      // 1. Insert Doctor Record
      const doctorPayload = {
        name: name.trim(),
        national_id: nationalId.trim() || null,
        birth_date: birthDate || autoExtractedBirthDate || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        hire_date: hireDate || null,
        graduation_date: graduationDate || null,
        notes: notes.trim() || null,
        is_confirmed: false, // Explicitly marked as unconfirmed for admin review
        organization_id: orgFromUrl || null
      };

      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .insert([doctorPayload])
        .select()
        .single();

      if (doctorError) throw doctorError;
      const newDoctorId = doctorData.id;

      // 2. Insert Employment History
      if (statusType) {
        const empPayload = {
          doctor_id: newDoctorId,
          organization_id: orgFromUrl || null,
          status_type: statusType,
          deputation_direction:
            statusType === 'انتداب' || statusType === 'ندب' ? deputationDirection || null : null,
          deputation_facility:
            statusType === 'انتداب' || statusType === 'ندب' ? deputationFacility.trim() || null : null,
          has_administrative_duty: hasAdminDuty,
          administrative_scope: hasAdminDuty ? adminScope : null,
          administrative_role: hasAdminDuty ? adminRole.trim() || null : null,
          administrative_facility: hasAdminDuty ? adminFacility.trim() || null : null,
          start_date: employmentStartDate || new Date().toISOString().split('T')[0],
          notes: employmentNotes.trim() || null
        };

        const { error: empError } = await supabase
          .from('doctor_employment_history')
          .insert([empPayload]);

        if (empError) console.error('Error inserting employment history:', empError);
      }

      // 3. Insert Certificates
      if (certificates.length > 0) {
        const certsPayload = certificates.map((c) => ({
          doctor_id: newDoctorId,
          organization_id: orgFromUrl || null,
          certificate_type: c.certificate_type,
          certificate_title: c.certificate_title.trim(),
          university_name: c.university_name.trim(),
          university_country: c.university_country.trim() || 'مصر',
          status: c.status,
          obtained_date: c.status === 'obtained' ? c.obtained_date || null : null,
          study_start_date: c.status === 'in_progress' ? c.study_start_date || null : null,
          expected_date: c.status === 'in_progress' ? c.expected_date || null : null,
          notes: c.notes.trim() || null
        }));

        const { error: certsError } = await supabase
          .from('doctor_certificates')
          .insert(certsPayload);

        if (certsError) console.error('Error inserting certificates:', certsError);
      }

      // 4. Insert Financial Grade if entered
      if (financialGrade.trim()) {
        const finPayload = {
          doctor_id: newDoctorId,
          organization_id: orgFromUrl || null,
          financial_grade: financialGrade.trim(),
          start_date: financialGradeStartDate || new Date().toISOString().split('T')[0],
          notes: null
        };

        const { error: finError } = await supabase
          .from('doctor_financial_grades')
          .insert([finPayload]);

        if (finError) console.error('Error inserting financial grade:', finError);
      }

      // 5. Insert Promotions if entered
      if (promotions.length > 0) {
        const promsPayload = promotions
          .filter((p) => p.promotion_type.trim())
          .map((p) => ({
            doctor_id: newDoctorId,
            organization_id: orgFromUrl || null,
            promotion_type: p.promotion_type.trim(),
            promotion_date: p.promotion_date || new Date().toISOString().split('T')[0],
            notes: p.notes.trim() || null
          }));

        if (promsPayload.length > 0) {
          const { error: promsError } = await supabase
            .from('doctor_promotions')
            .insert(promsPayload);

          if (promsError) console.error('Error inserting promotions:', promsError);
        }
      }

      setSubmittedDoctorName(name.trim());
      setSubmittedSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Error registering doctor:', err);
      Swal.fire({
        icon: 'error',
        title: 'حدث خطأ أثناء الإرسال',
        text: err?.message || 'يرجى المحاولة مرة أخرى أو مراجعة إدارة المستشفى.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // LINK EXPIRED SCREEN
  if (isLinkExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-slate-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900/40 p-8 text-center space-y-5 animate-fadeIn">
          <div className="w-20 h-20 bg-rose-100 dark:bg-rose-950/80 rounded-full flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400 ring-8 ring-rose-50 dark:ring-rose-900/30">
            <Clock className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded-full text-xs font-bold border border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>انتهت صلاحية الرابط</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
              عذراً، انتهت صلاحية رابط التسجيل
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-md mx-auto">
              هذا الرابط تم إعداده بفترة صلاحية زمنية محددة وقد انتهت صلاحيته
              {tokenResult.expiresAt ? ` (${tokenResult.expiresAt.toLocaleDateString('ar-EG', { dateStyle: 'full', timeStyle: 'short' })})` : ''}.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              يرجى التواصل مع إدارة العيادة لطلب رابط تسجيل جديد وصالح.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // SUCCESS CONFIRMATION SCREEN
  if (submittedSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-sky-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-xl w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-teal-100 dark:border-gray-700 p-8 text-center space-y-6 animate-fadeIn">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/80 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-50 dark:ring-emerald-900/30">
            <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800">
              <Sparkles className="w-3.5 h-3.5" />
              <span>تم استلام البيانات بنجاح</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
              شكراً جزيلاً د. {submittedDoctorName}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-md mx-auto">
              تم تسجيل وتوثيق بياناتكم ومؤهلاتكم العلمية بنجاح. سيتم مراجعة البيانات واعتمادها من قبل إدارة المستشفى والعيادات.
            </p>
          </div>

          {/* Summary Box */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-700 text-start space-y-2 text-xs text-gray-700 dark:text-gray-300">
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">الاسم:</span>
              <span className="font-bold">{submittedDoctorName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">الموقف الوظيفي:</span>
              <span className="font-bold">{statusType}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">عدد المؤهلات والشهادات:</span>
              <span className="font-bold text-teal-600 dark:text-teal-400">{certificates.length} مؤهل</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500 dark:text-gray-400">حالة السجل:</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-md font-bold text-[11px]">
                بانتظار الاعتماد الإداري
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-center">
            <button
              onClick={() => {
                setSubmittedSuccess(false);
                setName('');
                setNationalId('');
                setPhone('');
                setAddress('');
                setNotes('');
                setCertificates([
                  {
                    id: 'cert_1',
                    certificate_type: 'بكالوريوس',
                    certificate_title: 'طب وجراحة الفم والأسنان',
                    university_name: 'جامعة المنصورة',
                    university_country: 'مصر',
                    status: 'obtained',
                    obtained_date: '',
                    study_start_date: '',
                    expected_date: '',
                    notes: ''
                  }
                ]);
                setActiveStep(1);
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-600/20 active:scale-95 transition-all"
            >
              <span>تسجيل استمارة جديدة</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 py-8 px-4 sm:px-6 lg:px-8 font-sans" dir="rtl">
      {/* Container */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Brand Header */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-gray-800 p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-start">
            <div className="p-4 bg-gradient-to-br from-teal-600 to-cyan-700 text-white rounded-2xl shadow-lg shadow-teal-600/20 shrink-0">
              <Stethoscope className="w-9 h-9" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 rounded-full text-xs font-bold border border-teal-200/60 dark:border-teal-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>استمارة تسجيل وتحديث بيانات الأطباء المعتمدة</span>
                </div>
                {tokenResult.expiresAt && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-full text-xs font-bold border border-amber-200/60 dark:border-amber-800">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>صالح حتى: {tokenResult.expiresAt.toLocaleDateString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                استمارة بيانات الكادر الطبي والمؤهلات العلمية
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
                يرجى التكرم بتسجيل بياناتكم الشخصية، الموقف الوظيفي، والشهادات والدرجات العلمية بدقة لتحديث وتوثيق السجل الرسمي.
              </p>
            </div>
          </div>
        </div>

        {/* Step Indicator Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className={`p-3.5 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all text-start border ${
              activeStep === 1
                ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20 ring-2 ring-teal-500/20'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-teal-400'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${activeStep === 1 ? 'bg-white/20' : 'bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400'}`}>
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] opacity-80">الخطوة 1</div>
              <div className="font-bold">البيانات الشخصية</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (validateStep1()) setActiveStep(2);
            }}
            className={`p-3.5 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all text-start border ${
              activeStep === 2
                ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20 ring-2 ring-teal-500/20'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-teal-400'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${activeStep === 2 ? 'bg-white/20' : 'bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400'}`}>
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] opacity-80">الخطوة 2</div>
              <div className="font-bold">الموقف الوظيفي</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (validateStep1()) setActiveStep(3);
            }}
            className={`p-3.5 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all text-start border ${
              activeStep === 3
                ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20 ring-2 ring-teal-500/20'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-teal-400'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${activeStep === 3 ? 'bg-white/20' : 'bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400'}`}>
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] opacity-80">الخطوة 3</div>
              <div className="font-bold">الشهادات والدرجات</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (validateStep1()) setActiveStep(4);
            }}
            className={`p-3.5 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all text-start border ${
              activeStep === 4
                ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20 ring-2 ring-teal-500/20'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-teal-400'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${activeStep === 4 ? 'bg-white/20' : 'bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400'}`}>
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] opacity-80">الخطوة 4</div>
              <div className="font-bold">الدرجة والترقيات</div>
            </div>
          </button>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: PERSONAL DETAILS */}
          {activeStep === 1 && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-gray-800 p-6 sm:p-8 space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="p-2 bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded-xl">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">البيانات الشخصية والأساسية</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">الاسم الرباعي والرقم القومي وبيانات التواصل</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Full Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                    <span>الاسم بالكامل (رباعي على الأقل) <span className="text-rose-500">*</span></span>
                    <span className={`text-[11px] font-semibold ${
                      name.trim().split(/\s+/).filter(Boolean).length >= 4 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {name.trim() 
                        ? `${name.trim().split(/\s+/).filter(Boolean).length} أسماء` 
                        : 'مطلوب 4 أسماء على الأقل'}
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: د. محمد أحمد محمود إبراهيم"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    يرجى كتابة الاسم الرباعي كاملاً كما هو مدون في بطاقة الرقم القومي.
                  </p>
                </div>

                {/* National ID */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                    <span>الرقم القومي (14 رقم) <span className="text-rose-500">*</span></span>
                    <span className={`text-[11px] font-mono font-semibold ${
                      nationalId.length === 14 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {nationalId.length}/14 رقم
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={14}
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                      placeholder="29XXXXXXXXXXXX"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  {autoExtractedBirthDate && (
                    <p className="text-[11px] text-teal-600 dark:text-teal-400 mt-1 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>تاريخ الميلاد المستخرج: {autoExtractedBirthDate}</span>
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                    <span>رقم الموبايل / الواتساب (11 رقم) <span className="text-rose-500">*</span></span>
                    <span className={`text-[11px] font-mono font-semibold ${
                      phone.length === 11 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {phone.length}/11 رقم
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      maxLength={11}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="01012345678"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    رقم الهاتف المحمول المكون من 11 رقماً للتواصل والمراسلات.
                  </p>
                </div>

                {/* Birth Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                    <span>تاريخ الميلاد</span>
                    {calculatedAge !== null && (
                      <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                        العمر: {calculatedAge} سنة
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    العنوان ومحل الإقامة
                  </label>
                  <input
                    type="text"
                    list="address-suggestions-list"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="المدينة، المحافظة"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  />
                  <datalist id="address-suggestions-list">
                    {addressSuggestions.map((addr, idx) => (
                      <option key={idx} value={addr} />
                    ))}
                  </datalist>
                </div>

                {/* Hire Date - Flexible Date Input (سنة فقط / شهر وسنة / تاريخ كامل) */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700">
                  <FlexibleDateInput
                    label="تاريخ استلام العمل"
                    value={hireDate}
                    onChange={(val) => setHireDate(val)}
                    accentColor="emerald"
                    helperText="يمكنك اختيار (شهر/سنة) أو (سنة فقط) أو (تاريخ كامل)"
                  />
                </div>

                {/* Graduation Date - Flexible Date Input (سنة فقط / شهر وسنة / تاريخ كامل) */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700">
                  <FlexibleDateInput
                    label="تاريخ التخرج الأساسي (البكالوريوس)"
                    value={graduationDate}
                    onChange={(val) => setGraduationDate(val)}
                    accentColor="emerald"
                    helperText="يمكنك اختيار (شهر/سنة) أو (سنة فقط) أو (تاريخ كامل)"
                  />
                </div>

                {/* General Notes */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    ملاحظات عامة
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أي بيانات أو ملاحظات إضافية ترغب في إضافتها..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              {/* Navigation button */}
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) setActiveStep(2);
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm shadow-md shadow-teal-600/20 active:scale-95 transition-all"
                >
                  <span>التالي: الموقف الوظيفي</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: EMPLOYMENT STATUS */}
          {activeStep === 2 && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-gray-800 p-6 sm:p-8 space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="p-2 bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded-xl">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">الموقف الوظيفي الحالي</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">حالة التواجد، الانتدابات، والمهام الإدارية</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Status Type */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    نوع الموقف الوظيفي الحالي
                  </label>
                  <select
                    value={statusType}
                    onChange={(e) => setStatusType(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="قوة أساسية">قوة أساسية (على رأس العمل)</option>
                    <option value="انتداب">انتداب</option>
                    <option value="ندب">ندب</option>
                    <option value="إعارة">إعارة</option>
                    <option value="إجازة">إجازة</option>
                    <option value="إنهاء خدمة">إنهاء خدمة</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                {/* Status Start Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    تاريخ بدء الموقف الوظيفي الحالي
                  </label>
                  <input
                    type="date"
                    value={employmentStartDate}
                    onChange={(e) => setEmploymentStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                {/* Conditional: Deputation Details */}
                {(statusType === 'انتداب' || statusType === 'ندب') && (
                  <div className="md:col-span-2 p-4 bg-teal-50/60 dark:bg-teal-950/30 rounded-2xl border border-teal-200/60 dark:border-teal-800/60 space-y-4">
                    <h4 className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      <span>تفاصيل الانتداب / الندب</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          اتجاه الانتداب
                        </label>
                        <select
                          value={deputationDirection}
                          onChange={(e: any) => setDeputationDirection(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none"
                        >
                          <option value="">-- اختر اتجاه الانتداب --</option>
                          <option value="منتدب إلى المستشفى">منتدب إلى المستشفى (قادم من جهة أخرى)</option>
                          <option value="منتدب من المستشفى إلى الخارج">منتدب من المستشفى إلى الخارج</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          اسم الجهة المنتدب منها أو إليها
                        </label>
                        <input
                          type="text"
                          value={deputationFacility}
                          onChange={(e) => setDeputationFacility(e.target.value)}
                          placeholder="مثال: جامعة أخرى، وزارة الصحة، مستشفى عام"
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Administrative Duty Section */}
                <div className="md:col-span-2 p-4 bg-slate-50 dark:bg-gray-800/60 rounded-2xl border border-slate-200 dark:border-gray-700 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasAdminDuty}
                      onChange={(e) => setHasAdminDuty(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 border-gray-300"
                    />
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      هل مكلف بمهام إدارية أو إشرافية؟ (مثل رئيس قسم، مدير عيادات، وكيل كلية، منسق جودة...)
                    </span>
                  </label>

                  {hasAdminDuty && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-200/60 dark:border-gray-700">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          نطاق التكليف الإداري
                        </label>
                        <select
                          value={adminScope}
                          onChange={(e: any) => setAdminScope(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none"
                        >
                          <option value="داخل القسم">داخل القسم العلمي</option>
                          <option value="خارج القسم">خارج القسم (إدارة الكلية/المستشفى)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          المسمى أو التكليف الإداري
                        </label>
                        <input
                          type="text"
                          list="admin-roles-list"
                          value={adminRole}
                          onChange={(e) => setAdminRole(e.target.value)}
                          placeholder="مثال: رئيس مجلس القسم العلمي"
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none"
                        />
                        <datalist id="admin-roles-list">
                          {DEFAULT_ADMINISTRATIVE_ROLES.map((r, idx) => (
                            <option key={idx} value={r} />
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          الجهة التابع لها التكليف
                        </label>
                        <input
                          type="text"
                          list="admin-facilities-list"
                          value={adminFacility}
                          onChange={(e) => setAdminFacility(e.target.value)}
                          placeholder="مثال: إدارة المستشفيات الجامعية"
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none"
                        />
                        <datalist id="admin-facilities-list">
                          {DEFAULT_ADMINISTRATIVE_FACILITIES.map((f, idx) => (
                            <option key={idx} value={f} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    ملاحظات على الموقف الوظيفي
                  </label>
                  <input
                    type="text"
                    value={employmentNotes}
                    onChange={(e) => setEmploymentNotes(e.target.value)}
                    placeholder="أي تفاصيل خاصة بالموقف الوظيفي..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between items-center pt-4">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>السابق: البيانات الشخصية</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm shadow-md shadow-teal-600/20 active:scale-95 transition-all"
                >
                  <span>التالي: الشهادات والدرجات العلمية</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CERTIFICATES & QUALIFICATIONS */}
          {activeStep === 3 && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-gray-800 p-6 sm:p-8 space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded-xl">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">الشهادات والمؤهلات والدرجات العلمية</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      يمكنك إضافة أكثر من شهادة (بكالوريوس، ماجستير، دكتوراه، زمالة، دبلومة...)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddCertificate}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-xl font-bold text-xs transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة مؤهل / شهادة علمية أخرى</span>
                </button>
              </div>

              {/* Certificates Cards */}
              <div className="space-y-6">
                {certificates.map((cert, index) => (
                  <div
                    key={cert.id}
                    className="p-5 sm:p-6 bg-slate-50/70 dark:bg-gray-800/50 rounded-2xl border border-slate-200 dark:border-gray-700 space-y-4 relative"
                  >
                    <div className="flex items-center justify-between border-b border-gray-200/60 dark:border-gray-700 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                          {index + 1}
                        </span>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                          المؤهل العلمي رقم ({index + 1})
                        </h4>
                      </div>

                      {certificates.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCertificate(cert.id)}
                          className="text-rose-600 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors flex items-center gap-1 text-xs font-semibold"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>حذف هذا المؤهل</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Certificate Type */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                          نوع المؤهل / الدرجة <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={cert.certificate_type}
                          onChange={(e) =>
                            handleUpdateCertificate(cert.id, 'certificate_type', e.target.value)
                          }
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none"
                        >
                          <option value="بكالوريوس">بكالوريوس</option>
                          <option value="ماجستير">ماجستير</option>
                          <option value="دكتوراه">دكتوراه</option>
                          <option value="زمالة">زمالة (Fellowship)</option>
                          <option value="دبلوم">دبلوم</option>
                          <option value="دبلومة">دبلومة</option>
                          <option value="شهادة مهنية">شهادة مهنية</option>
                          <option value="دورة تدريبية">دورة تدريبية متقدمة</option>
                          <option value="أخرى">أخرى</option>
                        </select>
                      </div>

                      {/* Certificate Title / Major */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                          التخصص أو عنوان المؤهل <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          list="cert-titles-list"
                          required
                          value={cert.certificate_title}
                          onChange={(e) =>
                            handleUpdateCertificate(cert.id, 'certificate_title', e.target.value)
                          }
                          placeholder="مثال: طب وجراحة الفم والأسنان، علاج الجذور، تقويم الأسنان..."
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none"
                        />
                      </div>

                      {/* University Name */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                          اسم الجامعة أو الجهة المانحة <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          list="univ-names-list"
                          required
                          value={cert.university_name}
                          onChange={(e) =>
                            handleUpdateCertificate(cert.id, 'university_name', e.target.value)
                          }
                          placeholder="مثال: جامعة المنصورة، الكلية الملكية للجراحين..."
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none"
                        />
                      </div>

                      {/* University Country */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                          الدولة
                        </label>
                        <input
                          type="text"
                          value={cert.university_country}
                          onChange={(e) =>
                            handleUpdateCertificate(cert.id, 'university_country', e.target.value)
                          }
                          placeholder="مثال: مصر، إنجلترا، السعودية"
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none"
                        />
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                          حالة المؤهل
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateCertificate(cert.id, 'status', 'obtained')}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              cert.status === 'obtained'
                                ? 'bg-teal-600 text-white shadow-sm'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>حاصل عليها</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateCertificate(cert.id, 'status', 'in_progress')}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              cert.status === 'in_progress'
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>قيد الدراسة</span>
                          </button>
                        </div>
                      </div>

                      {/* Dates */}
                      {cert.status === 'obtained' ? (
                        <div className="md:col-span-2">
                          <FlexibleDateInput
                            label="تاريخ الحصول على الشهادة / المؤهل"
                            value={cert.obtained_date}
                            onChange={(val) =>
                              handleUpdateCertificate(cert.id, 'obtained_date', val)
                            }
                            accentColor="emerald"
                            helperText="يمكنك اختيار (شهر/سنة) أو (سنة فقط) أو (تاريخ كامل)"
                          />
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                              تاريخ بدء القيد / الدراسة
                            </label>
                            <input
                              type="date"
                              value={cert.study_start_date}
                              onChange={(e) =>
                                handleUpdateCertificate(cert.id, 'study_start_date', e.target.value)
                              }
                              className="w-full px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                              تاريخ المناقشة / التخرج المتوقع
                            </label>
                            <input
                              type="date"
                              value={cert.expected_date}
                              onChange={(e) =>
                                handleUpdateCertificate(cert.id, 'expected_date', e.target.value)
                              }
                              className="w-full px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Datalists for Autocomplete */}
              <datalist id="cert-titles-list">
                {titleSuggestions.map((t, idx) => (
                  <option key={idx} value={t} />
                ))}
              </datalist>

              <datalist id="univ-names-list">
                {univSuggestions.map((u, idx) => (
                  <option key={idx} value={u} />
                ))}
              </datalist>

              {/* Navigation buttons */}
              <div className="flex justify-between items-center pt-4">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>السابق: الموقف الوظيفي</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveStep(4)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm shadow-md shadow-teal-600/20 active:scale-95 transition-all"
                >
                  <span>التالي: الدرجة المالية والترقيات</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: FINANCIAL GRADE & PROMOTIONS & SUBMIT */}
          {activeStep === 4 && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-gray-800 p-6 sm:p-8 space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="p-2 bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">الدرجة المالية والترقيات</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">حقول اختيارية لتوثيق الدرجة المالية والترقيات الوظيفية</p>
                </div>
              </div>

              {/* Financial Grade */}
              <div className="p-5 bg-slate-50/70 dark:bg-gray-800/50 rounded-2xl border border-slate-200 dark:border-gray-700 space-y-4">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-teal-600" />
                  <span>الدرجة المالية الحالية</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      الدرجة المالية
                    </label>
                    <input
                      type="text"
                      list="financial-grades-list"
                      value={financialGrade}
                      onChange={(e) => setFinancialGrade(e.target.value)}
                      placeholder="مثال: الدرجة الثانية، الدرجة الأولى (أ)..."
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none"
                    />
                    <datalist id="financial-grades-list">
                      {DEFAULT_FINANCIAL_GRADES.map((g, idx) => (
                        <option key={idx} value={g} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      تاريخ استحقاق الدرجة
                    </label>
                    <input
                      type="date"
                      value={financialGradeStartDate}
                      onChange={(e) => setFinancialGradeStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Promotions */}
              <div className="p-5 bg-slate-50/70 dark:bg-gray-800/50 rounded-2xl border border-slate-200 dark:border-gray-700 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span>الترقيات الوظيفية السابقة (إن وجدت)</span>
                  </h4>

                  <button
                    type="button"
                    onClick={handleAddPromotion}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة ترقية</span>
                  </button>
                </div>

                {promotions.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    لم تتم إضافة ترقيات بعد. يمكنك الضغط على "إضافة ترقية" لإدراج الترقيات الوظيفية السابقة.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {promotions.map((prom, pIdx) => (
                      <div
                        key={prom.id}
                        className="p-3.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-3 items-center"
                      >
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                            مسمى الترقية
                          </label>
                          <input
                            type="text"
                            list="promotions-list"
                            value={prom.promotion_type}
                            onChange={(e) =>
                              handleUpdatePromotion(prom.id, 'promotion_type', e.target.value)
                            }
                            placeholder="مثال: أخصائي، استشاري..."
                            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                            تاريخ الترقية
                          </label>
                          <input
                            type="date"
                            value={prom.promotion_date}
                            onChange={(e) =>
                              handleUpdatePromotion(prom.id, 'promotion_date', e.target.value)
                            }
                            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white outline-none"
                          />
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-4 md:pt-0">
                          <input
                            type="text"
                            value={prom.notes}
                            onChange={(e) =>
                              handleUpdatePromotion(prom.id, 'notes', e.target.value)
                            }
                            placeholder="ملاحظات..."
                            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePromotion(prom.id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <datalist id="promotions-list">
                  {DEFAULT_PROMOTION_TYPES.map((pr, idx) => (
                    <option key={idx} value={pr} />
                  ))}
                </datalist>
              </div>

              {/* Review & Submit Banner */}
              <div className="p-5 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border border-teal-200 dark:border-teal-800/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-teal-600 text-white rounded-xl shadow-md">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-teal-950 dark:text-teal-200">
                      جاهز لإرسال الاستمارة؟
                    </h4>
                    <p className="text-xs text-teal-800/80 dark:text-teal-300/80 mt-0.5">
                      تأكد من صحة كافة البيانات المدخلة قبل الضغط على زر الإرسال النهائي.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-600/30 active:scale-95 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جاري حفظ وإرسال البيانات...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>إرسال استمارة البيانات</span>
                    </>
                  )}
                </button>
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-start pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>السابق: الشهادات والدرجات العلمية</span>
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Footer info */}
        <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-4 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>منظومة إدارة عيادات ومستشفيات طب الأسنان - جميع الحقوق محفوظة</span>
        </div>
      </div>
    </div>
  );
}
