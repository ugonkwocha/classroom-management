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
      <div className="pb-4 border-b border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
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
            <p className="text-gray-600">Email</p>
            <p className="font-medium text-gray-900">{teacher.email}</p>
          </div>
          <div>
            <p className="text-gray-600">Phone</p>
            <p className="font-medium text-gray-900">{teacher.phone}</p>
          </div>
        </div>

        {teacher.bio && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">{teacher.bio}</p>
          </div>
        )}
      </div>

      {/* Current Assignments by Program */}
      <div className="border rounded-lg">
        <button
          onClick={() => toggleSection('currentAssignments')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            Current Class Assignments ({currentAssignedClasses.length})
          </h2>
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform ${
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
          <div className="px-4 pb-4 border-t pt-4">
            {currentAssignedClasses.length === 0 ? (
              <p className="text-gray-500 text-sm">No active classes assigned</p>
            ) : (
              <div className="space-y-4">
            {currentClassesByProgram.map(({ program, classes: programClasses }) => {
              if (programClasses.length === 0) return null;

              return (
                <div key={program.id}>
                  <h3 className="font-medium text-gray-900 mb-2">
                    {program.name} - {program.year}
                  </h3>
                  <div className="space-y-2 ml-4">
                    {programClasses.map((cls) => {
                      const course = courses.find((c) => c.id === cls.courseId);
                      return (
                        <div
                          key={cls.id}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{cls.name}</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                            <div>
                              <p className="text-gray-600">Course</p>
                              <p className="text-gray-900 font-medium">{course?.name}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Schedule</p>
                              <p className="text-gray-900 font-medium">Batch {cls.batch} - {cls.slot}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Level</p>
                              <p className="text-gray-900 font-medium">{cls.programLevel}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Enrollment</p>
                              <p className="text-gray-900 font-medium">
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
        <div className="border rounded-lg">
          <button
            onClick={() => toggleSection('pastAssignments')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-lg font-semibold text-gray-900">
              Past Class Assignments ({pastAssignedClasses.length})
            </h2>
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${
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
            <div className="px-4 pb-4 border-t pt-4">
              <div className="space-y-4">
            {pastClassesByProgram.map(({ program, classes: programClasses }) => {
              if (programClasses.length === 0) return null;

              return (
                <div key={program.id}>
                  <h3 className="font-medium text-gray-900 mb-2">
                    {program.name} - {program.year}
                  </h3>
                  <div className="space-y-2 ml-4">
                    {programClasses.map((cls) => {
                      const course = courses.find((c) => c.id === cls.courseId);
                      return (
                        <div
                          key={cls.id}
                          className="p-3 bg-gray-100 rounded-lg border border-gray-300 opacity-75"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-gray-700">{cls.name}</h4>
                            <Badge variant="warning" className="text-xs">Archived</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                            <div>
                              <p className="text-gray-600">Course</p>
                              <p className="text-gray-900 font-medium">{course?.name}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Schedule</p>
                              <p className="text-gray-900 font-medium">Batch {cls.batch} - {cls.slot}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Level</p>
                              <p className="text-gray-900 font-medium">{cls.programLevel}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Last Enrollment</p>
                              <p className="text-gray-900 font-medium">
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
      <div className="border rounded-lg">
        <button
          onClick={() => toggleSection('qualifications')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            Qualified Courses ({qualifiedCourses.length})
          </h2>
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform ${
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
          <div className="px-4 pb-4 border-t pt-4">
            {qualifiedCourses.length === 0 ? (
              <p className="text-gray-500 text-sm">No course qualifications</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
            {qualifiedCourses.map((course) => (
              <div key={course.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900">{course.name}</h3>
                <p className="text-xs text-gray-600 mt-1">{course.description}</p>
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
      <div className="pt-4 border-t border-gray-200">
        <Button variant="outline" className="w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
