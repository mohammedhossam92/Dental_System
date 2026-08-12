import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import type { DoctorWithDetails, DoctorCertificate, DoctorEmploymentHistory, DoctorPromotion, DoctorFinancialGrade } from '../types';
import { formatDate, formatCertificateDate, getCertificateSummary, formatDisplayValue } from './doctorUtils';

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
  const undefinedStr = isAr ? 'غير محدد' : 'undefined';
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
  lines.push(`${isAr ? '• الرقم القومي' : '• National ID'}: ${formatDisplayValue(doctor.national_id, language)}`);
  lines.push(`${isAr ? '• رقم الهاتف' : '• Phone'}: ${formatDisplayValue(doctor.phone, language)}`);
  lines.push(`${isAr ? '• العنوان' : '• Address'}: ${formatDisplayValue(doctor.address, language)}`);
  lines.push(`${isAr ? '• تاريخ الميلاد' : '• Birth Date'}: ${formatDate(doctor.birth_date, language)}`);
  lines.push(`${isAr ? '• تاريخ التخرج' : '• Graduation Date'}: ${formatDate(doctor.graduation_date, language)}`);
  lines.push(`${isAr ? '• تاريخ استلام العمل' : '• Hire Date'}: ${formatDate(doctor.hire_date, language)}`);
  lines.push(`${isAr ? '• حالة تدقيق وتأكيد البيانات' : '• Data Confirmation'}: ${doctor.is_confirmed ? (isAr ? 'بيانات مؤكدة ومدققة ✓' : 'Confirmed & Verified ✓') : (isAr ? 'غير مؤكدة (قيد المراجعة)' : 'Pending Review')}`);
  lines.push('');

  // Employment Status & Admin Duty
  lines.push(subDivider);
  lines.push(isAr ? '【 الحالة الوظيفية والتكليف الإداري الحالي 】' : '【 CURRENT EMPLOYMENT & ADMINISTRATIVE STATUS 】');
  const currentStatus = doctor.current_status;
  const statusType = formatDisplayValue(currentStatus?.status_type, language, isAr ? 'قوة أساسية' : 'Core Staff');
  lines.push(`${isAr ? '• الحالة الوظيفية الحالية' : '• Current Employment Status'}: ${statusType}`);
  
  if (currentStatus?.deputation_direction && currentStatus.deputation_direction !== 'null' && currentStatus.deputation_direction !== 'undefined') {
    lines.push(`${isAr ? '• جهة / اتجاه الانتداب' : '• Deputation Direction'}: ${currentStatus.deputation_direction}`);
    if (currentStatus.deputation_facility && currentStatus.deputation_facility !== 'null' && currentStatus.deputation_facility !== 'undefined') {
      lines.push(`${isAr ? '• الجهة المنتدب منها / إليها' : '• Deputation Facility'}: ${currentStatus.deputation_facility}`);
    }
  }

  if (currentStatus?.has_administrative_duty) {
    lines.push(`${isAr ? '• التكليف الإداري' : '• Administrative Duty'}: ${isAr ? 'نعم (مكلف بعمل إداري)' : 'Yes'}`);
    lines.push(`${isAr ? '• المسمى / المنصب الإداري' : '• Administrative Role'}: ${formatDisplayValue(currentStatus.administrative_role, language)}`);
    lines.push(`${isAr ? '• نطاق العمل الإداري' : '• Administrative Scope'}: ${formatDisplayValue(currentStatus.administrative_scope, language, isAr ? 'داخل القسم' : 'Inside Department')}`);
    if (currentStatus.administrative_facility && currentStatus.administrative_facility !== 'null' && currentStatus.administrative_facility !== 'undefined') {
      lines.push(`${isAr ? '• جهة العمل الإداري' : '• Administrative Facility'}: ${currentStatus.administrative_facility}`);
    }
  } else {
    lines.push(`${isAr ? '• التكليف الإداري' : '• Administrative Duty'}: ${isAr ? 'لا (عمل إكلينيكي فقط)' : 'Clinical Only'}`);
  }

  if (doctor.current_financial_grade?.financial_grade && doctor.current_financial_grade.financial_grade !== 'null') {
    lines.push(`${isAr ? '• الدرجة المالية الحالية' : '• Current Financial Grade'}: ${doctor.current_financial_grade.financial_grade} (${isAr ? 'منذ' : 'Since'} ${doctor.current_financial_grade.start_date || undefinedStr})`);
  }
  lines.push('');

  // Academic Certificates & Degrees
  lines.push(subDivider);
  lines.push(isAr ? `【 الشهادات والدرجات العلمية (${doctor.certificates?.length || 0}) 】` : `【 ACADEMIC CERTIFICATES & DEGREES (${doctor.certificates?.length || 0}) 】`);
  if (doctor.certificates && doctor.certificates.length > 0) {
    doctor.certificates.forEach((cert, idx) => {
      lines.push(`  ${idx + 1}. ${formatDisplayValue(cert.certificate_type, language, '')} - ${formatDisplayValue(cert.certificate_title, language, '')}`);
      const cleanUniv = cert.university_name && cert.university_name !== 'null' && cert.university_name !== 'undefined' ? cert.university_name : undefinedStr;
      const cleanCountry = (cleanUniv !== undefinedStr && cert.university_country && cert.university_country !== 'null' && cert.university_country !== 'undefined' && cert.university_country !== 'مصر') ? ` (${cert.university_country})` : '';
      lines.push(`     ${isAr ? 'الجامعة / الجهة المانحة' : 'University'}: ${cleanUniv}${cleanCountry}`);
      lines.push(`     ${isAr ? 'الحالة' : 'Status'}: ${cert.status === 'obtained' ? (isAr ? 'حاصل عليها' : 'Obtained') : (isAr ? 'قيد الدراسة حالياً' : 'In Progress')}`);
      if (cert.status === 'obtained' && cert.obtained_date) {
        const d = formatCertificateDate(cert.obtained_date, cert.date_mode || 'month', language);
        if (d) lines.push(`     ${isAr ? 'تاريخ الحصول عليها' : 'Obtained Date'}: ${d}`);
      } else if (cert.status === 'in_progress') {
        if (cert.study_start_date) {
          const sd = formatCertificateDate(cert.study_start_date, 'month', language);
          if (sd) lines.push(`     ${isAr ? 'تاريخ بدء القيد' : 'Start Date'}: ${sd}`);
        }
        if (cert.expected_date) {
          const ed = formatCertificateDate(cert.expected_date, 'month', language);
          if (ed) lines.push(`     ${isAr ? 'تاريخ التخرج المتوقع' : 'Expected Completion'}: ${ed}`);
        }
      }
      if (cert.notes && cert.notes !== 'null' && cert.notes !== 'undefined') {
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
      const periodStr = `${hist.start_date || undefinedStr} -> ${hist.end_date || (isAr ? 'مستمر حتى الآن' : 'Present')}`;
      lines.push(`  ${idx + 1}. [${formatDisplayValue(hist.status_type, language, isAr ? 'قوة أساسية' : 'Core Staff')}] (${periodStr})`);
      if (hist.deputation_direction || hist.deputation_facility) {
        lines.push(`     ${isAr ? 'الانتداب' : 'Deputation'}: ${hist.deputation_direction && hist.deputation_direction !== 'null' ? hist.deputation_direction : ''} ${hist.deputation_facility && hist.deputation_facility !== 'null' ? `(${hist.deputation_facility})` : ''}`);
      }
      if (hist.has_administrative_duty) {
        lines.push(`     ${isAr ? 'المنصب الإداري' : 'Admin Role'}: ${formatDisplayValue(hist.administrative_role, language)} - ${formatDisplayValue(hist.administrative_scope, language, isAr ? 'داخل القسم' : 'Inside Department')} ${hist.administrative_facility && hist.administrative_facility !== 'null' ? `(${hist.administrative_facility})` : ''}`);
      }
      if (hist.notes && hist.notes !== 'null' && hist.notes !== 'undefined') {
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
      lines.push(`  ${idx + 1}. ${formatDisplayValue(promo.promotion_type, language)} - ${isAr ? 'التاريخ' : 'Date'}: ${formatDate(promo.promotion_date, language)}`);
      if (promo.notes && promo.notes !== 'null' && promo.notes !== 'undefined') lines.push(`     ${isAr ? 'ملاحظات' : 'Notes'}: ${promo.notes}`);
    });
    lines.push('');
  }

  // Financial Grades History
  if (doctor.financial_grades && doctor.financial_grades.length > 0) {
    lines.push(subDivider);
    lines.push(isAr ? `【 التدرج في الدرجات المالية (${doctor.financial_grades.length}) 】` : `【 FINANCIAL GRADES HISTORY (${doctor.financial_grades.length}) 】`);
    doctor.financial_grades.forEach((grade, idx) => {
      const periodStr = `${grade.start_date || undefinedStr} -> ${grade.end_date || (isAr ? 'الحالية' : 'Current')}`;
      lines.push(`  ${idx + 1}. ${formatDisplayValue(grade.financial_grade, language)} (${periodStr})`);
      if (grade.notes && grade.notes !== 'null' && grade.notes !== 'undefined') lines.push(`     ${isAr ? 'ملاحظات' : 'Notes'}: ${grade.notes}`);
    });
    lines.push('');
  }

  // General Notes
  if (doctor.notes && doctor.notes !== 'null' && doctor.notes !== 'undefined') {
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
 * Truncate text with ellipsis if it exceeds maxWidth
 */
function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (!text || maxWidth <= 0) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(truncated + '…').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '…';
}

/**
 * Generate a mobile-friendly, high-DPI Canvas Doctor Dossier / Profile Card
 * Produces an ultra-crisp, vertically stacked, large-typography card for mobile phones
 */
export function generateDoctorCardCanvas(doctor: DoctorWithDetails, language: string = 'ar'): HTMLCanvasElement {
  const isAr = language === 'ar';
  const scale = 2; // High-DPI 2x Retina rendering

  const cardWidth = 720;
  const padding = 24;
  const innerWidth = cardWidth - padding * 2; // 672px

  const currentStatus = doctor.current_status;
  const certs = doctor.certificates || [];
  const hasPromos = (doctor.promotions && doctor.promotions.length > 0) || (doctor.financial_grades && doctor.financial_grades.length > 0);
  const hasNotes = !!(doctor.notes && doctor.notes.trim() && doctor.notes.trim() !== 'null' && doctor.notes.trim() !== 'undefined');

  const hasDeputation = !!(currentStatus?.deputation_direction && currentStatus.deputation_direction !== 'null' && currentStatus.deputation_direction !== 'undefined') ||
                        !!(currentStatus?.deputation_facility && currentStatus.deputation_facility !== 'null' && currentStatus.deputation_facility !== 'undefined');
  const hasAdminDuty = !!(currentStatus?.has_administrative_duty);

  const rowStep = 30; // Spacious, clear row height for mobile readability

  // --- PASS 1: Calculate Exact Dynamic Height (Zero Dead Space) ---
  let calculatedY = 16; // Top margin
  const headerHeight = 148;
  calculatedY += headerHeight;

  // 1. Personal & Contact Info Card (Full Width)
  calculatedY += 12; // Spacing
  const personalBoxHeight = 36 + (4 * rowStep) + 12; // ~168px
  calculatedY += personalBoxHeight;

  // 2. Employment & Administrative Status Card (Full Width)
  calculatedY += 12; // Spacing
  const employmentRowsCount = 4 + (hasDeputation ? 1 : 0) + (hasAdminDuty ? 1 : 0);
  const employmentBoxHeight = 36 + (employmentRowsCount * rowStep) + 12;
  calculatedY += employmentBoxHeight;

  // 3. Academic Certificates & Degrees Card (Full Width)
  calculatedY += 12; // Spacing
  const certBoxHeight = certs.length === 0 ? 68 : (38 + certs.length * 54 + 10);
  calculatedY += certBoxHeight;

  // 4. Promotions & Financial Progression (Conditional)
  if (hasPromos) {
    calculatedY += 12;
    calculatedY += 56;
  }

  // 5. Doctor Notes (Conditional)
  if (hasNotes) {
    calculatedY += 12;
    calculatedY += 52;
  }

  calculatedY += 16; // Spacing to footer
  calculatedY += 34; // Footer height + bottom padding

  const cardHeight = calculatedY;

  // --- PASS 2: Canvas Rendering ---
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
  ctx.fillRect(0, 0, cardWidth, 6);

  // ================= 1. Header Banner Card =================
  const headerY = 16;
  const headerGrad = ctx.createLinearGradient(0, headerY, cardWidth, headerY + headerHeight);
  headerGrad.addColorStop(0, '#1e1b4b');
  headerGrad.addColorStop(0.5, '#312e81');
  headerGrad.addColorStop(1, '#1e40af');

  drawRoundedRect(ctx, padding, headerY, innerWidth, headerHeight, 16, '#1e1b4b');
  ctx.fillStyle = headerGrad;
  ctx.fill();

  // Subtle Header Decorative Glow
  ctx.save();
  ctx.beginPath();
  ctx.arc(isAr ? padding + 50 : cardWidth - padding - 50, headerY + 40, 85, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(99, 102, 241, 0.14)';
  ctx.fill();
  ctx.restore();

  // Clinic System Title (Top of Header)
  ctx.save();
  ctx.direction = isAr ? 'rtl' : 'ltr';
  ctx.font = '600 12px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#a5b4fc';
  ctx.textAlign = isAr ? 'right' : 'left';
  const clinicTitle = isAr ? 'نظام إدارة عيادات طب الأسنان  |  بطاقة وسجل بيانات الطبيب' : 'Dental Clinic Management System  |  Doctor Dossier Profile';
  ctx.fillText(clinicTitle, isAr ? cardWidth - padding - 18 : padding + 18, headerY + 26);

  // Doctor Monogram Avatar
  const avatarSize = 60;
  const avatarX = isAr ? cardWidth - padding - 18 - avatarSize : padding + 18;
  const avatarY = headerY + 40;

  const avatarGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
  avatarGrad.addColorStop(0, '#6366f1');
  avatarGrad.addColorStop(1, '#3b82f6');
  drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 16, '#6366f1');
  ctx.fillStyle = avatarGrad;
  ctx.fill();

  // Avatar Monogram Initial
  ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const initialChar = doctor.name ? doctor.name.trim().charAt(0) : 'د';
  ctx.fillText(initialChar, avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 1);

  // Doctor Full Name
  ctx.textAlign = isAr ? 'right' : 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 23px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  const nameX = isAr ? avatarX - 16 : avatarX + avatarSize + 16;
  const docPrefix = isAr ? 'د. ' : 'Dr. ';
  const rawDisplayName = doctor.name.startsWith('د') || doctor.name.startsWith('Dr') ? doctor.name : `${docPrefix}${doctor.name}`;
  const maxNameWidth = innerWidth - avatarSize - 44;
  const displayName = truncateText(ctx, rawDisplayName, maxNameWidth);
  ctx.fillText(displayName, nameX, avatarY + 26);

  // Badges in Header (Status, Financial Grade, Admin Duty)
  const statusTypeStr = formatDisplayValue(doctor.current_status?.status_type, language, isAr ? 'قوة أساسية' : 'Core Staff');
  const badgeY = avatarY + 42;
  const badgeH = 26;

  let currentBadgeX = nameX;

  // 1. Status Badge
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  const statusWidth = ctx.measureText(statusTypeStr).width + 18;
  const statusBadgeX = isAr ? currentBadgeX - statusWidth : currentBadgeX;
  drawRoundedRect(ctx, statusBadgeX, badgeY, statusWidth, badgeH, 13, 'rgba(16, 185, 129, 0.25)', '#10b981', 1);
  ctx.fillStyle = '#6ee7b7';
  ctx.fillText(statusTypeStr, isAr ? statusBadgeX + statusWidth - 9 : statusBadgeX + 9, badgeY + 17);

  currentBadgeX = isAr ? statusBadgeX - 8 : statusBadgeX + statusWidth + 8;

  // 2. Financial Grade Badge (if present)
  if (doctor.current_financial_grade?.financial_grade && doctor.current_financial_grade.financial_grade !== 'null') {
    const rawGrade = doctor.current_financial_grade.financial_grade;
    const gradeText = formatDisplayValue(rawGrade, language);
    if (gradeText !== (isAr ? 'غير محدد' : 'undefined')) {
      const gradeWidth = ctx.measureText(gradeText).width + 18;
      const gradeBadgeX = isAr ? currentBadgeX - gradeWidth : currentBadgeX;
      const canFit = isAr ? gradeBadgeX > (padding + 16) : (gradeBadgeX + gradeWidth < cardWidth - padding - 16);
      if (canFit) {
        drawRoundedRect(ctx, gradeBadgeX, badgeY, gradeWidth, badgeH, 13, 'rgba(245, 158, 11, 0.25)', '#f59e0b', 1);
        ctx.fillStyle = '#fde68a';
        ctx.fillText(gradeText, isAr ? gradeBadgeX + gradeWidth - 9 : gradeBadgeX + 9, badgeY + 17);
        currentBadgeX = isAr ? gradeBadgeX - 8 : gradeBadgeX + gradeWidth + 8;
      }
    }
  }

  // 3. Admin Duty Badge (if present)
  if (doctor.current_status?.has_administrative_duty) {
    const rawAdminRole = doctor.current_status.administrative_role;
    const adminText = formatDisplayValue(rawAdminRole, language, isAr ? 'تكليف إداري' : 'Admin Duty');
    const adminWidth = ctx.measureText(adminText).width + 18;
    const adminBadgeX = isAr ? currentBadgeX - adminWidth : currentBadgeX;
    const canFit = isAr ? adminBadgeX > (padding + 16) : (adminBadgeX + adminWidth < cardWidth - padding - 16);
    if (canFit) {
      drawRoundedRect(ctx, adminBadgeX, badgeY, adminWidth, badgeH, 13, 'rgba(168, 85, 247, 0.25)', '#a855f7', 1);
      ctx.fillStyle = '#e9d5ff';
      ctx.fillText(adminText, isAr ? adminBadgeX + adminWidth - 9 : adminBadgeX + 9, badgeY + 17);
    }
  }

  ctx.restore();

  let currentY = headerY + headerHeight + 12;

  // ================= 2. Personal & Contact Info Card (Full Width) =================
  drawRoundedRect(ctx, padding, currentY, innerWidth, personalBoxHeight, 14, '#ffffff', '#e2e8f0', 1);

  ctx.save();
  ctx.direction = isAr ? 'rtl' : 'ltr';

  // Card Header Banner
  drawRoundedRect(ctx, padding + 12, currentY + 8, innerWidth - 24, 28, 6, '#f8fafc');
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.textAlign = isAr ? 'right' : 'left';
  ctx.fillText(
    isAr ? '📋 البيانات الشخصية والاتصال' : '📋 Personal & Contact Information',
    isAr ? padding + innerWidth - 22 : padding + 22,
    currentY + 26
  );

  const personalFields = [
    { label: isAr ? 'الرقم القومي' : 'National ID', val: formatDisplayValue(doctor.national_id, language) },
    { label: isAr ? 'رقم الهاتف' : 'Phone Number', val: formatDisplayValue(doctor.phone, language) },
    { label: isAr ? 'تاريخ الميلاد' : 'Birth Date', val: formatDate(doctor.birth_date, language) },
    { label: isAr ? 'العنوان' : 'Address', val: formatDisplayValue(doctor.address, language) },
  ];

  let pRowY = currentY + 62;
  personalFields.forEach((f, idx) => {
    // Subtle separator line
    if (idx > 0) {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding + 16, pRowY - 18);
      ctx.lineTo(padding + innerWidth - 16, pRowY - 18);
      ctx.stroke();
    }

    // Label
    ctx.font = '600 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = isAr ? 'right' : 'left';
    ctx.fillText(`${f.label}:`, isAr ? cardWidth - padding - 20 : padding + 20, pRowY);

    // Value
    ctx.font = 'bold 13.5px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = isAr ? 'left' : 'right';
    const truncatedVal = truncateText(ctx, f.val, innerWidth - 220);
    ctx.fillText(truncatedVal, isAr ? padding + 20 : cardWidth - padding - 20, pRowY);

    pRowY += rowStep;
  });
  ctx.restore();

  currentY += personalBoxHeight + 12;

  // ================= 3. Employment & Administrative Status Card (Full Width) =================
  drawRoundedRect(ctx, padding, currentY, innerWidth, employmentBoxHeight, 14, '#ffffff', '#e2e8f0', 1);

  ctx.save();
  ctx.direction = isAr ? 'rtl' : 'ltr';

  // Card Header Banner
  drawRoundedRect(ctx, padding + 12, currentY + 8, innerWidth - 24, 28, 6, '#f8fafc');
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.textAlign = isAr ? 'right' : 'left';
  ctx.fillText(
    isAr ? '💼 الحالة الوظيفية والتكليف الإداري' : '💼 Employment & Administrative Status',
    isAr ? padding + innerWidth - 22 : padding + 22,
    currentY + 26
  );

  const employmentFields: { label: string; val: string; isHighlight?: boolean; highlightColor?: string }[] = [
    { label: isAr ? 'الحالة الوظيفية الحالية' : 'Current Status', val: statusTypeStr },
    { label: isAr ? 'تاريخ التعيين واستلام العمل' : 'Hire Date', val: formatDate(doctor.hire_date, language) },
    { label: isAr ? 'تاريخ التخرج' : 'Graduation Date', val: formatDate(doctor.graduation_date, language) },
    {
      label: isAr ? 'الدرجة المالية الحالية' : 'Financial Grade',
      val: formatDisplayValue(doctor.current_financial_grade?.financial_grade, language)
    },
  ];

  if (hasDeputation) {
    const dirStr = currentStatus?.deputation_direction || (isAr ? 'منتدب' : 'Deputed');
    const facStr = currentStatus?.deputation_facility ? ` - ${currentStatus.deputation_facility}` : '';
    employmentFields.push({
      label: isAr ? '🔄 الانتداب والجهة' : '🔄 Deputation Facility',
      val: `${dirStr}${facStr}`,
      isHighlight: true,
      highlightColor: '#1d4ed8'
    });
  }

  if (hasAdminDuty) {
    const adminRoleStr = formatDisplayValue(currentStatus?.administrative_role, language, isAr ? 'مكلف بعمل إداري' : 'Admin Duty');
    const adminScopeStr = currentStatus?.administrative_scope ? ` (${currentStatus.administrative_scope})` : '';
    const adminFacilityStr = currentStatus?.administrative_facility ? ` - ${currentStatus.administrative_facility}` : '';
    employmentFields.push({
      label: isAr ? '💼 التكليف والمنصب الإداري' : '💼 Administrative Role',
      val: `${adminRoleStr}${adminScopeStr}${adminFacilityStr}`,
      isHighlight: true,
      highlightColor: '#6d28d9'
    });
  }

  let eRowY = currentY + 62;
  employmentFields.forEach((f, idx) => {
    // Subtle separator line
    if (idx > 0) {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding + 16, eRowY - 18);
      ctx.lineTo(padding + innerWidth - 16, eRowY - 18);
      ctx.stroke();
    }

    // Label
    ctx.font = '600 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = f.isHighlight ? (f.highlightColor || '#4338ca') : '#64748b';
    ctx.textAlign = isAr ? 'right' : 'left';
    ctx.fillText(`${f.label}:`, isAr ? cardWidth - padding - 20 : padding + 20, eRowY);

    // Value
    ctx.font = 'bold 13.5px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = f.isHighlight ? (f.highlightColor || '#4338ca') : '#0f172a';
    ctx.textAlign = isAr ? 'left' : 'right';
    const truncatedVal = truncateText(ctx, f.val, innerWidth - 230);
    ctx.fillText(truncatedVal, isAr ? padding + 20 : cardWidth - padding - 20, eRowY);

    eRowY += rowStep;
  });
  ctx.restore();

  currentY += employmentBoxHeight + 12;

  // ================= 4. Academic Certificates & Degrees Card (Full Width) =================
  drawRoundedRect(ctx, padding, currentY, innerWidth, certBoxHeight, 14, '#ffffff', '#e2e8f0', 1);

  ctx.save();
  ctx.direction = isAr ? 'rtl' : 'ltr';

  // Section Header Banner
  drawRoundedRect(ctx, padding + 12, currentY + 8, innerWidth - 24, 28, 6, '#eef2ff');
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#3730a3';
  ctx.textAlign = isAr ? 'right' : 'left';
  ctx.fillText(
    `${isAr ? '🎓 الشهادات والدرجات العلمية' : '🎓 Academic Certificates & Degrees'} (${certs.length})`,
    isAr ? padding + innerWidth - 22 : padding + 22,
    currentY + 26
  );

  if (certs.length === 0) {
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = isAr ? 'right' : 'left';
    ctx.fillText(
      isAr ? 'لا توجد شهادات علمية مسجلة حتى الآن' : 'No academic degrees registered yet',
      isAr ? padding + innerWidth - 22 : padding + 22,
      currentY + 52
    );
  } else {
    let certRowY = currentY + 44;
    certs.forEach((c, idx) => {
      // Row separator
      if (idx > 0) {
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding + 16, certRowY - 8);
        ctx.lineTo(padding + innerWidth - 16, certRowY - 8);
        ctx.stroke();
      }

      const isObtained = c.status === 'obtained';

      // Status Pill
      const statusLabel = isObtained ? (isAr ? 'حاصل عليها' : 'Obtained') : (isAr ? 'قيد الدراسة' : 'In Progress');
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      const pillW = ctx.measureText(statusLabel).width + 16;
      const pillX = isAr ? padding + 18 : padding + innerWidth - 18 - pillW;
      const pillBg = isObtained ? '#ecfdf5' : '#eff6ff';
      const pillBorder = isObtained ? '#10b981' : '#3b82f6';
      const pillText = isObtained ? '#047857' : '#1d4ed8';

      drawRoundedRect(ctx, pillX, certRowY, pillW, 22, 11, pillBg, pillBorder, 1);
      ctx.fillStyle = pillText;
      ctx.textAlign = isAr ? 'right' : 'left';
      ctx.fillText(statusLabel, isAr ? pillX + pillW - 8 : pillX + 8, certRowY + 15);

      // Certificate Title & Type (Line 1)
      ctx.font = 'bold 13.5px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = isAr ? 'right' : 'left';
      const cleanCertType = formatDisplayValue(c.certificate_type, language, '');
      const cleanCertTitle = formatDisplayValue(c.certificate_title, language, '');
      const rawCertTitle = `${idx + 1}. ${cleanCertType} ${cleanCertTitle}`.trim();
      const maxTitleWidth = innerWidth - pillW - 54;
      const certTitleText = truncateText(ctx, rawCertTitle, maxTitleWidth);
      ctx.fillText(
        certTitleText,
        isAr ? padding + innerWidth - 20 : padding + 20,
        certRowY + 16
      );

      // Date Text (Line 2 opposite side)
      let dateText = '';
      if (isObtained) {
        dateText = formatCertificateDate(c.obtained_date, c.date_mode || 'month', language);
      } else {
        if (c.expected_date) {
          dateText = `${isAr ? 'متوقع: ' : 'Exp: '}${formatCertificateDate(c.expected_date, 'month', language)}`;
        } else if (c.study_start_date) {
          dateText = `${isAr ? 'بدء: ' : 'Start: '}${formatCertificateDate(c.study_start_date, 'month', language)}`;
        }
      }

      // University Name & Country (Line 2)
      ctx.font = '500 12px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = isAr ? 'right' : 'left';
      const cleanUniv = c.university_name && c.university_name !== 'null' && c.university_name !== 'undefined' ? c.university_name.trim() : '';
      const cleanCountry = (cleanUniv && c.university_country && c.university_country !== 'null' && c.university_country !== 'undefined' && c.university_country !== 'مصر') ? ` (${c.university_country})` : '';
      const rawUnivStr = cleanUniv ? `🏛️ ${cleanUniv}${cleanCountry}` : (isAr ? 'غير محدد' : 'undefined');

      ctx.font = '600 11.5px system-ui, -apple-system, sans-serif';
      const dateW = dateText ? ctx.measureText(`📅 ${dateText}`).width : 0;
      const maxUnivWidth = innerWidth - dateW - 60;

      ctx.font = '500 12px system-ui, -apple-system, sans-serif';
      const univStr = truncateText(ctx, rawUnivStr, maxUnivWidth);
      ctx.fillText(
        univStr,
        isAr ? padding + innerWidth - 20 : padding + 20,
        certRowY + 37
      );

      if (dateText && dateText !== 'null' && dateText !== 'undefined') {
        ctx.font = '600 11.5px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#475569';
        ctx.textAlign = isAr ? 'left' : 'right';
        ctx.fillText(
          `📅 ${dateText}`,
          isAr ? padding + 20 : padding + innerWidth - 20,
          certRowY + 37
        );
      }

      certRowY += 54;
    });
  }
  ctx.restore();
  currentY += certBoxHeight;

  // ================= 5. Promotions & Financial Grades (Conditional) =================
  if (hasPromos) {
    currentY += 12;
    const promoBoxHeight = 56;
    drawRoundedRect(ctx, padding, currentY, innerWidth, promoBoxHeight, 12, '#fffbeb', '#fde68a', 1);

    ctx.save();
    ctx.direction = isAr ? 'rtl' : 'ltr';
    ctx.textAlign = isAr ? 'right' : 'left';

    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#92400e';
    ctx.fillText(
      isAr ? '⭐ الترقيات والتدرج المالي' : '⭐ Promotions & Financial Progression',
      isAr ? padding + innerWidth - 20 : padding + 20,
      currentY + 20
    );

    let infoText = '';
    if (doctor.promotions && doctor.promotions[0]) {
      const pType = formatDisplayValue(doctor.promotions[0].promotion_type, language);
      infoText += `${isAr ? 'آخر ترقية' : 'Latest Promotion'}: ${pType} (${formatDate(doctor.promotions[0].promotion_date, language)})   •   `;
    }
    if (doctor.current_financial_grade?.financial_grade && doctor.current_financial_grade.financial_grade !== 'null') {
      const gGrade = formatDisplayValue(doctor.current_financial_grade.financial_grade, language);
      const gStart = doctor.current_financial_grade.start_date || (isAr ? 'غير محدد' : 'undefined');
      infoText += `${isAr ? 'الدرجة المالية' : 'Financial Grade'}: ${gGrade} (${isAr ? 'منذ' : 'Since'} ${gStart})`;
    }

    ctx.font = '600 12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#78350f';
    ctx.fillText(
      truncateText(ctx, infoText || (isAr ? 'لا توجد سجلات ترقية' : 'No records'), innerWidth - 40),
      isAr ? padding + innerWidth - 20 : padding + 20,
      currentY + 41
    );
    ctx.restore();
    currentY += promoBoxHeight;
  }

  // ================= 6. Doctor Notes (Conditional) =================
  if (hasNotes) {
    currentY += 12;
    const noteBoxHeight = 52;
    drawRoundedRect(ctx, padding, currentY, innerWidth, noteBoxHeight, 12, '#f8fafc', '#e2e8f0', 1);

    ctx.save();
    ctx.direction = isAr ? 'rtl' : 'ltr';
    ctx.textAlign = isAr ? 'right' : 'left';

    ctx.font = '600 12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#475569';
    const noteStr = `${isAr ? '📝 ملاحظات: ' : '📝 Notes: '}${doctor.notes?.trim()}`;
    ctx.fillText(
      truncateText(ctx, noteStr, innerWidth - 40),
      isAr ? padding + innerWidth - 20 : padding + 20,
      currentY + 31
    );
    ctx.restore();
    currentY += noteBoxHeight;
  }

  // ================= 7. Footer / Verification Stamp =================
  currentY += 16;

  // Thin separator line above footer
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, currentY);
  ctx.lineTo(cardWidth - padding, currentY);
  ctx.stroke();

  ctx.save();
  ctx.direction = isAr ? 'rtl' : 'ltr';
  ctx.font = '500 11px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = isAr ? 'right' : 'left';

  const footerDate = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US');
  const footerText = isAr
    ? `سجل رسمي معتمد  •  تاريخ الاستخراج: ${footerDate}  •  عيادات طب الأسنان`
    : `Official Medical Dossier  •  Date: ${footerDate}  •  Dental Clinics System`;
  ctx.fillText(footerText, isAr ? cardWidth - padding : padding, currentY + 20);

  // System Badge
  ctx.textAlign = isAr ? 'left' : 'right';
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#4f46e5';
  ctx.fillText('VERIFIED SYSTEM RECORD ✓', isAr ? padding : cardWidth - padding, currentY + 20);

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
