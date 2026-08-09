'use client';

import { useCallback, useEffect, useState } from 'react';
import { PriceOption, PriceType } from '@/types';
import { PRICE_OPTIONS } from '@/lib/constants/pricing';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

export function usePricing() {
  const [priceOptions, setPriceOptions] = useState<PriceOption[]>(PRICE_OPTIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPricing = useCallback(async () => {
    try {
        setIsLoading(true);
        const response = await fetchWithAuth('/api/pricing');

        if (!response.ok) {
          throw new Error('Failed to fetch pricing');
        }

        const pricingConfigs = await response.json();

        const options: PriceOption[] = pricingConfigs.map((config: {
          priceType: string;
          label: string;
          description: string;
          amount: number;
          isActive: boolean;
          isSystem: boolean;
          displayOrder: number;
        }) => ({
          type: config.priceType,
          label: config.label,
          description: config.description,
          amount: config.amount,
          isActive: config.isActive,
          isSystem: config.isSystem,
          displayOrder: config.displayOrder,
        }));

        setPriceOptions(options.length > 0 ? options : PRICE_OPTIONS);
        setError(null);
    } catch (err) {
      console.error('Error fetching pricing:', err);
      setPriceOptions(PRICE_OPTIONS);
      setError(err instanceof Error ? err.message : 'Failed to fetch pricing');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

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
    refresh: fetchPricing,
    getPriceByType,
    getPriceOption,
  };
}
