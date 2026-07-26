/**
 * Formats a mobile number into a valid WhatsApp URL (https://wa.me/<number>)
 * Handles Egypt local numbers (e.g. 010... -> 2010...) and international numbers.
 */
export function formatWhatsAppUrl(mobile: string | null | undefined): string {
  if (!mobile) return '#';
  
  // Remove all non-numeric characters
  let cleaned = mobile.replace(/\D/g, '');
  if (!cleaned) return '#';

  // Handle local Egyptian mobile numbers starting with '01' (11 digits e.g. 01012345678, 011..., 012..., 015...)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '20' + cleaned.slice(1);
  } else if (cleaned.startsWith('0')) {
    cleaned = '20' + cleaned.slice(1);
  }

  return `https://wa.me/${cleaned}`;
}
