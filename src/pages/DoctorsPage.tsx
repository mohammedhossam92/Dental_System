import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, UserPlus, Search, Filter, Download, Award, Clock,
  CheckCircle2, ShieldCheck, ChevronDown, RefreshCw, Layers,
  Phone, CreditCard, Building, Calendar, Edit, Trash2, Eye,
  Sparkles, X, LayoutGrid, List, MapPin, Briefcase, ArrowLeftRight, Globe,
  GraduationCap, BookOpen, UserCheck, BarChart3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type {
  Doctor, DoctorWithDetails, University, CertificateType,
  DoctorFilterState, DoctorCertificate, DoctorEmploymentHistory
} from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { WhatsAppButton } from '../components/common/WhatsAppButton';
import {
  getCertificateSummary, getCurrentEmploymentStatus,
  formatDate, getYearFromDate, formatDisplayValue
} from '../utils/doctorUtils';
import { DEFAULT_CERTIFICATE_TITLES } from '../utils/suggestionUtils';
import { DoctorFormModal } from '../components/doctors/DoctorFormModal';
import { DoctorDetailsModal } from '../components/doctors/DoctorDetailsModal';
import { DoctorExportModal } from '../components/doctors/DoctorExportModal';
import { DoctorExportDropdown } from '../components/doctors/DoctorExportDropdown';
import { DoctorDetailedStatsModal } from '../components/doctors/DoctorDetailedStatsModal';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

