'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { Student, CourseHistory, ProgramEnrollment } from '@/types';

const fetcher = (url: string) =>
  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      // Transform API response to match TypeScript types
      // API returns 'enrollments', but our type expects 'programEnrollments'
      if (Array.isArray(data)) {
        return data.map((student: any) => ({
          ...student,
          programEnrollments: student.enrollments || [],
        }));
      }
      return data;
    });

export function useStudents() {
  const { data: students = [], isLoading, error, mutate } = useSWR<Student[]>(
    '/api/students',
    fetcher,
    { revalidateOnFocus: false } as SWRConfiguration
  );

  const isLoaded = !isLoading && !error;

  const addStudent = async (student: Omit<Student, 'id' | 'createdAt'>) => {
    console.log('[useStudents.addStudent] ENTRY: Called with student:', student);
    try {
      // Separate programEnrollments and courseHistory from student data
      const { programEnrollments, courseHistory, ...studentData } = student;
      console.log('[useStudents.addStudent] Extracted programEnrollments:', programEnrollments);
      console.log('[useStudents.addStudent] Extracted courseHistory:', courseHistory);

      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('API error:', errorData);
        throw new Error(errorData.error || `Failed to create student: ${res.status}`);
      }

      const newStudent = await res.json();

      // Create course history separately if provided
      if (courseHistory && courseHistory.length > 0) {
        for (const history of courseHistory) {
          try {
            const courseRes = await fetch('/api/course-history', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                studentId: newStudent.id,
                courseId: history.courseId,
                courseName: history.courseName,
                completionStatus: history.completionStatus,
              }),
            });

            if (!courseRes.ok) {
              const courseError = await courseRes.json();
              console.error('Failed to create course history:', courseError);
            }
          } catch (courseError) {
            console.error('Failed to create course history:', courseError);
            // Continue with other courses even if one fails
          }
        }
      }

      // Create program enrollments separately if provided
      if (programEnrollments && programEnrollments.length > 0) {
        console.log('[addStudent] Creating enrollments, count:', programEnrollments.length);
        for (let i = 0; i < programEnrollments.length; i++) {
          const enrollment = programEnrollments[i];
          try {
            const enrollmentPayload = {
              studentId: newStudent.id,
              programId: enrollment.programId,
              classId: enrollment.classId,
              batchNumber: enrollment.batchNumber,
              status: enrollment.status,
              paymentStatus: enrollment.paymentStatus,
            };
            console.log(`[addStudent] Enrollment ${i + 1}/${programEnrollments.length} - Sending payload:`, enrollmentPayload);
            const enrollRes = await fetch('/api/enrollments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(enrollmentPayload),
            });

            console.log(`[addStudent] Enrollment ${i + 1} - Response status:`, enrollRes.status);

            if (!enrollRes.ok) {
              const enrollError = await enrollRes.json();
              console.error(`[addStudent] Enrollment ${i + 1} - Failed to create enrollment - HTTP ${enrollRes.status}:`, enrollError);
              throw new Error(`Enrollment API returned ${enrollRes.status}: ${enrollError.error}`);
            } else {
              const successEnroll = await enrollRes.json();
              console.log(`[addStudent] Enrollment ${i + 1} - Successfully created enrollment:`, successEnroll.id);
            }
          } catch (enrollmentError) {
            console.error(`[addStudent] Enrollment ${i + 1} - Exception:`, enrollmentError);
            // Continue with other enrollments even if one fails
          }
        }
        console.log('[addStudent] All enrollments processed');
      } else {
        console.log('[addStudent] No enrollments to create (programEnrollments is empty or undefined)');
      }

      // Add delay to ensure database writes are committed before revalidating cache
      // Increased to 500ms to account for database transaction completion
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('[addStudent] Revalidating SWR cache after 500ms delay...');
      const revalidatedData = await mutate();
      console.log('[addStudent] Mutate returned:', revalidatedData);

      // Fetch fresh data directly to verify enrollments exist
      const freshRes = await fetch(`/api/students/${newStudent.id}`);
      const freshData = await freshRes.json();
      console.log('[addStudent] Fresh student data after enrollment creation:', {
        id: freshData.id,
        enrollmentCount: freshData.enrollments?.length || 0,
        enrollments: freshData.enrollments
      });

      return newStudent;
    } catch (error) {
      console.error('Failed to add student:', error);
      throw error;
    }
  };

  const updateStudent = async (id: string, updates: Partial<Student>) => {
    try {
      console.log('[updateStudent] ENTRY: Called with updates:', Object.keys(updates), 'hasOwnProperty courseHistory:', updates.hasOwnProperty('courseHistory'));
      // Separate programEnrollments and courseHistory from student data
      // Handle both 'programEnrollments' (from form) and 'enrollments' (from API)
      const { programEnrollments, enrollments, courseHistory, ...studentData } = updates;
      const enrollmentsToProcess = programEnrollments || enrollments;
      const hasCourseHistoryUpdate = Object.prototype.hasOwnProperty.call(updates, 'courseHistory');

      const res = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('API error:', errorData);
        throw new Error(errorData.error || `Failed to update student: ${res.status}`);
      }

      const updatedStudent = await res.json();

      // Handle course history only if it's explicitly being updated
      // Only process course history deletions if courseHistory was explicitly passed
      if (hasCourseHistoryUpdate) {
        console.log('[updateStudent] courseHistory was explicitly passed, processing it');
        const existingCourseHistory = students.find((s) => s.id === id)?.courseHistory || [];
        const existingHistoryMap = new Map(existingCourseHistory.map((h) => [h.id, h]));
        const newHistoryMap = new Map(courseHistory.map((h) => [h.id, h]));

        console.log('[updateStudent] Handling course history. Existing:', existingHistoryMap.size, 'New:', newHistoryMap.size);

        // Update existing course history entries that have been modified
        for (const [historyId, newHistory] of newHistoryMap) {
          const oldHistory = existingHistoryMap.get(historyId);
          if (oldHistory && oldHistory.completionStatus !== newHistory.completionStatus) {
            console.log('[updateStudent] Updating course history:', historyId, 'from', oldHistory.completionStatus, 'to', newHistory.completionStatus);
            try {
              const updateRes = await fetch(`/api/course-history/${historyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  completionStatus: newHistory.completionStatus,
                  endDate: newHistory.endDate,
                  performanceNotes: newHistory.performanceNotes,
                }),
              });

              if (!updateRes.ok) {
                const updateError = await updateRes.json();
                console.error('[updateStudent] Failed to update course history:', updateError);
              } else {
                console.log('[updateStudent] Successfully updated course history:', historyId);
              }
            } catch (error) {
              console.error('[updateStudent] Error updating course history:', error);
            }
          }
        }

        // Delete courses that were removed (only delete if courseHistory was explicitly passed with fewer entries)
        for (const [historyId, oldHistory] of existingHistoryMap) {
          if (!newHistoryMap.has(historyId)) {
            console.log('[updateStudent] Deleting course history:', historyId);
            try {
              await fetch(`/api/course-history/${historyId}`, { method: 'DELETE' });
            } catch (error) {
              console.error('Failed to delete course history:', error);
            }
          }
        }

        // Add new courses that don't exist in history
        for (const [historyId, history] of newHistoryMap) {
          if (!existingHistoryMap.has(historyId)) {
            console.log('[updateStudent] Creating new course history:', historyId);
            try {
              const courseRes = await fetch('/api/course-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  studentId: id,
                  courseId: history.courseId,
                  courseName: history.courseName,
                  completionStatus: history.completionStatus,
                  programId: history.programId,
                  programName: history.programName,
                  batch: history.batch,
                  year: history.year,
                  startDate: history.startDate,
                  endDate: history.endDate,
                  performanceNotes: history.performanceNotes,
                }),
              });

              if (!courseRes.ok) {
                const courseError = await courseRes.json();
                console.error('Failed to create course history:', courseError);
              } else {
                console.log('[updateStudent] Successfully created course history');
              }
            } catch (error) {
              console.error('Failed to create course history:', error);
            }
          }
        }
      }

      // Handle program enrollments if they're being updated
      if (enrollmentsToProcess) {
        // Get current student from cache to find existing enrollments
        const currentStudent = students.find((s) => s.id === id);
        // Handle both 'enrollments' and 'programEnrollments' field names
        const currentEnrollments = currentStudent?.enrollments || currentStudent?.programEnrollments || [];
        const existingEnrollmentIds = new Set(currentEnrollments.map((e) => e.id) || []);
        const newEnrollmentIds = new Set(enrollmentsToProcess.map((e) => e.id) || []);

        console.log('[updateStudent] Handling enrollments. Current enrollments:', existingEnrollmentIds.size, 'New enrollments count:', enrollmentsToProcess.length);

        // Find enrollments that were deleted
        const deletedEnrollments = currentEnrollments.filter((e) => !newEnrollmentIds.has(e.id));
        console.log('[updateStudent] Deleted enrollments:', deletedEnrollments.length);

        // Delete removed enrollments
        for (const enrollment of deletedEnrollments) {
          try {
            console.log('[updateStudent] Deleting enrollment:', enrollment.id);
            const deleteRes = await fetch(`/api/enrollments/${enrollment.id}`, {
              method: 'DELETE',
            });

            if (!deleteRes.ok) {
              const deleteError = await deleteRes.json();
              console.error('[updateStudent] Failed to delete enrollment:', deleteError);
              // Don't throw - continue with other operations
            } else {
              console.log('[updateStudent] Successfully deleted enrollment:', enrollment.id);
            }
          } catch (error) {
            console.error('[updateStudent] Error deleting enrollment:', error);
            // Don't throw - continue with other operations
          }
        }

        // Separate new enrollments from existing ones that may have been modified
        const newEnrollments = enrollmentsToProcess.filter((e) => !existingEnrollmentIds.has(e.id));
        const modifiedEnrollments = enrollmentsToProcess.filter((e) => existingEnrollmentIds.has(e.id));

        console.log('[updateStudent] New enrollments to create:', newEnrollments.length, 'Modified enrollments:', modifiedEnrollments.length);

        // Update existing enrollments that have been modified (e.g., classId added)
        for (const enrollment of modifiedEnrollments) {
          try {
            console.log('[updateStudent] Updating enrollment:', enrollment.id, 'with classId:', enrollment.classId, 'status:', enrollment.status);
            const enrollRes = await fetch(`/api/enrollments/${enrollment.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                classId: enrollment.classId,
                batchNumber: enrollment.batchNumber,
                status: enrollment.status,
                paymentStatus: enrollment.paymentStatus,
              }),
            });

            if (!enrollRes.ok) {
              const enrollError = await enrollRes.json();
              console.error('[updateStudent] Failed to update enrollment:', enrollError);
              throw new Error(enrollError.error || 'Failed to update enrollment');
            } else {
              const updatedEnroll = await enrollRes.json();
              console.log('[updateStudent] Successfully updated enrollment:', updatedEnroll.id);
            }
          } catch (enrollmentError) {
            console.error('[updateStudent] Enrollment update error:', enrollmentError);
            throw enrollmentError;
          }
        }

        // Create new enrollments
        for (const enrollment of newEnrollments) {
          try {
            console.log('[updateStudent] Creating enrollment for program:', enrollment.programId);
            const enrollRes = await fetch('/api/enrollments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                studentId: id,
                programId: enrollment.programId,
                classId: enrollment.classId,
                batchNumber: enrollment.batchNumber,
                status: enrollment.status,
                paymentStatus: enrollment.paymentStatus,
              }),
            });

            if (!enrollRes.ok) {
              const enrollError = await enrollRes.json();
              console.error('[updateStudent] Failed to create enrollment:', enrollError);
              throw new Error(enrollError.error || 'Failed to create enrollment');
            } else {
              const createdEnroll = await enrollRes.json();
              console.log('[updateStudent] Successfully created enrollment:', createdEnroll.id);
            }
          } catch (enrollmentError) {
            console.error('[updateStudent] Enrollment creation error:', enrollmentError);
            throw enrollmentError;
          }
        }
      }

      await mutate();
      return updatedStudent;
    } catch (error) {
      console.error('Failed to update student:', error);
      throw error;
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      await fetch(`/api/students/${id}`, { method: 'DELETE' });
      await mutate();
    } catch (error) {
      console.error('Failed to delete student:', error);
      throw error;
    }
  };

  const getStudent = (id: string) => {
    return students.find((student) => student.id === id);
  };

  // Course History Management
  const addCourseHistory = async (studentId: string, courseHistory: Omit<CourseHistory, 'id'>) => {
    try {
      const student = getStudent(studentId);
      if (!student) throw new Error('Student not found');

      const res = await fetch('/api/course-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseHistory),
      });
      const newHistory = await res.json();
      await mutate();
      return newHistory;
    } catch (error) {
      console.error('Failed to add course history:', error);
      throw error;
    }
  };

  const removeCourseHistory = async (studentId: string, historyId: string) => {
    try {
      await fetch(`/api/course-history/${historyId}`, { method: 'DELETE' });
      await mutate();
    } catch (error) {
      console.error('Failed to remove course history:', error);
      throw error;
    }
  };

  const updateCourseHistory = async (
    studentId: string,
    historyId: string,
    updates: Partial<CourseHistory>
  ) => {
    try {
      const res = await fetch(`/api/course-history/${historyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updatedHistory = await res.json();
      await mutate();
      return updatedHistory;
    } catch (error) {
      console.error('Failed to update course history:', error);
      throw error;
    }
  };

  // Program Enrollment Management
  const addProgramEnrollment = async (
    studentId: string,
    enrollment: Omit<ProgramEnrollment, 'id'>
  ) => {
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...enrollment, studentId }),
      });
      const newEnrollment = await res.json();
      await mutate();
      return newEnrollment;
    } catch (error) {
      console.error('Failed to add program enrollment:', error);
      throw error;
    }
  };

  const removeProgramEnrollment = async (studentId: string, enrollmentId: string) => {
    try {
      await fetch(`/api/enrollments/${enrollmentId}`, { method: 'DELETE' });
      await mutate();
    } catch (error) {
      console.error('Failed to remove program enrollment:', error);
      throw error;
    }
  };

  const updateProgramEnrollment = async (
    studentId: string,
    enrollmentId: string,
    updates: Partial<ProgramEnrollment>
  ) => {
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updatedEnrollment = await res.json();
      await mutate();
      return updatedEnrollment;
    } catch (error) {
      console.error('Failed to update program enrollment:', error);
      throw error;
    }
  };

  // Get student's enrollments for a specific program
  const getStudentEnrollmentsForProgram = (studentId: string, programId: string) => {
    const student = getStudent(studentId);
    if (!student) return [];
    return (student.programEnrollments || []).filter((e) => e.programId === programId);
  };

  // Get all students in waitlist for a specific program/batch
  const getWaitlistedStudents = (programId: string, batchNumber: number) => {
    return students.filter((student) =>
      student.programEnrollments && student.programEnrollments.some(
        (e) => e.programId === programId && e.batchNumber === batchNumber && e.status === 'WAITLIST'
      )
    );
  };

  return {
    students,
    isLoaded,
    addStudent,
    updateStudent,
    deleteStudent,
    getStudent,
    addCourseHistory,
    removeCourseHistory,
    updateCourseHistory,
    addProgramEnrollment,
    removeProgramEnrollment,
    updateProgramEnrollment,
    getStudentEnrollmentsForProgram,
    getWaitlistedStudents,
  };
}
