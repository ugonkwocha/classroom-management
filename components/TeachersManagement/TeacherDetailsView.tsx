'use client';

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
  // Get all classes assigned to this teacher
  const assignedClasses = classes.filter((cls) => cls.teacherId === teacher.id);

  // Get teacher's qualified courses
  const qualifiedCourses = courses.filter((c) => teacher.qualifiedCourses.includes(c.id));

  // Group classes by program
  const classesByProgram = programs.map((program) => ({
    program,
    classes: assignedClasses.filter((cls) => cls.programId === program.id),
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

      {/* Qualifications */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Qualified Courses ({qualifiedCourses.length})
        </h2>
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

      {/* Assignments by Program */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Class Assignments ({assignedClasses.length})
        </h2>

        {assignedClasses.length === 0 ? (
          <p className="text-gray-500 text-sm">No classes assigned yet</p>
        ) : (
          <div className="space-y-4">
            {classesByProgram.map(({ program, classes: programClasses }) => {
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

      {/* Action Button */}
      <div className="pt-4 border-t border-gray-200">
        <Button variant="outline" className="w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