export function DoctorsPage() {
  const { t, language } = useLanguage();
  const { organizationId } = useAuth();

  const [doctors, setDoctors] = useState<DoctorWithDetails[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [certificateTypes, setCertificateTypes] = useState<CertificateType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // View state - DEFAULT IS CARDS (GRID) FOR BOTH DESKTOP AND MOBILE
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Modals state
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDoctorForExport, setSelectedDoctorForExport] = useState<DoctorWithDetails | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDetailedStatsOpen, setIsDetailedStatsOpen] = useState(false);

  // Filter State
  const [filters, setFilters] = useState<DoctorFilterState>({
    search: '',
    sortBy: 'recently_added',
    confirmationStatus: 'all',
    dutyStatus: 'all',
    employmentStatus: 'all',
    administrativeDuty: 'all',
    certificateType: 'all',
    certificateTitle: '',
    certificateStatus: 'all',
    university: 'all',
    obtainedYear: 'all',
    promotionType: 'all',
    financialGrade: 'all',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch doctors, certificates, employment history, promotions, grades, universities, and cert types in parallel
      const [
        docsRes,
        historyRes,
        certsRes,
        promsRes,
        gradesRes,
        univsRes,
        typesRes
      ] = await Promise.all([
        supabase.from('doctors').select('*').order('created_at', { ascending: false }),
        supabase.from('doctor_employment_history').select('*').order('created_at', { ascending: false }),
        supabase.from('doctor_certificates').select('*').order('created_at', { ascending: false }),
        supabase.from('doctor_promotions').select('*').order('created_at', { ascending: false }),
        supabase.from('doctor_financial_grades').select('*').order('created_at', { ascending: false }),
        supabase.from('universities').select('*').order('name'),
        supabase.from('certificate_types').select('*').order('name')
      ]);

      if (docsRes.error) throw docsRes.error;

      const rawDoctors = docsRes.data || [];
      const allHistory = historyRes.data || [];
      const allCerts = certsRes.data || [];
      const allProms = promsRes.data || [];
      const allGrades = gradesRes.data || [];

      // Combine relational data for fast searching and structured filtering
      const doctorsWithDetails: DoctorWithDetails[] = rawDoctors.map((doc) => {
        const docHistory = allHistory.filter((h) => h.doctor_id === doc.id);
        const docCerts = allCerts.filter((c) => c.doctor_id === doc.id);
        const docProms = allProms.filter((p) => p.doctor_id === doc.id);
        const docGrades = allGrades.filter((g) => g.doctor_id === doc.id);
        const current_status = getCurrentEmploymentStatus(docHistory);
        const current_financial_grade = docGrades.find(g => !g.end_date) || docGrades[0] || null;

        return {
          ...doc,
          employment_history: docHistory,
          certificates: docCerts,
          promotions: docProms,
          financial_grades: docGrades,
          current_status,
          current_financial_grade,
        };
      });

      setDoctors(doctorsWithDetails);
      setUniversities(univsRes.data || []);
      setCertificateTypes(typesRes.data || []);
    } catch (err: any) {
      console.error('Error loading doctors data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Unique list of years from all certificates for year filtering
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    doctors.forEach((d) => {
      d.certificates?.forEach((c) => {
        if (c.obtained_date) {
          const yr = getYearFromDate(c.obtained_date);
          if (yr) years.add(yr);
        }
      });
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [doctors]);

  // Dynamic list of entered certificate titles / specialties grouped by selected certificate type
  const specialtiesData = useMemo(() => {
    const selectedType = filters.certificateType || 'all';
    const enteredTitles = new Set<string>();

    doctors.forEach((d) => {
      d.certificates?.forEach((c) => {
        if (!c.certificate_title || !c.certificate_title.trim()) return;
        const title = c.certificate_title.trim();
        if (selectedType === 'all') {
          enteredTitles.add(title);
        } else if (c.certificate_type === selectedType) {
          enteredTitles.add(title);
        }
      });
    });

    const enteredList = Array.from(enteredTitles).sort((a, b) => a.localeCompare(b, 'ar'));
    const remainingDefaults = DEFAULT_CERTIFICATE_TITLES.filter(
      (dt) => !enteredTitles.has(dt)
    );

    return {
      enteredCount: enteredList.length,
      enteredList,
      defaultList: remainingDefaults,
      allCombined: [...enteredList, ...remainingDefaults]
    };
  }, [doctors, filters.certificateType]);

  // Filtered Doctors Logic
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      // 0. Filter by Confirmation Status
      if (filters.confirmationStatus && filters.confirmationStatus !== 'all') {
        if (filters.confirmationStatus === 'confirmed' && !doc.is_confirmed) return false;
        if (filters.confirmationStatus === 'unconfirmed' && doc.is_confirmed) return false;
      }

      // 1. Universal Search (Name, National ID, Phone, University, Certificate Title, Address)
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase().trim();
        const matchesName = doc.name?.toLowerCase().includes(query);
        const matchesNationalId = doc.national_id?.toLowerCase().includes(query);
        const matchesPhone = doc.phone?.toLowerCase().includes(query);
        const matchesAddress = doc.address?.toLowerCase().includes(query);
        const matchesCertTitle = doc.certificates?.some((c) =>
          c.certificate_title?.toLowerCase().includes(query)
        );
        const matchesUniv = doc.certificates?.some((c) =>
          c.university_name?.toLowerCase().includes(query)
        );

        if (!matchesName && !matchesNationalId && !matchesPhone && !matchesAddress && !matchesCertTitle && !matchesUniv) {
          return false;
        }
      }

      // 2. Filter by Workforce / Duty Status (على رأس العمل vs في إجازة)
      const currentStatusType = doc.current_status?.status_type || 'قوة أساسية';
      if (filters.dutyStatus && filters.dutyStatus !== 'all') {
        if (filters.dutyStatus === 'active_duty') {
          // On active duty = not on leave and not terminated
          if (currentStatusType === 'إجازة' || currentStatusType === 'إنهاء خدمة') return false;
        } else if (filters.dutyStatus === 'on_leave') {
          // On leave only
          if (currentStatusType !== 'إجازة') return false;
        }
      }

      // 3. Filter by Detailed Employment Status
      if (filters.employmentStatus !== 'all') {
        const currentDeputationDir = doc.current_status?.deputation_direction;
        if (filters.employmentStatus === 'انتداب_إلى_المستشفى') {
          if (currentStatusType !== 'انتداب' && currentStatusType !== 'ندب') return false;
          if (currentDeputationDir !== 'منتدب إلى المستشفى') return false;
        } else if (filters.employmentStatus === 'انتداب_خارج_المستشفى') {
          if (currentStatusType !== 'انتداب' && currentStatusType !== 'ندب') return false;
          if (currentDeputationDir !== 'منتدب من المستشفى إلى الخارج') return false;
        } else if (filters.employmentStatus === 'انتداب') {
          if (currentStatusType !== 'انتداب' && currentStatusType !== 'ندب') return false;
        } else if (currentStatusType !== filters.employmentStatus) {
          return false;
        }
      }

      // 4. Filter by Administrative Duty
      if (filters.administrativeDuty !== 'all') {
        const hasAdmin = doc.current_status?.has_administrative_duty;
        const scope = doc.current_status?.administrative_scope;
        const role = doc.current_status?.administrative_role;

        if (filters.administrativeDuty === 'has_admin') {
          if (!hasAdmin) return false;
        } else if (filters.administrativeDuty === 'inside_dept') {
          if (!hasAdmin || scope !== 'داخل القسم') return false;
        } else if (filters.administrativeDuty === 'outside_dept') {
          if (!hasAdmin || scope !== 'خارج القسم') return false;
        } else if (filters.administrativeDuty === 'head_of_dept') {
          if (!hasAdmin || !role?.includes('رئيس القسم')) return false;
        } else if (filters.administrativeDuty === 'no_admin') {
          if (hasAdmin) return false;
        }
      }

      // 5. Filter by Academic Qualifications (Degree Type, Specialty / Title, Status, University, Year)
      const hasCertType = filters.certificateType && filters.certificateType !== 'all';
      const hasCertTitle = !!filters.certificateTitle?.trim();
      const hasCertStatus = filters.certificateStatus && filters.certificateStatus !== 'all';
      const hasCertUniv = filters.university && filters.university !== 'all';
      const hasCertYear = filters.obtainedYear && filters.obtainedYear !== 'all';

      if (hasCertType || hasCertTitle || hasCertStatus || hasCertUniv || hasCertYear) {
        const titleQuery = filters.certificateTitle?.toLowerCase().trim() || '';
        const matchesCertificate = doc.certificates?.some((c) => {
          if (hasCertType && c.certificate_type !== filters.certificateType) return false;
          if (hasCertTitle && !c.certificate_title?.toLowerCase().includes(titleQuery)) return false;
          if (hasCertStatus && c.status !== filters.certificateStatus) return false;
          if (hasCertUniv && c.university_name !== filters.university) return false;
          if (hasCertYear) {
            if (!c.obtained_date) return false;
            if (getYearFromDate(c.obtained_date) !== filters.obtainedYear) return false;
          }
          return true;
        });

        if (!matchesCertificate) return false;
      }

      // 6. Filter by Promotion / Professional Rank
      if (filters.promotionType && filters.promotionType !== 'all') {
        const hasPromotion = doc.promotions?.some((p) =>
          p.promotion_type.toLowerCase().includes(filters.promotionType!.toLowerCase())
        );
        if (!hasPromotion) return false;
      }

      // 7. Filter by Financial Grade
      if (filters.financialGrade && filters.financialGrade !== 'all') {
        const hasGrade = doc.financial_grades?.some((g) =>
          g.financial_grade.toLowerCase().includes(filters.financialGrade!.toLowerCase())
        );
        if (!hasGrade) return false;
      }

      return true;
    });

    // Apply Sorting
    const sortBy = filters.sortBy || 'recently_added';

    return [...filtered].sort((a, b) => {
      if (sortBy === 'recently_added') {
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        return timeB - timeA;
      }
      if (sortBy === 'oldest') {
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        return timeA - timeB;
      }
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name, 'ar');
      }
      if (sortBy === 'name_desc') {
        return b.name.localeCompare(a.name, 'ar');
      }
      if (sortBy === 'hire_date_desc') {
        return (b.hire_date || '').localeCompare(a.hire_date || '');
      }
      if (sortBy === 'grad_date_desc') {
        return (b.graduation_date || '').localeCompare(a.graduation_date || '');
      }
      return 0;
    });
  }, [doctors, filters]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = doctors.length;
    const confirmed = doctors.filter((d) => d.is_confirmed).length;
    const unconfirmed = doctors.filter((d) => !d.is_confirmed).length;
    const onLeave = doctors.filter((d) => {
      const st = d.current_status?.status_type;
      return st === 'إجازة';
    }).length;
    const activeDuty = doctors.filter((d) => {
      const st = d.current_status?.status_type || 'قوة أساسية';
      return st !== 'إجازة' && st !== 'إنهاء خدمة';
    }).length;
    const coreStaff = doctors.filter(
      (d) => (d.current_status?.status_type || 'قوة أساسية') === 'قوة أساسية'
    ).length;
    const deputed = doctors.filter((d) => {
      const st = d.current_status?.status_type;
      return st === 'انتداب' || st === 'ندب';
    }).length;
    const loaned = doctors.filter((d) => {
      const st = d.current_status?.status_type;
      return st === 'إعارة';
    }).length;
    const higherDegrees = doctors.filter((d) =>
      d.certificates?.some(
        (c) => c.status === 'obtained' && (c.certificate_type.includes('ماجستير') || c.certificate_type.includes('دكتوراه') || c.certificate_type.includes('زمالة'))
      )
    ).length;
    const inStudy = doctors.filter((d) =>
      d.certificates?.some((c) => c.status === 'in_progress')
    ).length;
    const adminStaff = doctors.filter(
      (d) => d.current_status?.has_administrative_duty
    ).length;

    return { total, confirmed, unconfirmed, activeDuty, onLeave, coreStaff, deputed, loaned, higherDegrees, inStudy, adminStaff };
  }, [doctors]);

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredDoctors.map((doc) => {
        const certsSummary = doc.certificates?.map((c) => getCertificateSummary(c, 'ar')).join(' | ') || '';
        const currentStatus = doc.current_status?.status_type || 'قوة أساسية';

        return {
          'اسم الطبيب': doc.name,
          'حالة تدقيق وتأكيد البيانات': doc.is_confirmed ? 'مؤكدة ومدققة' : 'غير مؤكدة (قيد المراجعة)',
          'الرقم القومي': doc.national_id || '',
          'رقم الهاتف': doc.phone || '',
          'الحالة الوظيفية الحالية': currentStatus,
          'جهة / اتجاه الانتداب': doc.current_status?.deputation_direction || '',
          'الجهة المنتدب منها / إليها': doc.current_status?.deputation_facility || '',
          'العمل الإداري': doc.current_status?.has_administrative_duty ? (doc.current_status?.administrative_role || 'نعم') : 'لا',
          'نطاق العمل الإداري': doc.current_status?.has_administrative_duty ? (doc.current_status?.administrative_scope || '') : '',
          'المسمى / المنصب الإداري': doc.current_status?.has_administrative_duty ? (doc.current_status?.administrative_role || '') : '',
          'جهة العمل الإداري الخارجي': (doc.current_status?.has_administrative_duty && doc.current_status?.administrative_scope === 'خارج القسم') ? (doc.current_status?.administrative_facility || '') : '',
          'تاريخ استلام العمل': doc.hire_date || '',
          'تاريخ التخرج': doc.graduation_date || '',
          'تاريخ الميلاد': doc.birth_date || '',
          'العنوان': doc.address || '',
          'الشهادات والدرجات العلمية': certsSummary,
          'ملاحظات': doc.notes || '',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل الأطباء والشهادات');
      XLSX.writeFile(workbook, `doctors_registry_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err: any) {
      console.error('Export error:', err);
      Swal.fire({ icon: 'error', title: t('error'), text: 'فشل تصدير ملف Excel' });
    }
  };

  const handleToggleConfirmation = async (e: React.MouseEvent, doctorId: string, currentStatus?: boolean | null) => {
    e.stopPropagation();
    const newStatus = !currentStatus;

    // Optimistic update
    setDoctors((prev) =>
      prev.map((d) => (d.id === doctorId ? { ...d, is_confirmed: newStatus } : d))
    );

    try {
      const { error } = await supabase
        .from('doctors')
        .update({ is_confirmed: newStatus, updated_at: new Date().toISOString() })
        .eq('id', doctorId);

      if (error) throw error;

      const toast = Swal.mixin({
        toast: true,
        position: language === 'ar' ? 'top-start' : 'top-end',
        showConfirmButton: false,
        timer: 1500,
      });
      toast.fire({
        icon: newStatus ? 'success' : 'info',
        title: newStatus ? t('doctorConfirmedSuccess') : t('doctorUnconfirmedSuccess')
      });
    } catch (err: any) {
      // Rollback on error
      setDoctors((prev) =>
        prev.map((d) => (d.id === doctorId ? { ...d, is_confirmed: currentStatus } : d))
      );
      Swal.fire({
        icon: 'error',
        title: t('error'),
        text: err.message || t('errorSaving'),
        confirmButtonColor: '#4f46e5'
      });
    }
  };

  const handleDeleteDoctor = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: t('areYouSure'),
      text: `${t('deleteDoctorConfirm')} (${name})`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t('yesDelete'),
      cancelButtonText: t('cancel'),
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('doctors').delete().eq('id', id);
        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: t('deleted'),
          text: t('doctorDeletedSuccess'),
          timer: 1300,
          showConfirmButton: false,
        });
        fetchData();
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: t('error'),
          text: err.message || t('errorSaving'),
        });
      }
    }
  };

  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case 'قوة أساسية':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'انتداب':
      case 'ندب':
        return 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800';
      case 'إعارة':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'إجازة':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'إنهاء خدمة':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const activeFiltersCount = [
    filters.confirmationStatus && filters.confirmationStatus !== 'all',
    filters.dutyStatus && filters.dutyStatus !== 'all',
    filters.employmentStatus !== 'all',
    filters.administrativeDuty !== 'all',
    filters.certificateType !== 'all',
    !!filters.certificateTitle?.trim(),
    filters.certificateStatus !== 'all',
    filters.university !== 'all',
    filters.obtainedYear !== 'all',
    filters.promotionType && filters.promotionType !== 'all',
    filters.financialGrade && filters.financialGrade !== 'all',
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setFilters({
      search: '',
      sortBy: 'recently_added',
      confirmationStatus: 'all',
      dutyStatus: 'all',
      employmentStatus: 'all',
      administrativeDuty: 'all',
      certificateType: 'all',
      certificateTitle: '',
      certificateStatus: 'all',
      university: 'all',
      obtainedYear: 'all',
      promotionType: 'all',
      financialGrade: 'all',
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      
      {/* Page Title & Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>{t('doctors')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
            {language === 'ar' 
              ? 'إدارة بيانات الأطباء والسجل الوظيفي والشهادات العلمية والترقيات والدرجات المالية' 
              : 'Doctor profiles, employment timeline, certificates & career progression'}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsDetailedStatsOpen(true)}
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200 dark:border-purple-800/80 hover:border-purple-300 text-purple-700 dark:text-purple-300 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 shadow-sm transition-all hover:shadow hover:scale-[1.02] active:scale-95"
            title={language === 'ar' ? 'عرض التقرير الإحصائي والتفصيلي للدرجات والتخصصات' : 'View Detailed Statistics & Degrees Report'}
          >
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
            <span>{language === 'ar' ? 'التقرير الإحصائي والتفصيلي' : 'Detailed Report'}</span>
          </button>

          <button
            onClick={() => {
              setRefreshing(true);
              fetchData();
            }}
            className="p-2 sm:p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl shadow-sm transition-all"
            title={t('search')}
          >
            <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
            <span>{language === 'ar' ? 'تصدير Excel' : 'Export'}</span>
          </button>

          <button
            onClick={() => setIsAddDoctorOpen(true)}
            className="flex-1 sm:flex-initial px-3.5 sm:px-5 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg shadow-indigo-600/30 transition-all transform hover:-translate-y-0.5"
          >
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{t('addDoctor')}</span>
          </button>
        </div>
      </div>

      {/* Top Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-10 gap-2 sm:gap-2.5">
        {/* Total Doctors */}
        <button
          type="button"
          onClick={clearAllFilters}
          className={`p-2.5 sm:p-3 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border text-start flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 group ${
            activeFiltersCount === 0 && !filters.search
              ? 'border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20'
              : 'border-gray-200 dark:border-gray-700'
          }`}
          title={language === 'ar' ? 'عرض كافة الأطباء' : 'View all doctors'}
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 w-full">
            <span className="text-[11px] sm:text-xs font-semibold truncate">{t('totalDoctors')}</span>
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-1.5">{stats.total}</p>
        </button>

        {/* Active Workforce / On Duty */}
        <button
          type="button"
          onClick={() => setFilters((prev) => ({ ...prev, dutyStatus: prev.dutyStatus === 'active_duty' ? 'all' : 'active_duty', employmentStatus: prev.employmentStatus === 'إجازة' ? 'all' : prev.employmentStatus }))}
          className={`p-2.5 sm:p-3 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border text-start flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 group ${
            filters.dutyStatus === 'active_duty'
              ? 'border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/30'
              : 'border-gray-200 dark:border-gray-700'
          }`}
          title={language === 'ar' ? 'تصفية: على رأس العمل (غير مجازين)' : 'Filter: Active Workforce (Not on leave)'}
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 w-full">
            <span className="text-[11px] sm:text-xs font-semibold truncate text-emerald-700 dark:text-emerald-400">{t('activeWorkforce')}</span>
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">{stats.activeDuty}</p>
        </button>

        {/* On Leave */}
        <button
          type="button"
          onClick={() => setFilters((prev) => ({ ...prev, dutyStatus: prev.dutyStatus === 'on_leave' ? 'all' : 'on_leave', employmentStatus: 'all' }))}
          className={`p-2.5 sm:p-3 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border text-start flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 group ${
            filters.dutyStatus === 'on_leave' || filters.employmentStatus === 'إجازة'
              ? 'border-amber-400 dark:border-amber-600 ring-2 ring-amber-500/20 bg-amber-50/30 dark:bg-amber-950/20'
              : 'border-gray-200 dark:border-gray-700'
          }`}
          title={language === 'ar' ? 'تصفية: الأطباء في إجازة فقط' : 'Filter: On Leave Only'}
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 w-full">
            <span className="text-[11px] sm:text-xs font-semibold truncate text-amber-700 dark:text-amber-400">{t('onLeave')}</span>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400 mt-1.5">{stats.onLeave}</p>
        </button>

        {/* Core Staff */}
        <button
          type="button"
          onClick={() => setFilters((prev) => ({ ...prev, employmentStatus: prev.employmentStatus === 'قوة أساسية' ? 'all' : 'قوة أساسية' }))}
          className={`p-2.5 sm:p-3 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border text-start flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 group ${
            filters.employmentStatus === 'قوة أساسية'
              ? 'border-teal-400 dark:border-teal-600 ring-2 ring-teal-500/20 bg-teal-50/30 dark:bg-teal-950/20'
              : 'border-gray-200 dark:border-gray-700'
          }`}
          title={language === 'ar' ? 'تصفية: قوة أساسية' : 'Filter: Core Staff'}
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 w-full">
            <span className="text-[11px] sm:text-xs font-semibold truncate">{t('coreStaff')}</span>
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform shrink-0" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-teal-600 dark:text-teal-400 mt-1.5">{stats.coreStaff}</p>
        </button>

        {/* Deputation */}
        <button
          type="button"
          onClick={() => setFilters((prev) => ({ ...prev, employmentStatus: prev.employmentStatus === 'انتداب' ? 'all' : 'انتداب' }))}
          className={`p-2.5 sm:p-3 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border text-start flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 group ${
            filters.employmentStatus === 'انتداب' || filters.employmentStatus === 'انتداب_إلى_المستشفى' || filters.employmentStatus === 'انتداب_خارج_المستشفى' || filters.employmentStatus === 'ندب'
              ? 'border-sky-400 dark:border-sky-600 ring-2 ring-sky-500/20 bg-sky-50/30 dark:bg-sky-950/20'
              : 'border-gray-200 dark:border-gray-700'
          }`}
          title={language === 'ar' ? 'تصفية: منتدب' : 'Filter: Deputed'}
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 w-full">
            <span className="text-[11px] sm:text-xs font-semibold truncate">{t('deputation')}</span>
            <ArrowLeftRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-sky-600 dark:text-sky-400 mt-1.5">{stats.deputed}</p>
        </button>

        {/* Loan */}
        <button
          type="button"
          onClick={() => setFilters((prev) => ({ ...prev, employmentStatus: prev.employmentStatus === 'إعارة' ? 'all' : 'إعارة' }))}
          className={`p-2.5 sm:p-3 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border text-start flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 group ${
            filters.employmentStatus === 'إعارة'
              ? 'border-purple-400 dark:border-purple-600 ring-2 ring-purple-500/20 bg-purple-50/30 dark:bg-purple-950/20'
              : 'border-gray-200 dark:border-gray-700'
          }`}
          title={language === 'ar' ? 'تصفية: إعارة' : 'Filter: Loaned'}
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 w-full">
            <span className="text-[11px] sm:text-xs font-semibold truncate">{t('loaned')}</span>
            <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform shrink-0" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400 mt-1.5">{stats.loaned}</p>
        </button>

        {/* Higher Degrees */}
        <button
          type="button"
          onClick={() => setFilters((prev) => ({ ...prev, certificateStatus: prev.certificateStatus === 'obtained' ? 'all' : 'obtained' }))}
          className={`p-2.5 sm:p-3 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border text-start flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 group ${
            filters.certificateStatus === 'obtained'
              ? 'border-fuchsia-400 dark:border-fuchsia-600 ring-2 ring-fuchsia-500/20 bg-fuchsia-50/30 dark:bg-fuchsia-950/20'
              : 'border-gray-200 dark:border-gray-700'
          }`}
          title={language === 'ar' ? 'تصفية: حاصلين على دراسات عليا' : 'Filter: Higher Degrees'}
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 w-full">
            <span className="text-[11px] sm:text-xs font-semibold truncate">{t('higherDegrees')}</span>
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-fuchsia-600 dark:text-fuchsia-400 group-hover:scale-110 transition-transform shrink-0" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-fuchsia-600 dark:text-fuchsia-400 mt-1.5">{stats.higherDegrees}</p>
        </button>

        {/* Currently Studying */}
        <button
          type="button"
          onClick={() => setFilters((prev) => ({ ...prev, certificateStatus: prev.certificateStatus === 'in_progress' ? 'all' : 'in_progress' }))}
          className={`p-2.5 sm:p-3 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border text-start flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 group ${
            filters.certificateStatus === 'in_progress'
              ? 'border-blue-400 dark:border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/30 dark:bg-blue-950/20'
              : 'border-gray-200 dark:border-gray-700'
          }`}
          title={language === 'ar' ? 'تصفية: قيد الدراسة' : 'Filter: Currently Studying'}
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 w-full">
            <span className="text-[11px] sm:text-xs font-semibold truncate">{t('inStudy')}</span>
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400 mt-1.5">{stats.inStudy}</p>
        </button>

        {/* Confirmed Doctors */}
        <button
          type="button"
          onClick={() => setFilters((prev) => ({ ...prev, confirmationStatus: prev.confirmationStatus === 'confirmed' ? 'all' : 'confirmed' }))}
          className={`p-2.5 sm:p-3 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border text-start flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 group ${
            filters.confirmationStatus === 'confirmed'
              ? 'border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20'
              : 'border-gray-200 dark:border-gray-700'
          }`}
          title={language === 'ar' ? 'تصفية: البيانات المؤكدة' : 'Filter: Confirmed Data'}
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 w-full">
            <span className="text-[11px] sm:text-xs font-semibold truncate">{t('confirmedDoctorsCount')}</span>
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">{stats.confirmed}</p>
        </button>

        {/* Administrative Roles */}
        <button
          type="button"
          onClick={() => setFilters((prev) => ({ ...prev, administrativeDuty: prev.administrativeDuty === 'has_admin' ? 'all' : 'has_admin' }))}
          className={`p-2.5 sm:p-3 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border text-start flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 group ${
            filters.administrativeDuty !== 'all' && filters.administrativeDuty !== 'no_admin'
              ? 'border-rose-400 dark:border-rose-600 ring-2 ring-rose-500/20 bg-rose-50/30 dark:bg-rose-950/20'
              : 'border-gray-200 dark:border-gray-700'
          }`}
          title={language === 'ar' ? 'تصفية: تكليف إداري' : 'Filter: Administrative Duty'}
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 w-full">
            <span className="text-[11px] sm:text-xs font-semibold truncate">{t('administrativeStaff')}</span>
            <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform shrink-0" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 mt-1.5">{stats.adminStaff}</p>
        </button>
      </div>

      {/* Search & Filter Control Bar */}
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5 sm:gap-3">
          
          {/* Quick Workforce Status Tabs (All / Active Duty / On Leave) */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/70 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setFilters(prev => ({ ...prev, dutyStatus: 'all', employmentStatus: prev.employmentStatus === 'إجازة' ? 'all' : prev.employmentStatus }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                (!filters.dutyStatus || filters.dutyStatus === 'all') && filters.employmentStatus !== 'إجازة'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>{language === 'ar' ? 'الكل' : 'All'}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-500 text-gray-700 dark:text-gray-200">
                {stats.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilters(prev => ({ ...prev, dutyStatus: 'active_duty', employmentStatus: prev.employmentStatus === 'إجازة' ? 'all' : prev.employmentStatus }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filters.dutyStatus === 'active_duty'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t('activeWorkforce')}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filters.dutyStatus === 'active_duty' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'}`}>
                {stats.activeDuty}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilters(prev => ({ ...prev, dutyStatus: 'on_leave', employmentStatus: 'all' }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filters.dutyStatus === 'on_leave' || filters.employmentStatus === 'إجازة'
                  ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                  : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{t('onLeave')}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filters.dutyStatus === 'on_leave' || filters.employmentStatus === 'إجازة' ? 'bg-amber-600 text-white' : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'}`}>
                {stats.onLeave}
              </span>
            </button>
          </div>

          {/* Universal Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3.5 rtl:right-3.5 rtl:left-auto left-auto top-2.5 sm:top-3 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder={language === 'ar' 
                ? 'البحث باسم الطبيب، الرقم القومي، الهاتف، التخصص، الجامعة...' 
                : 'Search by doctor name, national ID, mobile, specialty, university...'}
              className="w-full pl-3.5 pr-10 rtl:pr-10 rtl:pl-3.5 py-2 sm:py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-700 transition-all"
            />
            {filters.search && (
              <button
                onClick={() => setFilters({ ...filters, search: '' })}
                className="absolute left-3 rtl:left-3 rtl:right-auto top-2.5 sm:top-3 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Toggle & Sort & View Switcher */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
            {/* Sort Selector */}
            <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700/60 p-1 rounded-xl border border-gray-200 dark:border-gray-600 flex-1 sm:flex-initial">
              <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 px-1 font-semibold whitespace-nowrap">
                {language === 'ar' ? 'ترتيب:' : 'Sort:'}
              </span>
              <select
                value={filters.sortBy || 'recently_added'}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
                className="w-full sm:w-auto px-2 py-1.5 rounded-lg border-0 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 shadow-sm"
              >
                <option value="recently_added">🕒 {language === 'ar' ? 'الأحدث إضافة' : 'Recently Added'}</option>
                <option value="oldest">⏳ {language === 'ar' ? 'الأقدم إضافة' : 'Oldest First'}</option>
                <option value="name_asc">🔤 {language === 'ar' ? 'الاسم (أ - ي)' : 'Name (A to Z)'}</option>
                <option value="name_desc">🔤 {language === 'ar' ? 'الاسم (ي - أ)' : 'Name (Z to A)'}</option>
                <option value="hire_date_desc">📅 {language === 'ar' ? 'أحدث استلام عمل' : 'Newest Hire Date'}</option>
                <option value="grad_date_desc">🎓 {language === 'ar' ? 'أحدث تخرج' : 'Newest Graduation'}</option>
              </select>
            </div>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 border transition-all ${
                showAdvancedFilters || activeFiltersCount > 0
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{t('filter')}</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-indigo-600 text-white text-[10px] sm:text-xs flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Grid / Table Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-gray-500'
                }`}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'cards' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-gray-500'
                }`}
                title="Cards view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Advanced Structured Filters */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-4 animate-in fade-in duration-150">
            
            {/* Section 1: Employment & Workforce Status */}
            <div>
              <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{language === 'ar' ? 'الحالة الوظيفية والتواجد بالعمل' : 'Employment & Duty Status'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                
                {/* Filter by Workforce / Duty Status */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    {t('dutyStatus')}
                  </label>
                  <select
                    value={filters.dutyStatus || 'all'}
                    onChange={(e) => setFilters({ ...filters, dutyStatus: e.target.value as any })}
                    className="w-full px-2.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs text-gray-900 dark:text-white font-medium"
                  >
                    <option value="all">{t('allDutyStatuses')}</option>
                    <option value="active_duty">🟢 {t('activeDutyOnly')}</option>
                    <option value="on_leave">🟡 {t('onLeaveOnly')}</option>
                  </select>
                </div>

                {/* Filter by Employment Status */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    {t('filterByStatus')}
                  </label>
                  <select
                    value={filters.employmentStatus}
                    onChange={(e) => setFilters({ ...filters, employmentStatus: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs text-gray-900 dark:text-white font-medium"
                  >
                    <option value="all">{t('allStatuses')}</option>
                    <option value="قوة أساسية">قوة أساسية</option>
                    <option value="انتداب">انتداب (الكل)</option>
                    <option value="انتداب_إلى_المستشفى">👉 منتدب إلى المستشفى</option>
                    <option value="انتداب_خارج_المستشفى">👈 منتدب لخارج المستشفى</option>
                    <option value="إعارة">إعارة</option>
                    <option value="إجازة">إجازة</option>
                    <option value="ندب">ندب</option>
                    <option value="إنهاء خدمة">إنهاء خدمة</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                {/* Filter by Administrative Role */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    {t('filterByAdministrative')}
                  </label>
                  <select
                    value={filters.administrativeDuty}
                    onChange={(e) => setFilters({ ...filters, administrativeDuty: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs text-gray-900 dark:text-white font-medium"
                  >
                    <option value="all">{t('allAdministrative')}</option>
                    <option value="has_admin">{t('hasAdminWorkAll')}</option>
                    <option value="inside_dept">🏢 {t('adminInsideDept')}</option>
                    <option value="outside_dept">🌐 {t('adminOutsideDept')}</option>
                    <option value="head_of_dept">👑 {t('headOfDeptOnly')}</option>
                    <option value="no_admin">{t('noAdminWork')}</option>
                  </select>
                </div>

                {/* Filter by Promotion / Professional Rank */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    {language === 'ar' ? 'الدرجة المهنية' : 'Professional Rank'}
                  </label>
                  <select
                    value={filters.promotionType || 'all'}
                    onChange={(e) => setFilters({ ...filters, promotionType: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs text-gray-900 dark:text-white"
                  >
                    <option value="all">{language === 'ar' ? 'كافة الدرجات المهنية' : 'All Ranks'}</option>
                    <option value="طبيب مقيم">طبيب مقيم</option>
                    <option value="مساعد أخصائي">مساعد أخصائي</option>
                    <option value="أخصائي">أخصائي</option>
                    <option value="استشاري مساعد">استشاري مساعد</option>
                    <option value="استشاري">استشاري</option>
                    <option value="رئيس قسم">رئيس قسم</option>
                  </select>
                </div>

                {/* Filter by Financial Grade */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    {language === 'ar' ? 'الدرجة المالية' : 'Financial Grade'}
                  </label>
                  <select
                    value={filters.financialGrade || 'all'}
                    onChange={(e) => setFilters({ ...filters, financialGrade: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs text-gray-900 dark:text-white"
                  >
                    <option value="all">{language === 'ar' ? 'كافة الدرجات المالية' : 'All Financial Grades'}</option>
                    <option value="الدرجة الثالثة">الدرجة الثالثة</option>
                    <option value="الدرجة الثانية">الدرجة الثانية</option>
                    <option value="الدرجة الأولى">الدرجة الأولى</option>
                    <option value="مدير عام">مدير عام</option>
                    <option value="الدرجة العالية">الدرجة العالية</option>
                    <option value="الدرجة الممتازة">الدرجة الممتازة</option>
                  </select>
                </div>

                {/* Filter by Confirmation Status */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    {t('filterByConfirmation')}
                  </label>
                  <select
                    value={filters.confirmationStatus || 'all'}
                    onChange={(e) => setFilters({ ...filters, confirmationStatus: e.target.value as any })}
                    className="w-full px-2.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs text-gray-900 dark:text-white font-medium"
                  >
                    <option value="all">{t('allConfirmationStatuses')}</option>
                    <option value="confirmed">✅ {t('onlyConfirmed')}</option>
                    <option value="unconfirmed">⏳ {t('onlyUnconfirmed')}</option>
                  </select>
                </div>

              </div>
            </div>

            {/* Section 2: Advanced Academic Degrees & Specialty Search */}
            <div className="bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl p-3 sm:p-4 border border-indigo-100 dark:border-indigo-900/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-sm">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                      {language === 'ar' ? 'البحث المتقدم في الدرجات العلمية والتخصصات' : 'Academic Degrees & Specialties Advanced Filter'}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {language === 'ar'
                        ? 'تصفية الأطباء الحاصلين على ماجستير أو دكتوراه أو زمالة في تخصص دقيق محدد'
                        : 'Filter doctors holding Masters, PhDs, or Fellowships in specific dental specialties'}
                    </p>
                  </div>
                </div>

                {filters.certificateType !== 'all' && (
                  <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-900/50 px-2.5 py-1 rounded-full self-start sm:self-auto border border-indigo-200 dark:border-indigo-800">
                    🎓 {filters.certificateType}: {specialtiesData.enteredCount} {t('registeredSpecialties')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                
                {/* 1. Certificate / Degree Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('filterByType')}
                  </label>
                  <select
                    value={filters.certificateType}
                    onChange={(e) => setFilters({ ...filters, certificateType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  >
                    <option value="all">{t('allTypes')}</option>
                    <option value="ماجستير">🎓 ماجستير (Master's)</option>
                    <option value="دكتوراه">🎖️ دكتوراه (PhD / Doctorate)</option>
                    <option value="زمالة">🏛️ زمالة (Fellowship)</option>
                    <option value="دبلوم">📜 دبلوم / دبلومة (Diploma)</option>
                    <option value="بكالوريوس">🩺 بكالوريوس (Bachelor's)</option>
                    <option value="شهادة مهنية">💼 شهادة مهنية</option>
                    <option value="دورة تدريبية">🎯 دورة تدريبية</option>
                    {certificateTypes
                      .filter(t => !['ماجستير', 'دكتوراه', 'زمالة', 'دبلوم', 'دبلومة', 'بكالوريوس', 'شهادة مهنية', 'دورة تدريبية'].includes(t.name))
                      .map((t) => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                  </select>
                </div>

                {/* 2. Certificate Specialty / Title (Preloaded & Searchable with Datalist) */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {t('filterBySpecialty')}
                    </label>
                    {specialtiesData.enteredCount > 0 && (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                        ({specialtiesData.enteredCount} مسجل)
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      list="specialty-suggestions-list"
                      value={filters.certificateTitle || ''}
                      onChange={(e) => setFilters({ ...filters, certificateTitle: e.target.value })}
                      placeholder={filters.certificateType !== 'all' 
                        ? (language === 'ar' ? `اختر تخصص ${filters.certificateType}...` : `Select ${filters.certificateType} specialty...`)
                        : t('selectOrTypeSpecialty')}
                      className="w-full pl-8 pr-3 rtl:pr-3 rtl:pl-8 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    />
                    {filters.certificateTitle && (
                      <button
                        type="button"
                        onClick={() => setFilters({ ...filters, certificateTitle: '' })}
                        className="absolute left-2.5 rtl:left-2.5 rtl:right-auto top-2.5 text-gray-400 hover:text-gray-600"
                        title={language === 'ar' ? 'مسح التخصص' : 'Clear specialty'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Datalist populated dynamically with entered specialties for the selected degree type + presets */}
                  <datalist id="specialty-suggestions-list">
                    {specialtiesData.enteredList.map((spec) => (
                      <option key={`entered-${spec}`} value={spec}>
                        {language === 'ar' ? `(مسجل بالنظام) ${spec}` : `(Entered) ${spec}`}
                      </option>
                    ))}
                    {specialtiesData.defaultList.map((spec) => (
                      <option key={`def-${spec}`} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* 3. Certificate Status (Obtained / In Progress) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('filterByCertStatus')}
                  </label>
                  <select
                    value={filters.certificateStatus}
                    onChange={(e) => setFilters({ ...filters, certificateStatus: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  >
                    <option value="all">{language === 'ar' ? 'كافة حالات الشهادات' : 'All Degree Statuses'}</option>
                    <option value="obtained">✅ {t('obtained')}</option>
                    <option value="in_progress">⏳ {t('inProgress')}</option>
                  </select>
                </div>

                {/* 4. University */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('filterByUniversity')}
                  </label>
                  <select
                    value={filters.university}
                    onChange={(e) => setFilters({ ...filters, university: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  >
                    <option value="all">{t('allUniversities')}</option>
                    {universities.map((u) => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>

                {/* 5. Obtained Year & Reset Actions */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('filterByYear')}
                  </label>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <select
                      value={filters.obtainedYear}
                      onChange={(e) => setFilters({ ...filters, obtainedYear: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    >
                      <option value="all">{t('allYears')}</option>
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                    
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/50 rounded-xl text-xs font-bold whitespace-nowrap border border-red-200 dark:border-red-800 transition-colors"
                        title={t('clearFilters')}
                      >
                        {language === 'ar' ? 'إعادة ضبط' : 'Reset'}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}
      </div>

      {/* Doctor Count Indicator */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
        <span>
          {language === 'ar'
            ? `عرض ${filteredDoctors.length} من إجمالي ${doctors.length} طبيب`
            : `Showing ${filteredDoctors.length} of ${doctors.length} doctors`}
        </span>
      </div>

      {/* Main Content: Table or Cards */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-16 border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-semibold text-gray-500">{t('loading')}</p>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-16 border border-gray-200 dark:border-gray-700 text-center space-y-3">
          <Users className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {language === 'ar' ? 'لم يتم العثور على أطباء' : 'No doctors found'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            {language === 'ar'
              ? 'جرب تعديل شروط البحث أو الفلاتر، أو قم بإضافة طبيب جديد'
              : 'Try adjusting your search criteria or add a new doctor.'}
          </p>
          <button
            onClick={() => setIsAddDoctorOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('addDoctor')}</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-4 text-center w-12" title={t('confirmedStatus')}>
                    <CheckCircle2 className="w-4 h-4 mx-auto text-emerald-600 dark:text-emerald-400" />
                  </th>
                  <th className="px-6 py-4">{t('doctorName')}</th>
                  <th className="px-6 py-4">{t('nationalId')} / {t('phone')}</th>
                  <th className="px-6 py-4">{t('currentStatus')}</th>
                  <th className="px-6 py-4">{t('certificates')}</th>
                  <th className="px-6 py-4">{t('hireDate')}</th>
                  <th className="px-6 py-4 text-center">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                {filteredDoctors.map((doc) => {
                  const currentStatus = doc.current_status?.status_type || 'قوة أساسية';
                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-750/70 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedDoctorId(doc.id);
                        setIsDetailsOpen(true);
                      }}
                    >
                      {/* Confirmation Checkbox Column */}
                      <td
                        className="px-3 py-4 whitespace-nowrap text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleToggleConfirmation(e, doc.id, doc.is_confirmed)}
                          className={`p-1.5 rounded-xl border transition-all inline-flex items-center justify-center ${
                            doc.is_confirmed
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 hover:scale-110 shadow-sm ring-2 ring-emerald-500/20'
                              : 'bg-white dark:bg-gray-700 text-gray-300 dark:text-gray-500 border-gray-300 dark:border-gray-600 hover:border-emerald-400 hover:text-emerald-500 hover:scale-105'
                          }`}
                          title={doc.is_confirmed ? t('unconfirmData') : t('confirmData')}
                        >
                          <CheckCircle2 className={`w-4 h-4 sm:w-5 sm:h-5 ${doc.is_confirmed ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300 dark:text-gray-500'}`} />
                        </button>
                      </td>

                      {/* Name & Initial Avatar */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
                            {doc.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {doc.name}
                              </div>
                              {doc.is_confirmed && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>{t('dataConfirmed')}</span>
                                </span>
                              )}
                            </div>
                            {doc.address && (
                              <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" />
                                <span>{doc.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* National ID & Phone */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-bold text-gray-800 dark:text-gray-200">
                          {doc.national_id && doc.national_id !== 'null' && doc.national_id !== 'undefined' ? (
                            doc.national_id
                          ) : (
                            <span className="text-gray-400 font-normal">{language === 'ar' ? 'غير محدد' : 'undefined'}</span>
                          )}
                        </div>
                        {doc.phone && doc.phone !== 'null' && doc.phone !== 'undefined' ? (
                          <div className="flex items-center gap-1.5 mt-1 font-mono text-xs text-gray-700 dark:text-gray-300">
                            <span>{doc.phone}</span>
                            <WhatsAppButton phone={doc.phone} size="xs" />
                          </div>
                        ) : (
                          <div className="font-mono text-xs text-gray-400 mt-0.5">{language === 'ar' ? 'غير محدد' : 'undefined'}</div>
                        )}
                      </td>

                      {/* Current Employment Status & Admin Duty */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeColor(currentStatus)}`}>
                            {currentStatus}
                          </span>
                          {doc.current_status?.has_administrative_duty && (
                            <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />
                              <span>{doc.current_status.administrative_role || t('administrativeDuty')}</span>
                              <span className="text-[10px] opacity-75">
                                ({doc.current_status.administrative_scope === 'خارج القسم' ? t('outsideDepartment') : t('insideDepartment')})
                              </span>
                            </span>
                          )}
                          {doc.current_status?.deputation_direction && (
                            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                              {doc.current_status.deputation_direction}
                              {doc.current_status.deputation_facility ? ` (${doc.current_status.deputation_facility})` : ''}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Certificates Badges */}
                      <td className="px-6 py-4 max-w-xs">
                        {doc.certificates && doc.certificates.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {doc.certificates.slice(0, 2).map((c) => {
                              const isObtained = c.status === 'obtained';
                              return (
                                <span
                                  key={c.id}
                                  className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold ${
                                    isObtained
                                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                      : 'bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                  }`}
                                  title={getCertificateSummary(c, language)}
                                >
                                  <Award className="w-3 h-3 mr-1 rtl:mr-0 rtl:ml-1" />
                                  <span>{c.certificate_type} - {c.certificate_title}</span>
                                </span>
                              );
                            })}
                            {doc.certificates.length > 2 && (
                              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 self-center">
                                +{doc.certificates.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {language === 'ar' ? 'لا توجد شهادات مسجلة' : 'No certificates'}
                          </span>
                        )}
                      </td>

                      {/* Hire Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300 font-medium">
                        {formatDate(doc.hire_date, language)}
                      </td>

                      {/* Actions */}
                      <td
                        className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center space-x-1.5 rtl:space-x-reverse">
                          <DoctorExportDropdown
                            doctor={doc}
                            onOpenPreviewModal={() => {
                              setSelectedDoctorForExport(doc);
                              setIsExportModalOpen(true);
                            }}
                            variant="icon"
                            size="md"
                          />
                          <button
                            onClick={() => {
                              setSelectedDoctorId(doc.id);
                              setIsDetailsOpen(true);
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50 rounded-xl transition-colors"
                            title={t('doctorDetails')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDoctor(doc.id, doc.name)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors"
                            title={t('delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredDoctors.map((doc) => {
            const currentStatus = doc.current_status?.status_type || 'قوة أساسية';
            return (
              <div
                key={doc.id}
                onClick={() => {
                  setSelectedDoctorId(doc.id);
                  setIsDetailsOpen(true);
                }}
                className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
                        {doc.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-gray-900 dark:text-white text-base truncate">{doc.name}</h3>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadgeColor(currentStatus)}`}>
                            {currentStatus}
                          </span>
                          {doc.current_status?.has_administrative_duty && (
                            <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                              <Briefcase className="w-2.5 h-2.5" />
                              <span>{doc.current_status.administrative_role || t('administrativeDuty')}</span>
                            </span>
                          )}
                          {doc.current_status?.deputation_direction && (
                            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                              {doc.current_status.deputation_direction}
                              {doc.current_status.deputation_facility ? ` (${doc.current_status.deputation_facility})` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Confirmation Checkbox Button */}
                    <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleToggleConfirmation(e, doc.id, doc.is_confirmed)}
                        className={`px-2 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1 transition-all ${
                          doc.is_confirmed
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 shadow-sm ring-1 ring-emerald-400/30'
                            : 'bg-gray-50 text-gray-400 dark:bg-gray-750 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-emerald-400 hover:text-emerald-600'
                        }`}
                        title={doc.is_confirmed ? t('unconfirmData') : t('confirmData')}
                      >
                        <CheckCircle2 className={`w-3.5 h-3.5 ${doc.is_confirmed ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`} />
                        <span className="hidden xs:inline">{doc.is_confirmed ? t('dataConfirmed') : t('confirmData')}</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-gray-600 dark:text-gray-300">
                    {doc.national_id && (
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-mono">{doc.national_id}</span>
                      </div>
                    )}
                    {doc.phone && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-mono">{doc.phone}</span>
                        </div>
                        <WhatsAppButton phone={doc.phone} size="xs" />
                      </div>
                    )}
                    {doc.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span>{doc.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Certificates in card */}
                  {doc.certificates && doc.certificates.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
                      <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block">{t('certificates')}:</span>
                      {doc.certificates.slice(0, 2).map((c) => (
                        <div
                          key={c.id}
                          className="text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-gray-700/80 border border-slate-200 dark:border-gray-600"
                        >
                          <div className="font-bold text-gray-900 dark:text-white flex items-center justify-between">
                            <span>{c.certificate_type} {c.certificate_title}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              c.status === 'obtained' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                            }`}>
                              {c.status === 'obtained' ? t('obtained') : t('inProgress')}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-600 dark:text-gray-300 mt-1 font-medium">
                            {c.university_name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setSelectedDoctorId(doc.id);
                      setIsDetailsOpen(true);
                    }}
                    className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    <span>{t('doctorDetails')}</span>
                    <Eye className="w-4 h-4" />
                  </button>

                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <DoctorExportDropdown
                      doctor={doc}
                      onOpenPreviewModal={() => {
                        setSelectedDoctorForExport(doc);
                        setIsExportModalOpen(true);
                      }}
                      size="sm"
                    />
                    <button
                      onClick={() => handleDeleteDoctor(doc.id, doc.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors"
                      title={t('delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Doctor Modal */}
      {isAddDoctorOpen && (
        <DoctorFormModal
          isOpen={isAddDoctorOpen}
          onClose={() => setIsAddDoctorOpen(false)}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}

      {/* Comprehensive Doctor Details Modal */}
      {isDetailsOpen && selectedDoctorId && (
        <DoctorDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedDoctorId(null);
          }}
          doctorId={selectedDoctorId}
          onDoctorUpdated={fetchData}
          universities={universities}
          certificateTypes={certificateTypes}
          onUniversityAdded={(newU) => setUniversities((prev) => [...prev, newU])}
        />
      )}

      {/* Standalone Doctor Export Modal */}
      {isExportModalOpen && selectedDoctorForExport && (
        <DoctorExportModal
          isOpen={isExportModalOpen}
          onClose={() => {
            setIsExportModalOpen(false);
            setSelectedDoctorForExport(null);
          }}
          doctor={selectedDoctorForExport}
        />
      )}

      {/* Comprehensive Detailed Degrees, Specialties & Promotions Statistics Modal */}
      {isDetailedStatsOpen && (
        <DoctorDetailedStatsModal
          isOpen={isDetailedStatsOpen}
          onClose={() => setIsDetailedStatsOpen(false)}
          doctors={doctors}
          onSelectDoctor={(docId) => {
            setIsDetailedStatsOpen(false);
            setSelectedDoctorId(docId);
            setIsDetailsOpen(true);
          }}
        />
      )}
    </div>
  );
}
