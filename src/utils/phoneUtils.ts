/**
 * Convert Arabic-Indic numerals (٠-٩) to standard western digits (0-9)
 */
export function normalizeArabicDigits(str: string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[٠-٩]/g, (w) => String(arabicDigits.indexOf(w)));
}

/**
 * Strips whitespace, dashes, brackets, and converts Arabic digits to western digits.
 */
export function cleanPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  const normalized = normalizeArabicDigits(phone.trim());
  return normalized.replace(/\D/g, '');
}

/**
 * Validates that a phone number is exactly 11 digits (e.g. 01012345678).
 * Checks after normalizing Arabic-Indic digits and removing non-numeric characters.
 */
export function isValid11DigitPhone(phone: string | null | undefined): boolean {
  const cleaned = cleanPhoneNumber(phone);
  return cleaned.length === 11 && /^\d{11}$/.test(cleaned);
}

/**
 * Formats an Egyptian or international mobile number into a valid WhatsApp URL (https://wa.me/<number>)
 * Handles Egypt local numbers (e.g. 010... -> 2010...) and international numbers.
 */
export function formatWhatsAppUrl(mobile: string | null | undefined): string {
  if (!mobile) return '#';
  
  // Normalize Arabic numerals to standard western digits
  const normalized = normalizeArabicDigits(mobile);

  // Remove all non-numeric characters
  let cleaned = normalized.replace(/\D/g, '');
  if (!cleaned) return '#';

  // Handle local Egyptian mobile numbers starting with '01' (11 digits e.g. 01012345678, 011..., 012..., 015...)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '20' + cleaned.slice(1);
  } else if (cleaned.startsWith('0')) {
    cleaned = '20' + cleaned.slice(1);
  } else if (!cleaned.startsWith('20') && cleaned.length === 10 && (cleaned.startsWith('10') || cleaned.startsWith('11') || cleaned.startsWith('12') || cleaned.startsWith('15'))) {
    cleaned = '20' + cleaned;
  }

  return `https://wa.me/${cleaned}`;
}
