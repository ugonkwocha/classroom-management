'use client';

import { useState, useMemo } from 'react';
import { Program, Class } from '@/types';
import { Badge } from '@/components/ui';
import { useClasses, useStudents, useTeachers, useProgramLevelSettings } from '@/lib/hooks';
import { getProgramLevelLabel } from '@/lib/program-levels';
import { FiCalendar, FiSearch, FiUsers } from 'react-icons/fi';

interface ProgramDetailsViewProps {
  program: Program;
  onClose: () => void;
}

export function ProgramDetailsView({ program, onClose }: ProgramDetailsViewProps) {
  const { classes } = useClasses();
  const { students } = useStudents();
  const { teachers } = useTeachers();
  const { settings } = useProgramLevelSettings();
  const [filter, setFilter] = useState('');

  // Get all classes for this program
  const programClasses = useMemo(() => {
    return classes.filter((cls) => cls.programId === program.id);
  }, [classes, program.id]);

  // Filter classes based on search
  const filteredClasses = useMemo(() => {
    return programClasses.filter((cls) => {
      const teacher = cls.teacherId ? teachers.find((t) => t.id === cls.teacherId) : null;
      const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : '';
      return (
        cls.name.toLowerCase().includes(filter.toLowerCase()) ||
        teacherName.toLowerCase().includes(filter.toLowerCase()) ||
        cls.programLevel.toLowerCase().includes(filter.toLowerCase()) ||
        getProgramLevelLabel(settings, cls.programLevel).toLowerCase().includes(filter.toLowerCase())
      );
    });
  }, [programClasses, filter, teachers, settings]);

  // Calculate statistics
  const stats = useMemo(() => {
    let totalCapacity = 0;
    let totalEnrolled = 0;

    programClasses.forEach((cls) => {
      const classStudents = students.filter(
        (s) => s.programEnrollments && s.programEnrollments.some((e) => e.classId === cls.id)
      );
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
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">{program.name} - {program.year}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="primary">{program.season}</Badge>
            <Badge variant="info">{program.type === 'WEEKEND_CLUB' ? 'Weekend Club' : 'Holiday Camp'}</Badge>
            <Badge variant="success">{program.batches} Batch{program.batches > 1 ? 'es' : ''}</Badge>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-500 transition hover:text-slate-700"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total Classes</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{stats.totalClasses}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total Capacity</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{stats.totalCapacity}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Enrolled</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{stats.totalEnrolled}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Utilization</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{stats.utilizationPercentage}%</p>
        </div>
      </div>

      <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 shadow-sm">
        <FiSearch className="mr-3 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search classes by name, teacher, or level..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      {filteredClasses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <p className="text-base font-bold text-slate-950">
            {programClasses.length === 0 ? 'No classes created for this program yet.' : 'No classes match your search.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClasses.map((classData) => {
            const classStudents = students.filter(
              (s) => s.programEnrollments && s.programEnrollments.some((e) => e.classId === classData.id)
            );
            const enrolledCount = Math.min(classStudents.length, classData.capacity);
            const availableSlots = classData.capacity - enrolledCount;
            const utilizationPercent = (enrolledCount / classData.capacity) * 100;

            return (
              <div
                key={classData.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-100"
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <FiCalendar className="h-5 w-5" />
                      </span>
                      <h3 className="font-bold text-slate-950">{classData.name}</h3>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="primary">{getProgramLevelLabel(settings, classData.programLevel)}</Badge>
                      <Badge variant="info">Batch {classData.batch}</Badge>
                      <Badge variant="success">
                        {classData.teacherId
                          ? (() => {
                              const teacher = teachers.find((t) => t.id === classData.teacherId);
                              return teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unassigned';
                            })()
                          : 'Unassigned'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Enrollment Progress */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-slate-600">
                      <span className="font-semibold">{enrolledCount}</span>/{classData.capacity} students
                      {availableSlots > 0 && <span className="ml-2 text-emerald-600">({availableSlots} available)</span>}
                      {availableSlots === 0 && <span className="ml-2 text-rose-600">(Full)</span>}
                    </p>
                    <p className="text-xs text-slate-500">{Math.round(utilizationPercent)}%</p>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        utilizationPercent < 50
                          ? 'bg-emerald-500'
                          : utilizationPercent < 80
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Time Slot */}
                <p className="mb-3 text-xs text-slate-600">
                  <span className="font-semibold">Slot:</span> {classData.slot}
                </p>

                {classStudents.length > 0 && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                      <FiUsers className="h-3.5 w-3.5" />
                      Enrolled Students
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {classStudents.map((student) => (
                        <span
                          key={student.id}
                          className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"
                        >
                          {student.firstName} {student.lastName}
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
