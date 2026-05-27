'use client';

import { useState } from 'react';
import { Teacher, Class, Program, Course } from '@/types';
import { Badge, Button } from '@/components/ui';

interface TeacherDetailsViewProps {
  teacher: Teacher;
  courses: Course[];
  programs: Program[];
  classes: Class[];
  onClose: () => void;
  onEdit: () => void;
}

export function TeacherDetailsView({
  teacher,
  courses,
  programs,
  classes,
  onClose,
  onEdit,
}: TeacherDetailsViewProps) {
  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    currentAssignments: true,
    pastAssignments: false,
    qualifications: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };
  // Get all classes assigned to this teacher, separated by archive status
  const allAssignedClasses = classes.filter((cls) => cls.teacherId === teacher.id);
  const currentAssignedClasses = allAssignedClasses.filter((cls) => !cls.isArchived);
  const pastAssignedClasses = allAssignedClasses.filter((cls) => cls.isArchived);

  // Get teacher's qualified courses
  const qualifiedCourses = courses.filter((c) => teacher.qualifiedCourses.includes(c.id));

  // Group current classes by program
  const currentClassesByProgram = programs.map((program) => ({
    program,
    classes: currentAssignedClasses.filter((cls) => cls.programId === program.id),
  }));

  // Group past classes by program
  const pastClassesByProgram = programs.map((program) => ({
    program,
    classes: pastAssignedClasses.filter((cls) => cls.programId === program.id),
  }));

  return (
    <div className="space-y-6">
      {/* Teacher Info Header */}
      <div className="border-b border-slate-100 pb-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">
              {teacher.firstName} {teacher.lastName}
            </h1>
            <Badge variant="success" className="mt-2">
              {teacher.status}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit Teacher
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Email</p>
            <p className="mt-1 font-medium text-slate-900">{teacher.email}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Phone</p>
            <p className="mt-1 font-medium text-slate-900">{teacher.phone}</p>
          </div>
        </div>

        {teacher.bio && (
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm leading-6 text-blue-900">{teacher.bio}</p>
          </div>
        )}
      </div>

      {/* Current Assignments by Program */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          onClick={() => toggleSection('currentAssignments')}
          className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50"
        >
          <h2 className="text-base font-bold text-slate-950">
            Current Class Assignments ({currentAssignedClasses.length})
          </h2>
          <svg
            className={`h-5 w-5 text-slate-500 transition-transform ${
              expandedSections.currentAssignments ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>

        {expandedSections.currentAssignments && (
          <div className="border-t border-slate-100 px-4 pb-4 pt-4">
            {currentAssignedClasses.length === 0 ? (
              <p className="text-sm text-slate-500">No active classes assigned</p>
            ) : (
              <div className="space-y-4">
            {currentClassesByProgram.map(({ program, classes: programClasses }) => {
              if (programClasses.length === 0) return null;

              return (
                <div key={program.id}>
                  <h3 className="mb-2 font-bold text-slate-900">
                    {program.name} - {program.year}
                  </h3>
                  <div className="space-y-2 ml-4">
                    {programClasses.map((cls) => {
                      const course = courses.find((c) => c.id === cls.courseId);
                      return (
                        <div
                          key={cls.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-bold text-slate-950">{cls.name}</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                            <div>
                              <p className="text-slate-500">Course</p>
                              <p className="font-medium text-slate-900">{course?.name}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Schedule</p>
                              <p className="font-medium text-slate-900">Batch {cls.batch} - {cls.slot}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Level</p>
                              <p className="font-medium text-slate-900">{cls.programLevel}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Enrollment</p>
                              <p className="font-medium text-slate-900">
                                {cls.students.length}/{cls.capacity}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="primary">{cls.programLevel}</Badge>
                            <Badge variant="info">Batch {cls.batch}</Badge>
                            <Badge variant="success">{cls.students.length} Students</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Past Assignments by Program */}
      {pastAssignedClasses.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <button
            onClick={() => toggleSection('pastAssignments')}
            className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50"
          >
            <h2 className="text-base font-bold text-slate-950">
              Past Class Assignments ({pastAssignedClasses.length})
            </h2>
            <svg
              className={`h-5 w-5 text-slate-500 transition-transform ${
                expandedSections.pastAssignments ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>

          {expandedSections.pastAssignments && (
            <div className="border-t border-slate-100 px-4 pb-4 pt-4">
              <div className="space-y-4">
            {pastClassesByProgram.map(({ program, classes: programClasses }) => {
              if (programClasses.length === 0) return null;

              return (
                <div key={program.id}>
                  <h3 className="mb-2 font-bold text-slate-900">
                    {program.name} - {program.year}
                  </h3>
                  <div className="space-y-2 ml-4">
                    {programClasses.map((cls) => {
                      const course = courses.find((c) => c.id === cls.courseId);
                      return (
                        <div
                          key={cls.id}
                          className="rounded-2xl border border-slate-200 bg-slate-100 p-3 opacity-75"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-bold text-slate-700">{cls.name}</h4>
                            <Badge variant="warning" className="text-xs">Archived</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                            <div>
                              <p className="text-slate-500">Course</p>
                              <p className="font-medium text-slate-900">{course?.name}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Schedule</p>
                              <p className="font-medium text-slate-900">Batch {cls.batch} - {cls.slot}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Level</p>
                              <p className="font-medium text-slate-900">{cls.programLevel}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Last Enrollment</p>
                              <p className="font-medium text-slate-900">
                                {cls.students.length}/{cls.capacity}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="primary">{cls.programLevel}</Badge>
                            <Badge variant="info">Batch {cls.batch}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Qualifications */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          onClick={() => toggleSection('qualifications')}
          className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50"
        >
          <h2 className="text-base font-bold text-slate-950">
            Qualified Courses ({qualifiedCourses.length})
          </h2>
          <svg
            className={`h-5 w-5 text-slate-500 transition-transform ${
              expandedSections.qualifications ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>

        {expandedSections.qualifications && (
          <div className="border-t border-slate-100 px-4 pb-4 pt-4">
            {qualifiedCourses.length === 0 ? (
              <p className="text-sm text-slate-500">No course qualifications</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
            {qualifiedCourses.map((course) => (
              <div key={course.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <h3 className="font-bold text-slate-950">{course.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{course.description}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {course.programLevels.map((level) => (
                    <Badge key={level} variant="info" className="text-xs">
                      {level}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="border-t border-slate-100 pt-4">
        <Button variant="outline" className="w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
