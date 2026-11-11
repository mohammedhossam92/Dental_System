/**
 * Utility functions for URL-safe token encoding and decoding
 * Obfuscates internal organization UUIDs into secure, clean invite tokens
 * with optional expiration and predefined class year.
 */

export type RegistrationTokenType = 'doc_reg' | 'std_reg';

export interface TokenOptions {
  type?: RegistrationTokenType;
  expiresInHours?: number | null; // e.g. 1, 6, 24, 72, 168, 720, or null/undefined for never
  expiresAt?: number | null; // absolute timestamp in ms
  classYearId?: string | null; // predefined class year for student registration
}

export interface TokenPayload {
  o: string; // organization ID
  t: RegistrationTokenType; // registration token type
  c: number; // created at (timestamp in ms)
  exp?: number | null; // expiration at (timestamp in ms)
  y?: string | null; // predefined class year ID
}

export interface TokenVerificationResult {
  valid: boolean;
  organizationId: string | null;
  isExpired: boolean;
  expiresAt: Date | null;
  type: RegistrationTokenType;
  classYearId: string | null;
  error?: 'INVALID' | 'EXPIRED' | 'MISSING';
}

/**
 * Encode an organization ID into an obfuscated, URL-safe token with optional expiration and class year
 */
export function encodeOrgToken(
  organizationId: string | null | undefined,
  options?: TokenOptions
): string {
  if (!organizationId || !organizationId.trim()) return '';

  try {
    const type = options?.type || 'doc_reg';
    const now = Date.now();

    let expiresAt: number | null = null;
    if (options?.expiresAt) {
      expiresAt = options.expiresAt;
    } else if (typeof options?.expiresInHours === 'number' && options.expiresInHours > 0) {
      expiresAt = now + Math.round(options.expiresInHours * 3600 * 1000);
    }

    const payload: TokenPayload = {
      o: organizationId.trim(),
      t: type,
      c: now,
    };

    if (expiresAt) {
      payload.exp = expiresAt;
    }

    if (options?.classYearId && options.classYearId.trim()) {
      payload.y = options.classYearId.trim();
    }

    const json = JSON.stringify(payload);

    // Convert string to URL-safe Base64
    const base64 = btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const prefix = type === 'std_reg' ? 'sreg_' : 'dreg_';
    return `${prefix}${base64}`;
  } catch (err) {
    console.error('Error encoding org token:', err);
    return organizationId.trim();
  }
}

/**
 * Helper to parse raw base64 or prefixed token into JSON payload
 */
function parseTokenPayload(cleanToken: string): TokenPayload | null {
  try {
    let base64 = cleanToken;
    if (base64.startsWith('dreg_') || base64.startsWith('sreg_')) {
      base64 = base64.substring(5);
    }
    // Re-pad if necessary
    base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    const jsonStr = decodeURIComponent(escape(atob(base64)));
    const parsed = JSON.parse(jsonStr);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Decode an organization ID from an obfuscated token (fallback to plain UUID)
 */
export function decodeOrgToken(tokenOrId: string | null | undefined): string | null {
  if (!tokenOrId || !tokenOrId.trim()) return null;
  const clean = tokenOrId.trim();

  // If it is already a UUID pattern, return as-is
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(clean)) {
    return clean;
  }

  const parsed = parseTokenPayload(clean);
  if (parsed && parsed.o) {
    return parsed.o;
  }

  // If decoding fails, fallback if looks like string id
  if (clean.length > 10 && !clean.includes('=')) {
    return clean;
  }

  return null;
}

/**
 * Fully verify a registration token, checking validity, expiration, and embedded metadata
 */
export function verifyOrgToken(tokenOrId: string | null | undefined): TokenVerificationResult {
  if (!tokenOrId || !tokenOrId.trim()) {
    return {
      valid: false,
      organizationId: null,
      isExpired: false,
      expiresAt: null,
      type: 'doc_reg',
      classYearId: null,
      error: 'MISSING',
    };
  }

  const clean = tokenOrId.trim();

  // If plain UUID: valid, no expiration
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(clean)) {
    return {
      valid: true,
      organizationId: clean,
      isExpired: false,
      expiresAt: null,
      type: 'doc_reg',
      classYearId: null,
    };
  }

  const parsed = parseTokenPayload(clean);
  if (!parsed || !parsed.o) {
    // If not a valid encoded json but long string fallback
    if (clean.length > 10) {
      return {
        valid: true,
        organizationId: clean,
        isExpired: false,
        expiresAt: null,
        type: 'doc_reg',
        classYearId: null,
      };
    }
    return {
      valid: false,
      organizationId: null,
      isExpired: false,
      expiresAt: null,
      type: 'doc_reg',
      classYearId: null,
      error: 'INVALID',
    };
  }

  const expiresAt = parsed.exp ? new Date(parsed.exp) : null;
  const isExpired = !!(parsed.exp && Date.now() > parsed.exp);

  return {
    valid: !isExpired,
    organizationId: parsed.o,
    isExpired,
    expiresAt,
    type: parsed.t || (clean.startsWith('sreg_') ? 'std_reg' : 'doc_reg'),
    classYearId: parsed.y || null,
    error: isExpired ? 'EXPIRED' : undefined,
  };
}
