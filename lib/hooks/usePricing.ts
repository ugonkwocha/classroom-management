'use client';

import { useEffect, useState } from 'react';
import { PriceOption, PriceType } from '@/types';
import { PRICE_OPTIONS } from '@/lib/constants/pricing';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

export function usePricing() {
  const [priceOptions, setPriceOptions] = useState<PriceOption[]>(PRICE_OPTIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setIsLoading(true);
        const response = await fetchWithAuth('/api/pricing');

        if (!response.ok) {
          throw new Error('Failed to fetch pricing');
        }

        const pricingConfigs = await response.json();

        // Convert API response to PriceOption format
        const options: PriceOption[] = PRICE_OPTIONS.map((option) => {
          const config = pricingConfigs.find(
            (p: any) => p.priceType === option.type
          );
          return {
            ...option,
            amount: config?.amount || option.amount,
          };
        });

        setPriceOptions(options);
        setError(null);
      } catch (err) {
        console.error('Error fetching pricing:', err);
        // Fall back to default PRICE_OPTIONS on error
        setPriceOptions(PRICE_OPTIONS);
        setError(err instanceof Error ? err.message : 'Failed to fetch pricing');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPricing();
  }, []);

  const getPriceByType = (priceType: PriceType): number => {
    const option = priceOptions.find((opt) => opt.type === priceType);
    return option?.amount || 60000;
  };

  const getPriceOption = (priceType: PriceType): PriceOption | undefined => {
    return priceOptions.find((opt) => opt.type === priceType);
  };

  return {
    priceOptions,
    isLoading,
    error,
    getPriceByType,
    getPriceOption,
  };
}
