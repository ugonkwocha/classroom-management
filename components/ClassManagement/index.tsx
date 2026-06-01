'use client';

import { useEffect, useState } from 'react';
import { useClasses, useStudents, useTeachers, usePrograms, useCourses, useProgramLevelSettings } from '@/lib/hooks';
import { useAuth } from '@/lib/hooks/useAuth';
import { Class } from '@/types';
import { Modal, Button } from '@/components/ui';
import { PERMISSIONS } from '@/lib/permissions';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { ClassForm } from './ClassForm';
import { ClassNameMigration } from './ClassNameMigration';
import { ClassStudentsModal } from './ClassStudentsModal';
import {
  FiArchive,
  FiCalendar,
  FiCopy,
  FiEdit3,
  FiEye,
  FiLink,
  FiMoreVertical,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUserCheck,
  FiUsers,
  FiZap,
} from 'react-icons/fi';
import { generateClassNameWithNextSuffix } from '@/lib/utils';
import { getProgramLevelLabel } from '@/lib/program-levels';

export function ClassManagement() {
  const { classes, isLoaded, addClass, updateClass, deleteClass } = useClasses();
  const { students, updateStudent } = useStudents();
  const { teachers } = useTeachers();
  const { programs } = usePrograms();
  const { courses } = useCourses();
  const { settings } = useProgramLevelSettings();
  const { hasPermission, user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<Class | undefined>();
  const [editingClass, setEditingClass] = useState<Class | undefined>();
  const [duplicatingClass, setDuplicatingClass] = useState<Class | undefined>();
  const [filter, setFilter] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | undefined>();
  const [archiveConfirmationClass, setArchiveConfirmationClass] = useState<Class | undefined>();
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

  const canCreate = hasPermission(PERMISSIONS.CREATE_CLASS);
  const canEdit = hasPermission(PERMISSIONS.UPDATE_CLASS);
  const canDelete = hasPermission(PERMISSIONS.DELETE_CLASS);
  const canDuplicate = canCreate && (user?.role === 'ADMIN' || user?.role === 'SUPERADMIN');

  const filteredClasses = classes.filter((cls) => {
    const program = programs.find((p) => p.id === cls.programId);
    const teacher = teachers.find((t) => t.id === cls.teacherId);
    const matchesFilter =
      cls.name.toLowerCase().includes(filter.toLowerCase()) ||
      cls.programLevel.toLowerCase().includes(filter.toLowerCase()) ||
      getProgramLevelLabel(settings, cls.programLevel).toLowerCase().includes(filter.toLowerCase()) ||
      (program?.name.toLowerCase() || '').includes(filter.toLowerCase()) ||
      (`${teacher?.firstName || ''} ${teacher?.lastName || ''}`.toLowerCase()).includes(filter.toLowerCase());
    const matchesArchiveStatus = showArchived ? cls.isArchived : !cls.isArchived;
    return matchesFilter && matchesArchiveStatus;
  });

  const activeClasses = classes.filter((cls) => !cls.isArchived);
  const archivedClasses = classes.filter((cls) => cls.isArchived);
  const totalCapacity = activeClasses.reduce((sum, cls) => sum + cls.capacity, 0);

  const getClassStudentCount = (classId: string) =>
    students.filter((student) =>
      student.programEnrollments?.some((enrollment) => enrollment.classId === classId && enrollment.status === 'ASSIGNED')
    ).length;

  const assignedSlots = activeClasses.reduce((sum, cls) => sum + Math.min(getClassStudentCount(cls.id), cls.capacity), 0);
  const availableSlots = Math.max(totalCapacity - assignedSlots, 0);

  const getClassStatus = (classData: Class, studentCount: number) => {
    if (classData.isArchived) return 'Archived';
    if (studentCount >= classData.capacity) return 'Full';
    if (!classData.teacherId || !classData.meetLink) return 'Pending';
    if (studentCount > 0) return 'Active';
    return 'Ready';
  };

  const statusStyles: Record<string, string> = {
    Active: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    Ready: 'border-blue-100 bg-blue-50 text-blue-700',
    Full: 'border-rose-100 bg-rose-50 text-rose-700',
    Pending: 'border-amber-100 bg-amber-50 text-amber-700',
    Archived: 'border-slate-200 bg-slate-100 text-slate-600',
  };

  useEffect(() => {
    if (!openActionMenuId) return;

    const closeMenu = () => setOpenActionMenuId(undefined);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [openActionMenuId]);

  const sendTeacherAssignmentEmail = async (classId: string) => {
    try {
      const response = await fetchWithAuth('/api/emails/send-teacher-assignment', {
        method: 'POST',
        body: JSON.stringify({ classId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.warn('[Email] Failed to send tutor assignment email:', data.error || response.statusText);
      }
    } catch (error) {
      console.error('[Email] Error sending tutor assignment email:', error);
    }
  };

  const handleSubmit = async (classData: Omit<Class, 'id' | 'createdAt'>) => {
    try {
      const shouldEmailTeacher =
        !!classData.teacherId &&
        (!editingClass ||
          editingClass.teacherId !== classData.teacherId ||
          (editingClass.meetLink || '') !== (classData.meetLink || ''));

      const savedClass = editingClass
        ? await updateClass(editingClass.id, classData)
        : await addClass(classData);

      if (shouldEmailTeacher && savedClass?.id) {
        await sendTeacherAssignmentEmail(savedClass.id);
      }

      setEditingClass(undefined);
      setDuplicatingClass(undefined);
      setIsModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save class';
      console.error('Error saving class:', error);
      alert(message);
    }
  };

  const handleEdit = (classData: Class) => {
    setDuplicatingClass(undefined);
    setEditingClass(classData);
    setIsModalOpen(true);
  };

  const handleDuplicate = (classData: Class) => {
    setEditingClass(undefined);
    setDuplicatingClass({
      ...classData,
      teacherId: undefined,
      meetLink: undefined,
      students: [],
      isArchived: false,
    });
    setIsModalOpen(true);
  };

  const handleQuickDuplicate = async (classData: Class) => {
    const course = classData.course || courses.find((c) => c.id === classData.courseId);
    const program = classData.program || programs.find((p) => p.id === classData.programId);

    if (!course || !program) {
      alert('This class cannot be duplicated until its course and program data are available.');
      return;
    }

    try {
      await addClass({
        name: generateClassNameWithNextSuffix({
          courseName: course.name,
          season: program.season,
          year: program.year,
          batch: String(classData.batch),
          slot: classData.slot,
          classes,
        }),
        courseId: classData.courseId,
        programId: classData.programId,
        programLevel: classData.programLevel,
        batch: classData.batch,
        slot: classData.slot,
        schedule: classData.slot,
        teacherId: undefined,
        meetLink: undefined,
        students: [],
        capacity: classData.capacity,
        isArchived: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to duplicate class';
      console.error('Error duplicating class:', error);
      alert(message);
    }
  };

  const handleViewStudents = (classData: Class) => {
    setSelectedClassForStudents(classData);
    setIsStudentsModalOpen(true);
  };

  const handleCloseStudentsModal = () => {
    setIsStudentsModalOpen(false);
    setSelectedClassForStudents(undefined);
  };

  const handleArchiveClass = (id: string) => {
    const classToArchive = classes.find((c) => c.id === id);
    if (classToArchive) {
      setArchiveConfirmationClass(classToArchive);
      setIsArchiveConfirmOpen(true);
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveConfirmationClass) return;

    try {
      // Get all students enrolled in this class
      const enrolledStudents = students.filter((student) =>
        student.programEnrollments && student.programEnrollments.some((enrollment) => enrollment.classId === archiveConfirmationClass.id)
      );

      console.log(`[handleConfirmArchive] Archiving class ${archiveConfirmationClass.name} with ${enrolledStudents.length} students`);

      // For each student, mark the course as completed in their course history
      for (const student of enrolledStudents) {
        if (!student.programEnrollments) continue;

        // Find the enrollment for this class
        const enrollment = student.programEnrollments.find((e) => e.classId === archiveConfirmationClass.id);
        if (!enrollment) continue;

        console.log(`[handleConfirmArchive] Processing student ${student.id} with enrollment:`, enrollment);

        // Find program data for this enrollment
        const program = programs.find((p) => p.id === enrollment.programId);

        // Update course history: mark as COMPLETED if IN_PROGRESS, or create entry if doesn't exist
        let updatedCourseHistory = (student.courseHistory || []).slice(); // Clone the array

        // Check if this course already exists in history
        const existingCourseHistoryIndex = updatedCourseHistory.findIndex(
          (history) => history.courseId === archiveConfirmationClass.courseId
        );

        if (existingCourseHistoryIndex >= 0) {
          // Update existing entry only if it's IN_PROGRESS (don't overwrite COMPLETED entries)
          const existingHistory = updatedCourseHistory[existingCourseHistoryIndex];
          if (existingHistory.completionStatus === 'IN_PROGRESS') {
            console.log(`[handleConfirmArchive] Marking existing course history as COMPLETED for student ${student.id}`);
            updatedCourseHistory[existingCourseHistoryIndex] = {
              ...existingHistory,
              completionStatus: 'COMPLETED' as const,
              endDate: new Date().toISOString(),
            };
          } else {
            console.log(`[handleConfirmArchive] Course history already ${existingHistory.completionStatus}, skipping update`);
          }
        } else {
          // Create new course history entry as COMPLETED
          console.log(`[handleConfirmArchive] Creating new course history entry as COMPLETED for student ${student.id}`);
          const newCourseHistory = {
            id: Math.random().toString(36).substr(2, 9),
            courseId: archiveConfirmationClass.courseId,
            courseName: archiveConfirmationClass.name,
            programId: program?.id || '',
            programName: program?.name || '',
            batch: enrollment.batchNumber || 1,
            year: program?.year,
            completionStatus: 'COMPLETED' as const,
            startDate: enrollment.enrollmentDate || new Date().toISOString(),
            endDate: new Date().toISOString(),
            dateAdded: new Date().toISOString(),
          };
          updatedCourseHistory.push(newCourseHistory);
        }

        // Remove the enrollment from the class and mark as COMPLETED
        const updatedEnrollments = student.programEnrollments.map((e) =>
          e.classId === archiveConfirmationClass.id
            ? { ...e, classId: undefined, status: 'COMPLETED' as const }
            : e
        );

        await updateStudent(student.id, {
          programEnrollments: updatedEnrollments,
          courseHistory: updatedCourseHistory,
        });
      }

      // Now archive the class
      updateClass(archiveConfirmationClass.id, { isArchived: true });

      // Close modal
      setIsArchiveConfirmOpen(false);
      setArchiveConfirmationClass(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to archive class';
      console.error('Error archiving class:', error);
      alert(`Error archiving class: ${errorMessage}`);
    }
  };

  const handleCancelArchive = () => {
    setIsArchiveConfirmOpen(false);
    setArchiveConfirmationClass(undefined);
  };

  const handleUnarchiveClass = (id: string) => {
    const classToUnarchive = classes.find((c) => c.id === id);
    if (classToUnarchive) {
      updateClass(id, { isArchived: false });
    }
  };

  const handleDelete = async (id: string) => {
    const classToDelete = classes.find((c) => c.id === id);
    if (!classToDelete) return;

    const confirmMessage = `Are you sure you want to delete this class? ${
      classToDelete.students.length > 0
        ? `${classToDelete.students.length} student(s) assigned to this class will be moved back to unassigned status.`
        : ''
    }`;

    if (window.confirm(confirmMessage)) {
      try {
        // Reassign students from deleted class back to unassigned status
        for (const studentId of classToDelete.students) {
          const student = students.find((s) => s.id === studentId);
          if (student && student.programEnrollments) {
            const updatedEnrollments = student.programEnrollments.map((enrollment) =>
              enrollment.classId === id ? { ...enrollment, classId: undefined } : enrollment
            );
            await updateStudent(studentId, { programEnrollments: updatedEnrollments });
          }
        }

        // Delete the class
        await deleteClass(id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete class';
        console.error('Error deleting class:', error);
        alert(`Error deleting class: ${errorMessage}`);
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClass(undefined);
    setDuplicatingClass(undefined);
  };

  const closeActionMenu = () => setOpenActionMenuId(undefined);

  if (!isLoaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-slate-600">Loading classes...</p>
        </div>
      </div>
    );
  }

  const classDirectoryRows = filteredClasses.map((classData) => {
    const enrolledStudents = students.filter((student) =>
      student.programEnrollments?.some((enrollment) => enrollment.classId === classData.id)
    );
    const studentCount = enrolledStudents.length;

    if (studentCount > classData.capacity) {
      const excessStudents = enrolledStudents.slice(classData.capacity);
      excessStudents.forEach((student) => {
        const updatedEnrollments = (student.programEnrollments || []).map((e) =>
          e.classId === classData.id ? { ...e, classId: undefined } : e
        );
        updateStudent(student.id, { programEnrollments: updatedEnrollments });
      });
    }

    const teacher = classData.teacherId ? teachers.find((t) => t.id === classData.teacherId) : undefined;
    const program = programs.find((p) => p.id === classData.programId);
    const safeStudentCount = Math.min(studentCount, classData.capacity);
    const utilization = classData.capacity > 0 ? Math.round((safeStudentCount / classData.capacity) * 100) : 0;
    const status = getClassStatus(classData, safeStudentCount);

    return {
      classData,
      program,
      safeStudentCount,
      status,
      teacher,
      utilization,
    };
  });

  return (
    <div className="space-y-6">
      <ClassNameMigration />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FiCalendar className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Active Classes</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{activeClasses.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <FiUsers className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Assigned Slots</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{assignedSlots}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-600">
            <FiUserCheck className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Available Slots</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{availableSlots}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <FiArchive className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Archived</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{archivedClasses.length}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">Class Directory</h2>
            <p className="mt-1 text-sm text-slate-500">{filteredClasses.length} classes shown</p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex min-w-0 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 shadow-sm md:w-80">
              <FiSearch className="mr-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search classes, programs, tutors..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-blue-600"
              />
              Show archived
            </label>
            {canCreate && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                <FiPlus className="h-4 w-4" />
                Create Class
              </button>
            )}
          </div>
        </div>

        <div className="p-5">
          {filteredClasses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <FiCalendar className="h-6 w-6" />
              </div>
              <p className="text-base font-bold text-slate-950">No classes found</p>
              <p className="mt-1 text-sm text-slate-500">Create a class or adjust your filters.</p>
            </div>
          ) : (
            <>
            <div className="divide-y divide-slate-100 min-[1800px]:hidden">
              {classDirectoryRows.map(({ classData, program, safeStudentCount, status, teacher, utilization }) => (
                <article key={classData.id} className="px-0 py-5 first:pt-0 last:pb-0">
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => handleViewStudents(classData)}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition hover:bg-blue-100"
                      aria-label={`View students in ${classData.name}`}
                    >
                      <FiCalendar className="h-5 w-5" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => handleViewStudents(classData)}
                            className="block max-w-full text-left text-base font-bold leading-6 text-slate-950 transition hover:text-blue-700"
                          >
                            <span className="break-words">{classData.name}</span>
                          </button>
                          <p className="mt-1 text-sm text-slate-500">{classData.schedule || classData.slot}</p>
                        </div>

                        <span className={`inline-flex w-fit whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[status]}`}>
                          {status}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Program</p>
                          <p className="mt-1 text-sm font-bold text-slate-800">{program ? `${program.name} ${program.year}` : 'Program missing'}</p>
                          <p className="mt-1 text-xs text-slate-500">{getProgramLevelLabel(settings, classData.programLevel)} · Batch {classData.batch}</p>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Tutor</p>
                          <p className="mt-1 text-sm font-bold text-slate-800">
                            {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unassigned'}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Students</p>
                              <p className="mt-1 text-sm font-bold text-slate-950">{safeStudentCount}/{classData.capacity}</p>
                              <p className="text-xs text-slate-500">{utilization}% utilization</p>
                            </div>
                            <div className="mt-2 h-2 w-20 rounded-full bg-slate-200">
                              <div
                                className={`h-full rounded-full ${
                                  utilization >= 100 ? 'bg-rose-500' : utilization >= 70 ? 'bg-yellow-500' : 'bg-blue-600'
                                }`}
                                style={{ width: `${Math.min(utilization, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Meeting Link</p>
                          {classData.meetLink ? (
                            <a
                              href={classData.meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                            >
                              <FiLink className="h-3.5 w-3.5 shrink-0" />
                              Meet ready
                            </a>
                          ) : (
                            <span className="mt-2 inline-flex rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                              No link
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewStudents(classData)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
                        >
                          <FiEye className="h-4 w-4" />
                          View
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleEdit(classData)}
                            disabled={classData.isArchived}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <FiEdit3 className="h-4 w-4" />
                            Edit
                          </button>
                        )}
                        {canDuplicate && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleQuickDuplicate(classData)}
                              className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 shadow-sm transition hover:bg-blue-100"
                            >
                              <FiZap className="h-4 w-4" />
                              Quick Duplicate
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicate(classData)}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
                            >
                              <FiCopy className="h-4 w-4" />
                              Duplicate
                            </button>
                          </>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() =>
                              classData.isArchived ? handleUnarchiveClass(classData.id) : handleArchiveClass(classData.id)
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 shadow-sm transition hover:bg-amber-100"
                          >
                            <FiArchive className="h-4 w-4" />
                            {classData.isArchived ? 'Restore' : 'Archive'}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(classData.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 shadow-sm transition hover:bg-rose-100"
                          >
                            <FiTrash2 className="h-4 w-4" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden min-[1800px]:block">
              <table className="w-full min-w-[1260px] table-fixed text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-400">
                    <th className="w-[28%] px-4 py-4">Class</th>
                    <th className="w-[15%] px-4 py-4">Program</th>
                    <th className="w-[12%] px-4 py-4">Tutor</th>
                    <th className="w-[14%] px-4 py-4">Students</th>
                    <th className="w-[14%] px-4 py-4">Meeting Link</th>
                    <th className="w-[9%] px-4 py-4">Status</th>
                    <th className="w-[16%] px-4 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classDirectoryRows.map(({ classData, program, safeStudentCount, status, teacher, utilization }) => (
                      <tr key={classData.id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-4 align-middle">
                          <button type="button" onClick={() => handleViewStudents(classData)} className="flex min-w-0 items-center gap-4 text-left">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                              <FiCalendar className="h-5 w-5" />
                            </span>
                            <span className="min-w-0">
                              <span className="block max-w-[24rem] whitespace-normal break-normal text-base font-bold leading-6 text-slate-950">
                                {classData.name}
                              </span>
                              <span className="mt-1 block text-xs text-slate-500">{classData.schedule || classData.slot}</span>
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <p className="font-semibold text-slate-700">{program ? `${program.name} ${program.year}` : 'Program missing'}</p>
                          <p className="mt-1 text-xs text-slate-500">{getProgramLevelLabel(settings, classData.programLevel)} · Batch {classData.batch}</p>
                        </td>
                        <td className="px-4 py-4 align-middle text-slate-600">
                          {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unassigned'}
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-bold text-slate-950">{safeStudentCount}/{classData.capacity}</p>
                              <p className="text-xs text-slate-500">{utilization}% utilization</p>
                            </div>
                            <div className="h-2 w-24 rounded-full bg-slate-200">
                              <div
                                className={`h-full rounded-full ${
                                  utilization >= 100 ? 'bg-rose-500' : utilization >= 70 ? 'bg-yellow-500' : 'bg-blue-600'
                                }`}
                                style={{ width: `${Math.min(utilization, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          {classData.meetLink ? (
                            <a
                              href={classData.meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex max-w-44 items-center gap-2 whitespace-nowrap rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                            >
                              <FiLink className="h-3.5 w-3.5 shrink-0" />
                              Meet ready
                            </a>
                          ) : (
                            <span className="inline-flex whitespace-nowrap rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                              No link
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[status]}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="relative flex justify-end">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenActionMenuId(openActionMenuId === classData.id ? undefined : classData.id);
                              }}
                              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
                              aria-expanded={openActionMenuId === classData.id}
                              aria-haspopup="menu"
                              aria-label={`Open actions for ${classData.name}`}
                            >
                              <FiMoreVertical className="h-4 w-4" />
                            </button>

                            {openActionMenuId === classData.id && (
                              <div
                                role="menu"
                                onClick={(event) => event.stopPropagation()}
                                className="absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 text-left shadow-xl"
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    closeActionMenu();
                                    handleViewStudents(classData);
                                  }}
                                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                                >
                                  <FiEye className="h-4 w-4" />
                                  View students
                                </button>

                                {canEdit && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      closeActionMenu();
                                      handleEdit(classData);
                                    }}
                                    disabled={classData.isArchived}
                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-700"
                                  >
                                    <FiEdit3 className="h-4 w-4" />
                                    Edit class
                                  </button>
                                )}

                                {canDuplicate && (
                                  <>
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        closeActionMenu();
                                        handleQuickDuplicate(classData);
                                      }}
                                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                                    >
                                      <FiZap className="h-4 w-4" />
                                      Quick duplicate
                                    </button>
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        closeActionMenu();
                                        handleDuplicate(classData);
                                      }}
                                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                                    >
                                      <FiCopy className="h-4 w-4" />
                                      Duplicate
                                    </button>
                                  </>
                                )}

                                {canEdit && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      closeActionMenu();
                                      classData.isArchived ? handleUnarchiveClass(classData.id) : handleArchiveClass(classData.id);
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                                  >
                                    <FiArchive className="h-4 w-4" />
                                    {classData.isArchived ? 'Restore class' : 'Archive class'}
                                  </button>
                                )}

                                {canDelete && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      closeActionMenu();
                                      handleDelete(classData.id);
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                                  >
                                    <FiTrash2 className="h-4 w-4" />
                                    Delete class
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      </section>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingClass ? 'Edit Class' : duplicatingClass ? 'Duplicate Class' : 'Create New Class'}
      >
        <ClassForm
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
          initialData={editingClass || duplicatingClass}
          isDuplicate={!!duplicatingClass}
        />
      </Modal>

      <Modal
        isOpen={isStudentsModalOpen}
        onClose={handleCloseStudentsModal}
        title={selectedClassForStudents ? `Students in ${selectedClassForStudents.name}` : 'Class Students'}
        size="lg"
      >
        {selectedClassForStudents && (
          <ClassStudentsModal
            classData={selectedClassForStudents}
            students={students}
            programs={programs}
          />
        )}
      </Modal>

      {/* Archive Confirmation Modal */}
      <Modal
        isOpen={isArchiveConfirmOpen}
        onClose={handleCancelArchive}
        title="Archive Class Confirmation"
      >
        {archiveConfirmationClass && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <h4 className="font-bold text-amber-900">Archive Class</h4>
                  <p className="text-sm text-amber-800 mt-1">
                    You are about to archive <span className="font-semibold">{archiveConfirmationClass.name}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-semibold text-blue-900 mb-2">What will happen:</h5>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">1.</span>
                  <span>All {students.filter((s) => s.programEnrollments?.some((e) => e.classId === archiveConfirmationClass.id)).length} student(s) currently in this class will be unassigned</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">2.</span>
                  <span>The course will be marked as <span className="font-semibold">COMPLETED</span> in their course history</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">3.</span>
                  <span>Their enrollment status will be marked as <span className="font-semibold">COMPLETED</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">4.</span>
                  <span>The class will be hidden from the class assignment menu</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">5.</span>
                  <span>You can unarchive this class later if needed</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancelArchive}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmArchive}
                className="flex-1"
              >
                Archive Class
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
