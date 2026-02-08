'use client';

import { CourseHistory } from '@/types';
import { Card } from '@/components/ui';

interface CourseHistorySectionProps {
  courseHistory: CourseHistory[];
  getCourseName: (courseId: string) => string;
}

export function CourseHistorySection({ courseHistory, getCourseName }: CourseHistorySectionProps) {
  if (courseHistory.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Course History</h3>
        <p className="text-gray-600 text-center py-6">
          This student hasn&apos;t taken any courses yet.
        </p>
      </Card>
    );
  }

  const completedCount = courseHistory.filter((c) => c.completionStatus === 'COMPLETED').length;
  const inProgressCount = courseHistory.filter((c) => c.completionStatus === 'IN_PROGRESS').length;

  return (
    <Card>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Course History</h3>
          <p className="text-sm text-gray-600 mt-1">
            {courseHistory.length} course{courseHistory.length !== 1 ? 's' : ''} taken
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <div className="text-center">
            <p className="font-bold text-green-600">{completedCount}</p>
            <p className="text-gray-600 text-xs">Completed</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-blue-600">{inProgressCount}</p>
            <p className="text-gray-600 text-xs">In Progress</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {courseHistory.map((history) => {
          const statusColor =
            history.completionStatus === 'COMPLETED'
              ? 'bg-green-50 border-green-200'
              : 'bg-blue-50 border-blue-200';

          const statusBadgeColor =
            history.completionStatus === 'COMPLETED'
              ? 'bg-green-200 text-green-800'
              : 'bg-blue-200 text-blue-800';

          const statusLabel =
            history.completionStatus === 'COMPLETED'
              ? 'Completed'
              : 'In Progress';

          return (
            <div key={history.id} className={`p-4 rounded-lg border ${statusColor}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{getCourseName(history.courseId)}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {history.programName && `${history.programName}`}
                    {history.programName && history.batch && ' • '}
                    {history.batch && `Batch ${history.batch}`}
                    {history.year && ` • ${history.year}`}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap ml-2 ${statusBadgeColor}`}>
                  {statusLabel}
                </span>
              </div>

              {/* Separator line */}
              <div className="my-3 border-b border-current border-opacity-20" />

              {/* Dates section */}
              <div className="space-y-1 text-sm text-gray-600">
                {history.startDate && (
                  <p>
                    <span className="font-semibold">Started:</span>{' '}
                    {new Date(history.startDate).toLocaleDateString()}
                  </p>
                )}
                {history.endDate && (
                  <p>
                    <span className="font-semibold">Ended:</span>{' '}
                    {new Date(history.endDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Performance notes if available */}
              {history.performanceNotes && (
                <div className="mt-2 pt-2 border-t border-current border-opacity-20 text-sm">
                  <p className="text-gray-700">
                    <span className="font-semibold">Notes:</span> {history.performanceNotes}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
