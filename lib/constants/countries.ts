export interface CountryCode {
  name: string;
  code: string;
  dial: string;
  flag: string;
  format: string;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  example: string;
}

export const COUNTRY_CODES: Record<string, CountryCode> = {
  NG: {
    name: 'Nigeria',
    code: '+234',
    dial: 'NG',
    flag: '🇳🇬',
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
    flag: '🇺🇸',
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
    flag: '🇬🇧',
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
    flag: '🇨🇦',
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
    flag: '🇦🇺',
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
    flag: '🇰🇪',
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
    flag: '🇬🇭',
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
    flag: '🇿🇦',
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
    flag: '🇮🇳',
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
    flag: '🇸🇬',
    format: '+65 XXXX XXXX',
    pattern: /^(?:\+65)?[6-9]\d{7}$/,
    minLength: 8,
    maxLength: 11,
    example: '+65 6123 4567',
  },
  // Additional countries without strict validation
  AF: { name: 'Afghanistan', code: '+93', dial: 'AF', flag: '🇦🇫', format: '+93 XXX XXX XXXX', example: '+93 70 123 4567' },
  AL: { name: 'Albania', code: '+355', dial: 'AL', flag: '🇦🇱', format: '+355 XX XXX XXXX', example: '+355 69 123 4567' },
  DZ: { name: 'Algeria', code: '+213', dial: 'DZ', flag: '🇩🇿', format: '+213 XXX XXX XXX', example: '+213 561 234 567' },
  AR: { name: 'Argentina', code: '+54', dial: 'AR', flag: '🇦🇷', format: '+54 XXX XXX XXXX', example: '+54 114 123 4567' },
  AT: { name: 'Austria', code: '+43', dial: 'AT', flag: '🇦🇹', format: '+43 XX XXXX XXXX', example: '+43 12 3456 7890' },
  BD: { name: 'Bangladesh', code: '+880', dial: 'BD', flag: '🇧🇩', format: '+880 XX XXX XXXX', example: '+880 17 1234 5678' },
  BE: { name: 'Belgium', code: '+32', dial: 'BE', flag: '🇧🇪', format: '+32 XXX XXX XXX', example: '+32 471 234 567' },
  BR: { name: 'Brazil', code: '+55', dial: 'BR', flag: '🇧🇷', format: '+55 XX XXXXX XXXX', example: '+55 11 96789 0123' },
  BG: { name: 'Bulgaria', code: '+359', dial: 'BG', flag: '🇧🇬', format: '+359 XXX XXX XXX', example: '+359 871 234 567' },
  CL: { name: 'Chile', code: '+56', dial: 'CL', flag: '🇨🇱', format: '+56 X XXXX XXXX', example: '+56 9 1234 5678' },
  CN: { name: 'China', code: '+86', dial: 'CN', flag: '🇨🇳', format: '+86 XX XXXX XXXX', example: '+86 10 1234 5678' },
  CO: { name: 'Colombia', code: '+57', dial: 'CO', flag: '🇨🇴', format: '+57 XXX XXX XXXX', example: '+57 312 1234 567' },
  CR: { name: 'Costa Rica', code: '+506', dial: 'CR', flag: '🇨🇷', format: '+506 XXXX XXXX', example: '+506 8765 4321' },
  HR: { name: 'Croatia', code: '+385', dial: 'HR', flag: '🇭🇷', format: '+385 X XXXX XXXX', example: '+385 1 2345 6789' },
  CY: { name: 'Cyprus', code: '+357', dial: 'CY', flag: '🇨🇾', format: '+357 XXXX XXXX', example: '+357 9612 3456' },
  CZ: { name: 'Czechia', code: '+420', dial: 'CZ', flag: '🇨🇿', format: '+420 XXX XXX XXX', example: '+420 721 234 567' },
  DK: { name: 'Denmark', code: '+45', dial: 'DK', flag: '🇩🇰', format: '+45 XXXX XXXX', example: '+45 4012 3456' },
  EG: { name: 'Egypt', code: '+20', dial: 'EG', flag: '🇪🇬', format: '+20 XXX XXX XXXX', example: '+20 100 1234 567' },
  EE: { name: 'Estonia', code: '+372', dial: 'EE', flag: '🇪🇪', format: '+372 XXXX XXXX', example: '+372 5012 3456' },
  FI: { name: 'Finland', code: '+358', dial: 'FI', flag: '🇫🇮', format: '+358 XX XXXX XXXX', example: '+358 50 1234 5678' },
  FR: { name: 'France', code: '+33', dial: 'FR', flag: '🇫🇷', format: '+33 X XX XX XX XX', example: '+33 6 12 34 56 78' },
  DE: { name: 'Germany', code: '+49', dial: 'DE', flag: '🇩🇪', format: '+49 XXX XXXXXXXX', example: '+49 301 234 5678' },
  GR: { name: 'Greece', code: '+30', dial: 'GR', flag: '🇬🇷', format: '+30 XXX XXX XXXX', example: '+30 212 1234 567' },
  HK: { name: 'Hong Kong', code: '+852', dial: 'HK', flag: '🇭🇰', format: '+852 XXXX XXXX', example: '+852 5123 4567' },
  HU: { name: 'Hungary', code: '+36', dial: 'HU', flag: '🇭🇺', format: '+36 XXX XXX XXX', example: '+36 701 234 567' },
  IS: { name: 'Iceland', code: '+354', dial: 'IS', flag: '🇮🇸', format: '+354 XXXX XXXX', example: '+354 6812 3456' },
  ID: { name: 'Indonesia', code: '+62', dial: 'ID', flag: '🇮🇩', format: '+62 XXX XXXX XXXX', example: '+62 812 1234 5678' },
  IR: { name: 'Iran', code: '+98', dial: 'IR', flag: '🇮🇷', format: '+98 XXX XXX XXXX', example: '+98 901 1234 567' },
  IQ: { name: 'Iraq', code: '+964', dial: 'IQ', flag: '🇮🇶', format: '+964 XXX XXX XXXX', example: '+964 781 1234 567' },
  IE: { name: 'Ireland', code: '+353', dial: 'IE', flag: '🇮🇪', format: '+353 XX XXXX XXXX', example: '+353 87 1234 5678' },
  IL: { name: 'Israel', code: '+972', dial: 'IL', flag: '🇮🇱', format: '+972 XX XXXX XXXX', example: '+972 50 1234 5678' },
  IT: { name: 'Italy', code: '+39', dial: 'IT', flag: '🇮🇹', format: '+39 XXX XXXX XXXX', example: '+39 301 1234 567' },
  JP: { name: 'Japan', code: '+81', dial: 'JP', flag: '🇯🇵', format: '+81 XX XXXX XXXX', example: '+81 90 1234 5678' },
  JO: { name: 'Jordan', code: '+962', dial: 'JO', flag: '🇯🇴', format: '+962 XX XXXX XXXX', example: '+962 78 1234 5678' },
  KZ: { name: 'Kazakhstan', code: '+7', dial: 'KZ', flag: '🇰🇿', format: '+7 XXX XXX XXXX', example: '+7 701 234 5678' },
  KW: { name: 'Kuwait', code: '+965', dial: 'KW', flag: '🇰🇼', format: '+965 XXXX XXXX', example: '+965 9612 3456' },
  LV: { name: 'Latvia', code: '+371', dial: 'LV', flag: '🇱🇻', format: '+371 XXXX XXXX', example: '+371 2012 3456' },
  LB: { name: 'Lebanon', code: '+961', dial: 'LB', flag: '🇱🇧', format: '+961 XX XXXX XXXX', example: '+961 71 1234 567' },
  LT: { name: 'Lithuania', code: '+370', dial: 'LT', flag: '🇱🇹', format: '+370 XXX XXXXX', example: '+370 612 34567' },
  LU: { name: 'Luxembourg', code: '+352', dial: 'LU', flag: '🇱🇺', format: '+352 XXXX XXXX', example: '+352 6612 3456' },
  MY: { name: 'Malaysia', code: '+60', dial: 'MY', flag: '🇲🇾', format: '+60 XX XXXX XXXX', example: '+60 12 1234 5678' },
  MX: { name: 'Mexico', code: '+52', dial: 'MX', flag: '🇲🇽', format: '+52 XXX XXX XXXX', example: '+52 551 1234 567' },
  MA: { name: 'Morocco', code: '+212', dial: 'MA', flag: '🇲🇦', format: '+212 XXX XXX XXX', example: '+212 612 345 678' },
  NL: { name: 'Netherlands', code: '+31', dial: 'NL', flag: '🇳🇱', format: '+31 XX XXXX XXXX', example: '+31 61 1234 5678' },
  NZ: { name: 'New Zealand', code: '+64', dial: 'NZ', flag: '🇳🇿', format: '+64 X XXXX XXXX', example: '+64 2 1234 5678' },
  NO: { name: 'Norway', code: '+47', dial: 'NO', flag: '🇳🇴', format: '+47 XXXX XXXX', example: '+47 9012 3456' },
  PK: { name: 'Pakistan', code: '+92', dial: 'PK', flag: '🇵🇰', format: '+92 XXX XXXX XXXX', example: '+92 300 1234 567' },
  PE: { name: 'Peru', code: '+51', dial: 'PE', flag: '🇵🇪', format: '+51 XXX XXX XXX', example: '+51 912 345 678' },
  PH: { name: 'Philippines', code: '+63', dial: 'PH', flag: '🇵🇭', format: '+63 XXX XXX XXXX', example: '+63 917 1234 567' },
  PL: { name: 'Poland', code: '+48', dial: 'PL', flag: '🇵🇱', format: '+48 XXX XXX XXX', example: '+48 601 234 567' },
  PT: { name: 'Portugal', code: '+351', dial: 'PT', flag: '🇵🇹', format: '+351 XXX XXX XXX', example: '+351 912 345 678' },
  QA: { name: 'Qatar', code: '+974', dial: 'QA', flag: '🇶🇦', format: '+974 XXXX XXXX', example: '+974 3312 3456' },
  RO: { name: 'Romania', code: '+40', dial: 'RO', flag: '🇷🇴', format: '+40 XXX XXX XXX', example: '+40 721 234 567' },
  RU: { name: 'Russia', code: '+7', dial: 'RU', flag: '🇷🇺', format: '+7 XXX XXX XXXX', example: '+7 901 234 5678' },
  SA: { name: 'Saudi Arabia', code: '+966', dial: 'SA', flag: '🇸🇦', format: '+966 XX XXXX XXXX', example: '+966 50 1234 5678' },
  RS: { name: 'Serbia', code: '+381', dial: 'RS', flag: '🇷🇸', format: '+381 XX XXXX XXXX', example: '+381 60 1234 5678' },
  SK: { name: 'Slovakia', code: '+421', dial: 'SK', format: '+421 XXX XXX XXX', flag: '🇸🇰', example: '+421 901 234 567' },
  SI: { name: 'Slovenia', code: '+386', dial: 'SI', flag: '🇸🇮', format: '+386 X XXXX XXXX', example: '+386 1 2345 6789' },
  KR: { name: 'South Korea', code: '+82', dial: 'KR', flag: '🇰🇷', format: '+82 XX XXXX XXXX', example: '+82 10 1234 5678' },
  ES: { name: 'Spain', code: '+34', dial: 'ES', flag: '🇪🇸', format: '+34 XXX XXX XXX', example: '+34 612 345 678' },
  LK: { name: 'Sri Lanka', code: '+94', dial: 'LK', flag: '🇱🇰', format: '+94 XX XXXX XXXX', example: '+94 77 1234 5678' },
  SE: { name: 'Sweden', code: '+46', dial: 'SE', flag: '🇸🇪', format: '+46 XXX XXX XXX', example: '+46 701 234 567' },
  CH: { name: 'Switzerland', code: '+41', dial: 'CH', flag: '🇨🇭', format: '+41 XX XXXX XXXX', example: '+41 79 1234 5678' },
  TW: { name: 'Taiwan', code: '+886', dial: 'TW', flag: '🇹🇼', format: '+886 X XXXX XXXX', example: '+886 9 1234 5678' },
  TH: { name: 'Thailand', code: '+66', dial: 'TH', flag: '🇹🇭', format: '+66 XX XXXX XXXX', example: '+66 81 1234 5678' },
  TN: { name: 'Tunisia', code: '+216', dial: 'TN', flag: '🇹🇳', format: '+216 XX XXX XXX', example: '+216 20 123 456' },
  TR: { name: 'Turkey', code: '+90', dial: 'TR', flag: '🇹🇷', format: '+90 XXX XXX XXXX', example: '+90 501 1234 567' },
  UA: { name: 'Ukraine', code: '+380', dial: 'UA', flag: '🇺🇦', format: '+380 XX XXXX XXXX', example: '+380 50 1234 5678' },
  AE: { name: 'United Arab Emirates', code: '+971', dial: 'AE', flag: '🇦🇪', format: '+971 XX XXX XXXX', example: '+971 50 1234 5678' },
  UY: { name: 'Uruguay', code: '+598', dial: 'UY', flag: '🇺🇾', format: '+598 X XXXX XXXX', example: '+598 9 1234 5678' },
  VE: { name: 'Venezuela', code: '+58', dial: 'VE', flag: '🇻🇪', format: '+58 XXX XXX XXXX', example: '+58 414 1234 567' },
  VN: { name: 'Vietnam', code: '+84', dial: 'VN', flag: '🇻🇳', format: '+84 XXX XXX XXX', example: '+84 901 234 567' },
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

  // If country doesn't have strict validation, just check it's not empty
  if (!country.pattern) {
    if (cleanedNumber.length < 7) {
      return {
        valid: false,
        message: 'Phone number must be at least 7 digits'
      };
    }
    return { valid: true, message: '' };
  }

  // For countries with validation rules
  if (country.minLength && cleanedNumber.length < country.minLength) {
    return {
      valid: false,
      message: `Phone number must be at least ${country.minLength} digits`
    };
  }

  if (country.maxLength && cleanedNumber.length > country.maxLength) {
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
 * Format phone number according to country's format pattern
 * Handles real-time formatting as user types
 */
export function formatPhoneNumber(phoneNumber: string, countryCode: string): string {
  const country = getCountry(countryCode);
  if (!country) return phoneNumber;

  // Remove all non-digits
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (!cleaned) return '';

  const format = country.format;
  let formatted = '';
  let digitIndex = 0;

  // Apply format pattern
  for (let i = 0; i < format.length && digitIndex < cleaned.length; i++) {
    if (format[i] === 'X') {
      formatted += cleaned[digitIndex];
      digitIndex++;
    } else {
      formatted += format[i];
    }
  }

  return formatted;
}

/**
 * Format phone number for display (with country code prefix)
 * Used in student details view
 */
export function formatPhoneNumberForDisplay(phoneNumber: string, countryCode: string): string {
  const country = getCountry(countryCode);
  if (!country) return phoneNumber;

  // Clean input - remove all non-digits
  let cleaned = phoneNumber.replace(/\D/g, '');
  if (!cleaned) return '';

  // Handle leading 0 for countries that use it (like Nigeria)
  // If it starts with 0 and country code exists, remove the 0
  if (cleaned.startsWith('0') && countryCode === 'NG') {
    cleaned = cleaned.substring(1);
  }

  // Ensure we have the right number of digits for formatting
  // Take only the last 10 digits (in case someone pasted extra digits)
  if (cleaned.length > 10) {
    cleaned = cleaned.slice(-10);
  }

  // Build the formatted number with country code
  const dialCode = country.code.replace('+', '');
  const format = country.format.replace('+' + dialCode, '').trim();

  let formatted = country.code + ' ';
  let digitIndex = 0;

  for (let i = 0; i < format.length && digitIndex < cleaned.length; i++) {
    if (format[i] === 'X') {
      formatted += cleaned[digitIndex];
      digitIndex++;
    } else if (format[i] !== 'X') {
      formatted += format[i];
    }
  }

  return formatted;
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
