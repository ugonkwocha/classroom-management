'use client';

import { useMemo, useState } from 'react';
import { Student, Program, PriceType } from '@/types';
import { PRICE_OPTIONS, formatCurrency, getPriceLabel } from '@/lib/constants/pricing';

interface RevenueAnalyticsProps {
  students: Student[];
  programs: Program[];
}

export function RevenueAnalytics({ students, programs }: RevenueAnalyticsProps) {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSeason, setSelectedSeason] = useState<string>('all');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');

  // Get unique years and seasons
  const uniqueYears = useMemo(() => {
    const years = new Set(programs.map((p) => p.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [programs]);

  const uniqueSeasons = useMemo(() => {
    const seasons = new Set(programs.map((p) => p.season));
    return Array.from(seasons).sort();
  }, [programs]);

  // Filter programs based on selections
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      if (selectedYear !== 'all' && p.year !== parseInt(selectedYear)) return false;
      if (selectedSeason !== 'all' && p.season !== selectedSeason) return false;
      if (selectedProgram !== 'all' && p.id !== selectedProgram) return false;
      return true;
    });
  }, [programs, selectedYear, selectedSeason, selectedProgram]);

  // Calculate revenue data
  const revenueData = useMemo(() => {
    const confirmedEnrollments = students.flatMap((student) => {
      if (!student.programEnrollments) return [];
      return student.programEnrollments.filter(
        (e) =>
          e.status === 'ASSIGNED' &&
          (e.paymentStatus === 'CONFIRMED' || e.paymentStatus === 'COMPLETED') &&
          filteredPrograms.some((p) => p.id === e.programId)
      );
    });

    // Calculate totals
    const totalRevenue = confirmedEnrollments.reduce(
      (sum, e) => sum + (e.priceAmount || 60000),
      0
    );

    // Group by price type
    const byPriceType: Record<
      PriceType,
      { count: number; revenue: number }
    > = {
      FULL_PRICE: { count: 0, revenue: 0 },
      SIBLING_DISCOUNT: { count: 0, revenue: 0 },
      EARLY_BIRD: { count: 0, revenue: 0 },
    };

    confirmedEnrollments.forEach((e) => {
      const priceType = (e.priceType || 'FULL_PRICE') as PriceType;
      byPriceType[priceType].count += 1;
      byPriceType[priceType].revenue += e.priceAmount || 60000;
    });

    // Group by program
    const byProgram: Record<
      string,
      {
        programName: string;
        count: number;
        revenue: number;
        byPriceType: Record<PriceType, number>;
      }
    > = {};

    confirmedEnrollments.forEach((e) => {
      if (!byProgram[e.programId]) {
        const prog = filteredPrograms.find((p) => p.id === e.programId);
        byProgram[e.programId] = {
          programName: prog ? `${prog.name} - ${prog.season} ${prog.year}` : e.programId,
          count: 0,
          revenue: 0,
          byPriceType: {
            FULL_PRICE: 0,
            SIBLING_DISCOUNT: 0,
            EARLY_BIRD: 0,
          },
        };
      }

      byProgram[e.programId].count += 1;
      byProgram[e.programId].revenue += e.priceAmount || 60000;
      const priceType = (e.priceType || 'FULL_PRICE') as PriceType;
      byProgram[e.programId].byPriceType[priceType] += 1;
    });

    const uniqueStudents = new Set(
      confirmedEnrollments.map((e) => {
        const student = students.find((s) => s.programEnrollments?.some((en) => en.id === e.id));
        return student?.id;
      })
    ).size;

    return {
      totalRevenue,
      enrollmentCount: confirmedEnrollments.length,
      uniqueStudents,
      averagePerStudent: uniqueStudents > 0 ? Math.round(totalRevenue / uniqueStudents) : 0,
      byPriceType,
      byProgram: Object.values(byProgram).sort((a, b) => b.revenue - a.revenue),
    };
  }, [students, filteredPrograms]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Years</option>
            {uniqueYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Season</label>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Seasons</option>
            {uniqueSeasons.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Program</label>
          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Programs</option>
            {filteredPrograms.map((prog) => (
              <option key={prog.id} value={prog.id}>
                {prog.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-xs text-purple-600 font-semibold mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-purple-900">{formatCurrency(revenueData.totalRevenue)}</p>
          <p className="text-xs text-purple-600 mt-2">{revenueData.enrollmentCount} enrollments</p>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-600 font-semibold mb-1">Unique Students</p>
          <p className="text-2xl font-bold text-blue-900">{revenueData.uniqueStudents}</p>
          <p className="text-xs text-blue-600 mt-2">with confirmed payment</p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-xs text-green-600 font-semibold mb-1">Average per Student</p>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(revenueData.averagePerStudent)}</p>
          <p className="text-xs text-green-600 mt-2">mean enrollment value</p>
        </div>

        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-600 font-semibold mb-1">Programs</p>
          <p className="text-2xl font-bold text-amber-900">{revenueData.byProgram.length}</p>
          <p className="text-xs text-amber-600 mt-2">in selected filters</p>
        </div>
      </div>

      {/* Revenue by Price Type */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PRICE_OPTIONS.map((option) => {
          const data = revenueData.byPriceType[option.type];
          const percentage =
            revenueData.enrollmentCount > 0
              ? Math.round((data.count / revenueData.enrollmentCount) * 100)
              : 0;

          return (
            <div key={option.type} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{option.label}</p>
                  <p className="text-xs text-gray-600">{option.description}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-600">Enrollments</p>
                  <p className="text-lg font-bold text-gray-900">{data.count}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-600">Revenue</p>
                  <p className="text-lg font-bold text-purple-600">{formatCurrency(data.revenue)}</p>
                </div>

                <div className="pt-2 border-t border-gray-300">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-600 font-semibold">Adoption Rate</p>
                    <p className="text-sm font-bold text-gray-900">{percentage}%</p>
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Program Breakdown */}
      {revenueData.byProgram.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Program Breakdown</h3>
          <div className="space-y-3">
            {revenueData.byProgram.map((prog) => (
              <div key={prog.programName} className="p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{prog.programName}</p>
                    <p className="text-sm text-gray-600 mt-1">{prog.count} enrollments</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(prog.revenue)}</p>
                </div>

                {/* Price type distribution for this program */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {PRICE_OPTIONS.map((option) => (
                    <div key={option.type} className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-600 mb-1">{option.label}</p>
                      <p className="font-bold text-gray-900">{prog.byPriceType[option.type]}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {revenueData.enrollmentCount === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No confirmed enrollments found for the selected filters.</p>
        </div>
      )}
    </div>
  );
}
