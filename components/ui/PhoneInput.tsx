'use client';

import { useState } from 'react';
import { getSortedCountries, validatePhoneNumber } from '@/lib/constants/countries';

interface PhoneInputProps {
  label: string;
  value: string;
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function PhoneInput({
  label,
  value,
  countryCode,
  onCountryCodeChange,
  onChange,
  error,
  placeholder,
  required = false,
  className = '',
}: PhoneInputProps) {
  const countries = getSortedCountries();
  const [touched, setTouched] = useState(false);

  // Validate on blur
  const handleBlur = () => {
    setTouched(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow user to type freely without real-time formatting
    // Validation will happen on blur
    onChange(e.target.value);
  };

  const validation = value && touched ? validatePhoneNumber(value, countryCode) : null;
  const displayError = error || (validation && !validation.valid ? validation.message : '');

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-600">*</span>}
      </label>

      <div className="flex gap-2">
        {/* Country Code Dropdown */}
        <div className="flex-shrink-0">
          <select
            value={countryCode}
            onChange={(e) => onCountryCodeChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
          >
            {countries.map(([code, country]) => (
              <option key={code} value={code}>
                {country.flag} {country.name} ({country.code})
              </option>
            ))}
          </select>
        </div>

        {/* Phone Number Input */}
        <div className="flex-1">
          <input
            type="tel"
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
              displayError && touched
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-purple-500'
            }`}
          />
        </div>
      </div>

      {/* Error Message */}
      {displayError && touched && (
        <p className="text-red-600 text-xs mt-1">{displayError}</p>
      )}

      {/* Help Text */}
      {!displayError && !touched && (
        <p className="text-gray-500 text-xs mt-1">
          e.g. +234 8012 3456 78
        </p>
      )}

      {/* Validation Success */}
      {validation && validation.valid && touched && (
        <p className="text-green-600 text-xs mt-1">✓ Valid phone number</p>
      )}
    </div>
  );
}
