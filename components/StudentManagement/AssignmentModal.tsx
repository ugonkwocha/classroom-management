'use client';

import { useState } from 'react';
import { Program, Class, CourseHistory } from '@/types';
import { Button } from '@/components/ui';

interface AssignmentModalProps {
  studentId: string;
  studentName: string;
  programs: Program[];
  classes: Class[];
  assignedClassIds: string[]; // Track which classes student is already in
  courseHistory: CourseHistory[];
  onAssign: (studentId: string, programId: string, classId: string) => void;
  onCancel: () => void;
}

export function AssignmentModal({
  studentId,
  studentName,
  programs,
  classes,
  assignedClassIds,
  courseHistory,
  onAssign,
  onCancel,
}: AssignmentModalProps) {
  const [step, setStep] = useState<'program' | 'class'>('program');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [showCourseWarning, setShowCourseWarning] = useState(false);
  const [takenCourseNames, setTakenCourseNames] = useState<string[]>([]);

  // Filter classes by selected program
  const programClasses = selectedProgram
    ? classes.filter((cls) => cls.programId === selectedProgram)
    : [];

  const handleProgramSelect = (programId: string) => {
    setSelectedProgram(programId);
    setStep('class');
    setSelectedClass(''); // Reset class selection when program changes
  };

  const handleAssign = () => {
    if (selectedProgram && selectedClass) {
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
    setStep('program');
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
      ) : (
        <div className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Selected Program:</span>{' '}
              {programs.find((p) => p.id === selectedProgram)?.name}
            </p>
          </div>

          <h4 className="font-semibold text-gray-900">Step 2: Select a Class</h4>
          {programClasses.length === 0 ? (
            <p className="text-gray-500 text-sm">No classes available for this program.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {programClasses.map((cls) => {
                const enrolledCount = cls.students.length;
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
        {step === 'class' && (
          <Button variant="outline" onClick={handleBack} className="flex-1">
            Back
          </Button>
        )}
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
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
