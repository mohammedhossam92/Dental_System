import React, { useState, useMemo } from 'react';
import {
  X, Award, GraduationCap, Users, BookOpen, Layers, Briefcase,
  ChevronDown, ChevronUp, Download, Search, CheckCircle2, Clock,
  Filter, Sparkles, PieChart, BarChart3, Building, UserCheck
} from 'lucide-react';
import type { DoctorWithDetails, DoctorCertificate, DoctorPromotion } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { formatDate, formatCertificateDate, formatDisplayValue } from '../../utils/doctorUtils';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

interface DoctorDetailedStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctors: DoctorWithDetails[];
  onSelectDoctor?: (doctorId: string) => void;
}

export function DoctorDetailedStatsModal({
  isOpen,
  onClose,
  doctors,
  onSelectDoctor
}: DoctorDetailedStatsModalProps) {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  const [searchFilter, setSearchFilter] = useState('');
  const [selectedDegreeType, setSelectedDegreeType] = useState<string>('all');
  const [expandedDegrees, setExpandedDegrees] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'degrees' | 'promotions' | 'matrix'>('degrees');

  // Toggle accordion state for degree groups
  const toggleDegreeExpand = (degName: string) => {
    setExpandedDegrees(prev => ({
      ...prev,
      [degName]: !prev[degName]
    }));
  };

  // 1. Calculate Technical Promotions / Scientific Ranks (عدد الأخصائيين، الاستشاريين، إلخ)
  const promotionStats = useMemo(() => {
    const statsMap: Record<string, { count: number; doctors: DoctorWithDetails[] }> = {};

    doctors.forEach(doc => {
      // Latest promotion if any, or default general status
      const latestPromo = doc.promotions && doc.promotions.length > 0
        ? [...doc.promotions].sort((a, b) => (b.promotion_date || '').localeCompare(a.promotion_date || ''))[0]
        : null;

      const promoTitle = latestPromo?.promotion_type || (isAr ? 'طبيب ممارس عام / غير مسجل رتبة' : 'General Practitioner / Unspecified');

      if (!statsMap[promoTitle]) {
        statsMap[promoTitle] = { count: 0, doctors: [] };
      }
      statsMap[promoTitle].count += 1;
      statsMap[promoTitle].doctors.push(doc);
    });

    return Object.entries(statsMap)
      .map(([title, data]) => ({
        title,
        count: data.count,
        doctors: data.doctors,
        percentage: doctors.length > 0 ? (data.count / doctors.length) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [doctors, isAr]);

  // 2. Calculate Comprehensive Academic Degrees & Subspecialties Breakdown
  // (كم واحد ماجستير، وكم واحد في كل تخصص من تخصص الماجستير، وهكذا لكل درجة علمية)
  const degreeStats = useMemo(() => {
    // Map: Degree Type (e.g. ماجستير) -> { totalDoctors, specialtiesMap: { specialtyTitle -> { total, obtained, inProgress, doctorsList } } }
    const degreeMap: Record<string, {
      degreeType: string;
      totalCertificates: number;
      uniqueDoctorsCount: number;
      uniqueDoctors: Set<string>;
      obtainedCount: number;
      inProgressCount: number;
      specialties: Record<string, {
        specialtyTitle: string;
        total: number;
        obtained: number;
        inProgress: number;
        entries: Array<{ doctor: DoctorWithDetails; cert: DoctorCertificate }>;
      }>;
    }> = {};

    doctors.forEach(doc => {
      if (!doc.certificates || doc.certificates.length === 0) return;

      doc.certificates.forEach(cert => {
        const dType = cert.certificate_type?.trim() || (isAr ? 'درجة علمية غير محددة' : 'Unspecified Degree');
        const sTitle = cert.certificate_title?.trim() || (isAr ? 'تخصص عام / غير محدد' : 'General / Unspecified');

        if (!degreeMap[dType]) {
          degreeMap[dType] = {
            degreeType: dType,
            totalCertificates: 0,
            uniqueDoctorsCount: 0,
            uniqueDoctors: new Set<string>(),
            obtainedCount: 0,
            inProgressCount: 0,
            specialties: {}
          };
        }

        const degGroup = degreeMap[dType];
        degGroup.totalCertificates += 1;
        degGroup.uniqueDoctors.add(doc.id);

        if (cert.status === 'obtained') {
          degGroup.obtainedCount += 1;
        } else {
          degGroup.inProgressCount += 1;
        }

        if (!degGroup.specialties[sTitle]) {
          degGroup.specialties[sTitle] = {
            specialtyTitle: sTitle,
            total: 0,
            obtained: 0,
            inProgress: 0,
            entries: []
          };
        }

        const specGroup = degGroup.specialties[sTitle];
        specGroup.total += 1;
        if (cert.status === 'obtained') {
          specGroup.obtained += 1;
        } else {
          specGroup.inProgress += 1;
        }
        specGroup.entries.push({ doctor: doc, cert });
      });
    });

    return Object.values(degreeMap).map(deg => ({
      ...deg,
      uniqueDoctorsCount: deg.uniqueDoctors.size,
      specialtiesList: Object.values(deg.specialties).sort((a, b) => b.total - a.total)
    })).sort((a, b) => b.uniqueDoctorsCount - a.uniqueDoctorsCount);
  }, [doctors, isAr]);

  // List of active degrees available for filter
  const activeDegreeTypes = useMemo(() => {
    return degreeStats.map(d => d.degreeType);
  }, [degreeStats]);

  // Filtered degree list based on search and selected degree filter
  const filteredDegreeStats = useMemo(() => {
    return degreeStats
      .filter(deg => selectedDegreeType === 'all' || deg.degreeType === selectedDegreeType)
      .map(deg => {
        if (!searchFilter.trim()) return deg;
        const q = searchFilter.toLowerCase().trim();

        const filteredSpecs = deg.specialtiesList.filter(spec => {
          const specMatch = spec.specialtyTitle.toLowerCase().includes(q);
          const docMatch = spec.entries.some(e => e.doctor.name.toLowerCase().includes(q) || (e.cert.university_name || '').toLowerCase().includes(q));
          return specMatch || docMatch;
        });

        return {
          ...deg,
          specialtiesList: filteredSpecs
        };
      })
      .filter(deg => deg.specialtiesList.length > 0 || !searchFilter.trim());
  }, [degreeStats, selectedDegreeType, searchFilter]);

  // Export Full Statistical Report to Excel
  const handleExportStatsToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Degrees & Subspecialties Summary
      const degreesSummaryRows: any[] = [];
      degreesSummaryRows.push([
        isAr ? 'الدرجة العلمية' : 'Degree Type',
        isAr ? 'إجمالي الأطباء' : 'Unique Doctors',
        isAr ? 'الحاصلون عليها' : 'Obtained',
        isAr ? 'قيد الدراسة' : 'In Progress',
        isAr ? 'عدد التخصصات المسجلة' : 'Specialties Count',
      ]);

      degreeStats.forEach(deg => {
        degreesSummaryRows.push([
          deg.degreeType,
          deg.uniqueDoctorsCount,
          deg.obtainedCount,
          deg.inProgressCount,
          deg.specialtiesList.length
        ]);
      });

      const wsDegreesSummary = XLSX.utils.aoa_to_sheet(degreesSummaryRows);
      wsDegreesSummary['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 22 }];
      XLSX.utils.book_append_sheet(wb, wsDegreesSummary, isAr ? 'ملخص الدرجات العلمية' : 'Degrees Summary');

      // Sheet 2: Detailed Degrees and Subspecialties Breakdown
      const detailedSpecialtiesRows: any[] = [];
      detailedSpecialtiesRows.push([
        isAr ? 'الدرجة العلمية' : 'Degree Type',
        isAr ? 'التخصص / المجال' : 'Specialty / Field',
        isAr ? 'إجمالي الأطباء في التخصص' : 'Total Doctors in Field',
        isAr ? 'اسم الطبيب' : 'Doctor Name',
        isAr ? 'الجامعة' : 'University',
        isAr ? 'الدولة' : 'Country',
        isAr ? 'حالة الشهادة' : 'Status',
        isAr ? 'تاريخ الحصول / المتوقع' : 'Obtained / Expected Date',
        isAr ? 'رقم الهاتف' : 'Phone'
      ]);

      degreeStats.forEach(deg => {
        deg.specialtiesList.forEach(spec => {
          spec.entries.forEach(entry => {
            detailedSpecialtiesRows.push([
              deg.degreeType,
              spec.specialtyTitle,
              spec.total,
              entry.doctor.name,
              entry.cert.university_name || (isAr ? 'غير محدد' : 'N/A'),
              entry.cert.university_country || 'مصر',
              entry.cert.status === 'obtained' ? (isAr ? 'حاصل عليها' : 'Obtained') : (isAr ? 'قيد الدراسة' : 'In Progress'),
              entry.cert.status === 'obtained' ? (entry.cert.obtained_date || '') : (entry.cert.expected_date || entry.cert.study_start_date || ''),
              entry.doctor.phone || ''
            ]);
          });
        });
      });

      const wsDetailed = XLSX.utils.aoa_to_sheet(detailedSpecialtiesRows);
      wsDetailed['!cols'] = [
        { wch: 20 }, { wch: 30 }, { wch: 22 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 16 }
      ];
      XLSX.utils.book_append_sheet(wb, wsDetailed, isAr ? 'تفاصيل التخصصات والأطباء' : 'Specialties & Doctors');

      // Sheet 3: Technical Promotions Breakdown
      const promotionsRows: any[] = [];
      promotionsRows.push([
        isAr ? 'المسمى / الرتبة الفنية' : 'Technical Rank / Promotion',
        isAr ? 'العدد' : 'Count',
        isAr ? 'النسبة المئوية' : 'Percentage',
        isAr ? 'أسماء الأطباء' : 'Doctors'
      ]);

      promotionStats.forEach(p => {
        promotionsRows.push([
          p.title,
          p.count,
          `${p.percentage.toFixed(1)}%`,
          p.doctors.map(d => d.name).join(', ')
        ]);
      });

      const wsPromotions = XLSX.utils.aoa_to_sheet(promotionsRows);
      wsPromotions['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 60 }];
      XLSX.utils.book_append_sheet(wb, wsPromotions, isAr ? 'المسميات الفنية والترقيات' : 'Technical Ranks');

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `doctors_detailed_statistics_report_${dateStr}.xlsx`);

      Swal.fire({
        icon: 'success',
        title: isAr ? 'تم تصدير التقرير الإحصائي' : 'Report Exported Successfully',
        text: isAr ? 'تم تحميل ملف إكسيل الشامل للإحصائيات والدرجات والتخصصات' : 'Excel statistics workbook downloaded',
        timer: 1600,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error('Error exporting statistics Excel:', err);
      Swal.fire({
        icon: 'error',
        title: isAr ? 'خطأ' : 'Error',
        text: err.message || 'Failed to export Excel report'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-1.5 sm:p-3 md:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-850 dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-6xl max-h-[96vh] sm:max-h-[94vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50/80 via-blue-50/60 to-purple-50/70 dark:from-gray-900 dark:via-gray-850 dark:to-gray-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                  {isAr ? 'التقرير الإحصائي التفصيلي للأطباء والدرجات العلمية' : 'Detailed Doctors & Academic Degrees Report'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {doctors.length} {isAr ? 'طبيب مسجل' : 'Registered Doctors'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {isAr
                  ? 'حصر تفصيلي للدرجات العلمية (ماجستير، دكتوراه، زمالة...) وتوزيع التخصصات والمجالات الدقيقة والرتب الفنية'
                  : 'Breakdown of academic degrees, subspecialties, and technical promotion ranks'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportStatsToExcel}
              className="px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
              title={isAr ? 'تصدير كامل التقرير الإحصائي إلى إكسيل' : 'Export Full Statistics to Excel'}
            >
              <Download className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">{isAr ? 'تصدير إكسيل (.xlsx)' : 'Export Excel'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation & Search Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50/70 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center space-x-1.5 rtl:space-x-reverse overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveTab('degrees')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'degrees'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>{isAr ? 'الدرجات العلمية والتخصصات' : 'Degrees & Specialties'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'degrees' ? 'bg-white/25 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                {degreeStats.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('promotions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'promotions'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>{isAr ? 'المسميات والرتب الفنية (أخصائي، استشاري...)' : 'Technical Ranks'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'promotions' ? 'bg-white/25 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                {promotionStats.length}
              </span>
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            {activeTab === 'degrees' && (
              <select
                value={selectedDegreeType}
                onChange={(e) => setSelectedDegreeType(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">{isAr ? 'جميع الدرجات العلمية' : 'All Academic Degrees'}</option>
                {activeDegreeTypes.map(deg => (
                  <option key={deg} value={deg}>{deg}</option>
                ))}
              </select>
            )}

            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute right-2.5 rtl:right-2.5 ltr:left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={isAr ? 'بحث بالتخصص أو الطبيب أو الجامعة...' : 'Search specialty, doctor, univ...'}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-3 rtl:pl-3 ltr:pl-8 pr-8 rtl:pr-8 ltr:pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="absolute left-2 rtl:left-2 ltr:right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/40 dark:bg-gray-900/30">

          {/* ================= TAB 1: ACADEMIC DEGREES & SUBSPECIALTIES ================= */}
          {activeTab === 'degrees' && (
            <div className="space-y-6">

              {/* High Level Degree Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {degreeStats.map((deg, idx) => {
                  const colors = [
                    'border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300',
                    'border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300',
                    'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
                    'border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
                    'border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
                  ];
                  const colorClass = colors[idx % colors.length];

                  return (
                    <div
                      key={deg.degreeType}
                      onClick={() => {
                        setSelectedDegreeType(selectedDegreeType === deg.degreeType ? 'all' : deg.degreeType);
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                        selectedDegreeType === deg.degreeType ? 'ring-2 ring-indigo-500 shadow-md scale-[1.02]' : ''
                      } ${colorClass}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate">{deg.degreeType}</span>
                        <GraduationCap className="w-4 h-4 shrink-0 opacity-80" />
                      </div>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-gray-900 dark:text-white">
                          {deg.uniqueDoctorsCount}
                        </span>
                        <span className="text-[11px] font-semibold opacity-75">
                          {isAr ? 'طبيب' : 'doctors'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                        <span>{deg.specialtiesList.length} {isAr ? 'تخصصات' : 'specialties'}</span>
                        <span className="text-emerald-600 font-semibold">{deg.obtainedCount} ✓</span>
                        {deg.inProgressCount > 0 && <span className="text-blue-600 font-semibold">{deg.inProgressCount} ⏳</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Registered Degrees & Specialties Detailed Accordions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span>{isAr ? 'حصر التخصصات والمجالات الدقيقة تحت كل درجة علمية' : 'Subspecialties & Fields Under Each Academic Degree'}</span>
                  </h3>
                  <span className="text-xs text-gray-500">
                    {filteredDegreeStats.length} {isAr ? 'درجات معتمدة' : 'degrees'}
                  </span>
                </div>

                {filteredDegreeStats.length === 0 ? (
                  <div className="py-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">{isAr ? 'لا توجد بيانات مطابقة لخيارات البحث' : 'No matching degree statistics found'}</p>
                  </div>
                ) : (
                  filteredDegreeStats.map(deg => {
                    const isExpanded = expandedDegrees[deg.degreeType] !== false; // Default open

                    return (
                      <div
                        key={deg.degreeType}
                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-all"
                      >
                        {/* Degree Group Accordion Header */}
                        <div
                          onClick={() => toggleDegreeExpand(deg.degreeType)}
                          className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/70 dark:hover:bg-gray-750/70 border-b border-gray-100 dark:border-gray-700/60 select-none"
                        >
                          <div className="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold shrink-0">
                              <GraduationCap className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                                <span>{deg.degreeType}</span>
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                  {deg.uniqueDoctorsCount} {isAr ? 'طبيب' : 'doctors'}
                                </span>
                                <span className="text-xs font-normal text-gray-500">
                                  ({deg.specialtiesList.length} {isAr ? 'تخصصات ومجالات مختلفة' : 'specialties'})
                                </span>
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-3">
                                <span className="text-emerald-600 font-semibold">{deg.obtainedCount} {isAr ? 'حاصل عليها' : 'obtained'}</span>
                                {deg.inProgressCount > 0 && (
                                  <span className="text-blue-600 font-semibold">{deg.inProgressCount} {isAr ? 'قيد الدراسة' : 'in progress'}</span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-gray-400">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>

                        {/* Subspecialties Grid & Doctors List */}
                        {isExpanded && (
                          <div className="p-4 sm:p-5 space-y-4 bg-slate-50/40 dark:bg-gray-850/40">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                              {deg.specialtiesList.map(spec => (
                                <div
                                  key={spec.specialtyTitle}
                                  className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm space-y-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                                >
                                  {/* Specialty Header */}
                                  <div className="flex items-start justify-between gap-2 border-b border-gray-100 dark:border-gray-700/60 pb-2.5">
                                    <div>
                                      <h5 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                        <Award className="w-4 h-4 text-purple-600 shrink-0" />
                                        <span>{spec.specialtyTitle}</span>
                                      </h5>
                                      <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 block">
                                        {spec.obtained > 0 && <span className="text-emerald-600 font-semibold">{spec.obtained} {isAr ? 'حاصل عليها' : 'obtained'} </span>}
                                        {spec.inProgress > 0 && <span className="text-blue-600 font-semibold"> • {spec.inProgress} {isAr ? 'قيد الدراسة' : 'in progress'}</span>}
                                      </span>
                                    </div>
                                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                                      {spec.total} {isAr ? 'طبيب' : 'docs'}
                                    </span>
                                  </div>

                                  {/* Doctors in this specialty */}
                                  <div className="space-y-1.5">
                                    {spec.entries.map((entry, idx) => (
                                      <div
                                        key={idx}
                                        onClick={() => onSelectDoctor && onSelectDoctor(entry.doctor.id)}
                                        className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                                          onSelectDoctor ? 'hover:bg-indigo-50/80 dark:hover:bg-gray-700/80 cursor-pointer' : 'bg-gray-50 dark:bg-gray-750'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                                            {idx + 1}
                                          </div>
                                          <div className="min-w-0">
                                            <span className="font-bold text-gray-800 dark:text-gray-200 block truncate">
                                              {entry.doctor.name}
                                            </span>
                                            <span className="text-[10.5px] text-gray-500 dark:text-gray-400 truncate block">
                                              {entry.cert.university_name ? `🏛️ ${entry.cert.university_name}` : ''}
                                              {entry.cert.obtained_date ? ` (${formatDate(entry.cert.obtained_date, language)})` : ''}
                                            </span>
                                          </div>
                                        </div>

                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                                          entry.cert.status === 'obtained'
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                        }`}>
                                          {entry.cert.status === 'obtained' ? (isAr ? 'حاصل عليها' : 'Obtained') : (isAr ? 'قيد الدراسة' : 'Studying')}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 2: TECHNICAL RANKS / PROMOTIONS ================= */}
          {activeTab === 'promotions' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-500" />
                    <span>{isAr ? 'توزيع الأطباء حسب الرتبة والمسمى الفني (أخصائي، استشاري، ممارس عام...)' : 'Doctor Distribution by Technical Title & Rank'}</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isAr ? 'إحصاء عدد الأخصائيين، الاستشاريين، الممارسين العامين وقوائم الأطباء في كل درجة' : 'Counts and list of doctors in each scientific rank'}
                  </p>
                </div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {promotionStats.length} {isAr ? 'مسميات مسجلة' : 'Ranks'}
                </span>
              </div>

              {/* Ranks Cards & Progress */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {promotionStats.map((promo) => (
                  <div
                    key={promo.title}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700 shadow-sm space-y-3.5 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                            {promo.title}
                          </h4>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {promo.percentage.toFixed(1)}% {isAr ? 'من إجمالي الأطباء' : 'of doctors'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right rtl:text-right ltr:text-left">
                        <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 block">
                          {promo.count}
                        </span>
                        <span className="text-[10px] text-gray-400">{isAr ? 'طبيب' : 'doctors'}</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(promo.percentage, 5)}%` }}
                      />
                    </div>

                    {/* Doctors Names in this rank */}
                    <div className="space-y-1 pt-1 max-h-48 overflow-y-auto">
                      {promo.doctors.map((doc, idx) => (
                        <div
                          key={doc.id}
                          onClick={() => onSelectDoctor && onSelectDoctor(doc.id)}
                          className={`flex items-center justify-between p-1.5 rounded-lg text-xs transition-colors ${
                            onSelectDoctor ? 'hover:bg-indigo-50 dark:hover:bg-gray-700 cursor-pointer' : ''
                          }`}
                        >
                          <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {idx + 1}. {doc.name}
                          </span>
                          <span className="text-[10.5px] text-gray-500 font-mono">
                            {doc.phone || ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 shrink-0">
          <span>
            {isAr ? 'نظام إدارة عيادات طب الأسنان • تقرير إحصائي حي وشامل' : 'Dental Management System • Live Statistical Report'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold transition-colors"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
