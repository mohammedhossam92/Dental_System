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
 * Standard Egyptian & International Universities presets
 */
export const DEFAULT_UNIVERSITIES = [
  'جامعة المنصورة',
  'جامعة القاهرة',
  'جامعة عين شمس',
  'جامعة الإسكندرية',
  'جامعة الأزهر',
  'جامعة أسيوط',
  'جامعة طنطا',
  'جامعة الزقازيق',
  'جامعة كفر الشيخ',
  'جامعة المنيا',
  'جامعة بني سويف',
  'جامعة قناة السويس',
  'جامعة جنوب الوادي',
  'جامعة الفيوم',
  'جامعة حلوان',
  'جامعة السويس',
  'جامعة المنوفية',
  'جامعة بنها',
  'جامعة المستقبل',
  'جامعة مصر للعلوم والتكنولوجيا (MUST)',
  'جامعة 6 أكتوبر',
  'الجامعة البريطانية في مصر (BUE)',
  'جامعة الدلتا للعلوم والتكنولوجيا',
  'جامعة حورس',
  'جامعة المنصورة الأهلية',
  'جامعة المنصورة الجديدة',
  'جامعة الملك عبد العزيز',
  'جامعة الملك سعود',
  'الكلية الملكية للجراحين (إنجلترا - RCSEng)',
  'الكلية الملكية للجراحين (إدنبرة - RCSEd)',
  'الكلية الملكية للجراحين (أيرلندا - RCSI)'
];

/**
 * Fetch distinct past values from database tables to merge with presets
 */
export async function fetchHistoricalSuggestions(): Promise<{
  addresses: string[];
  certificateTitles: string[];
  universities: string[];
  administrativeRoles: string[];
  administrativeFacilities: string[];
  promotionTypes: string[];
  financialGrades: string[];
}> {
  try {
    const [
      docsRes,
      certsRes,
      univsRes,
      historyRes,
      promsRes,
      gradesRes
    ] = await Promise.all([
      supabase.from('doctors').select('address'),
      supabase.from('doctor_certificates').select('certificate_title, university_name'),
      supabase.from('universities').select('name'),
      supabase.from('doctor_employment_history').select('administrative_role, administrative_facility, deputation_facility'),
      supabase.from('doctor_promotions').select('promotion_type'),
      supabase.from('doctor_financial_grades').select('financial_grade')
    ]);

    const addressesSet = new Set<string>(DEFAULT_ADDRESS_SUGGESTIONS);
    docsRes.data?.forEach((d) => {
      if (d.address && d.address.trim()) addressesSet.add(d.address.trim());
    });

    const certsSet = new Set<string>(DEFAULT_CERTIFICATE_TITLES);
    const univsSet = new Set<string>(DEFAULT_UNIVERSITIES);
    univsRes.data?.forEach((u) => {
      if (u.name && u.name.trim()) univsSet.add(u.name.trim());
    });

    certsRes.data?.forEach((c) => {
      if (c.certificate_title && c.certificate_title.trim()) certsSet.add(c.certificate_title.trim());
      if (c.university_name && c.university_name.trim()) univsSet.add(c.university_name.trim());
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
      universities: Array.from(univsSet),
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
      universities: DEFAULT_UNIVERSITIES,
      administrativeRoles: DEFAULT_ADMINISTRATIVE_ROLES,
      administrativeFacilities: DEFAULT_ADMINISTRATIVE_FACILITIES,
      promotionTypes: DEFAULT_PROMOTION_TYPES,
      financialGrades: DEFAULT_FINANCIAL_GRADES
    };
  }
}
