import { supabase } from '../lib/supabase';
import type { DoctorCertificate, DoctorEmploymentHistory } from '../types';

const arabicMonths = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

/**
 * Safely format text values, replacing 'null', 'undefined', empty or placeholder strings with localized 'غير محدد' or 'undefined'
 */
export function formatDisplayValue(
  val: string | number | null | undefined,
  language: string = 'ar',
  fallback?: string
): string {
  if (val === null || val === undefined) {
    return fallback !== undefined ? fallback : (language === 'ar' ? 'غير محدد' : 'undefined');
  }
  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined' || str === '---' || str === 'N/A') {
    return fallback !== undefined ? fallback : (language === 'ar' ? 'غير محدد' : 'undefined');
  }
  return str;
}

/**
 * Format a date string (YYYY, YYYY-MM, or YYYY-MM-DD) to Month Year in Arabic or English
 * e.g. "2018-08" -> "أغسطس 2018", "2018" -> "عام 2018"
 */
export function formatMonthYear(dateString: string | null | undefined, language: string = 'ar'): string {
  if (!dateString) return '';
  const cleanStr = String(dateString).trim();
  if (!cleanStr || cleanStr.toLowerCase() === 'null' || cleanStr.toLowerCase() === 'undefined' || cleanStr === '---' || cleanStr === 'N/A') {
    return '';
  }
  
  try {
    const parts = cleanStr.split('-');
    const year = parts[0].trim();
    if (!year || isNaN(Number(year))) return '';
    if (parts.length === 1) {
      return language === 'ar' ? `عام ${year}` : `${year}`;
    }
    const monthIndex = parseInt(parts[1], 10) - 1;

    if (language === 'ar') {
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${arabicMonths[monthIndex]} ${year}`;
      }
      return year;
    } else {
      const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNamesEn[monthIndex] || parts[1];
      return `${monthName} ${year}`;
    }
  } catch {
    return '';
  }
}

/**
 * Format date for display supporting Year Only ('YYYY'), Month & Year ('YYYY-MM'), and Full Date ('YYYY-MM-DD')
 */
export function formatDate(dateString: string | null | undefined, language: string = 'ar'): string {
  if (!dateString) return language === 'ar' ? 'غير محدد' : 'undefined';
  const cleanStr = String(dateString).trim();
  if (!cleanStr || cleanStr.toLowerCase() === 'null' || cleanStr.toLowerCase() === 'undefined' || cleanStr === '---' || cleanStr === 'N/A') {
    return language === 'ar' ? 'غير محدد' : 'undefined';
  }
  
  try {
    const parts = cleanStr.split('-');
    if (parts.length === 1) {
      const year = parts[0].trim();
      if (!year || isNaN(Number(year))) return language === 'ar' ? 'غير محدد' : 'undefined';
      return language === 'ar' ? `عام ${year}` : year;
    }
    if (parts.length === 2) {
      const my = formatMonthYear(cleanStr, language);
      return my || (language === 'ar' ? 'غير محدد' : 'undefined');
    }
    const year = parts[0].trim();
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    if (isNaN(monthIndex) || isNaN(day) || !year || isNaN(Number(year))) {
      return language === 'ar' ? 'غير محدد' : 'undefined';
    }

    if (language === 'ar') {
      const monthName = arabicMonths[monthIndex] || parts[1];
      return `${day} ${monthName} ${year}`;
    } else {
      const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNamesEn[monthIndex] || parts[1];
      return `${day} ${monthName} ${year}`;
    }
  } catch {
    return language === 'ar' ? 'غير محدد' : 'undefined';
  }
}

/**
 * Extract Year from Date string
 */
export function getYearFromDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const clean = String(dateString).trim();
  if (!clean || clean.toLowerCase() === 'null' || clean.toLowerCase() === 'undefined' || clean === '---' || clean === 'N/A') return '';
  const yr = clean.split('-')[0]?.trim() || '';
  return !isNaN(Number(yr)) ? yr : '';
}

/**
 * Format certificate date based on precision / date_mode ('year' vs 'month' vs 'full')
 */
export function formatCertificateDate(
  dateString: string | null | undefined,
  mode: 'year' | 'month' | 'full' | string = 'month',
  language: string = 'ar'
): string {
  if (!dateString) return '';
  const clean = String(dateString).trim();
  if (!clean || clean.toLowerCase() === 'null' || clean.toLowerCase() === 'undefined' || clean === '---' || clean === 'N/A') return '';
  if (mode === 'year') {
    const y = getYearFromDate(clean);
    if (!y) return '';
    return language === 'ar' ? `عام ${y}` : `${y}`;
  }
  if (mode === 'full') {
    const formatted = formatDate(clean, language);
    return formatted === (language === 'ar' ? 'غير محدد' : 'undefined') ? '' : formatted;
  }
  return formatMonthYear(clean, language);
}

/**
 * Generate formatted summary text for a certificate (Generated Display Text)
 * Examples:
 * - "دبلوم جراحة الوجه والفكين، جامعة المنصورة، أغسطس 2018"
 * - "ماجستير طب الأسنان، جامعة القاهرة، 15 مايو 2021"
 * - "دكتوراه طب الأسنان، جامعة المنصورة، قيد الدراسة، متوقع الحصول عليها: أغسطس 2027"
 */
export function getCertificateSummary(cert: Partial<DoctorCertificate>, language: string = 'ar'): string {
  const cleanVal = (v?: string | null) => {
    if (!v) return '';
    const s = String(v).trim();
    return (s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined' || s === '---' || s === 'N/A') ? '' : s;
  };

  const type = cleanVal(cert.certificate_type);
  const title = cleanVal(cert.certificate_title);
  const univ = cleanVal(cert.university_name);
  const countryVal = cleanVal(cert.university_country);
  const country = (univ && countryVal && countryVal !== 'مصر' && countryVal.toLowerCase() !== 'egypt') ? ` (${countryVal})` : '';
  const mode = cert.date_mode || 'month';
  const univPart = univ ? `، ${univ}${country}` : '';

  if (language === 'ar') {
    if (cert.status === 'in_progress') {
      let expectedPart = '';
      const expDate = formatCertificateDate(cert.expected_date, mode, 'ar');
      if (expDate) {
        expectedPart = `، متوقع الحصول عليها: ${expDate}`;
      }
      return `${type} ${title}${univPart}، قيد الدراسة${expectedPart}`.replace(/\s+/g, ' ').replace(/،\s*،/g, '،').replace(/^،\s*/, '').trim();
    } else {
      const obtDate = formatCertificateDate(cert.obtained_date, mode, 'ar');
      const datePart = obtDate ? `، ${obtDate}` : '';
      return `${type} ${title}${univPart}${datePart}`.replace(/\s+/g, ' ').replace(/،\s*،/g, '،').replace(/^،\s*/, '').trim();
    }
  } else {
    const univPartEn = univ ? `, ${univ}${country}` : '';
    if (cert.status === 'in_progress') {
      let expectedPart = '';
      const expDate = formatCertificateDate(cert.expected_date, mode, 'en');
      if (expDate) {
        expectedPart = `, expected in ${expDate}`;
      }
      return `${type} in ${title}${univPartEn}, In Progress${expectedPart}`.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').replace(/^,\s*/, '').trim();
    } else {
      const obtDate = formatCertificateDate(cert.obtained_date, mode, 'en');
      const datePart = obtDate ? `, ${obtDate}` : '';
      return `${type} in ${title}${univPartEn}${datePart}`.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').replace(/^,\s*/, '').trim();
    }
  }
}

/**
 * Find the current active employment status from a doctor's employment history
 */
export function getCurrentEmploymentStatus(history: DoctorEmploymentHistory[] = []): DoctorEmploymentHistory | null {
  if (!history || history.length === 0) return null;

  // Sort by start_date descending (or created_at)
  const sorted = [...history].sort((a, b) => {
    const timeB = b.start_date ? new Date(b.start_date).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
    const timeA = a.start_date ? new Date(a.start_date).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
    return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
  });

  const todayStr = new Date().toISOString().split('T')[0];

  // First check if there is an ongoing record without end_date
  const ongoing = sorted.find(h => !h.end_date || h.end_date >= todayStr);
  if (ongoing) return ongoing;

  // Otherwise return the most recent record
  return sorted[0] || null;
}

/**
 * Validate that a new or edited employment period does not improperly overlap
 */
export function validateEmploymentPeriod(
  existingPeriods: DoctorEmploymentHistory[],
  newPeriod: { id?: string; start_date?: string | null; end_date?: string | null; status_type?: string }
): { valid: boolean; message?: string } {
  // If no start_date is specified, allow saving freely
  if (!newPeriod.start_date || !newPeriod.start_date.trim()) {
    return { valid: true };
  }

  const newStart = new Date(newPeriod.start_date).getTime();
  const newEnd = newPeriod.end_date ? new Date(newPeriod.end_date).getTime() : Infinity;

  if (!isNaN(newStart) && !isNaN(newEnd) && newEnd < newStart) {
    return { valid: false, message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' };
  }

  for (const period of existingPeriods) {
    if (newPeriod.id && period.id === newPeriod.id) continue;
    if (!period.start_date) continue; // Skip periods with no dates

    const pStart = new Date(period.start_date).getTime();
    const pEnd = period.end_date ? new Date(period.end_date).getTime() : Infinity;

    if (isNaN(pStart) || isNaN(pEnd) || isNaN(newStart) || isNaN(newEnd)) continue;

    // Check if intervals overlap
    const isOverlapping = (newStart <= pEnd) && (newEnd >= pStart);
    if (isOverlapping) {
      return {
        valid: false,
        message: `تتعارض الفترة المدخلة مع فترة سابقة (${period.status_type}: ${period.start_date} إلى ${period.end_date || 'مستمر'})`
      };
    }
  }

  return { valid: true };
}

/**
 * Upload a document or certificate file to Supabase Storage bucket 'doctor-files'
 */
export async function uploadDoctorFile(
  file: File,
  folder: 'certificates' | 'promotions' | 'documents' = 'certificates'
): Promise<{ url: string; fileName: string; error?: string }> {
  try {
    const fileExt = file.name.split('.').pop();
    const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${folder}/${cleanFileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('doctor-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.warn('Storage upload error, attempting public URL fallback or base64:', uploadError);
      
      // If bucket doesn't exist or policy blocks, fallback to base64 data url for small files / offline
      if (file.size < 5 * 1024 * 1024) {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              url: reader.result as string,
              fileName: file.name
            });
          };
          reader.onerror = () => {
            resolve({
              url: '',
              fileName: file.name,
              error: 'فشل قراءة الملف'
            });
          };
          reader.readAsDataURL(file);
        });
      }

      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from('doctor-files')
      .getPublicUrl(uploadData?.path || filePath);

    return {
      url: publicUrlData.publicUrl,
      fileName: file.name
    };
  } catch (err: any) {
    console.error('File upload exception:', err);
    return {
      url: '',
      fileName: file.name,
      error: err.message || 'فشل رفع الملف'
    };
  }
}

/**
 * Find the latest update/create timestamp for a doctor across all relational records
 */
export function getDoctorLastUpdated(
  doctor: any,
  language: string = 'ar'
): { formatted: string; relative: string; date: Date | null } {
  if (!doctor) {
    return { formatted: language === 'ar' ? 'غير محدد' : 'N/A', relative: '', date: null };
  }

  const timestamps: number[] = [];

  const addTimestamp = (dateStr?: string | null) => {
    if (dateStr) {
      const time = new Date(dateStr).getTime();
      if (!isNaN(time) && time > 0) {
        timestamps.push(time);
      }
    }
  };

  addTimestamp(doctor.updated_at);
  addTimestamp(doctor.created_at);

  if (Array.isArray(doctor.certificates)) {
    doctor.certificates.forEach((c: any) => {
      addTimestamp(c.updated_at);
      addTimestamp(c.created_at);
    });
  }

  if (Array.isArray(doctor.promotions)) {
    doctor.promotions.forEach((p: any) => addTimestamp(p.created_at));
  }

  if (Array.isArray(doctor.financial_grades)) {
    doctor.financial_grades.forEach((g: any) => addTimestamp(g.created_at));
  }

  if (Array.isArray(doctor.employment_history)) {
    doctor.employment_history.forEach((h: any) => addTimestamp(h.created_at));
  }

  if (Array.isArray(doctor.documents)) {
    doctor.documents.forEach((d: any) => addTimestamp(d.created_at));
  }

  if (timestamps.length === 0) {
    return { formatted: language === 'ar' ? 'غير متوفر' : 'Not available', relative: '', date: null };
  }

  const maxTime = Math.max(...timestamps);
  const date = new Date(maxTime);

  // Formatted date and time string
  const formatted = date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Relative time calculation
  const now = Date.now();
  const diffSec = Math.floor((now - maxTime) / 1000);
  let relative = '';

  if (diffSec < 60) {
    relative = language === 'ar' ? 'منذ لحظات' : 'just now';
  } else if (diffSec < 3600) {
    const min = Math.floor(diffSec / 60);
    relative = language === 'ar' ? `منذ ${min} دقيقة` : `${min}m ago`;
  } else if (diffSec < 86400) {
    const hr = Math.floor(diffSec / 3600);
    relative = language === 'ar' ? `منذ ${hr} ساعة` : `${hr}h ago`;
  } else if (diffSec < 2592000) {
    const days = Math.floor(diffSec / 86400);
    relative = language === 'ar' ? `منذ ${days} يوم` : `${days}d ago`;
  } else {
    relative = formatted;
  }

  return { formatted, relative, date };
}

/**
 * Touch parent doctor's updated_at timestamp in Supabase
 */
export async function touchDoctorUpdatedAt(doctorId: string): Promise<void> {
  if (!doctorId) return;
  try {
    await supabase
      .from('doctors')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', doctorId);
  } catch (err) {
    console.warn('Failed to touch doctor updated_at:', err);
  }
}

