/**
 * Utility functions for URL-safe token encoding and decoding
 * Obfuscates internal organization UUIDs into secure, clean invite tokens.
 */

/**
 * Encode an organization ID into an obfuscated, URL-safe token
 */
export function encodeOrgToken(organizationId: string | null | undefined): string {
  if (!organizationId || !organizationId.trim()) return '';
  try {
    const payload = JSON.stringify({
      o: organizationId.trim(),
      t: 'doc_reg',
      c: Date.now()
    });
    // Convert string to URL-safe Base64
    const base64 = btoa(unescape(encodeURIComponent(payload)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return `dreg_${base64}`;
  } catch (err) {
    console.error('Error encoding org token:', err);
    return organizationId;
  }
}

/**
 * Decode an organization ID from an obfuscated token (or fallback to plain UUID)
 */
export function decodeOrgToken(tokenOrId: string | null | undefined): string | null {
  if (!tokenOrId || !tokenOrId.trim()) return null;
  const clean = tokenOrId.trim();

  // If it is already a UUID pattern, return as-is
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(clean)) {
    return clean;
  }

  try {
    let base64 = clean;
    if (base64.startsWith('dreg_')) {
      base64 = base64.substring(5);
    }
    // Re-pad if necessary
    base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    const jsonStr = decodeURIComponent(escape(atob(base64)));
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.o) {
      return parsed.o;
    }
  } catch {
    // If decoding fails, fallback
    if (clean.length > 10) return clean;
  }

  return null;
}
