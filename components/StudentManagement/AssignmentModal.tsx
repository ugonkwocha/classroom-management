'use client';

import { useState } from 'react';
import { Program, Class, CourseHistory, ProgramEnrollment } from '@/types';
import { Button } from '@/components/ui';

interface AssignmentModalProps {
  studentId: string;
  studentName: string;
  programs: Program[];
  classes: Class[];
  students: any[]; // List of all students to calculate class enrollment accurately
  assignedClassIds: string[]; // Track which classes student is already in
  courseHistory: CourseHistory[];
  studentProgramEnrollments: ProgramEnrollment[]; // Program enrollments to check payment status
  onAssign: (studentId: string, programId: string, classId: string) => void;
  onAddToWaitlist?: (studentId: string, programId: string) => void;
  onCancel: () => void;
}

export function AssignmentModal({
  studentId,
  studentName,
  programs,
  classes,
  students,
  assignedClassIds,
  courseHistory,
  studentProgramEnrollments,
  onAssign,
  onAddToWaitlist,
  onCancel,
}: AssignmentModalProps) {
  const [mode, setMode] = useState<'choice' | 'assign' | 'waitlist'>('choice');
  const [step, setStep] = useState<'program' | 'payment' | 'class'>('program');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [showCourseWarning, setShowCourseWarning] = useState(false);
  const [takenCourseNames, setTakenCourseNames] = useState<string[]>([]);

  // Filter classes by selected program
  const programClasses = selectedProgram
    ? classes.filter((cls) => cls.programId === selectedProgram)
    : [];

  // Check if selected program has confirmed payment
  const selectedProgramEnrollment = studentProgramEnrollments.find(
    (e) => e.programId === selectedProgram
  );
  const isPaymentConfirmed = selectedProgramEnrollment?.paymentStatus === 'CONFIRMED';

  const handleProgramSelect = (programId: string) => {
    setSelectedProgram(programId);
    setStep('payment'); // Move to payment confirmation step instead of directly to class selection
    setSelectedClass(''); // Reset class selection when program changes
  };

  const handlePaymentConfirmed = () => {
    // Proceed to class selection after confirming payment
    setStep('class');
  };

  const handleAssign = () => {
    if (selectedProgram && selectedClass) {
      // Check if payment is confirmed for this program
      // Note: This assumes programEnrollments are passed via props or accessed from student data
      // The actual payment check will be done at the StudentDetailsView level

      // Check if student has taken the course in this class before
      const selectedClassData = classes.find((c) => c.id === selectedClass);
      if (selectedClassData) {
        const previouslyCourses = courseHistory
          .filter((h) => h.courseId === selectedClassData.courseId)
          .map((h) => h.courseName);

        if (previouslyCourses.length > 0) {
          setTakenCourseNames(previouslyCourses);
          setShowCourseWarning(true);
          return;
        }
      }

      // If no previous courses, proceed with assignment
      onAssign(studentId, selectedProgram, selectedClass);
      onCancel();
    }
  };

  const handleConfirmReassignment = () => {
    if (selectedProgram && selectedClass) {
      onAssign(studentId, selectedProgram, selectedClass);
      setShowCourseWarning(false);
      onCancel();
    }
  };

  const handleBack = () => {
    if (step === 'payment') {
      setStep('program');
      setSelectedProgram('');
      setSelectedClass('');
    } else if (step === 'class') {
      setStep('payment');
      setSelectedClass('');
    }
  };

  const handleAssignModeBack = () => {
    setMode('choice');
    setStep('program');
    setSelectedProgram('');
    setSelectedClass('');
  };

  if (showCourseWarning) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 mb-2">Course History Alert</h4>
          <p className="text-sm text-yellow-800 mb-3">
            <span className="font-semibold">{studentName}</span> has previously taken:
          </p>
          <ul className="space-y-1 mb-4">
            {takenCourseNames.map((courseName, index) => (
              <li key={index} className="text-sm text-yellow-800 flex items-start">
                <span className="mr-2">•</span>
                <span>{courseName}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-yellow-800">
            Would you like to reassign them to this course?
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowCourseWarning(false)}
            className="flex-1"
          >
            Cancel Assignment
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmReassignment}
            className="flex-1"
          >
            Confirm Reassignment
          </Button>
        </div>
      </div>
    );
  }

  // Handle choice mode
  if (mode === 'choice') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">How would you like to enroll {studentName}?</h3>
          <p className="text-sm text-gray-600 mb-6">
            Choose to assign them to a class directly, or add them to the waitlist if classes are full.
          </p>
        </div>

        <div className="space-y-3">
          {/* Assign to Class Option */}
          <button
            onClick={() => {
              setMode('assign');
              setStep('program');
            }}
            className="w-full p-4 text-left border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">📚</div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Assign to Class</p>
                <p className="text-sm text-gray-600 mt-1">
                  Enroll student directly in an available class with course history tracking.
                </p>
              </div>
            </div>
          </button>

          {/* Waitlist Option */}
          <button
            onClick={() => setMode('waitlist')}
            className="w-full p-4 text-left border-2 border-gray-300 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">⏳</div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Add to Waitlist</p>
                <p className="text-sm text-gray-600 mt-1">
                  Add student to waitlist for a program. Promote to class when spots become available.
                </p>
              </div>
            </div>
          </button>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Handle waitlist mode
  if (mode === 'waitlist') {
    const enrolledProgramIds = studentProgramEnrollments.map((e) => e.programId);
    const availablePrograms = programs.filter(
      (p) => !enrolledProgramIds.includes(p.id)
    );

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Add to Waitlist</h3>
          <p className="text-sm text-gray-600">
            Select a program to add <span className="font-semibold">{studentName}</span> to the waitlist.
          </p>
        </div>

        {availablePrograms.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              This student is already enrolled in all available programs.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availablePrograms.map((program) => (
              <button
                key={program.id}
                onClick={() => {
                  if (onAddToWaitlist) {
                    onAddToWaitlist(studentId, program.id);
                    onCancel();
                  }
                }}
                className="w-full p-3 text-left border border-gray-300 rounded-lg hover:bg-amber-50 hover:border-amber-500 transition-colors"
              >
                <p className="font-semibold text-gray-900">
                  {program.name} - {program.season} {program.year}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Type: {program.type} | Batches: {program.batches}
                </p>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => setMode('choice')}
            className="flex-1"
          >
            Back
          </Button>
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Handle assign mode
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Assign Student to Program and Class</h3>
        <p className="text-sm text-gray-600">
          Assigning: <span className="font-semibold">{studentName}</span>
        </p>
      </div>

      {step === 'program' ? (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Step 1: Select a Program</h4>
          {programs.length === 0 ? (
            <p className="text-gray-500 text-sm">No programs available. Please create a program first.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {programs.map((program) => (
                <button
                  key={program.id}
                  onClick={() => handleProgramSelect(program.id)}
                  className="w-full p-3 text-left border border-gray-300 rounded-lg hover:bg-purple-50 hover:border-purple-500 transition-colors"
                >
                  <p className="font-semibold text-gray-900">
                    {program.name} - {program.season} {program.year}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Type: {program.type} | Batches: {program.batches}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : step === 'payment' ? (
        <div className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Selected Program:</span>{' '}
              {programs.find((p) => p.id === selectedProgram)?.name}
            </p>
          </div>

          <h4 className="font-semibold text-gray-900">Step 2: Confirm Payment Status</h4>
          <div className={`p-4 rounded-lg border-2 ${
            isPaymentConfirmed
              ? 'border-green-300 bg-green-50'
              : 'border-amber-300 bg-amber-50'
          }`}>
            <p className="text-sm font-semibold mb-3">
              Payment Status for {programs.find((p) => p.id === selectedProgram)?.name}
            </p>
            <p className={`text-sm font-semibold ${
              isPaymentConfirmed
                ? 'text-green-700'
                : 'text-amber-700'
            }`}>
              {isPaymentConfirmed
                ? '✓ Payment Confirmed'
                : '⚠ Payment Not Confirmed'}
            </p>
            {!isPaymentConfirmed && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-amber-700">
                  Payment status for this program has not been confirmed. Please update the payment status before proceeding.
                </p>
                <p className="text-xs text-amber-700 font-semibold">
                  To confirm payment:
                </p>
                <ol className="text-xs text-amber-700 list-decimal list-inside space-y-1">
                  <li>Close this modal by clicking "Cancel"</li>
                  <li>Go to the "Program Payment Status" section below</li>
                  <li>Click "Edit" next to the program</li>
                  <li>Change the status to "Confirmed - Payment Verified"</li>
                  <li>Click "Save" and try assigning again</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Selected Program:</span>{' '}
              {programs.find((p) => p.id === selectedProgram)?.name}
            </p>
          </div>

          <h4 className="font-semibold text-gray-900">Step 3: Select a Class</h4>
          {programClasses.length === 0 ? (
            <p className="text-gray-500 text-sm">No classes available for this program.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {programClasses.map((cls) => {
                // Calculate enrollment based on students with actual class assignments
                const enrolledCount = students.filter(
                  (s) => s.programEnrollments && s.programEnrollments.some((e) => e.classId === cls.id)
                ).length;
                const availableSpots = cls.capacity - enrolledCount;
                const isFull = availableSpots <= 0;
                const isAlreadyAssigned = assignedClassIds.includes(cls.id);

                return (
                  <button
                    key={cls.id}
                    onClick={() => {
                      if (!isFull && !isAlreadyAssigned) {
                        setSelectedClass(cls.id);
                      }
                    }}
                    disabled={isFull || isAlreadyAssigned}
                    className={`w-full p-3 text-left border rounded-lg transition-colors ${
                      selectedClass === cls.id
                        ? 'border-purple-500 bg-purple-50'
                        : isFull
                        ? 'border-red-300 bg-red-50 opacity-50 cursor-not-allowed'
                        : isAlreadyAssigned
                        ? 'border-yellow-300 bg-yellow-50 opacity-50 cursor-not-allowed'
                        : 'border-gray-300 hover:bg-purple-50 hover:border-purple-500'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{cls.name}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Slot: {cls.slot} | Level: {cls.programLevel}
                        </p>
                        {isAlreadyAssigned && (
                          <p className="text-xs text-yellow-600 mt-2 font-semibold">Already assigned</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${
                          isFull ? 'text-red-600' : isAlreadyAssigned ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {isAlreadyAssigned ? 'Assigned' : isFull ? 'Full' : availableSpots > 0 ? `${availableSpots} spots` : 'Full'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {enrolledCount}/{cls.capacity}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        {step === 'program' && (
          <Button variant="outline" onClick={handleAssignModeBack} className="flex-1">
            Back
          </Button>
        )}
        {(step === 'class' || step === 'payment') && (
          <Button variant="outline" onClick={handleBack} className="flex-1">
            Back
          </Button>
        )}
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        {step === 'payment' && (
          <Button
            variant="primary"
            onClick={handlePaymentConfirmed}
            disabled={!isPaymentConfirmed}
            className="flex-1"
          >
            Continue to Class Selection
          </Button>
        )}
        {step === 'class' && (
          <Button
            variant="primary"
            onClick={handleAssign}
            disabled={!selectedClass}
            className="flex-1"
          >
            Assign Student
          </Button>
        )}
        {step === 'program' && programs.length > 0 && (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
}
