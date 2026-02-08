'use client';

import { useMemo } from 'react';
import { Student, Program, PriceType } from '@/types';
import { PRICE_OPTIONS, formatCurrency, getPriceLabel } from '@/lib/constants/pricing';

interface DiscountAdoptionAnalysisProps {
  students: Student[];
  programs: Program[];
}

const FULL_PRICE_AMOUNT = 60000;
const DISCOUNT_PRICES: Record<PriceType, number> = {
  FULL_PRICE: 60000,
  SIBLING_DISCOUNT: 56000,
  EARLY_BIRD: 54000,
};

export function DiscountAdoptionAnalysis({ students, programs }: DiscountAdoptionAnalysisProps) {
  const analysisData = useMemo(() => {
    // Get all confirmed enrollments
    const confirmedEnrollments = students.flatMap((student) => {
      if (!student.programEnrollments) return [];
      return student.programEnrollments.filter(
        (e) =>
          e.status === 'ASSIGNED' &&
          (e.paymentStatus === 'CONFIRMED' || e.paymentStatus === 'COMPLETED')
      );
    });

    const totalEnrollments = confirmedEnrollments.length;

    // Group by price type
    const byPriceType: Record<
      PriceType,
      { count: number; revenue: number; discount: number }
    > = {
      FULL_PRICE: { count: 0, revenue: 0, discount: 0 },
      SIBLING_DISCOUNT: { count: 0, revenue: 0, discount: 0 },
      EARLY_BIRD: { count: 0, revenue: 0, discount: 0 },
    };

    confirmedEnrollments.forEach((e) => {
      const priceType = (e.priceType || 'FULL_PRICE') as PriceType;
      const amount = e.priceAmount || DISCOUNT_PRICES[priceType];
      const discountFromFullPrice = FULL_PRICE_AMOUNT - amount;

      byPriceType[priceType].count += 1;
      byPriceType[priceType].revenue += amount;
      byPriceType[priceType].discount += discountFromFullPrice;
    });

    // Calculate discount statistics
    const totalDiscounts = byPriceType.SIBLING_DISCOUNT.discount + byPriceType.EARLY_BIRD.discount;
    const totalDiscountedEnrollments = byPriceType.SIBLING_DISCOUNT.count + byPriceType.EARLY_BIRD.count;
    const averageDiscount =
      totalDiscountedEnrollments > 0 ? Math.round(totalDiscounts / totalDiscountedEnrollments) : 0;
    const discountAdoptionRate =
      totalEnrollments > 0 ? Math.round((totalDiscountedEnrollments / totalEnrollments) * 100) : 0;

    // Calculate potential lost revenue if all were full price
    const potentialFullPrice = confirmedEnrollments.length * FULL_PRICE_AMOUNT;
    const actualRevenue = Object.values(byPriceType).reduce((sum, p) => sum + p.revenue, 0);
    const totalDiscountedRevenue = potentialFullPrice - actualRevenue;

    // Group by program to show discount rates per program
    const byProgram: Record<
      string,
      {
        programName: string;
        totalEnrollments: number;
        discountedEnrollments: number;
        discountRate: number;
        totalDiscount: number;
        byPriceType: Record<PriceType, number>;
      }
    > = {};

    confirmedEnrollments.forEach((e) => {
      if (!byProgram[e.programId]) {
        const prog = programs.find((p) => p.id === e.programId);
        byProgram[e.programId] = {
          programName: prog ? `${prog.name} - ${prog.season} ${prog.year}` : e.programId,
          totalEnrollments: 0,
          discountedEnrollments: 0,
          discountRate: 0,
          totalDiscount: 0,
          byPriceType: {
            FULL_PRICE: 0,
            SIBLING_DISCOUNT: 0,
            EARLY_BIRD: 0,
          },
        };
      }

      byProgram[e.programId].totalEnrollments += 1;
      const priceType = (e.priceType || 'FULL_PRICE') as PriceType;
      byProgram[e.programId].byPriceType[priceType] += 1;

      if (priceType !== 'FULL_PRICE') {
        byProgram[e.programId].discountedEnrollments += 1;
        const discountAmount = FULL_PRICE_AMOUNT - (e.priceAmount || DISCOUNT_PRICES[priceType]);
        byProgram[e.programId].totalDiscount += discountAmount;
      }
    });

    // Calculate discount rates and sort by adoption
    Object.values(byProgram).forEach((prog) => {
      prog.discountRate =
        prog.totalEnrollments > 0
          ? Math.round((prog.discountedEnrollments / prog.totalEnrollments) * 100)
          : 0;
    });

    const programList = Object.values(byProgram).sort((a, b) => b.discountRate - a.discountRate);

    // Find most popular discount
    const discountCounts = [
      { type: 'SIBLING_DISCOUNT' as PriceType, count: byPriceType.SIBLING_DISCOUNT.count },
      { type: 'EARLY_BIRD' as PriceType, count: byPriceType.EARLY_BIRD.count },
    ];
    const mostPopular = discountCounts.reduce((max, current) =>
      current.count > max.count ? current : max
    );

    return {
      totalEnrollments,
      totalDiscountedEnrollments,
      discountAdoptionRate,
      totalDiscountedRevenue,
      averageDiscount,
      byPriceType,
      programList,
      mostPopular,
      potentialFullPrice,
      actualRevenue,
    };
  }, [students, programs]);

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-xs text-purple-600 font-semibold mb-1">Total Enrollments</p>
          <p className="text-2xl font-bold text-purple-900">{analysisData.totalEnrollments}</p>
          <p className="text-xs text-purple-600 mt-2">confirmed payments</p>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-600 font-semibold mb-1">Using Discount</p>
          <p className="text-2xl font-bold text-blue-900">{analysisData.totalDiscountedEnrollments}</p>
          <p className="text-xs text-blue-600 mt-2">
            {analysisData.discountAdoptionRate}% adoption rate
          </p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-xs text-green-600 font-semibold mb-1">Revenue Impact</p>
          <p className="text-2xl font-bold text-green-900">
            {formatCurrency(analysisData.totalDiscountedRevenue)}
          </p>
          <p className="text-xs text-green-600 mt-2">total discounts given</p>
        </div>

        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-600 font-semibold mb-1">Average Discount</p>
          <p className="text-2xl font-bold text-amber-900">{formatCurrency(analysisData.averageDiscount)}</p>
          <p className="text-xs text-amber-600 mt-2">per discounted enrollment</p>
        </div>
      </div>

      {/* Most Popular Discount */}
      {analysisData.totalDiscountedEnrollments > 0 && (
        <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Most Popular Discount</p>
              <p className="text-lg font-bold text-gray-900">
                {getPriceLabel(analysisData.mostPopular.type)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-600">
                {analysisData.mostPopular.count}
              </p>
              <p className="text-xs text-gray-600">enrollments</p>
            </div>
          </div>
        </div>
      )}

      {/* Price Type Breakdown */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Discount Breakdown by Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRICE_OPTIONS.map((option) => {
            const data = analysisData.byPriceType[option.type];
            const percentage =
              analysisData.totalEnrollments > 0
                ? Math.round((data.count / analysisData.totalEnrollments) * 100)
                : 0;
            const isDiscount = option.type !== 'FULL_PRICE';

            return (
              <div
                key={option.type}
                className={`p-4 rounded-lg border ${
                  isDiscount
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <p className="font-semibold text-gray-900 mb-3">{option.label}</p>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-600">Count</p>
                    <p className="text-2xl font-bold text-gray-900">{data.count}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600">Percentage</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            isDiscount ? 'bg-blue-600' : 'bg-gray-400'
                          } rounded-full`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-lg font-bold text-gray-900 w-12 text-right">{percentage}%</p>
                    </div>
                  </div>

                  {isDiscount && (
                    <div>
                      <p className="text-xs text-gray-600">Total Discount</p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(data.discount)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Program Analysis */}
      {analysisData.programList.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Discount Adoption by Program</h3>
          <div className="space-y-3">
            {analysisData.programList.map((prog) => (
              <div key={prog.programName} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{prog.programName}</p>
                    <p className="text-sm text-gray-600 mt-1">{prog.totalEnrollments} enrollments</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{prog.discountRate}%</p>
                    <p className="text-xs text-gray-600">discount rate</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  {PRICE_OPTIONS.map((option) => (
                    <div key={option.type} className="bg-white p-2 rounded border border-gray-200">
                      <p className="text-gray-600 mb-1">{option.label}</p>
                      <p className="font-bold text-gray-900">{prog.byPriceType[option.type]}</p>
                    </div>
                  ))}
                </div>

                {prog.discountedEnrollments > 0 && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600">
                      Total discount given: <span className="font-bold text-blue-600">
                        {formatCurrency(prog.totalDiscount)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue Impact Summary */}
      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
        <h4 className="font-semibold text-gray-900 mb-3">Revenue Impact Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">If all enrollments were full price:</span>
            <span className="font-bold text-gray-900">
              {formatCurrency(analysisData.potentialFullPrice)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Actual revenue:</span>
            <span className="font-bold text-gray-900">
              {formatCurrency(analysisData.actualRevenue)}
            </span>
          </div>
          <div className="pt-2 border-t border-amber-300 flex justify-between">
            <span className="text-gray-700 font-semibold">Discount impact:</span>
            <span className="font-bold text-amber-700">
              -{formatCurrency(analysisData.totalDiscountedRevenue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
