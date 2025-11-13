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
          This student hasn't taken any courses yet.
        </p>
      </Card>
    );
  }

  const completedCount = courseHistory.filter((c) => c.completionStatus === 'completed').length;
  const inProgressCount = courseHistory.filter((c) => c.completionStatus === 'in-progress').length;
  const droppedCount = courseHistory.filter((c) => c.completionStatus === 'dropped').length;

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
          <div className="text-center">
            <p className="font-bold text-red-600">{droppedCount}</p>
            <p className="text-gray-600 text-xs">Dropped</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {courseHistory.map((history) => {
          const statusColor =
            history.completionStatus === 'completed'
              ? 'bg-green-50 border-green-200'
              : history.completionStatus === 'in-progress'
              ? 'bg-blue-50 border-blue-200'
              : 'bg-red-50 border-red-200';

          const statusBadgeColor =
            history.completionStatus === 'completed'
              ? 'bg-green-200 text-green-800'
              : history.completionStatus === 'in-progress'
              ? 'bg-blue-200 text-blue-800'
              : 'bg-red-200 text-red-800';

          const statusLabel =
            history.completionStatus === 'completed'
              ? 'Completed'
              : history.completionStatus === 'in-progress'
              ? 'In Progress'
              : 'Dropped';

          return (
            <div key={history.id} className={`p-4 rounded-lg border ${statusColor}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{getCourseName(history.courseId)}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {history.programName && `${history.programName}`}
                    {history.programName && history.batch && ' • '}
                    {history.batch && `Batch ${history.batch}`}
                    {history.year && ` • ${history.year}`}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${statusBadgeColor}`}>
                  {statusLabel}
                </span>
              </div>

              {/* Optional dates and notes */}
              {(history.startDate || history.endDate || history.performanceNotes) && (
                <div className="mt-3 pt-3 border-t border-current border-opacity-20 space-y-1 text-sm">
                  {history.startDate && (
                    <p className="text-gray-600">
                      <span className="font-semibold">Started:</span>{' '}
                      {new Date(history.startDate).toLocaleDateString()}
                    </p>
                  )}
                  {history.endDate && (
                    <p className="text-gray-600">
                      <span className="font-semibold">Ended:</span>{' '}
                      {new Date(history.endDate).toLocaleDateString()}
                    </p>
                  )}
                  {history.performanceNotes && (
                    <p className="text-gray-700">
                      <span className="font-semibold">Notes:</span> {history.performanceNotes}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
