'use client';

import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { useClasses, usePrograms } from '@/lib/hooks';
import { migrateClassNamesToNewFormat, MigrationResult } from '@/lib/migrateClasses';

export function ClassNameMigration() {
  const { classes, updateClass } = useClasses();
  const { programs } = usePrograms();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleMigrate = async () => {
    setIsRunning(true);
    try {
      const { updatedClasses, result: migrationResult } = migrateClassNamesToNewFormat(classes, programs);

      // Update all classes with new names
      updatedClasses.forEach((updatedClass) => {
        if (updatedClass.name !== classes.find(c => c.id === updatedClass.id)?.name) {
          updateClass(updatedClass.id, { name: updatedClass.name });
        }
      });

      setResult(migrationResult);
    } catch (error) {
      console.error('Migration error:', error);
      setResult({
        successful: 0,
        failed: classes.length,
        skipped: 0,
        errors: [{
          classId: '',
          className: '',
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }],
      });
    } finally {
      setIsRunning(false);
    }
  };

  const needsMigration = classes.some(c => {
    const longDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return longDays.some(day => c.name.includes(` - ${day}`));
  });

  if (!needsMigration && !result) {
    return null;
  }

  return (
    <Card className="border-l-4 border-blue-500 bg-blue-50">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Update Class Names</h3>
          <p className="text-sm text-gray-600 mb-3">
            Update existing class names to the new format with abbreviated months and days.
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Example: "Scratch 101 - January - Batch 1 - Saturday 10am-12pm-A" → "Scratch 101 - Jan 2026 - Batch 1 - Sat 10am-12pm-A"
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleMigrate}
          disabled={isRunning || !needsMigration}
          className="whitespace-nowrap"
        >
          {isRunning ? 'Migrating...' : 'Migrate Names'}
        </Button>
      </div>

      {result && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{result.successful}</p>
              <p className="text-xs text-gray-600">Updated</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">{result.skipped}</p>
              <p className="text-xs text-gray-600">Already Updated</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{result.failed}</p>
              <p className="text-xs text-gray-600">Failed</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showDetails ? 'Hide' : 'Show'} Error Details ({result.errors.length})
              </button>
              {showDetails && (
                <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                  {result.errors.map((error, idx) => (
                    <div key={idx} className="text-xs bg-white p-2 rounded border border-red-200">
                      <p className="font-medium text-gray-900">{error.className || error.classId}</p>
                      <p className="text-red-700">{error.error}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
