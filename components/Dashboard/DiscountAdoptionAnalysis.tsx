'use client';

import { useMemo } from 'react';
import { Student, Program } from '@/types';
import { formatCurrency, getPriceLabel } from '@/lib/constants/pricing';
import { getConfirmedPaidEnrollmentRows } from '@/lib/dashboard-enrollment-metrics';
import { usePricing } from '@/lib/hooks';

interface DiscountAdoptionAnalysisProps {
  students: Student[];
  programs: Program[];
}

export function DiscountAdoptionAnalysis({ students, programs }: DiscountAdoptionAnalysisProps) {
  const { priceOptions } = usePricing();
  const fullPriceAmount = priceOptions.find((option) => option.type === 'FULL_PRICE')?.amount || 60000;

  const analysisData = useMemo(() => {
    // Get all confirmed enrollments
    const confirmedEnrollments = getConfirmedPaidEnrollmentRows(students);

    const totalEnrollments = confirmedEnrollments.length;

    // Group by price type
    const byPriceType: Record<string, { count: number; revenue: number; discount: number }> = Object.fromEntries(
      priceOptions.map((option) => [option.type, { count: 0, revenue: 0, discount: 0 }])
    );

    confirmedEnrollments.forEach(({ enrollment, amount }) => {
      const priceType = enrollment.priceType || 'FULL_PRICE';
      const discountFromFullPrice = Math.max(0, fullPriceAmount - amount);

      byPriceType[priceType] ||= { count: 0, revenue: 0, discount: 0 };
      byPriceType[priceType].count += 1;
      byPriceType[priceType].revenue += amount;
      byPriceType[priceType].discount += discountFromFullPrice;
    });

    // Calculate discount statistics
    const discountEntries = Object.entries(byPriceType).filter(([type]) => type !== 'FULL_PRICE');
    const totalDiscounts = discountEntries.reduce((sum, [, data]) => sum + data.discount, 0);
    const totalDiscountedEnrollments = discountEntries.reduce((sum, [, data]) => sum + data.count, 0);
    const averageDiscount =
      totalDiscountedEnrollments > 0 ? Math.round(totalDiscounts / totalDiscountedEnrollments) : 0;
    const discountAdoptionRate =
      totalEnrollments > 0 ? Math.round((totalDiscountedEnrollments / totalEnrollments) * 100) : 0;

    // Calculate potential lost revenue if all were full price
    const potentialFullPrice = confirmedEnrollments.length * fullPriceAmount;
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
        byPriceType: Record<string, number>;
      }
    > = {};

    confirmedEnrollments.forEach(({ enrollment, amount }) => {
      if (!byProgram[enrollment.programId]) {
        const prog = programs.find((p) => p.id === enrollment.programId);
        byProgram[enrollment.programId] = {
          programName: prog ? `${prog.name} - ${prog.season} ${prog.year}` : enrollment.programId,
          totalEnrollments: 0,
          discountedEnrollments: 0,
          discountRate: 0,
          totalDiscount: 0,
          byPriceType: Object.fromEntries(priceOptions.map((option) => [option.type, 0])),
        };
      }

      byProgram[enrollment.programId].totalEnrollments += 1;
      const priceType = enrollment.priceType || 'FULL_PRICE';
      byProgram[enrollment.programId].byPriceType[priceType] ||= 0;
      byProgram[enrollment.programId].byPriceType[priceType] += 1;

      if (priceType !== 'FULL_PRICE') {
        byProgram[enrollment.programId].discountedEnrollments += 1;
        const discountAmount = Math.max(0, fullPriceAmount - amount);
        byProgram[enrollment.programId].totalDiscount += discountAmount;
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
    const discountCounts = discountEntries.map(([type, data]) => ({ type, count: data.count }));
    const mostPopular = discountCounts.reduce((max, current) =>
      current.count > max.count ? current : max
    , { type: 'FULL_PRICE', count: 0 });

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
  }, [students, programs, priceOptions, fullPriceAmount]);

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
                {priceOptions.find((option) => option.type === analysisData.mostPopular.type)?.label || getPriceLabel(analysisData.mostPopular.type)}
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
          {priceOptions.map((option) => {
            const data = analysisData.byPriceType[option.type] || { count: 0, revenue: 0, discount: 0 };
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
                  {priceOptions.map((option) => (
                    <div key={option.type} className="bg-white p-2 rounded border border-gray-200">
                      <p className="text-gray-600 mb-1">{option.label}</p>
                      <p className="font-bold text-gray-900">{prog.byPriceType[option.type] || 0}</p>
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
