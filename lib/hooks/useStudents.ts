'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { Student, CourseHistory, ProgramEnrollment } from '@/types';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

const fetcher = (url: string) =>
  fetchWithAuth(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      return res.json();
    })
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
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      focusThrottleInterval: 0
    } as SWRConfiguration
  );

  const isLoaded = !isLoading && !error;

  const addStudent = async (student: Omit<Student, 'id' | 'createdAt'>) => {
    console.log('[useStudents.addStudent] ENTRY: Called with student:', student);
    try {
      // Separate programEnrollments and courseHistory from student data
      const { programEnrollments, courseHistory, ...studentData } = student;
      console.log('[useStudents.addStudent] Extracted programEnrollments:', programEnrollments);
      console.log('[useStudents.addStudent] Extracted courseHistory:', courseHistory);

      const res = await fetchWithAuth('/api/students', {
        method: 'POST',
        body: JSON.stringify(studentData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('API error:', errorData);
        // Create error with both error message and details for validation errors
        const error = new Error(errorData.error || `Failed to create student: ${res.status}`);
        if (errorData.details) {
          error.message = JSON.stringify({ error: errorData.error, details: errorData.details });
        }
        throw error;
      }

      const newStudent = await res.json();

      // Create course history separately if provided
      if (courseHistory && courseHistory.length > 0) {
        for (const history of courseHistory) {
          try {
            const courseRes = await fetchWithAuth('/api/course-history', {
              method: 'POST',
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
            const enrollRes = await fetchWithAuth('/api/enrollments', {
              method: 'POST',
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
      const revalidatedData = await mutate(undefined, { revalidate: true });
      console.log('[addStudent] Mutate returned:', revalidatedData);

      // Fetch fresh data directly to verify enrollments exist
      const freshRes = await fetchWithAuth(`/api/students/${newStudent.id}`);
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

      const res = await fetchWithAuth(`/api/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(studentData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('API error:', errorData);
        // Create error with both error message and details for validation errors
        const error = new Error(errorData.error || `Failed to update student: ${res.status}`);
        if (errorData.details) {
          error.message = JSON.stringify({ error: errorData.error, details: errorData.details });
        }
        throw error;
      }

      const updatedStudent = await res.json();

      // Handle course history only if it's explicitly being updated
      // Only process course history modifications if courseHistory was explicitly passed
      if (hasCourseHistoryUpdate) {
        console.log('[updateStudent] courseHistory was explicitly passed, processing it');
        const existingCourseHistory = students.find((s) => s.id === id)?.courseHistory || [];

        // Create a map of existing courses by courseId + programId (not by ID, to avoid sync issues)
        const existingByKey = new Map<string, CourseHistory>();
        for (const history of existingCourseHistory) {
          const key = `${history.courseId}|${history.programId}`;
          existingByKey.set(key, history);
        }

        // Create a map of new courses by courseId + programId
        const newByKey = new Map<string, CourseHistory>();
        for (const history of courseHistory) {
          const key = `${history.courseId}|${history.programId}`;
          newByKey.set(key, history);
        }

        console.log('[updateStudent] Handling course history. Existing:', existingByKey.size, 'New:', newByKey.size);

        // Update existing course history entries that have been modified (by matching courseId + programId)
        for (const [key, newHistory] of newByKey) {
          const oldHistory = existingByKey.get(key);
          if (oldHistory && oldHistory.id && oldHistory.completionStatus !== newHistory.completionStatus) {
            console.log('[updateStudent] Updating course history:', oldHistory.id, 'from', oldHistory.completionStatus, 'to', newHistory.completionStatus);
            try {
              const updateRes = await fetchWithAuth(`/api/course-history/${oldHistory.id}`, {
                method: 'PUT',
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
                console.log('[updateStudent] Successfully updated course history:', oldHistory.id);
              }
            } catch (error) {
              console.error('[updateStudent] Error updating course history:', error);
            }
          }
        }

        // Delete courses that were removed (by matching courseId + programId)
        for (const [key, oldHistory] of existingByKey) {
          if (!newByKey.has(key) && oldHistory.id) {
            console.log('[updateStudent] Deleting course history:', oldHistory.id, 'Key:', key);
            try {
              await fetchWithAuth(`/api/course-history/${oldHistory.id}`, { method: 'DELETE' });
            } catch (error) {
              console.error('Failed to delete course history:', error);
            }
          }
        }

        // Add new courses that don't exist in history (by matching courseId + programId)
        for (const [key, history] of newByKey) {
          if (!existingByKey.has(key)) {
            console.log('[updateStudent] Creating new course history with key:', key);
            try {
              const courseRes = await fetchWithAuth('/api/course-history', {
                method: 'POST',
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
            const deleteRes = await fetchWithAuth(`/api/enrollments/${enrollment.id}`, {
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

        // Update existing enrollments that have been modified (e.g., classId added or removed)
        for (const enrollment of modifiedEnrollments) {
          try {
            console.log('[updateStudent] Updating enrollment:', enrollment.id, 'with classId:', enrollment.classId, 'classId is undefined:', enrollment.classId === undefined, 'status:', enrollment.status);
            const enrollRes = await fetchWithAuth(`/api/enrollments/${enrollment.id}`, {
              method: 'PUT',
              body: JSON.stringify({
                classId: enrollment.classId || null,
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
            const enrollRes = await fetchWithAuth('/api/enrollments', {
              method: 'POST',
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

      // Add delay before revalidating cache to ensure database writes are committed
      await new Promise(resolve => setTimeout(resolve, 300));

      // Revalidate SWR cache and wait for fresh data to ensure UI updates properly
      console.log('[updateStudent] Revalidating SWR cache after all operations');
      const revalidatedData = await mutate(undefined, { revalidate: true });
      console.log('[updateStudent] SWR cache revalidation complete. Revalidated data student count:', revalidatedData?.length || 0);

      return updatedStudent;
    } catch (error) {
      console.error('Failed to update student:', error);
      throw error;
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      await fetchWithAuth(`/api/students/${id}`, { method: 'DELETE' });
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

      const res = await fetchWithAuth('/api/course-history', {
        method: 'POST',
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
      await fetchWithAuth(`/api/course-history/${historyId}`, { method: 'DELETE' });
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
      const res = await fetchWithAuth(`/api/course-history/${historyId}`, {
        method: 'PUT',
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
      const res = await fetchWithAuth('/api/enrollments', {
        method: 'POST',
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
      await fetchWithAuth(`/api/enrollments/${enrollmentId}`, { method: 'DELETE' });
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
      const res = await fetchWithAuth(`/api/enrollments/${enrollmentId}`, {
        method: 'PUT',
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
