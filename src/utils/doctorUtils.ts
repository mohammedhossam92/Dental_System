import { supabase } from '../lib/supabase';
import type { DoctorCertificate, DoctorEmploymentHistory } from '../types';

const arabicMonths = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

/**
 * Format a date string (YYYY, YYYY-MM, or YYYY-MM-DD) to Month Year in Arabic or English
 * e.g. "2018-08" -> "أغسطس 2018", "2018" -> "عام 2018"
 */
export function formatMonthYear(dateString: string | null | undefined, language: string = 'ar'): string {
  if (!dateString) return '';
  
  try {
    const parts = dateString.split('-');
    const year = parts[0];
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
    return dateString;
  }
}

/**
 * Format date for display supporting Year Only ('YYYY'), Month & Year ('YYYY-MM'), and Full Date ('YYYY-MM-DD')
 */
export function formatDate(dateString: string | null | undefined, language: string = 'ar'): string {
  if (!dateString) return language === 'ar' ? 'غير محدد' : '---';
  
  try {
    const parts = dateString.split('-');
    if (parts.length === 1) {
      // Year only e.g. "2024"
      return language === 'ar' ? `عام ${parts[0]}` : parts[0];
    }
    if (parts.length === 2) {
      // Month and Year e.g. "2024-08"
      return formatMonthYear(dateString, language);
    }
    // Full date e.g. "2024-08-15"
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    if (language === 'ar') {
      const monthName = arabicMonths[monthIndex] || parts[1];
      return `${day} ${monthName} ${year}`;
    } else {
      const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNamesEn[monthIndex] || parts[1];
      return `${day} ${monthName} ${year}`;
    }
  } catch {
    return dateString;
  }
}

/**
 * Extract Year from Date string
 */
export function getYearFromDate(dateString: string | null): string {
  if (!dateString) return '';
  return dateString.split('-')[0] || '';
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
  if (mode === 'year') {
    const y = getYearFromDate(dateString);
    return language === 'ar' ? `عام ${y}` : `${y}`;
  }
  if (mode === 'full') {
    return formatDate(dateString, language);
  }
  return formatMonthYear(dateString, language);
}

/**
 * Generate formatted summary text for a certificate (Generated Display Text)
 * Examples:
 * - "دبلوم جراحة الوجه والفكين، جامعة المنصورة، أغسطس 2018"
 * - "ماجستير طب الأسنان، جامعة القاهرة، 15 مايو 2021"
 * - "دكتوراه طب الأسنان، جامعة المنصورة، قيد الدراسة، متوقع الحصول عليها: أغسطس 2027"
 */
export function getCertificateSummary(cert: Partial<DoctorCertificate>, language: string = 'ar'): string {
  const type = cert.certificate_type || '';
  const title = cert.certificate_title || '';
  const univ = cert.university_name ? cert.university_name.trim() : '';
  const country = (univ && cert.university_country && cert.university_country !== 'مصر') ? ` (${cert.university_country})` : '';
  const mode = cert.date_mode || 'month';
  const univPart = univ ? `، ${univ}${country}` : '';

  if (language === 'ar') {
    if (cert.status === 'in_progress') {
      let expectedPart = '';
      if (cert.expected_date) {
        expectedPart = `، متوقع الحصول عليها: ${formatCertificateDate(cert.expected_date, mode, 'ar')}`;
      }
      return `${type} ${title}${univPart}، قيد الدراسة${expectedPart}`.replace(/\s+/g, ' ').replace(/،\s*،/g, '،').replace(/^،\s*/, '').trim();
    } else {
      const datePart = cert.obtained_date ? `، ${formatCertificateDate(cert.obtained_date, mode, 'ar')}` : '';
      return `${type} ${title}${univPart}${datePart}`.replace(/\s+/g, ' ').replace(/،\s*،/g, '،').replace(/^،\s*/, '').trim();
    }
  } else {
    const univPartEn = univ ? `, ${univ}${country}` : '';
    if (cert.status === 'in_progress') {
      let expectedPart = '';
      if (cert.expected_date) {
        expectedPart = `, expected in ${formatCertificateDate(cert.expected_date, mode, 'en')}`;
      }
      return `${type} in ${title}${univPartEn}, In Progress${expectedPart}`.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').replace(/^,\s*/, '').trim();
    } else {
      const datePart = cert.obtained_date ? `, ${formatCertificateDate(cert.obtained_date, mode, 'en')}` : '';
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
