'use client';

import { useState, useMemo } from 'react';
import { Program, Class } from '@/types';
import { Badge, Button } from '@/components/ui';
import { useClasses, useStudents } from '@/lib/hooks';

interface ProgramDetailsViewProps {
  program: Program;
  onClose: () => void;
}

export function ProgramDetailsView({ program, onClose }: ProgramDetailsViewProps) {
  const { classes } = useClasses();
  const { students } = useStudents();
  const [filter, setFilter] = useState('');

  // Get all classes for this program
  const programClasses = useMemo(() => {
    return classes.filter((cls) => cls.programId === program.id);
  }, [classes, program.id]);

  // Filter classes based on search
  const filteredClasses = useMemo(() => {
    return programClasses.filter((cls) =>
      cls.name.toLowerCase().includes(filter.toLowerCase()) ||
      cls.teacher.toLowerCase().includes(filter.toLowerCase()) ||
      cls.programLevel.toLowerCase().includes(filter.toLowerCase())
    );
  }, [programClasses, filter]);

  // Calculate statistics
  const stats = useMemo(() => {
    let totalCapacity = 0;
    let totalEnrolled = 0;

    programClasses.forEach((cls) => {
      const classStudents = students.filter((s) => s.classId === cls.id);
      totalCapacity += cls.capacity;
      totalEnrolled += Math.min(classStudents.length, cls.capacity);
    });

    return {
      totalClasses: programClasses.length,
      totalCapacity,
      totalEnrolled,
      utilizationPercentage: totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0,
    };
  }, [programClasses, students]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{program.name} - {program.year}</h2>
          <div className="flex gap-2 mt-2">
            <Badge variant="primary">{program.season}</Badge>
            <Badge variant="info">{program.type === 'WeekendClub' ? 'Weekend Club' : 'Holiday Camp'}</Badge>
            <Badge variant="success">{program.batches} Batch{program.batches > 1 ? 'es' : ''}</Badge>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 font-semibold text-lg"
        >
          ✕
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-600 font-semibold">Total Classes</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{stats.totalClasses}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs text-green-600 font-semibold">Total Capacity</p>
          <p className="text-2xl font-bold text-green-900 mt-1">{stats.totalCapacity}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <p className="text-xs text-purple-600 font-semibold">Enrolled</p>
          <p className="text-2xl font-bold text-purple-900 mt-1">{stats.totalEnrolled}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-xs text-orange-600 font-semibold">Utilization</p>
          <p className="text-2xl font-bold text-orange-900 mt-1">{stats.utilizationPercentage}%</p>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search classes by name, teacher, or level..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
      />

      {/* Classes List */}
      {filteredClasses.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500 text-lg">
            {programClasses.length === 0 ? 'No classes created for this program yet.' : 'No classes match your search.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClasses.map((classData) => {
            const classStudents = students.filter((s) => s.classId === classData.id);
            const enrolledCount = Math.min(classStudents.length, classData.capacity);
            const availableSlots = classData.capacity - enrolledCount;
            const utilizationPercent = (enrolledCount / classData.capacity) * 100;

            return (
              <div
                key={classData.id}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{classData.name}</h3>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="primary">{classData.programLevel}</Badge>
                      <Badge variant="info">Batch {classData.batch}</Badge>
                      <Badge variant="success">{classData.teacher}</Badge>
                    </div>
                  </div>
                </div>

                {/* Enrollment Progress */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">{enrolledCount}</span>/{classData.capacity} students
                      {availableSlots > 0 && <span className="text-green-600 ml-2">({availableSlots} available)</span>}
                      {availableSlots === 0 && <span className="text-red-600 ml-2">(Full)</span>}
                    </p>
                    <p className="text-xs text-gray-500">{Math.round(utilizationPercent)}%</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        utilizationPercent < 50
                          ? 'bg-green-500'
                          : utilizationPercent < 80
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Time Slot */}
                <p className="text-xs text-gray-600 mb-3">
                  <span className="font-semibold">Slot:</span> {classData.slot}
                </p>

                {/* Student List */}
                {classStudents.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Enrolled Students:</p>
                    <div className="flex flex-wrap gap-2">
                      {classStudents.map((student) => (
                        <span
                          key={student.id}
                          className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded"
                        >
                          {student.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
