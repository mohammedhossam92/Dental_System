import { supabase } from '../lib/supabase';

/**
 * Standard dental specialties & majors presets
 */
export const DEFAULT_CERTIFICATE_TITLES = [
  'جراحة الوجه والفكين والتخدير',
  'علاج الجذور وحشو العصب (Endodontics)',
  'التركيبات الثابتة (Fixed Prosthodontics)',
  'التركيبات المتحركة والاستعاضة الصناعية (Removable Prosthodontics)',
  'طب أسنان الأطفال والصحة العامة (Pedodontics)',
  'تقويم الأسنان والفكين (Orthodontics)',
  'طب الفم وعلاج اللثة والتشخيص (Periodontology & Oral Medicine)',
  'باثولوجيا الفم والوجه والفكين (Oral Pathology)',
  'بيولوجيا الفم وأنسجة الأسنان (Oral Biology)',
  'أشعة الفم والوجه والفكين (Oral Radiology)',
  'خواص المواد الحيوية للأسنان (Dental Biomaterials)',
  'العلاج التحفظي وتجميل الأسنان (Operative Dentistry)',
  'زراعة الأسنان المتقدمة (Implantology)',
  'جراحة الفم والأسنان (Oral Surgery)',
  'إدارة المستشفيات وجودة الرعاية الصحية',
  'التعليم الطبي لطب الأسنان'
];

/**
 * Standard administrative roles presets
 */
export const DEFAULT_ADMINISTRATIVE_ROLES = [
  'رئيس مجلس القسم العلمي',
  'مدير العيادات التعليمية',
  'منسق الجودة والاعتماد بالقسم',
  'منسق برنامج الدراسات العليا',
  'منسق التدريب وسنة الامتياز',
  'وكيل الكلية لشؤون التعليم والطلاب',
  'وكيل الكلية لشؤون الدراسات العليا والبحوث',
  'وكيل الكلية لشؤون خدمة المجتمع وتنمية البيئة',
  'عميد الكلية',
  'مدير عام المستشفى الجامعي',
  'رئيس وحدة مكافحة العدوى والسلامة والصحة المهنية',
  'المشرف العام على عيادات التدريب الخارجي'
];

/**
 * Standard administrative facilities presets
 */
export const DEFAULT_ADMINISTRATIVE_FACILITIES = [
  'عمادة كلية طب الأسنان',
  'إدارة المستشفيات الجامعية',
  'قطاع الدراسات العليا والبحوث بالجامعة',
  'قطاع التعليم والطلاب بالجامعة',
  'مركز ضمان الجودة والاعتماد بالجامعة',
  'المجلس الأعلى للمستشفيات الجامعية',
  'وزارة الصحة والسكان',
  'المجلس الصحي المصري'
];

/**
 * Standard promotion types presets
 */
export const DEFAULT_PROMOTION_TYPES = [
  'طبيب مقيم',
  'مساعد أخصائي',
  'أخصائي',
  'استشاري مساعد',
  'استشاري',
  'استشاري أول',
  'مدرس مساعد',
  'مدرس (أستاذ مساعد طب الأسنان)',
  'أستاذ مساعد',
  'أستاذ طب الأسنان'
];

/**
 * Standard financial grades presets
 */
export const DEFAULT_FINANCIAL_GRADES = [
  'الدرجة الثالثة (التخصصية)',
  'الدرجة الثانية',
  'الدرجة الأولى (أ)',
  'الدرجة الأولى (ب)',
  'درجة مدير عام',
  'الدرجة العالية',
  'الدرجة الممتازة',
  'كادر خاص - الجامعات'
];

/**
 * Standard Egyptian governorates & cities
 */
