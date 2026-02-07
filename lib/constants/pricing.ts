import { PriceType, PriceOption } from '@/types';

export const PRICE_OPTIONS: PriceOption[] = [
  {
    type: 'FULL_PRICE',
    label: 'Full Price',
    amount: 60000,
    description: 'Standard enrollment price',
  },
  {
    type: 'SIBLING_DISCOUNT',
    label: 'Sibling Discount',
    amount: 56000,
    description: 'For siblings enrolled in the same program',
  },
  {
    type: 'EARLY_BIRD',
    label: 'Early Bird',
    amount: 54000,
    description: 'Early registration discount',
  },
];

/**
 * Get price amount for a specific price type
 * @param priceType - The price type to look up
 * @returns The amount in Naira, defaults to 60000 if not found
 */
export const getPriceByType = (priceType: PriceType): number => {
  const option = PRICE_OPTIONS.find((opt) => opt.type === priceType);
  return option?.amount || 60000;
};

/**
 * Get full price option details
 * @param priceType - The price type to look up
 * @returns The PriceOption object or undefined if not found
 */
export const getPriceOption = (priceType: PriceType): PriceOption | undefined => {
  return PRICE_OPTIONS.find((opt) => opt.type === priceType);
};

/**
 * Format currency amount as Nigerian Naira
 * @param amount - Amount in Naira
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Get price label for a price type
 * @param priceType - The price type
 * @returns The label string
 */
export const getPriceLabel = (priceType: PriceType): string => {
  const option = PRICE_OPTIONS.find((opt) => opt.type === priceType);
  return option?.label || 'Full Price';
};
