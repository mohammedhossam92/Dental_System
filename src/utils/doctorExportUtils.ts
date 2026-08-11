import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import type { DoctorWithDetails, DoctorCertificate, DoctorEmploymentHistory, DoctorPromotion, DoctorFinancialGrade } from '../types';
import { formatDate, formatCertificateDate, getCertificateSummary } from './doctorUtils';

/**
 * Clean filename string from invalid characters
 */
function sanitizeFileName(name: string): string {
  return (name || 'doctor').replace(/[/\\?%*:|"<>]/g, '_').trim();
}

/**
 * Generate formatted text dossier for a doctor
 */
export function generateDoctorTextDossier(doctor: DoctorWithDetails, language: string = 'ar'): string {
  const isAr = language === 'ar';
  const divider = '='.repeat(70);
  const subDivider = '-'.repeat(70);
  const now = new Date().toLocaleString(isAr ? 'ar-EG' : 'en-US', {
    dateStyle: 'full',
    timeStyle: 'short'
  });

  const lines: string[] = [];

  // Header
  lines.push(divider);
  lines.push(isAr ? '                 بطاقة بيانات وسجل الطبيب                 ' : '                 DOCTOR PROFILE & DOSSIER                 ');
  lines.push(isAr ? '            نظام إدارة عيادات طب الأسنان            ' : '         Dental Clinic Management System         ');
  lines.push(divider);
  lines.push('');

  // Personal Information
  lines.push(isAr ? '【 البيانات الشخصية والأساسية 】' : '【 PERSONAL & BASIC INFORMATION 】');
  lines.push(`${isAr ? '• اسم الطبيب' : '• Doctor Name'}: ${doctor.name}`);
  lines.push(`${isAr ? '• الرقم القومي' : '• National ID'}: ${doctor.national_id || (isAr ? 'غير مسجل' : 'N/A')}`);
  lines.push(`${isAr ? '• رقم الهاتف' : '• Phone'}: ${doctor.phone || (isAr ? 'غير مسجل' : 'N/A')}`);
  lines.push(`${isAr ? '• العنوان' : '• Address'}: ${doctor.address || (isAr ? 'غير مسجل' : 'N/A')}`);
  lines.push(`${isAr ? '• تاريخ الميلاد' : '• Birth Date'}: ${formatDate(doctor.birth_date, language)}`);
  lines.push(`${isAr ? '• تاريخ التخرج' : '• Graduation Date'}: ${formatDate(doctor.graduation_date, language)}`);
  lines.push(`${isAr ? '• تاريخ استلام العمل' : '• Hire Date'}: ${formatDate(doctor.hire_date, language)}`);
  lines.push('');

  // Employment Status & Admin Duty
  lines.push(subDivider);
  lines.push(isAr ? '【 الحالة الوظيفية والتكليف الإداري الحالي 】' : '【 CURRENT EMPLOYMENT & ADMINISTRATIVE STATUS 】');
  const currentStatus = doctor.current_status;
  const statusType = currentStatus?.status_type || (isAr ? 'قوة أساسية' : 'Core Staff');
  lines.push(`${isAr ? '• الحالة الوظيفية الحالية' : '• Current Employment Status'}: ${statusType}`);
  
  if (currentStatus?.deputation_direction) {
    lines.push(`${isAr ? '• جهة / اتجاه الانتداب' : '• Deputation Direction'}: ${currentStatus.deputation_direction}`);
    if (currentStatus.deputation_facility) {
      lines.push(`${isAr ? '• الجهة المنتدب منها / إليها' : '• Deputation Facility'}: ${currentStatus.deputation_facility}`);
    }
  }

  if (currentStatus?.has_administrative_duty) {
    lines.push(`${isAr ? '• التكليف الإداري' : '• Administrative Duty'}: ${isAr ? 'نعم (مكلف بعمل إداري)' : 'Yes'}`);
    lines.push(`${isAr ? '• المسمى / المنصب الإداري' : '• Administrative Role'}: ${currentStatus.administrative_role || (isAr ? 'غير محدد' : 'N/A')}`);
    lines.push(`${isAr ? '• نطاق العمل الإداري' : '• Administrative Scope'}: ${currentStatus.administrative_scope || (isAr ? 'داخل القسم' : 'Inside Department')}`);
    if (currentStatus.administrative_facility) {
      lines.push(`${isAr ? '• جهة العمل الإداري' : '• Administrative Facility'}: ${currentStatus.administrative_facility}`);
    }
  } else {
    lines.push(`${isAr ? '• التكليف الإداري' : '• Administrative Duty'}: ${isAr ? 'لا (عمل إكلينيكي فقط)' : 'Clinical Only'}`);
  }

  if (doctor.current_financial_grade) {
    lines.push(`${isAr ? '• الدرجة المالية الحالية' : '• Current Financial Grade'}: ${doctor.current_financial_grade.financial_grade} (${isAr ? 'منذ' : 'Since'} ${doctor.current_financial_grade.start_date})`);
  }
  lines.push('');

  // Academic Certificates & Degrees
  lines.push(subDivider);
  lines.push(isAr ? `【 الشهادات والدرجات العلمية (${doctor.certificates?.length || 0}) 】` : `【 ACADEMIC CERTIFICATES & DEGREES (${doctor.certificates?.length || 0}) 】`);
  if (doctor.certificates && doctor.certificates.length > 0) {
    doctor.certificates.forEach((cert, idx) => {
      lines.push(`  ${idx + 1}. ${cert.certificate_type} - ${cert.certificate_title}`);
      lines.push(`     ${isAr ? 'الجامعة / الجهة المانحة' : 'University'}: ${cert.university_name}${cert.university_country ? ` (${cert.university_country})` : ''}`);
      lines.push(`     ${isAr ? 'الحالة' : 'Status'}: ${cert.status === 'obtained' ? (isAr ? 'حاصل عليها' : 'Obtained') : (isAr ? 'قيد الدراسة حالياً' : 'In Progress')}`);
      if (cert.status === 'obtained' && cert.obtained_date) {
        lines.push(`     ${isAr ? 'تاريخ الحصول عليها' : 'Obtained Date'}: ${formatCertificateDate(cert.obtained_date, cert.date_mode || 'month', language)}`);
      } else if (cert.status === 'in_progress') {
        if (cert.study_start_date) lines.push(`     ${isAr ? 'تاريخ بدء القيد' : 'Start Date'}: ${formatCertificateDate(cert.study_start_date, 'month', language)}`);
        if (cert.expected_date) lines.push(`     ${isAr ? 'تاريخ التخرج المتوقع' : 'Expected Completion'}: ${formatCertificateDate(cert.expected_date, 'month', language)}`);
      }
      if (cert.notes) {
        lines.push(`     ${isAr ? 'ملاحظات' : 'Notes'}: ${cert.notes}`);
      }
      lines.push('');
    });
  } else {
    lines.push(isAr ? '  (لا توجد شهادات علمية مسجلة)' : '  (No registered certificates)');
    lines.push('');
  }

  // Employment Timeline History
  if (doctor.employment_history && doctor.employment_history.length > 1) {
    lines.push(subDivider);
    lines.push(isAr ? `【 سجل التدرج والحالات الوظيفية (${doctor.employment_history.length}) 】` : `【 EMPLOYMENT TIMELINE HISTORY (${doctor.employment_history.length}) 】`);
    doctor.employment_history.forEach((hist, idx) => {
      const periodStr = `${hist.start_date || '-'} -> ${hist.end_date || (isAr ? 'مستمر حتى الآن' : 'Present')}`;
      lines.push(`  ${idx + 1}. [${hist.status_type}] (${periodStr})`);
      if (hist.deputation_direction || hist.deputation_facility) {
        lines.push(`     ${isAr ? 'الانتداب' : 'Deputation'}: ${hist.deputation_direction || ''} ${hist.deputation_facility ? `(${hist.deputation_facility})` : ''}`);
      }
      if (hist.has_administrative_duty) {
        lines.push(`     ${isAr ? 'المنصب الإداري' : 'Admin Role'}: ${hist.administrative_role || ''} - ${hist.administrative_scope || ''} ${hist.administrative_facility ? `(${hist.administrative_facility})` : ''}`);
      }
      if (hist.notes) {
        lines.push(`     ${isAr ? 'ملاحظات' : 'Notes'}: ${hist.notes}`);
      }
    });
    lines.push('');
  }

  // Technical Promotions
  if (doctor.promotions && doctor.promotions.length > 0) {
    lines.push(subDivider);
    lines.push(isAr ? `【 الترقيات الفنية (${doctor.promotions.length}) 】` : `【 TECHNICAL PROMOTIONS (${doctor.promotions.length}) 】`);
    doctor.promotions.forEach((promo, idx) => {
      lines.push(`  ${idx + 1}. ${promo.promotion_type} - ${isAr ? 'التاريخ' : 'Date'}: ${formatDate(promo.promotion_date, language)}`);
      if (promo.notes) lines.push(`     ${isAr ? 'ملاحظات' : 'Notes'}: ${promo.notes}`);
    });
    lines.push('');
  }

  // Financial Grades History
  if (doctor.financial_grades && doctor.financial_grades.length > 0) {
    lines.push(subDivider);
    lines.push(isAr ? `【 التدرج في الدرجات المالية (${doctor.financial_grades.length}) 】` : `【 FINANCIAL GRADES HISTORY (${doctor.financial_grades.length}) 】`);
    doctor.financial_grades.forEach((grade, idx) => {
      const periodStr = `${grade.start_date || '-'} -> ${grade.end_date || (isAr ? 'الحالية' : 'Current')}`;
      lines.push(`  ${idx + 1}. ${grade.financial_grade} (${periodStr})`);
      if (grade.notes) lines.push(`     ${isAr ? 'ملاحظات' : 'Notes'}: ${grade.notes}`);
    });
    lines.push('');
  }

  // General Notes
  if (doctor.notes) {
    lines.push(subDivider);
    lines.push(isAr ? '【 ملاحظات عامة 】' : '【 GENERAL NOTES 】');
    lines.push(doctor.notes);
    lines.push('');
  }

  // Footer
  lines.push(divider);
  lines.push(`${isAr ? 'تاريخ وتوقيت الاستخراج' : 'Generated On'}: ${now}`);
  lines.push(divider);

  return lines.join('\n');
}

/**
 * Export single doctor dossier as a formatted Text (.txt) file with UTF-8 BOM
 */
export function exportDoctorAsText(doctor: DoctorWithDetails, language: string = 'ar'): void {
  try {
    const textContent = generateDoctorTextDossier(doctor, language);
    // Add UTF-8 BOM so Notepad on Windows displays Arabic letters cleanly
    const blob = new Blob(['\uFEFF' + textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    const safeName = sanitizeFileName(doctor.name);
    link.href = url;
    link.download = `doctor_profile_${safeName}_${dateStr}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    Swal.fire({
      icon: 'success',
      title: language === 'ar' ? 'تم التصدير بنجاح' : 'Exported Successfully',
      text: language === 'ar' ? `تم تحميل ملف بيانات الطبيب (${doctor.name}) بنجاح` : `Doctor text file downloaded successfully`,
      timer: 1500,
      showConfirmButton: false
    });
  } catch (err: any) {
    console.error('Error exporting doctor to text:', err);
    Swal.fire({
      icon: 'error',
      title: language === 'ar' ? 'خطأ' : 'Error',
      text: err.message || 'Failed to export doctor text file'
    });
  }
}

/**
 * Copy doctor text dossier to clipboard
 */
export async function copyDoctorTextToClipboard(doctor: DoctorWithDetails, language: string = 'ar'): Promise<boolean> {
  try {
    const textContent = generateDoctorTextDossier(doctor, language);
    await navigator.clipboard.writeText(textContent);
    Swal.fire({
      icon: 'success',
      title: language === 'ar' ? 'تم النسخ للحافظة' : 'Copied to Clipboard',
      text: language === 'ar' ? 'تم نسخ كامل بيانات وسجل الطبيب بنجاح' : 'Complete doctor dossier copied to clipboard',
      timer: 1400,
      showConfirmButton: false
    });
    return true;
  } catch (err) {
    console.error('Clipboard copy error:', err);
    return false;
  }
}

/**
 * Export single doctor dossier as a rich multi-sheet Excel (.xlsx) file
 */
export function exportDoctorAsExcel(doctor: DoctorWithDetails, language: string = 'ar'): void {
  try {
    const isAr = language === 'ar';
    const workbook = XLSX.utils.book_new();

    // 1. Sheet 1: Basic Profile & Employment Overview
    const certsSummary = doctor.certificates?.map(c => getCertificateSummary(c, language)).join(' | ') || (isAr ? 'لا يوجد' : 'None');
    const currentStatus = doctor.current_status;

    const basicInfoRows = [
      [isAr ? 'بطاقة وسجل الطبيب' : 'Doctor Dossier Profile', doctor.name],
      ['', ''],
      [isAr ? 'البيان' : 'Field', isAr ? 'القيمة' : 'Value'],
      [isAr ? 'اسم الطبيب' : 'Doctor Name', doctor.name],
      [isAr ? 'الرقم القومي' : 'National ID', doctor.national_id || ''],
      [isAr ? 'رقم الهاتف' : 'Phone', doctor.phone || ''],
      [isAr ? 'العنوان' : 'Address', doctor.address || ''],
      [isAr ? 'تاريخ الميلاد' : 'Birth Date', doctor.birth_date || ''],
      [isAr ? 'تاريخ التخرج' : 'Graduation Date', doctor.graduation_date || ''],
      [isAr ? 'تاريخ استلام العمل' : 'Hire Date', doctor.hire_date || ''],
      [isAr ? 'الحالة الوظيفية الحالية' : 'Current Status', currentStatus?.status_type || (isAr ? 'قوة أساسية' : 'Core Staff')],
      [isAr ? 'اتجاه / جهة الانتداب' : 'Deputation Direction', currentStatus?.deputation_direction || ''],
      [isAr ? 'الجهة المنتدب منها / إليها' : 'Deputation Facility', currentStatus?.deputation_facility || ''],
      [isAr ? 'مكلف بعمل إداري' : 'Has Admin Duty', currentStatus?.has_administrative_duty ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No')],
      [isAr ? 'المسمى / المنصب الإداري' : 'Admin Role', currentStatus?.administrative_role || ''],
      [isAr ? 'نطاق العمل الإداري' : 'Admin Scope', currentStatus?.administrative_scope || ''],
      [isAr ? 'جهة العمل الإداري الخارجي' : 'Admin Facility', currentStatus?.administrative_facility || ''],
      [isAr ? 'الدرجة المالية الحالية' : 'Current Financial Grade', doctor.current_financial_grade?.financial_grade || ''],
      [isAr ? 'ملخص الشهادات والدرجات' : 'Certificates Summary', certsSummary],
      [isAr ? 'ملاحظات عامة' : 'General Notes', doctor.notes || ''],
      ['', ''],
      [isAr ? 'تاريخ الاستخراج' : 'Generated At', new Date().toLocaleString(isAr ? 'ar-EG' : 'en-US')]
    ];

    const basicSheet = XLSX.utils.aoa_to_sheet(basicInfoRows);
    basicSheet['!cols'] = [{ wch: 28 }, { wch: 55 }];
    XLSX.utils.book_append_sheet(workbook, basicSheet, isAr ? 'البيانات الأساسية' : 'Basic Profile');

    // 2. Sheet 2: Certificates & Degrees
    if (doctor.certificates && doctor.certificates.length > 0) {
      const certsData = doctor.certificates.map((c, i) => ({
        '#': i + 1,
        [isAr ? 'نوع الشهادة' : 'Degree Type']: c.certificate_type,
        [isAr ? 'عنوان / تخصص الشهادة' : 'Degree Title']: c.certificate_title,
        [isAr ? 'الجامعة / الجهة المانحة' : 'University']: c.university_name,
        [isAr ? 'الدولة' : 'Country']: c.university_country || '',
        [isAr ? 'الحالة' : 'Status']: c.status === 'obtained' ? (isAr ? 'حاصل عليها' : 'Obtained') : (isAr ? 'قيد الدراسة' : 'In Progress'),
        [isAr ? 'تاريخ الحصول عليها' : 'Obtained Date']: c.obtained_date ? formatCertificateDate(c.obtained_date, c.date_mode || 'month', language) : '',
        [isAr ? 'تاريخ بدء الدراسة' : 'Start Date']: c.study_start_date ? formatCertificateDate(c.study_start_date, 'month', language) : '',
        [isAr ? 'التاريخ المتوقع' : 'Expected Date']: c.expected_date ? formatCertificateDate(c.expected_date, 'month', language) : '',
        [isAr ? 'ملاحظات' : 'Notes']: c.notes || ''
      }));
      const certsSheet = XLSX.utils.json_to_sheet(certsData);
      certsSheet['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 28 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(workbook, certsSheet, isAr ? 'الشهادات والدرجات' : 'Certificates');
    }

    // 3. Sheet 3: Employment History Timeline
    if (doctor.employment_history && doctor.employment_history.length > 0) {
      const historyData = doctor.employment_history.map((h, i) => ({
        '#': i + 1,
        [isAr ? 'الحالة الوظيفية' : 'Status Type']: h.status_type,
        [isAr ? 'جهة / اتجاه الانتداب' : 'Deputation Direction']: h.deputation_direction || '',
        [isAr ? 'الجهة المنتدب إليها / منها' : 'Deputation Facility']: h.deputation_facility || '',
        [isAr ? 'عمل إداري' : 'Admin Duty']: h.has_administrative_duty ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No'),
        [isAr ? 'المسمى الإداري' : 'Admin Role']: h.administrative_role || '',
        [isAr ? 'نطاق العمل الإداري' : 'Admin Scope']: h.administrative_scope || '',
        [isAr ? 'جهة العمل الإداري' : 'Admin Facility']: h.administrative_facility || '',
        [isAr ? 'تاريخ البدء' : 'Start Date']: h.start_date || '',
        [isAr ? 'تاريخ الانتهاء' : 'End Date']: h.end_date || (isAr ? 'مستمر' : 'Ongoing'),
        [isAr ? 'ملاحظات' : 'Notes']: h.notes || ''
      }));
      const historySheet = XLSX.utils.json_to_sheet(historyData);
      historySheet['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 25 }, { wch: 25 }, { wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(workbook, historySheet, isAr ? 'السجل الوظيفي' : 'Employment History');
    }

    // 4. Sheet 4: Promotions & Financial Grades
    const milestonesRows: any[] = [];
    if (doctor.promotions && doctor.promotions.length > 0) {
      milestonesRows.push([isAr ? '=== الترقيات الفنية ===' : '=== Technical Promotions ===']);
      milestonesRows.push(['#', isAr ? 'نوع الترقية' : 'Promotion Type', isAr ? 'تاريخ الترقية' : 'Promotion Date', isAr ? 'ملاحظات' : 'Notes']);
      doctor.promotions.forEach((p, idx) => {
        milestonesRows.push([idx + 1, p.promotion_type, p.promotion_date || '', p.notes || '']);
      });
      milestonesRows.push(['', '', '', '']);
    }

    if (doctor.financial_grades && doctor.financial_grades.length > 0) {
      milestonesRows.push([isAr ? '=== التدرج المالي والدرجات ===' : '=== Financial Grades ===']);
      milestonesRows.push(['#', isAr ? 'الدرجة المالية' : 'Financial Grade', isAr ? 'تاريخ البدء' : 'Start Date', isAr ? 'تاريخ الانتهاء' : 'End Date', isAr ? 'ملاحظات' : 'Notes']);
      doctor.financial_grades.forEach((g, idx) => {
        milestonesRows.push([idx + 1, g.financial_grade, g.start_date || '', g.end_date || (isAr ? 'الحالية' : 'Current'), g.notes || '']);
      });
    }

    if (milestonesRows.length > 0) {
      const milestonesSheet = XLSX.utils.aoa_to_sheet(milestonesRows);
      milestonesSheet['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(workbook, milestonesSheet, isAr ? 'الترقيات والدرجات المالية' : 'Promotions & Grades');
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const safeName = sanitizeFileName(doctor.name);
    XLSX.writeFile(workbook, `doctor_dossier_${safeName}_${dateStr}.xlsx`);

    Swal.fire({
      icon: 'success',
      title: isAr ? 'تم التصدير بنجاح' : 'Exported Successfully',
      text: isAr ? `تم تحميل ملف Excel لطبيب (${doctor.name}) بنجاح` : `Doctor Excel dossier downloaded successfully`,
      timer: 1500,
      showConfirmButton: false
    });
  } catch (err: any) {
    console.error('Error exporting doctor to Excel:', err);
    Swal.fire({
      icon: 'error',
      title: language === 'ar' ? 'خطأ' : 'Error',
      text: err.message || 'Failed to export doctor Excel file'
    });
  }
}

/**
 * Draw a rounded rectangle on a 2D canvas context
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor?: string,
  strokeColor?: string,
  lineWidth: number = 1
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Generate a high-DPI Canvas Doctor Dossier / Profile Card
 * Produces an ultra-crisp, state-of-the-art medical doctor card image
 */
export function generateDoctorCardCanvas(doctor: DoctorWithDetails, language: string = 'ar'): HTMLCanvasElement {
  const isAr = language === 'ar';
  const scale = 2; // High-DPI 2x Retina rendering

  const cardWidth = 1000;
  const padding = 40;
  const innerWidth = cardWidth - padding * 2;

  // Compute dynamic height based on number of certificates and items
  const certCount = doctor.certificates?.length || 0;
  const promoCount = doctor.promotions?.length || 0;
  const gradeCount = doctor.financial_grades?.length || 0;
  const hasHistory = (doctor.employment_history?.length || 0) > 1;

  let baseHeight = 720;
  if (certCount > 0) baseHeight += Math.min(certCount * 62 + 50, 420);
  if (hasHistory) baseHeight += 120;
  if (promoCount > 0 || gradeCount > 0) baseHeight += 130;
  if (doctor.notes) baseHeight += 90;

  const cardHeight = Math.max(baseHeight, 820);

  const canvas = document.createElement('canvas');
  canvas.width = cardWidth * scale;
  canvas.height = cardHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, cardWidth, cardHeight);

  // Top Accent Gradient Bar
  const topGrad = ctx.createLinearGradient(0, 0, cardWidth, 0);
  topGrad.addColorStop(0, '#4338ca');
  topGrad.addColorStop(0.5, '#4f46e5');
  topGrad.addColorStop(1, '#2563eb');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, cardWidth, 8);

  // Header Banner Card
  const headerHeight = 175;
  const headerGrad = ctx.createLinearGradient(0, 8, cardWidth, headerHeight + 8);
  headerGrad.addColorStop(0, '#1e1b4b');
  headerGrad.addColorStop(0.6, '#312e81');
  headerGrad.addColorStop(1, '#1e40af');

  drawRoundedRect(ctx, padding, 24, innerWidth, headerHeight, 20, '#1e1b4b');
  ctx.fillStyle = headerGrad;
  ctx.fill();

  // Subtle Header Decorative Glow
  ctx.save();
  ctx.beginPath();
  ctx.arc(cardWidth - 80, 50, 110, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
  ctx.fill();
  ctx.restore();

  // Clinic System Title (Top of Header)
  ctx.save();
  ctx.direction = isAr ? 'rtl' : 'ltr';
  ctx.font = '600 13px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#a5b4fc';
  const clinicTitle = isAr ? 'نظام إدارة عيادات طب الأسنان  |  سجل وبيانات الطبيب' : 'Dental Clinic Management System  |  Doctor Dossier Profile';
  ctx.fillText(clinicTitle, isAr ? cardWidth - padding - 24 : padding + 24, 52);

  // Doctor Monogram Avatar Circle
  const avatarSize = 74;
  const avatarX = isAr ? cardWidth - padding - 30 - avatarSize : padding + 30;
  const avatarY = 70;

  const avatarGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
  avatarGrad.addColorStop(0, '#6366f1');
  avatarGrad.addColorStop(1, '#3b82f6');
  drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 18, '#6366f1');
  ctx.fillStyle = avatarGrad;
  ctx.fill();

  // Avatar Monogram Letter
  ctx.font = 'bold 34px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const initialChar = doctor.name ? doctor.name.trim().charAt(0) : 'د';
  ctx.fillText(initialChar, avatarX + avatarSize / 2, avatarY + avatarSize / 2);

  // Doctor Full Name
  ctx.textAlign = isAr ? 'right' : 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  const nameX = isAr ? avatarX - 20 : avatarX + avatarSize + 20;
  const docPrefix = isAr ? 'د. ' : 'Dr. ';
  const displayName = doctor.name.startsWith('د') || doctor.name.startsWith('Dr') ? doctor.name : `${docPrefix}${doctor.name}`;
  ctx.fillText(displayName, nameX, 98);

  // Status Badges in Header
  const currentStatus = doctor.current_status?.status_type || (isAr ? 'قوة أساسية' : 'Core Staff');
  let badgeStartX = nameX;
  const badgeY = 120;
  const badgeH = 26;

  // 1. Status Badge
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  const statusText = currentStatus;
  const statusWidth = ctx.measureText(statusText).width + 20;
  const statusBadgeX = isAr ? badgeStartX - statusWidth : badgeStartX;
  drawRoundedRect(ctx, statusBadgeX, badgeY, statusWidth, badgeH, 13, 'rgba(16, 185, 129, 0.25)', '#10b981', 1);
  ctx.fillStyle = '#6ee7b7';
  ctx.fillText(statusText, isAr ? statusBadgeX + statusWidth - 10 : statusBadgeX + 10, badgeY + 17);

  // 2. Admin Duty Badge if present
  if (doctor.current_status?.has_administrative_duty) {
    const adminText = doctor.current_status.administrative_role || (isAr ? 'تكليف إداري' : 'Admin Duty');
    const adminWidth = ctx.measureText(adminText).width + 20;
    const adminBadgeX = isAr ? statusBadgeX - adminWidth - 10 : statusBadgeX + statusWidth + 10;
    drawRoundedRect(ctx, adminBadgeX, badgeY, adminWidth, badgeH, 13, 'rgba(168, 85, 247, 0.25)', '#a855f7', 1);
    ctx.fillStyle = '#e9d5ff';
    ctx.fillText(adminText, isAr ? adminBadgeX + adminWidth - 10 : adminBadgeX + 10, badgeY + 17);
  }

  // 3. Current Financial Grade if present
  if (doctor.current_financial_grade) {
    const gradeText = doctor.current_financial_grade.financial_grade;
    const gradeWidth = ctx.measureText(gradeText).width + 20;
    const gradeBadgeX = isAr ? statusBadgeX - (doctor.current_status?.has_administrative_duty ? 180 : 0) - gradeWidth - 10 : statusBadgeX + statusWidth + (doctor.current_status?.has_administrative_duty ? 180 : 0) + 10;
    if (gradeBadgeX > padding + 10 && gradeBadgeX + gradeWidth < cardWidth - padding - 10) {
      drawRoundedRect(ctx, gradeBadgeX, badgeY, gradeWidth, badgeH, 13, 'rgba(245, 158, 11, 0.25)', '#f59e0b', 1);
      ctx.fillStyle = '#fde68a';
      ctx.fillText(gradeText, isAr ? gradeBadgeX + gradeWidth - 10 : gradeBadgeX + 10, badgeY + 17);
    }
  }

  ctx.restore();

  // Content Layout
  let currentY = 220;
  const colGap = 18;
  const halfColWidth = (innerWidth - colGap) / 2;

  // Left & Right Info Boxes: Personal Info & Employment Info
  const boxHeight = 168;

  // Box 1: Personal & Contact Info
  const box1X = isAr ? padding + halfColWidth + colGap : padding;
  drawRoundedRect(ctx, box1X, currentY, halfColWidth, boxHeight, 16, '#ffffff', '#e2e8f0', 1);

  ctx.save();
  ctx.direction = isAr ? 'rtl' : 'ltr';
  ctx.textAlign = isAr ? 'right' : 'left';
  
  // Section 1 Header
  drawRoundedRect(ctx, box1X + 16, currentY + 14, halfColWidth - 32, 28, 8, '#f1f5f9');
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText(isAr ? '📋 البيانات الشخصية والاتصال' : '📋 Personal & Contact Info', isAr ? box1X + halfColWidth - 28 : box1X + 28, currentY + 33);

  // Field Rows
  const fieldsCol1 = [
    { label: isAr ? 'الرقم القومي' : 'National ID', val: doctor.national_id || '---' },
    { label: isAr ? 'رقم الهاتف' : 'Phone', val: doctor.phone || '---' },
    { label: isAr ? 'العنوان' : 'Address', val: doctor.address || '---' },
    { label: isAr ? 'تاريخ التعيين' : 'Hire Date', val: formatDate(doctor.hire_date, language) },
  ];

  let fieldY = currentY + 62;
  fieldsCol1.forEach(f => {
    ctx.font = '600 11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`${f.label}:`, isAr ? box1X + halfColWidth - 24 : box1X + 24, fieldY);

    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(f.val, isAr ? box1X + halfColWidth - 110 : box1X + 105, fieldY);
    fieldY += 24;
  });
  ctx.restore();

  // Box 2: Employment & Administrative Info
  const box2X = isAr ? padding : padding + halfColWidth + colGap;
  drawRoundedRect(ctx, box2X, currentY, halfColWidth, boxHeight, 16, '#ffffff', '#e2e8f0', 1);

  ctx.save();
  ctx.direction = isAr ? 'rtl' : 'ltr';
  ctx.textAlign = isAr ? 'right' : 'left';

  // Section 2 Header
  drawRoundedRect(ctx, box2X + 16, currentY + 14, halfColWidth - 32, 28, 8, '#f1f5f9');
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText(isAr ? '💼 الحالة الوظيفية والتكليف الإداري' : '💼 Employment & Admin Duty', isAr ? box2X + halfColWidth - 28 : box2X + 28, currentY + 33);

  const fieldsCol2 = [
    { label: isAr ? 'الحالة الحالية' : 'Current Status', val: currentStatus },
    { label: isAr ? 'التكليف الإداري' : 'Admin Duty', val: doctor.current_status?.has_administrative_duty ? (doctor.current_status.administrative_role || (isAr ? 'نعم' : 'Yes')) : (isAr ? 'عمل إكلينيكي فقط' : 'Clinical Only') },
    { label: isAr ? 'الدرجة المالية' : 'Financial Grade', val: doctor.current_financial_grade?.financial_grade || '---' },
    { label: isAr ? 'تاريخ التخرج' : 'Graduation Date', val: formatDate(doctor.graduation_date, language) },
  ];

  let field2Y = currentY + 62;
  fieldsCol2.forEach(f => {
    ctx.font = '600 11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`${f.label}:`, isAr ? box2X + halfColWidth - 24 : box2X + 24, field2Y);

    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(f.val, isAr ? box2X + halfColWidth - 110 : box2X + 105, field2Y);
    field2Y += 24;
  });
  ctx.restore();

  currentY += boxHeight + 20;

  // Section 3: Academic Degrees & Certificates (Full Width Box)
  const certs = doctor.certificates || [];
  const certBoxHeight = Math.max(80, certs.length * 56 + 56);
  drawRoundedRect(ctx, padding, currentY, innerWidth, certBoxHeight, 16, '#ffffff', '#e2e8f0', 1);

  ctx.save();
  ctx.direction = isAr ? 'rtl' : 'ltr';
  ctx.textAlign = isAr ? 'right' : 'left';

  // Section Header
  drawRoundedRect(ctx, padding + 16, currentY + 14, innerWidth - 32, 28, 8, '#eef2ff');
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#3730a3';
  ctx.fillText(
    `${isAr ? '🎓 الشهادات والدرجات العلمية' : '🎓 Academic Certificates & Degrees'} (${certs.length})`,
    isAr ? padding + innerWidth - 28 : padding + 28,
    currentY + 33
  );

  if (certs.length === 0) {
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(isAr ? 'لا توجد شهادات علمية مسجلة حتى الآن' : 'No academic degrees registered yet', isAr ? padding + innerWidth - 30 : padding + 30, currentY + 68);
  } else {
    let certRowY = currentY + 54;
    certs.forEach((c, idx) => {
      // Row separator
      if (idx > 0) {
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding + 20, certRowY);
        ctx.lineTo(padding + innerWidth - 20, certRowY);
        ctx.stroke();
      }

      const isObtained = c.status === 'obtained';
      
      // Certificate Title & Type
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#1e293b';
      const certTitleText = `${idx + 1}. ${c.certificate_type} ${c.certificate_title}`;
      ctx.fillText(certTitleText, isAr ? padding + innerWidth - 30 : padding + 30, certRowY + 20);

      // University Name & Country
      ctx.font = '500 11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#64748b';
      const univStr = `${c.university_name}${c.university_country ? ` (${c.university_country})` : ''}`;
      ctx.fillText(univStr, isAr ? padding + innerWidth - 30 : padding + 30, certRowY + 38);

      // Status Pill on the side
      const statusLabel = isObtained ? (isAr ? 'حاصل عليها' : 'Obtained') : (isAr ? 'قيد الدراسة' : 'In Progress');
      ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
      const pillW = ctx.measureText(statusLabel).width + 16;
      const pillX = isAr ? padding + 30 : padding + innerWidth - 30 - pillW;
      const pillBg = isObtained ? '#ecfdf5' : '#eff6ff';
      const pillBorder = isObtained ? '#10b981' : '#3b82f6';
      const pillText = isObtained ? '#047857' : '#1d4ed8';

      drawRoundedRect(ctx, pillX, certRowY + 12, pillW, 22, 11, pillBg, pillBorder, 1);
      ctx.fillStyle = pillText;
      ctx.fillText(statusLabel, isAr ? pillX + pillW - 8 : pillX + 8, certRowY + 27);

      // Date Text next to pill
      const dateText = isObtained 
        ? formatCertificateDate(c.obtained_date, c.date_mode || 'month', language)
        : (c.expected_date ? `${isAr ? 'متوقع: ' : 'Exp: '}${formatCertificateDate(c.expected_date, 'month', language)}` : '');
      if (dateText) {
        ctx.font = '600 10px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#64748b';
        const dateX = isAr ? pillX + pillW + 12 : pillX - ctx.measureText(dateText).width - 12;
        ctx.fillText(dateText, dateX, certRowY + 27);
      }

      certRowY += 54;
    });
  }
  ctx.restore();

  currentY += certBoxHeight + 20;

  // Section 4: Promotions & Financial Grades (if available)
  if (promoCount > 0 || gradeCount > 0) {
    const promoBoxHeight = 90;
    drawRoundedRect(ctx, padding, currentY, innerWidth, promoBoxHeight, 16, '#ffffff', '#e2e8f0', 1);

    ctx.save();
    ctx.direction = isAr ? 'rtl' : 'ltr';
    ctx.textAlign = isAr ? 'right' : 'left';

    drawRoundedRect(ctx, padding + 16, currentY + 12, innerWidth - 32, 26, 8, '#fef3c7');
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#92400e';
    ctx.fillText(isAr ? '⭐ الترقيات والتدرج المالي' : '⭐ Promotions & Financial Progression', isAr ? padding + innerWidth - 28 : padding + 28, currentY + 29);

    let infoText = '';
    if (doctor.promotions && doctor.promotions[0]) {
      infoText += `${isAr ? 'آخر ترقية' : 'Latest Promotion'}: ${doctor.promotions[0].promotion_type} (${formatDate(doctor.promotions[0].promotion_date, language)})   |   `;
    }
    if (doctor.current_financial_grade) {
      infoText += `${isAr ? 'الدرجة المالية' : 'Financial Grade'}: ${doctor.current_financial_grade.financial_grade} (${isAr ? 'منذ' : 'Since'} ${doctor.current_financial_grade.start_date})`;
    }

    ctx.font = '500 11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(infoText || (isAr ? 'لا توجد سجلات ترقية' : 'No records'), isAr ? padding + innerWidth - 28 : padding + 28, currentY + 62);
    ctx.restore();

    currentY += promoBoxHeight + 20;
  }

  // Footer / Verification Stamp
  ctx.save();
  ctx.direction = isAr ? 'rtl' : 'ltr';
  ctx.textAlign = isAr ? 'right' : 'left';
  ctx.font = '500 11px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#94a3b8';

  const footerText = isAr 
    ? `سجل رسمي معتمد  •  تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')}  •  عيادات طب الأسنان`
    : `Official Medical Dossier  •  Generated: ${new Date().toLocaleDateString('en-US')}  •  Dental Clinics System`;
  ctx.fillText(footerText, isAr ? cardWidth - padding - 10 : padding + 10, cardHeight - 20);

  // Left / Right badge text
  ctx.textAlign = isAr ? 'left' : 'right';
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#6366f1';
  ctx.fillText('VERIFIED SYSTEM RECORD ✓', isAr ? padding + 10 : cardWidth - padding - 10, cardHeight - 20);

  ctx.restore();

  return canvas;
}

/**
 * Export single doctor dossier as high-resolution PNG image
 */
export function exportDoctorAsImage(doctor: DoctorWithDetails, language: string = 'ar'): void {
  try {
    const canvas = generateDoctorCardCanvas(doctor, language);
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    const safeName = sanitizeFileName(doctor.name);
    link.href = dataUrl;
    link.download = `doctor_card_${safeName}_${dateStr}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire({
      icon: 'success',
      title: language === 'ar' ? 'تم التصدير بنجاح' : 'Exported Successfully',
      text: language === 'ar' ? `تم تحميل بطاقة الطبيب (${doctor.name}) كصورة PNG بنجاح` : `Doctor card PNG downloaded successfully`,
      timer: 1500,
      showConfirmButton: false
    });
  } catch (err: any) {
    console.error('Error exporting doctor card image:', err);
    Swal.fire({
      icon: 'error',
      title: language === 'ar' ? 'خطأ' : 'Error',
      text: err.message || 'Failed to export doctor image card'
    });
  }
}

/**
 * Copy doctor image card to clipboard as PNG image blob
 */
export async function copyDoctorCardImageToClipboard(doctor: DoctorWithDetails, language: string = 'ar'): Promise<boolean> {
  try {
    const canvas = generateDoctorCardCanvas(doctor, language);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Failed to create image blob');

    if (navigator.clipboard && (window as any).ClipboardItem) {
      await navigator.clipboard.write([
        new (window as any).ClipboardItem({
          'image/png': blob
        })
      ]);
      Swal.fire({
        icon: 'success',
        title: language === 'ar' ? 'تم النسخ للحافظة' : 'Copied to Clipboard',
        text: language === 'ar' ? 'تم نسخ صورة بطاقة الطبيب للحافظة بنجاح' : 'Doctor card image copied to clipboard',
        timer: 1400,
        showConfirmButton: false
      });
      return true;
    } else {
      throw new Error('Clipboard image writing is not supported by this browser');
    }
  } catch (err: any) {
    console.warn('Image clipboard write error, fallback to data url copy:', err);
    // Fallback: Copy text dossier if image clipboard fails
    return await copyDoctorTextToClipboard(doctor, language);
  }
}

/**
 * Print doctor profile card directly
 */
export function printDoctorCard(doctor: DoctorWithDetails, language: string = 'ar'): void {
  try {
    const canvas = generateDoctorCardCanvas(doctor, language);
    const dataUrl = canvas.toDataURL('image/png');

    const printWin = window.open('', '_blank');
    if (!printWin) {
      Swal.fire({
        icon: 'warning',
        title: language === 'ar' ? 'نافذة منبثقة محظورة' : 'Popup Blocked',
        text: language === 'ar' ? 'يرجى السماح بالنوافذ المنبثقة للطباعة' : 'Please allow popups to print'
      });
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
      <head>
        <title>${doctor.name} - ${language === 'ar' ? 'بطاقة الطبيب' : 'Doctor Profile'}</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #ffffff;
          }
          img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          @media print {
            body { padding: 0; }
            img { box-shadow: none; width: 100%; }
          }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" alt="${doctor.name}" onload="window.print();window.close();" />
      </body>
      </html>
    `);
    printWin.document.close();
  } catch (err: any) {
    console.error('Error printing doctor card:', err);
  }
}
