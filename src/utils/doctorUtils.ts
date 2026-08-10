import { supabase } from '../lib/supabase';
import type { DoctorCertificate, DoctorEmploymentHistory } from '../types';

const arabicMonths = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

/**
 * Format a date string (YYYY-MM-DD or YYYY-MM) to Month Year in Arabic or English
 * e.g. "2018-08-01" -> "أغسطس 2018"
 */
export function formatMonthYear(dateString: string | null, language: string = 'ar'): string {
  if (!dateString) return '';
  
  try {
    const parts = dateString.split('-');
    const year = parts[0];
    const monthIndex = parts.length > 1 ? parseInt(parts[1], 10) - 1 : 0;

    if (language === 'ar') {
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${arabicMonths[monthIndex]} ${year}`;
      }
      return year;
    } else {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  } catch {
    return dateString;
  }
}

/**
 * Format date for standard display
 */
export function formatDate(dateString: string | null, language: string = 'ar'): string {
  if (!dateString) return language === 'ar' ? 'غير محدد' : 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
 * Format certificate date based on precision / date_mode ('month' vs 'full')
 */
export function formatCertificateDate(
  dateString: string | null | undefined,
  mode: 'month' | 'full' | string = 'month',
  language: string = 'ar'
): string {
  if (!dateString) return '';
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
  const univ = cert.university_name || '';
  const country = cert.university_country && cert.university_country !== 'مصر' ? ` (${cert.university_country})` : '';
  const mode = cert.date_mode || 'month';

  if (language === 'ar') {
    if (cert.status === 'in_progress') {
      let expectedPart = '';
      if (cert.expected_date) {
        expectedPart = `، متوقع الحصول عليها: ${formatCertificateDate(cert.expected_date, mode, 'ar')}`;
      }
      return `${type} ${title}، ${univ}${country}، قيد الدراسة${expectedPart}`.replace(/\s+/g, ' ').trim();
    } else {
      const datePart = cert.obtained_date ? `، ${formatCertificateDate(cert.obtained_date, mode, 'ar')}` : '';
      return `${type} ${title}، ${univ}${country}${datePart}`.replace(/\s+/g, ' ').trim();
    }
  } else {
    if (cert.status === 'in_progress') {
      let expectedPart = '';
      if (cert.expected_date) {
        expectedPart = `, expected in ${formatCertificateDate(cert.expected_date, mode, 'en')}`;
      }
      return `${type} in ${title}, ${univ}${country}, In Progress${expectedPart}`.replace(/\s+/g, ' ').trim();
    } else {
      const datePart = cert.obtained_date ? `, ${formatCertificateDate(cert.obtained_date, mode, 'en')}` : '';
      return `${type} in ${title}, ${univ}${country}${datePart}`.replace(/\s+/g, ' ').trim();
    }
  }
}

/**
 * Find the current active employment status from a doctor's employment history
 */
export function getCurrentEmploymentStatus(history: DoctorEmploymentHistory[] = []): DoctorEmploymentHistory | null {
  if (!history || history.length === 0) return null;

  // Sort by start_date descending
  const sorted = [...history].sort((a, b) => {
    return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
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
  newPeriod: { id?: string; start_date: string; end_date?: string | null; status_type?: string }
): { valid: boolean; message?: string } {
  if (!newPeriod.start_date) {
    return { valid: false, message: 'تاريخ بداية الحالة مطلوب' };
  }

  const newStart = new Date(newPeriod.start_date).getTime();
  const newEnd = newPeriod.end_date ? new Date(newPeriod.end_date).getTime() : Infinity;

  if (newEnd < newStart) {
    return { valid: false, message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' };
  }

  for (const period of existingPeriods) {
    if (newPeriod.id && period.id === newPeriod.id) continue;

    const pStart = new Date(period.start_date).getTime();
    const pEnd = period.end_date ? new Date(period.end_date).getTime() : Infinity;

    // Check if intervals overlap
    const isOverlapping = (newStart <= pEnd) && (newEnd >= pStart);
    if (isOverlapping) {
      // If one of the periods is 'إنهاء خدمة' or both are continuous
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
