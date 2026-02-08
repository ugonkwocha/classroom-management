'use client';

import { useMemo } from 'react';
import { Student, Program, Class } from '@/types';
import { formatCurrency } from '@/lib/constants/pricing';

interface RevenueForecastProps {
  students: Student[];
  programs: Program[];
  classes: Class[];
}

export function RevenueForecast({ students, programs, classes }: RevenueForecastProps) {
  const AVERAGE_PRICE = 58000; // Average of the three pricing options
  const today = new Date();

  const forecastData = useMemo(() => {
    // Get only upcoming programs (start date in the future)
    const upcomingPrograms = programs.filter((p) => {
      if (!p.startDate) return false;
      const startDate = new Date(p.startDate);
      return startDate > today;
    });

    // Calculate data for each program
    const forecasts = upcomingPrograms.map((program) => {
      // Get all classes for this program
      const programClasses = classes.filter((c) => c.programId === program.id && !c.isArchived);

      // Count current enrollments
      const currentEnrollments = students.flatMap((s) => {
        if (!s.programEnrollments) return [];
        return s.programEnrollments.filter(
          (e) =>
            e.programId === program.id &&
            e.status === 'ASSIGNED' &&
            (e.paymentStatus === 'CONFIRMED' || e.paymentStatus === 'COMPLETED')
        );
      });

      // Calculate confirmed revenue from existing enrollments
      const confirmedRevenue = currentEnrollments.reduce(
        (sum, e) => sum + (e.priceAmount || 60000),
        0
      );

      // Calculate remaining capacity
      const totalCapacity = programClasses.reduce((sum, c) => sum + c.capacity, 0);
      const totalEnrolled = students.reduce((sum, s) => {
        if (!s.programEnrollments) return sum;
        return (
          sum +
          s.programEnrollments.filter(
            (e) => e.programId === program.id && e.classId && e.status === 'ASSIGNED'
          ).length
        );
      }, 0);

      const remainingSlots = Math.max(0, totalCapacity - totalEnrolled);
      const potentialRevenue = remainingSlots * AVERAGE_PRICE;
      const forecastedTotal = confirmedRevenue + potentialRevenue;

      const utilizationRate =
        totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

      return {
        id: program.id,
        name: `${program.name} - ${program.season} ${program.year}`,
        startDate: new Date(program.startDate),
        confirmedRevenue,
        potentialRevenue,
        forecastedTotal,
        totalCapacity,
        currentEnrollments: currentEnrollments.length,
        remainingSlots,
        utilizationRate,
      };
    });

    // Sort by forecasted total (highest first)
    return forecasts.sort((a, b) => b.forecastedTotal - a.forecastedTotal);
  }, [students, programs, classes]);

  // Calculate summary
  const summary = useMemo(() => {
    return {
      totalConfirmed: forecastData.reduce((sum, f) => sum + f.confirmedRevenue, 0),
      totalPotential: forecastData.reduce((sum, f) => sum + f.potentialRevenue, 0),
      totalForecasted: forecastData.reduce((sum, f) => sum + f.forecastedTotal, 0),
      programCount: forecastData.length,
    };
  }, [forecastData]);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {forecastData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs text-green-600 font-semibold mb-1">Confirmed Revenue</p>
            <p className="text-2xl font-bold text-green-900">
              {formatCurrency(summary.totalConfirmed)}
            </p>
            <p className="text-xs text-green-600 mt-2">from existing enrollments</p>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-#4885ed font-semibold mb-1">Potential Revenue</p>
            <p className="text-2xl font-bold text-blue-900">
              {formatCurrency(summary.totalPotential)}
            </p>
            <p className="text-xs text-#4885ed mt-2">from remaining slots</p>
          </div>

          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-xs text-#db3236 font-semibold mb-1">Forecasted Total</p>
            <p className="text-2xl font-bold text-[#881f1f]">
              {formatCurrency(summary.totalForecasted)}
            </p>
            <p className="text-xs text-#db3236 mt-2">confirmed + potential</p>
          </div>

          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs text-amber-600 font-semibold mb-1">Upcoming Programs</p>
            <p className="text-2xl font-bold text-amber-900">{summary.programCount}</p>
            <p className="text-xs text-amber-600 mt-2">in forecast</p>
          </div>
        </div>
      )}

      {/* Programs List */}
      {forecastData.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-gray-900">Upcoming Programs</h3>
          {forecastData.map((forecast) => {
            let bgColor = 'bg-green-50';
            let borderColor = 'border-green-200';
            let textColor = 'text-green-700';

            if (forecast.utilizationRate >= 90) {
              bgColor = 'bg-red-50';
              borderColor = 'border-red-200';
              textColor = 'text-red-700';
            } else if (forecast.utilizationRate >= 70) {
              bgColor = 'bg-yellow-50';
              borderColor = 'border-yellow-200';
              textColor = 'text-yellow-700';
            }

            return (
              <div key={forecast.id} className={`p-4 rounded-lg border ${bgColor} ${borderColor}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-semibold text-gray-900">{forecast.name}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Starts: {forecast.startDate.toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-#db3236">
                    {formatCurrency(forecast.forecastedTotal)}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-600">Current Enrollments</p>
                    <p className="text-lg font-bold text-gray-900">{forecast.currentEnrollments}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Remaining Slots</p>
                    <p className="text-lg font-bold text-gray-900">{forecast.remainingSlots}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total Capacity</p>
                    <p className="text-lg font-bold text-gray-900">{forecast.totalCapacity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Utilization</p>
                    <p className={`text-lg font-bold ${textColor}`}>{forecast.utilizationRate}%</p>
                  </div>
                </div>

                {/* Revenue breakdown */}
                <div className="pt-3 border-t border-current border-opacity-20 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Confirmed</p>
                    <p className="font-bold text-green-600">{formatCurrency(forecast.confirmedRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Potential</p>
                    <p className="font-bold text-#4885ed">{formatCurrency(forecast.potentialRevenue)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No upcoming programs found.</p>
        </div>
      )}

      <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
        <p>
          <span className="font-semibold">Forecast Methodology:</span> Potential revenue is calculated
          using an average price of {formatCurrency(AVERAGE_PRICE)} per enrollment for remaining
          slots. Actual revenue may vary based on price tier selection.
        </p>
      </div>
    </div>
  );
}
