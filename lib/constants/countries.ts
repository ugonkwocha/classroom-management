export interface CountryCode {
  name: string;
  code: string;
  dial: string;
  format: string;
  pattern: RegExp;
  minLength: number;
  maxLength: number;
  example: string;
}

export const COUNTRY_CODES: Record<string, CountryCode> = {
  NG: {
    name: 'Nigeria',
    code: '+234',
    dial: 'NG',
    format: '+234 XXX XXX XXXX',
    pattern: /^(?:\+234|0)[0-9]{10}$/,
    minLength: 11,
    maxLength: 13,
    example: '+234 8012 3456 78',
  },
  US: {
    name: 'United States',
    code: '+1',
    dial: 'US',
    format: '+1 (XXX) XXX-XXXX',
    pattern: /^(?:\+1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/,
    minLength: 10,
    maxLength: 12,
    example: '+1 (555) 123-4567',
  },
  GB: {
    name: 'United Kingdom',
    code: '+44',
    dial: 'GB',
    format: '+44 XXXX XXX XXXX',
    pattern: /^(?:\+44|0)[0-9]{10}$/,
    minLength: 11,
    maxLength: 13,
    example: '+44 2012 3456 78',
  },
  CA: {
    name: 'Canada',
    code: '+1',
    dial: 'CA',
    format: '+1 (XXX) XXX-XXXX',
    pattern: /^(?:\+1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/,
    minLength: 10,
    maxLength: 12,
    example: '+1 (613) 555-0123',
  },
  AU: {
    name: 'Australia',
    code: '+61',
    dial: 'AU',
    format: '+61 X XXXX XXXX',
    pattern: /^(?:\+61|0)[2-9]\d{8}$/,
    minLength: 9,
    maxLength: 12,
    example: '+61 2 1234 5678',
  },
  KE: {
    name: 'Kenya',
    code: '+254',
    dial: 'KE',
    format: '+254 XXX XXX XXX',
    pattern: /^(?:\+254|0)[0-9]{9}$/,
    minLength: 10,
    maxLength: 12,
    example: '+254 712 345 678',
  },
  GH: {
    name: 'Ghana',
    code: '+233',
    dial: 'GH',
    format: '+233 XX XXX XXXX',
    pattern: /^(?:\+233|0)[0-9]{9}$/,
    minLength: 10,
    maxLength: 12,
    example: '+233 24 1234 567',
  },
  ZA: {
    name: 'South Africa',
    code: '+27',
    dial: 'ZA',
    format: '+27 XX XXX XXXX',
    pattern: /^(?:\+27|0)[0-9]{9}$/,
    minLength: 10,
    maxLength: 12,
    example: '+27 21 123 4567',
  },
  IN: {
    name: 'India',
    code: '+91',
    dial: 'IN',
    format: '+91 XXXXX XXXXX',
    pattern: /^(?:\+91|0)[6-9]\d{9}$/,
    minLength: 10,
    maxLength: 12,
    example: '+91 98123 45678',
  },
  SG: {
    name: 'Singapore',
    code: '+65',
    dial: 'SG',
    format: '+65 XXXX XXXX',
    pattern: /^(?:\+65)?[6-9]\d{7}$/,
    minLength: 8,
    maxLength: 11,
    example: '+65 6123 4567',
  },
};

/**
 * Get country code object by country code
 */
export function getCountry(countryCode: string): CountryCode | undefined {
  return COUNTRY_CODES[countryCode.toUpperCase()];
}

/**
 * Validate phone number for a specific country
 */
export function validatePhoneNumber(phoneNumber: string, countryCode: string): { valid: boolean; message: string } {
  const country = getCountry(countryCode);
  if (!country) {
    return { valid: false, message: 'Invalid country code' };
  }

  const cleanedNumber = phoneNumber.replace(/\s/g, '');

  if (cleanedNumber.length < country.minLength) {
    return {
      valid: false,
      message: `Phone number must be at least ${country.minLength} digits`
    };
  }

  if (cleanedNumber.length > country.maxLength) {
    return {
      valid: false,
      message: `Phone number must not exceed ${country.maxLength} digits`
    };
  }

  if (!country.pattern.test(cleanedNumber)) {
    return {
      valid: false,
      message: `Invalid phone number format. Example: ${country.example}`
    };
  }

  return { valid: true, message: '' };
}

/**
 * Format phone number with country code
 */
export function formatPhoneNumber(phoneNumber: string, countryCode: string): string {
  const country = getCountry(countryCode);
  if (!country) return phoneNumber;

  const cleaned = phoneNumber.replace(/\D/g, '');

  // Remove leading 0 if present (for countries that use it)
  let normalized = cleaned;
  if (normalized.startsWith('0')) {
    normalized = normalized.substring(1);
  }

  // Ensure it starts with country code (without +)
  const dialCode = country.code.replace('+', '');
  if (!normalized.startsWith(dialCode)) {
    normalized = dialCode + normalized;
  }

  return '+' + normalized;
}

/**
 * Get sorted list of countries for dropdown
 */
export function getSortedCountries(): [string, CountryCode][] {
  // Put Nigeria first, then sort rest alphabetically
  const entries = Object.entries(COUNTRY_CODES);
  const ngEntry = entries.find(([code]) => code === 'NG');
  const otherEntries = entries.filter(([code]) => code !== 'NG').sort((a, b) => a[1].name.localeCompare(b[1].name));

  return ngEntry ? [ngEntry, ...otherEntries] : otherEntries;
}
