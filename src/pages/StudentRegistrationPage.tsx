import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  GraduationCap, User, Phone, CreditCard, MapPin, Building,
  Calendar, CheckCircle2, AlertCircle, Sparkles, Clock, Layers,
  ChevronDown, Send, ShieldCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ClassYear, WorkingDays } from '../types';
import { verifyOrgToken } from '../utils/tokenUtils';
import { cleanPhoneNumber, isValid11DigitPhone } from '../utils/phoneUtils';
import { extractBirthDateFromNationalId, calculateAge } from '../utils/doctorUtils';
import { DEFAULT_UNIVERSITIES, DEFAULT_ADDRESS_SUGGESTIONS } from '../utils/suggestionUtils';
import Swal from 'sweetalert2';

const OTHER_OPTION = '__other__';

export function StudentRegistrationPage() {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');
  const orgParam = searchParams.get('org');

  const tokenResult = useMemo(() => {
    return verifyOrgToken(tokenParam || orgParam);
  }, [tokenParam, orgParam]);

  const orgFromUrl = tokenResult.organizationId;
  const isLinkExpired = tokenResult.isExpired;
  const predefinedClassYearId = tokenResult.classYearId;
  const predefinedRegistrationStartDate = tokenResult.registrationStartDate;

  // Metadata lists from DB
  const [classYears, setClassYears] = useState<ClassYear[]>([]);
  const [workingDaysList, setWorkingDaysList] = useState<WorkingDays[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<string[]>(DEFAULT_ADDRESS_SUGGESTIONS);
  const [universitySuggestions, setUniversitySuggestions] = useState<string[]>(DEFAULT_UNIVERSITIES);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [submittedName, setSubmittedName] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [city, setCity] = useState('');
  const [university, setUniversity] = useState('');
  const [cityChoice, setCityChoice] = useState('');
  const [universityChoice, setUniversityChoice] = useState('');
  const [universityType, setUniversityType] = useState<'حكومي' | 'خاص' | 'اخري'>('حكومي');
  const [registrationStartDate, setRegistrationStartDate] = useState(predefinedRegistrationStartDate || '');
  const [registrationEndDate, setRegistrationEndDate] = useState('');
  const [classYearId, setClassYearId] = useState<string>(predefinedClassYearId || '');
  const workingDaysId = ''; // Assigned later by administration

  // Fetch Class Years and Working Days
  useEffect(() => {
    async function fetchMetadata() {
      if (!orgFromUrl) {
        setLoadingMeta(false);
        return;
      }
      try {
        setLoadingMeta(true);
        const [cyRes, wdRes, studentsRes] = await Promise.all([
          supabase.from('class_years').select('*').eq('organization_id', orgFromUrl).order('created_at', { ascending: false }),
          supabase.from('working_days').select('*').eq('organization_id', orgFromUrl).order('name', { ascending: true }),
          supabase.from('students').select('city, university').eq('organization_id', orgFromUrl)
        ]);

        if (cyRes.data) setClassYears(cyRes.data);
        if (wdRes.data) setWorkingDaysList(wdRes.data);
        if (studentsRes.data) {
          const cities = [...new Set(studentsRes.data.map(student => student.city?.trim()).filter(Boolean))] as string[];
          const universities = [...new Set(studentsRes.data.map(student => student.university?.trim()).filter(Boolean))] as string[];

          if (cities.length > 0) setCitySuggestions(cities.sort((a, b) => a.localeCompare(b, 'ar')));
          if (universities.length > 0) setUniversitySuggestions(universities.sort((a, b) => a.localeCompare(b, 'ar')));
        }
      } catch (err) {
        console.error('Error fetching registration metadata:', err);
      } finally {
        setLoadingMeta(false);
      }
    }

    fetchMetadata();
  }, [orgFromUrl]);

  // Set predefined class year when loaded
  useEffect(() => {
    if (predefinedClassYearId) {
      setClassYearId(predefinedClassYearId);
    }
  }, [predefinedClassYearId]);

  useEffect(() => {
    setRegistrationStartDate(predefinedRegistrationStartDate || '');
  }, [predefinedRegistrationStartDate]);

  // Auto-detect birth date when national ID reaches 14 digits
  useEffect(() => {
    const cleanedNatId = cleanPhoneNumber(nationalId);
    if (cleanedNatId.length === 14 && !birthDate) {
      const extracted = extractBirthDateFromNationalId(cleanedNatId);
      if (extracted) {
        setBirthDate(extracted);
      }
    }
  }, [nationalId, birthDate]);

  const calculatedAge = useMemo(() => {
    return calculateAge(birthDate);
  }, [birthDate]);

  const predefinedClassYearObj = useMemo(() => {
    return classYears.find(cy => cy.id === predefinedClassYearId) || null;
  }, [classYears, predefinedClassYearId]);

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
              عذراً، انتهت صلاحية رابط تسجيل الطلاب
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-md mx-auto">
              هذا الرابط تم إعداده بفترة صلاحية زمنية محددة وقد انتهت صلاحيته
              {tokenResult.expiresAt ? ` في ${tokenResult.expiresAt.toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' })}` : ''}.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              يرجى التواصل مع إدارة العيادة أو منسق الكلية لطلب رابط تسجيل جديد وصالح.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // SUCCESS CONFIRMATION SCREEN
  if (submittedSuccess) {
    const assignedClassYear = classYears.find(cy => cy.id === classYearId);
    const assignedWorkingDays = workingDaysList.find(wd => wd.id === workingDaysId);

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-indigo-100 dark:border-gray-700 p-8 text-center space-y-6 animate-fadeIn">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/80 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-50 dark:ring-emerald-900/30">
            <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800">
              <Sparkles className="w-3.5 h-3.5" />
              <span>تم استلام استمارة التسجيل بنجاح</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
              أهلاً بك، {submittedName}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-md mx-auto">
              تم تسجيل بياناتكم بنجاح في منظومة العيادات. سيتم مراجعة الطلب وتفعيل الحساب من قبل الإدارة.
            </p>
          </div>

          {/* Details Card */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-700 text-start space-y-2 text-xs text-gray-700 dark:text-gray-300">
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">الاسم:</span>
              <span className="font-bold">{submittedName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">الفرقة الدراسية:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{assignedClassYear?.year_range || 'غير محدد'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">أيام العمل:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {assignedWorkingDays ? `${assignedWorkingDays.name} (${assignedWorkingDays.days.join(', ')})` : 'اختياري - لم تحدد بعد'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500 dark:text-gray-400">حالة الطلب:</span>
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 rounded-md font-bold text-[11px]">
                قيد الانتظار (Pending)
              </span>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate full name (at least 4 parts)
    const cleanName = name.trim();
    if (!cleanName) {
      Swal.fire({
        icon: 'warning',
        title: 'الاسم مطلوب',
        text: 'يرجى إدخال اسم الطالب بالكامل.'
      });
      return;
    }
    const nameParts = cleanName.split(/\s+/).filter(Boolean);
    if (nameParts.length < 4) {
      Swal.fire({
        icon: 'warning',
        title: 'الاسم غير مكتمل',
        text: `يجب كتابة الاسم رباعياً على الأقل (أدخلت ${nameParts.length} أسماء - مثال: أحمد محمد محمود إبراهيم).`
      });
      return;
    }

    // 2. Validate mobile (exactly 11 digits, normalized)
    const cleanPhone = cleanPhoneNumber(mobile);
    if (!cleanPhone) {
      Swal.fire({
        icon: 'warning',
        title: 'رقم الموبايل مطلوب',
        text: 'يرجى إدخال رقم الموبايل (11 رقماً).'
      });
      return;
    }
    if (!isValid11DigitPhone(cleanPhone)) {
      Swal.fire({
        icon: 'warning',
        title: 'رقم الموبايل غير صحيح',
        text: `يجب أن يتكون رقم الموبايل من 11 رقماً بالضبط (أدخلت ${cleanPhone.length} رقماً - مثال: 01012345678).`
      });
      return;
    }

    // 3. Validate national ID if entered (optional, 14 digits)
    const cleanNatId = cleanPhoneNumber(nationalId);
    if (cleanNatId && (cleanNatId.length !== 14 || !/^\d{14}$/.test(cleanNatId))) {
      Swal.fire({
        icon: 'warning',
        title: 'الرقم القومي غير صحيح',
        text: `الرقم القومي اختياري، ولكن في حال إدخاله يجب أن يتكون من 14 رقماً بالضبط (أدخلت ${cleanNatId.length} رقماً).`
      });
      return;
    }

    // 4. Validate city and university
    if (!city.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'المدينة مطلوبة',
        text: 'يرجى إدخال المدينة أو المحافظة.'
      });
      return;
    }

    if (!university.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'الجامعة مطلوبة',
        text: 'يرجى إدخال اسم الجامعة أو الكلية.'
      });
      return;
    }

    if (registrationStartDate && registrationEndDate && registrationEndDate < registrationStartDate) {
      Swal.fire({
        icon: 'warning',
        title: 'فترة التسجيل غير صحيحة',
        text: 'يجب أن يكون تاريخ نهاية التسجيل في نفس تاريخ البداية أو بعده.'
      });
      return;
    }

    if (!orgFromUrl) {
      Swal.fire({
        icon: 'error',
        title: 'رابط غير صالح',
        text: 'معرف المنظومة غير موجود في الرابط. يرجى طلب رابط جديد.'
      });
      return;
    }

    try {
      setSubmitting(true);

      // Check mobile uniqueness for this organization
      const { data: existingMobile, error: checkMobileErr } = await supabase
        .from('students')
        .select('id, name')
        .eq('mobile', cleanPhone)
        .eq('organization_id', orgFromUrl)
        .maybeSingle();

      if (!checkMobileErr && existingMobile) {
        Swal.fire({
          icon: 'warning',
          title: 'رقم الهاتف مسجل مسبقاً',
          text: `رقم الهاتف مسجل بالفعل للطالب: ${existingMobile.name}`
        });
        setSubmitting(false);
        return;
      }

      // Prepare payload
      const studentPayload: any = {
        name: cleanName,
        mobile: cleanPhone,
        city: city.trim(),
        university: university.trim(),
        university_type: universityType,
        working_days_id: null,
        class_year_id: predefinedClassYearId || null,
        registration_start_date: registrationStartDate || null,
        registration_end_date: registrationEndDate || null,
        organization_id: orgFromUrl,
        registration_status: 'pending',
        is_available: true,
        patients_in_progress: 0,
        patients_completed: 0,
        birth_date: birthDate ? birthDate.trim() : null,
        national_id: cleanNatId || null,
        created_at: new Date().toISOString(),
      };

      // Attempt insert with new columns (defensive fallback if columns don't exist yet in DB)
      let insertRes = await supabase.from('students').insert([studentPayload]);

      if (insertRes.error) {
        // If error 42703 (column doesn't exist), retry without birth_date & national_id
        if (insertRes.error.code === '42703' || insertRes.error.message?.includes('national_id') || insertRes.error.message?.includes('birth_date')) {
          const fallbackPayload = { ...studentPayload };
          delete fallbackPayload.birth_date;
          delete fallbackPayload.national_id;
          insertRes = await supabase.from('students').insert([fallbackPayload]);
        }
      }

      if (insertRes.error) {
        throw insertRes.error;
      }

      setSubmittedName(cleanName);
      setSubmittedSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err: any) {
      console.error('Error registering student:', err);
      Swal.fire({
        icon: 'error',
        title: 'حدث خطأ أثناء التسجيل',
        text: err?.message || 'يرجى المحاولة مرة أخرى أو مراجعة إدارة العيادة.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 py-6 sm:py-10 px-3.5 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Brand Header */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-gray-800 p-5 sm:p-8 relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-start">
            <div className="p-3.5 sm:p-4 bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl shadow-lg shadow-indigo-600/20 shrink-0">
              <GraduationCap className="w-8 h-8 sm:w-9 sm:h-9" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold border border-indigo-200/60 dark:border-indigo-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>استمارة تسجيل الطلاب الرسمية</span>
                </div>
                {tokenResult.expiresAt && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold border border-purple-200/60 dark:border-purple-800">
                    <Clock className="w-3.5 h-3.5 text-purple-500" />
                    <span>صالح حتى: {tokenResult.expiresAt.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                )}
                {predefinedClassYearObj && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 rounded-full text-xs font-bold border border-pink-200/60 dark:border-pink-800">
                    <Layers className="w-3.5 h-3.5 text-pink-500" />
                    <span>الفرقة: {predefinedClassYearObj.year_range}</span>
                  </div>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                استمارة تسجيل بيانات الطلاب والأطباء المتدربين
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                يرجى كتابة البيانات الشخصية وأرقام التواصل بدقة للانضمام لمنظومة تدريب وعيادات الأسنان.
              </p>
            </div>
          </div>
        </div>

        {/* Registration Form Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-gray-800 p-5 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              
              {/* Full Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                  اسم الطالب بالكامل (رباعي على الأقل) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute right-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: أحمد محمد محمود إبراهيم"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <p className="text-[10.5px] text-gray-500 mt-1">يجب أن يتكون الاسم من 4 مقاطع على الأقل لتسجيل السجل الأكاديمي.</p>
              </div>

              {/* Mobile Phone (11 numbers) */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                  رقم الموبايل / الواتساب (11 رقماً) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute right-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    maxLength={11}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="01012345678"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                  />
                </div>
                <p className="text-[10.5px] text-gray-500 mt-1">يجب أن يتكون من 11 رقماً للتواصل وإرسال الحالات.</p>
              </div>

              {/* National ID (Optional - 14 digits) */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                  الرقم القومي <span className="text-xs font-normal text-gray-400">(اختياري - 14 رقماً)</span>
                </label>
                <div className="relative">
                  <CreditCard className="absolute right-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    maxLength={14}
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="29901011234567"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                  />
                </div>
                <p className="text-[10.5px] text-gray-500 mt-1">عند كتابة 14 رقماً يتم استنتاج تاريخ الميلاد تلقائياً.</p>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                  تاريخ الميلاد <span className="text-xs font-normal text-gray-400">{calculatedAge ? `(${calculatedAge} سنة)` : ''}</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute right-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Registration Period */}
              <div className="sm:col-span-2 p-4 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/60 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-200">
                      فترة التسجيل
                    </h3>
                    <p className="text-[10.5px] text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
                      {predefinedRegistrationStartDate
                        ? 'تم تحديد تاريخ البداية مسبقاً من الإدارة. يمكنك تحديد تاريخ النهاية فقط.'
                        : 'يمكنك تحديد تاريخ بداية ونهاية التسجيل.'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                      تاريخ بداية التسجيل
                    </label>
                    <input
                      type="date"
                      value={registrationStartDate}
                      onChange={(e) => setRegistrationStartDate(e.target.value)}
                      disabled={Boolean(predefinedRegistrationStartDate)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm outline-none transition-all ${
                        predefinedRegistrationStartDate
                          ? 'bg-gray-100 dark:bg-gray-800/60 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 cursor-not-allowed font-bold'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                      تاريخ نهاية التسجيل
                    </label>
                    <input
                      type="date"
                      value={registrationEndDate}
                      min={registrationStartDate || undefined}
                      onChange={(e) => setRegistrationEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* City / Governorate */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                  المحافظة / المدينة <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute right-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    required
                    value={cityChoice}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCityChoice(value);
                      setCity(value === OTHER_OPTION ? '' : value);
                    }}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  >
                    <option value="" disabled>-- اختر المدينة / المحافظة --</option>
                    {citySuggestions.map((suggestion) => <option key={suggestion} value={suggestion}>{suggestion}</option>)}
                    <option value={OTHER_OPTION}>أخرى (اكتب مدينة جديدة)</option>
                  </select>
                </div>
                {cityChoice === OTHER_OPTION && (
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="اكتب المدينة أو المحافظة"
                    className="w-full mt-2 px-3.5 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                )}
              </div>

              {/* University */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                  الجامعة / الكلية <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building className="absolute right-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    required
                    value={universityChoice}
                    onChange={(e) => {
                      const value = e.target.value;
                      setUniversityChoice(value);
                      setUniversity(value === OTHER_OPTION ? '' : value);
                    }}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  >
                    <option value="" disabled>-- اختر الجامعة / الكلية --</option>
                    {universitySuggestions.map((suggestion) => <option key={suggestion} value={suggestion}>{suggestion}</option>)}
                    <option value={OTHER_OPTION}>أخرى (اكتب جامعة أو كلية جديدة)</option>
                  </select>
                </div>
                {universityChoice === OTHER_OPTION && (
                  <input
                    type="text"
                    required
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="اكتب اسم الجامعة أو الكلية"
                    className="w-full mt-2 px-3.5 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                )}
              </div>

              {/* University Type */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                  نوع الجامعة <span className="text-rose-500">*</span>
                </label>
                <select
                  value={universityType}
                  onChange={(e) => setUniversityType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  <option value="حكومي">حكومي</option>
                  <option value="خاص">خاص</option>
                  <option value="اخري">أخرى</option>
                </select>
              </div>

              {/* Class Year */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5 flex items-center justify-between">
                  <span>الفرقة الدراسية (Class Year)</span>
                  {predefinedClassYearObj && (
                    <span className="text-[10.5px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md">
                      محددة مسبقاً من الإدارة
                    </span>
                  )}
                </label>
                <select
                  value={classYearId}
                  disabled
                  className="w-full p-2.5 rounded-xl border transition-all text-xs sm:text-sm outline-none bg-purple-50/50 dark:bg-purple-950/20 border-purple-300 dark:border-purple-800 text-purple-950 dark:text-purple-200 cursor-not-allowed font-bold"
                >
                  <option value="">-- اختر الفرقة الدراسية --</option>
                  {classYears.map((cy) => (
                    <option key={cy.id} value={cy.id}>
                      {cy.year_range}
                    </option>
                  ))}
                </select>
              </div>

              {/* Working Days (OPTIONAL - CAN BE CHOSEN LATER) */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5 flex items-center justify-between">
                  <span>أيام العمل في العيادات</span>
                  <span className="text-[10.5px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                    اختياري (يمكن تحديدها لاحقاً)
                  </span>
                </label>
                <select
                  value={workingDaysId}
                  disabled
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-xs sm:text-sm cursor-not-allowed"
                >
                  <option value="">-- لم يتم التحديد بعد (اختياري - يمكن اختيارها لاحقاً) --</option>
                </select>
                <p className="text-[10.5px] text-gray-500 mt-1">
                  يمكن ترك هذا الحقل فارغاً الآن وتحديد أيام العمل لاحقاً من قبل إدارة العيادة.
                </p>
              </div>

            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/25 active:scale-98 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'جاري إرسال البيانات...' : 'إرسال استمارة التسجيل'}</span>
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}

