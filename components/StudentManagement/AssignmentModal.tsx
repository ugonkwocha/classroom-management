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
  onAssign: (studentId: string, programId: string, batchNumber: number, classId: string) => void;
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
  onCancel,
}: AssignmentModalProps) {
  const [mode, setMode] = useState<'choice' | 'assign'>('choice');
  const [step, setStep] = useState<'program' | 'batch' | 'payment' | 'class'>('program');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<number>(1);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [showCourseWarning, setShowCourseWarning] = useState(false);
  const [takenCourseNames, setTakenCourseNames] = useState<string[]>([]);
  const [takenCourseHistory, setTakenCourseHistory] = useState<CourseHistory[]>([]);

  // Get selected program data
  const selectedProgramData = programs.find((p) => p.id === selectedProgram);

  // Filter classes by selected program and batch (excluding archived classes)
  const programClasses = selectedProgram
    ? classes.filter(
        (cls) =>
          cls.programId === selectedProgram &&
          cls.batch === selectedBatch &&
          !cls.isArchived
      )
    : [];

  // Check if selected program has confirmed payment
  const selectedProgramEnrollment = studentProgramEnrollments.find(
    (e) => e.programId === selectedProgram
  );
  const isPaymentConfirmed = selectedProgramEnrollment?.paymentStatus === 'CONFIRMED';

  const handleProgramSelect = (programId: string) => {
    setSelectedProgram(programId);
    setSelectedBatch(1); // Reset batch to 1 when program changes
    setStep('batch'); // Move to batch selection
    setSelectedClass(''); // Reset class selection when program changes
  };

  const handleBatchSelect = (batchNum: number) => {
    setSelectedBatch(batchNum);
    setStep('payment'); // Move to payment confirmation after batch selection
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
        const previousCourseHistory = courseHistory.filter(
          (h) => h.courseId === selectedClassData.courseId
        );

        if (previousCourseHistory.length > 0) {
          setTakenCourseHistory(previousCourseHistory);
          setTakenCourseNames(previousCourseHistory.map((h) => h.courseName));
          setShowCourseWarning(true);
          console.log('[AssignmentModal] Prompting for course repeat confirmation:', {
            courseName: selectedClassData.name,
            previousCount: previousCourseHistory.length,
            courseHistory: previousCourseHistory,
          });
          return;
        }
      }

      // If no previous courses, proceed with assignment
      onAssign(studentId, selectedProgram, selectedBatch, selectedClass);
      onCancel();
    }
  };

  const handleConfirmReassignment = () => {
    if (selectedProgram && selectedClass) {
      console.log('[AssignmentModal] Confirming course repeat assignment');
      onAssign(studentId, selectedProgram, selectedBatch, selectedClass);
      setShowCourseWarning(false);
      setTakenCourseHistory([]);
      onCancel();
    }
  };

  const handleBack = () => {
    if (step === 'batch') {
      setStep('program');
      setSelectedProgram('');
      setSelectedBatch(1);
      setSelectedClass('');
    } else if (step === 'payment') {
      setStep('batch');
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
    const selectedClassData = classes.find((c) => c.id === selectedClass);
    const selectedProgramData = programs.find((p) => p.id === selectedProgram);

    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-5">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h4 className="font-bold text-yellow-900 text-lg">Course Repeat Warning</h4>
              <p className="text-sm text-yellow-800 mt-1">
                <span className="font-semibold">{studentName}</span> has previously completed this course.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 mb-4 border border-yellow-200">
            <p className="text-sm font-semibold text-gray-900 mb-3">Previous Course History:</p>
            <div className="space-y-3">
              {takenCourseHistory.map((history, index) => (
                <div key={index} className="text-sm">
                  <p className="font-semibold text-gray-900">{history.courseName}</p>
                  <div className="text-xs text-gray-600 mt-1 space-y-1">
                    <p>Status: <span className="font-semibold text-green-700">{history.completionStatus}</span></p>
                    {history.programName && <p>Program: {history.programName}</p>}
                    {history.batch && <p>Batch: {history.batch}</p>}
                    {history.endDate && <p>Completed: {new Date(history.endDate).toLocaleDateString()}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-yellow-100 border border-yellow-300 rounded p-3 mb-3">
            <p className="text-sm text-yellow-900">
              <span className="font-semibold">Current Assignment:</span> {selectedClassData?.name} ({selectedProgramData?.name})
            </p>
            <p className="text-xs text-yellow-800 mt-2">
              Students may repeat courses to improve their skills or reinforce learning. Please confirm this is intentional.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setShowCourseWarning(false);
              setTakenCourseHistory([]);
            }}
            className="flex-1"
          >
            Cancel Assignment
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmReassignment}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700"
          >
            Confirm Course Repeat
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
          <h3 className="text-lg font-bold text-gray-900 mb-2">Assign {studentName} to a Class</h3>
          <p className="text-sm text-gray-600 mb-6">
            Select a class to enroll the student. Course history will be tracked automatically.
          </p>
        </div>

        <div className="space-y-3">
          {/* Assign to Class Option */}
          <button
            onClick={() => {
              setMode('assign');
              setStep('program');
            }}
            className="w-full p-4 text-left border-2 border-gray-300 rounded-lg hover:border-#db3236 hover:bg-red-50 transition-colors"
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
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-200">
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
                  className="w-full p-3 text-left border border-gray-300 rounded-lg hover:bg-red-50 hover:border-#db3236 transition-colors"
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
      ) : step === 'batch' ? (
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Selected Program:</span>{' '}
              {selectedProgramData?.name}
            </p>
          </div>

          <h4 className="font-semibold text-gray-900">Step 2: Select a Batch</h4>
          <div className="space-y-2">
            {Array.from({ length: selectedProgramData?.batches || 1 }, (_, i) => i + 1).map(
              (batchNum) => (
                <button
                  key={batchNum}
                  onClick={() => handleBatchSelect(batchNum)}
                  className={`w-full p-3 text-left border rounded-lg transition-colors ${
                    selectedBatch === batchNum
                      ? 'border-#db3236 bg-red-50'
                      : 'border-gray-300 hover:bg-red-50 hover:border-#db3236'
                  }`}
                >
                  <p className="font-semibold text-gray-900">Batch {batchNum}</p>
                </button>
              )
            )}
          </div>
        </div>
      ) : step === 'payment' ? (
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Selected Program:</span>{' '}
              {programs.find((p) => p.id === selectedProgram)?.name}
            </p>
          </div>

          <h4 className="font-semibold text-gray-900">Step 3: Confirm Payment Status</h4>
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
                  <li>Close this modal by clicking &quot;Cancel&quot;</li>
                  <li>Go to the &quot;Program Payment Status&quot; section below</li>
                  <li>Click &quot;Edit&quot; next to the program</li>
                  <li>Change the status to &quot;Confirmed - Payment Verified&quot;</li>
                  <li>Click &quot;Save&quot; and try assigning again</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Selected Program:</span>{' '}
              {programs.find((p) => p.id === selectedProgram)?.name}
            </p>
          </div>

          <h4 className="font-semibold text-gray-900">Step 4: Select a Class</h4>
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
                        ? 'border-#db3236 bg-red-50'
                        : isFull
                        ? 'border-red-300 bg-red-50 opacity-50 cursor-not-allowed'
                        : isAlreadyAssigned
                        ? 'border-yellow-300 bg-yellow-50 opacity-50 cursor-not-allowed'
                        : 'border-gray-300 hover:bg-red-50 hover:border-#db3236'
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
        {(step === 'batch' || step === 'class' || step === 'payment') && (
          <Button variant="outline" onClick={handleBack} className="flex-1">
            Back
          </Button>
        )}
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        {step === 'batch' && (
          <Button
            variant="primary"
            onClick={() => setStep('payment')}
            className="flex-1"
          >
            Continue to Payment
          </Button>
        )}
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