export const DEFAULT_ADDRESS_SUGGESTIONS = [
  'المنصورة، الدقهلية',
  'ميت غمر، الدقهلية',
  'طلخا، الدقهلية',
  'دكرنس، الدقهلية',
  'السنبلاوين، الدقهلية',
  'بلقاس، الدقهلية',
  'شربين، الدقهلية',
  'أجا، الدقهلية',
  'مدينة نصر، القاهرة',
  'مصر الجديدة، القاهرة',
  'التجمع الخامس، القاهرة الجديدة',
  'المعادي، القاهرة',
  'الدقي، الجيزة',
  'المهندسين، الجيزة',
  '6 أكتوبر، الجيزة',
  'الشيخ زايد، الجيزة',
  'طنطا، الغربية',
  'المحلة الكبرى، الغربية',
  'الزقازيق، الشرقية',
  'دمياط',
  'دمياط الجديدة',
  'بورسعيد',
  'الإسماعيلية',
  'الإسكندرية',
  'سموحة، الإسكندرية',
  'كفر الشيخ',
  'بنها، القليوبية',
  'شبين الكوم، المنوفية'
];

/**
 * Fetch distinct past values from database tables to merge with presets
 */
export async function fetchHistoricalSuggestions(): Promise<{
  addresses: string[];
  certificateTitles: string[];
  administrativeRoles: string[];
  administrativeFacilities: string[];
  promotionTypes: string[];
  financialGrades: string[];
}> {
  try {
    const [
      docsRes,
      certsRes,
      historyRes,
      promsRes,
      gradesRes
    ] = await Promise.all([
      supabase.from('doctors').select('address'),
      supabase.from('doctor_certificates').select('certificate_title'),
      supabase.from('doctor_employment_history').select('administrative_role, administrative_facility, deputation_facility'),
      supabase.from('doctor_promotions').select('promotion_type'),
      supabase.from('doctor_financial_grades').select('financial_grade')
    ]);

    const addressesSet = new Set<string>(DEFAULT_ADDRESS_SUGGESTIONS);
    docsRes.data?.forEach((d) => {
      if (d.address && d.address.trim()) addressesSet.add(d.address.trim());
    });

    const certsSet = new Set<string>(DEFAULT_CERTIFICATE_TITLES);
    certsRes.data?.forEach((c) => {
      if (c.certificate_title && c.certificate_title.trim()) certsSet.add(c.certificate_title.trim());
    });

    const rolesSet = new Set<string>(DEFAULT_ADMINISTRATIVE_ROLES);
    const facilitiesSet = new Set<string>(DEFAULT_ADMINISTRATIVE_FACILITIES);
    historyRes.data?.forEach((h) => {
      if (h.administrative_role && h.administrative_role.trim()) rolesSet.add(h.administrative_role.trim());
      if (h.administrative_facility && h.administrative_facility.trim()) facilitiesSet.add(h.administrative_facility.trim());
      if (h.deputation_facility && h.deputation_facility.trim()) facilitiesSet.add(h.deputation_facility.trim());
    });

    const promsSet = new Set<string>(DEFAULT_PROMOTION_TYPES);
    promsRes.data?.forEach((p) => {
      if (p.promotion_type && p.promotion_type.trim()) promsSet.add(p.promotion_type.trim());
    });

    const gradesSet = new Set<string>(DEFAULT_FINANCIAL_GRADES);
    gradesRes.data?.forEach((g) => {
      if (g.financial_grade && g.financial_grade.trim()) gradesSet.add(g.financial_grade.trim());
    });

    return {
      addresses: Array.from(addressesSet),
      certificateTitles: Array.from(certsSet),
      administrativeRoles: Array.from(rolesSet),
      administrativeFacilities: Array.from(facilitiesSet),
      promotionTypes: Array.from(promsSet),
      financialGrades: Array.from(gradesSet)
    };
  } catch (err) {
    console.error('Error fetching historical suggestions:', err);
    return {
      addresses: DEFAULT_ADDRESS_SUGGESTIONS,
      certificateTitles: DEFAULT_CERTIFICATE_TITLES,
      administrativeRoles: DEFAULT_ADMINISTRATIVE_ROLES,
      administrativeFacilities: DEFAULT_ADMINISTRATIVE_FACILITIES,
      promotionTypes: DEFAULT_PROMOTION_TYPES,
      financialGrades: DEFAULT_FINANCIAL_GRADES
    };
  }
}
