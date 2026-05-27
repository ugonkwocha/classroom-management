'use client';

import { useEffect, useMemo, useState } from 'react';
import { Student, CourseHistory, ProgramEnrollment, PriceType } from '@/types';
import { Input, Button, PhoneInput } from '@/components/ui';
import { useCourses, useFamilies, usePrograms, usePricing } from '@/lib/hooks';
import { calculateAge, generateId } from '@/lib/utils';
import { formatCurrency } from '@/lib/constants/pricing';
import { validatePhoneNumber } from '@/lib/constants/countries';
import { formatGuardianName, normalizeEmail, normalizePhone } from '@/lib/family-utils';

interface StudentFormProps {
  onSubmit: (studentData: Omit<Student, 'id' | 'createdAt'>) => Promise<void>;
  onCancel?: () => void;
  initialData?: Student;
  isLoading?: boolean;
  apiErrors?: string[];
  existingStudents?: Student[];
  lockedFamilyId?: string;
}

const getFullName = (student: Student) => `${student.firstName} ${student.lastName}`.trim();

export function StudentForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  apiErrors = [],
  existingStudents = [],
  lockedFamilyId,
}: StudentFormProps) {
  const { courses } = useCourses();
  const { programs } = usePrograms();
  const { priceOptions } = usePricing();
  const { families } = useFamilies();
  const initialPrimaryGuardian = initialData?.family?.guardians?.find((guardian) => guardian.isPrimary)
    || initialData?.family?.guardians?.[0];

  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    parentFirstName: initialPrimaryGuardian?.firstName || '',
    parentLastName: initialPrimaryGuardian?.lastName || '',
    parentRelationship: initialPrimaryGuardian?.relationship || 'PARENT',
    parentEmail: initialData?.parentEmail || '',
    parentPhone: initialData?.parentPhone || '',
    dateOfBirth: initialData?.dateOfBirth || '',
    isReturningStudent: initialData?.isReturningStudent || false,
  });

  const [selectedPastCourses, setSelectedPastCourses] = useState<string[]>(
    initialData?.courseHistory.map((h) => h.courseId) || []
  );

  const [studentPhoneCountry, setStudentPhoneCountry] = useState<string>(
    initialData?.phoneCountryCode || 'NG'
  ); // Default to Nigeria
  const [parentPhoneCountry, setParentPhoneCountry] = useState<string>(
    initialData?.parentPhoneCountryCode || 'NG'
  ); // Default to Nigeria

  const [enrollInProgram, setEnrollInProgram] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedBatches, setSelectedBatches] = useState<{ batchNumber: number; priceType: PriceType }[]>([]);
  const [applySiblingDiscount, setApplySiblingDiscount] = useState(false);
  const [selectedFamilyId, setSelectedFamilyId] = useState(lockedFamilyId || initialData?.familyId || '');
  const [createNewFamily, setCreateNewFamily] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const siblingMatches = useMemo(() => {
    const parentEmail = normalizeEmail(formData.parentEmail);
    const parentPhone = normalizePhone(formData.parentPhone);
    const parentCountry = parentPhoneCountry || 'NG';

    if (!parentEmail && !parentPhone) return [];

    return existingStudents.filter((student) => {
      if (initialData?.id && student.id === initialData.id) return false;

      const emailMatches = Boolean(
        parentEmail && normalizeEmail(student.parentEmail) === parentEmail
      );
      const phoneMatches = Boolean(
        parentPhone &&
          normalizePhone(student.parentPhone) === parentPhone &&
          (student.parentPhoneCountryCode || 'NG') === parentCountry
      );

      return emailMatches || phoneMatches;
    });
  }, [
    existingStudents,
    formData.parentEmail,
    formData.parentPhone,
    initialData?.id,
    parentPhoneCountry,
  ]);

  const hasSiblingMatch = siblingMatches.length > 0;
  const familyMatches = useMemo(() => {
    const parentEmail = normalizeEmail(formData.parentEmail);
    const parentPhone = normalizePhone(formData.parentPhone);
    const parentCountry = parentPhoneCountry || 'NG';

    if (!parentEmail && !parentPhone) return [];

    return families.filter((family) =>
      family.guardians.some((guardian) => {
        const emailMatches = Boolean(parentEmail && normalizeEmail(guardian.email) === parentEmail);
        const phoneMatches = Boolean(
          parentPhone &&
            normalizePhone(guardian.phone) === parentPhone &&
            (guardian.phoneCountryCode || 'NG') === parentCountry
        );

        return emailMatches || phoneMatches;
      })
    );
  }, [families, formData.parentEmail, formData.parentPhone, parentPhoneCountry]);
  const selectedFamily = families.find((family) => family.id === selectedFamilyId);
  useEffect(() => {
    if (!selectedFamily) return;
    const primary = selectedFamily.guardians.find((guardian) => guardian.isPrimary) || selectedFamily.guardians[0];
    if (!primary) return;

    setFormData((current) => ({
      ...current,
      parentFirstName: primary.firstName || current.parentFirstName,
      parentLastName: primary.lastName || current.parentLastName,
      parentRelationship: primary.relationship || current.parentRelationship,
      parentEmail: primary.email || current.parentEmail,
      parentPhone: primary.phone || current.parentPhone,
    }));
    setParentPhoneCountry(primary.phoneCountryCode || 'NG');
  }, [selectedFamily]);
  const shouldSuggestSiblingDiscount = Boolean(
    selectedFamily?.students?.length || familyMatches.length > 0 || hasSiblingMatch
  );
  const hasSiblingDiscountOption = priceOptions.some((option) => option.type === 'SIBLING_DISCOUNT');

  useEffect(() => {
    if (!shouldSuggestSiblingDiscount && applySiblingDiscount) {
      setApplySiblingDiscount(false);
      setSelectedBatches((batches) =>
        batches.map((batch) => ({
          ...batch,
          priceType: batch.priceType === 'SIBLING_DISCOUNT' ? 'FULL_PRICE' : batch.priceType,
        }))
      );
    }
  }, [applySiblingDiscount, shouldSuggestSiblingDiscount]);

  const handleSiblingDiscountToggle = (enabled: boolean) => {
    setApplySiblingDiscount(enabled);
    setSelectedBatches((batches) =>
      batches.map((batch) => ({
        ...batch,
        priceType: enabled
          ? 'SIBLING_DISCOUNT'
          : batch.priceType === 'SIBLING_DISCOUNT'
            ? 'FULL_PRICE'
            : batch.priceType,
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';

    // Student email is now optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email.trim() && !emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Student phone is optional, but must be valid if provided
    if (formData.phone.trim()) {
      const phoneValidation = validatePhoneNumber(formData.phone, studentPhoneCountry);
      if (!phoneValidation.valid) {
        newErrors.phone = phoneValidation.message;
      }
    }

    // Parent contact is now required
    if (!formData.parentEmail.trim()) newErrors.parentEmail = 'Parent email is required';
    if (formData.parentEmail.trim() && !emailRegex.test(formData.parentEmail)) {
      newErrors.parentEmail = 'Invalid parent email format';
    }
    if (!formData.parentPhone.trim()) newErrors.parentPhone = 'Parent phone is required';
    if (createNewFamily || !selectedFamilyId) {
      if (!formData.parentFirstName.trim()) newErrors.parentFirstName = 'Parent/guardian first name is required';
      if (!formData.parentLastName.trim()) newErrors.parentLastName = 'Parent/guardian last name is required';
    }

    if (familyMatches.length > 0 && !selectedFamilyId && !createNewFamily) {
      newErrors.family = 'Choose the matching family or select create a new family';
    }

    // Parent phone validation
    if (formData.parentPhone.trim()) {
      const parentPhoneValidation = validatePhoneNumber(formData.parentPhone, parentPhoneCountry);
      if (!parentPhoneValidation.valid) {
        newErrors.parentPhone = parentPhoneValidation.message;
      }
    }

    // Check enrollment and batches if enrolled in program
    if (enrollInProgram && !selectedProgram) {
      newErrors.selectedProgram = 'Please select a program';
    }
    if (enrollInProgram && selectedProgram && selectedBatches.length === 0) {
      newErrors.selectedBatches = 'Please select at least one batch and its pricing';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build course history from selected courses
    const courseHistory: CourseHistory[] = selectedPastCourses.map((courseId) => {
      const course = courses.find((c) => c.id === courseId);
      return {
        id: '', // Will be generated by hook
        courseId,
        courseName: course?.name || '',
        completionStatus: 'COMPLETED',
        dateAdded: new Date().toISOString(),
      };
    });

    // Build program enrollments if student is enrolling in a program
    let programEnrollments: ProgramEnrollment[] = initialData?.programEnrollments || [];
    if (enrollInProgram && selectedProgram && selectedBatches.length > 0) {
      // Create an enrollment for each selected batch
      selectedBatches.forEach((batch) => {
        // Get the price amount for the selected price type
        const priceOption = priceOptions.find((opt) => opt.type === batch.priceType);
        const priceAmount = priceOption?.amount || 60000;

        // Create enrollment with minimal data - will be created by the hook
        const newEnrollment = {
          id: generateId(),  // Generate a temporary ID for the form
          programId: selectedProgram,
          batchNumber: batch.batchNumber,
          enrollmentDate: new Date().toISOString(),
          status: 'ASSIGNED' as const,
          paymentStatus: 'CONFIRMED' as const,
          priceType: batch.priceType,
          priceAmount,
        };
        programEnrollments = [...programEnrollments, newEnrollment as any];
      });
    }

    await onSubmit({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      phoneCountryCode: studentPhoneCountry || undefined,
      parentEmail: formData.parentEmail || undefined,
      parentPhone: formData.parentPhone || undefined,
      parentPhoneCountryCode: parentPhoneCountry || undefined,
      parentFirstName: formData.parentFirstName || undefined,
      parentLastName: formData.parentLastName || undefined,
      parentRelationship: formData.parentRelationship || 'PARENT',
      familyId: selectedFamilyId || undefined,
      createFamily: !selectedFamilyId,
      dateOfBirth: formData.dateOfBirth || undefined,
      isReturningStudent: formData.isReturningStudent,
      courseHistory,
      programEnrollments,
      // Only set paymentStatus if student has program enrollments, otherwise leave as PENDING (not displayed)
      paymentStatus: programEnrollments.length > 0 ? 'CONFIRMED' : 'PENDING',
    } as any);

    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* API Error Summary */}
      {apiErrors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <p className="font-semibold">The following contacts are already in use:</p>
          <ul className="mt-1 ml-4 list-disc">
            {apiErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Validation Error Summary */}
      {Object.keys(errors).length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <p className="font-semibold">Please fix the following errors:</p>
          <ul className="mt-1 ml-4 list-disc">
            {Object.values(errors).map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Personal Information Section */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Personal Information</h3>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First Name"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            error={errors.firstName}
            placeholder="e.g., John"
          />
          <Input
            label="Last Name"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            error={errors.lastName}
            placeholder="e.g., Doe"
          />
        </div>

        <div>
          <Input
            label="Date of Birth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            className="mt-3"
          />
          {formData.dateOfBirth && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Age:</span> {calculateAge(formData.dateOfBirth)} years old
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>

        <Input
          label="Student Email (Optional)"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          error={errors.email}
          placeholder="student@example.com"
        />

        <PhoneInput
          label="Student Phone (Optional)"
          value={formData.phone}
          countryCode={studentPhoneCountry}
          onCountryCodeChange={setStudentPhoneCountry}
          onChange={(e) => setFormData({ ...formData, phone: e })}
          error={errors.phone}
          placeholder="8012 3456 78"
          className="mt-3"
        />

        <Input
          label="Parent/Guardian First Name"
          value={formData.parentFirstName}
          onChange={(e) => setFormData({ ...formData, parentFirstName: e.target.value })}
          error={errors.parentFirstName}
          placeholder="e.g., Gloria"
          className="mt-3"
        />

        <Input
          label="Parent/Guardian Last Name"
          value={formData.parentLastName}
          onChange={(e) => setFormData({ ...formData, parentLastName: e.target.value })}
          error={errors.parentLastName}
          placeholder="e.g., Nwkocha"
          className="mt-3"
        />

        <label className="mb-2 mt-3 block text-sm font-bold text-slate-700">Relationship</label>
        <select
          value={formData.parentRelationship}
          onChange={(e) => setFormData({ ...formData, parentRelationship: e.target.value as typeof formData.parentRelationship })}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
        >
          <option value="PARENT">Parent</option>
          <option value="MOTHER">Mother</option>
          <option value="FATHER">Father</option>
          <option value="GUARDIAN">Guardian</option>
          <option value="OTHER">Other</option>
        </select>

        <Input
          label="Parent Email"
          type="email"
          value={formData.parentEmail}
          onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
          error={errors.parentEmail}
          placeholder="parent@example.com"
          className="mt-3"
        />

        <PhoneInput
          label="Parent Phone"
          value={formData.parentPhone}
          countryCode={parentPhoneCountry}
          onCountryCodeChange={setParentPhoneCountry}
          onChange={(e) => setFormData({ ...formData, parentPhone: e })}
          error={errors.parentPhone}
          placeholder="8012 3456 78"
          required={true}
          className="mt-3"
        />

        {selectedFamily && lockedFamilyId && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-sm font-semibold text-emerald-950">Adding student to {selectedFamily.displayName}</p>
            <p className="mt-1 text-xs text-emerald-800">This student will be linked to this family after saving.</p>
          </div>
        )}

        {familyMatches.length > 0 && !lockedFamilyId && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-950">Matching family found</p>
                <p className="mt-1 text-xs text-blue-800">
                  Choose a family below to link this student, or create a new family if this is a different household.
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-blue-700">
                {familyMatches.length} match{familyMatches.length === 1 ? '' : 'es'}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {familyMatches.map((family) => {
                const primary = family.guardians.find((guardian) => guardian.isPrimary) || family.guardians[0];
                return (
                  <label
                    key={family.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                      selectedFamilyId === family.id
                        ? 'border-blue-500 bg-white'
                        : 'border-blue-100 bg-white/70'
                    }`}
                  >
                    <input
                      type="radio"
                      name="family-choice"
                      checked={selectedFamilyId === family.id}
                      onChange={() => {
                        setSelectedFamilyId(family.id);
                        setCreateNewFamily(false);
                      }}
                      className="mt-1 h-4 w-4 text-blue-600"
                    />
                    <span>
                      <span className="block text-sm font-bold text-blue-950">{family.displayName}</span>
                      <span className="mt-1 block text-xs text-blue-800">
                        {primary ? formatGuardianName(primary.firstName, primary.lastName) : 'No guardian'} · {family.students?.length || 0} student{family.students?.length === 1 ? '' : 's'}
                      </span>
                    </span>
                  </label>
                );
              })}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-blue-100 bg-white/70 p-3">
                <input
                  type="radio"
                  name="family-choice"
                  checked={createNewFamily && !selectedFamilyId}
                  onChange={() => {
                    setSelectedFamilyId('');
                    setCreateNewFamily(true);
                  }}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="text-sm font-bold text-blue-950">Create a new family instead</span>
              </label>
            </div>
            {errors.family && <p className="mt-2 text-xs font-medium text-rose-600">{errors.family}</p>}
          </div>
        )}

        {hasSiblingMatch && familyMatches.length === 0 && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-950">Sibling match found</p>
                <p className="mt-1 text-xs text-blue-800">
                  This parent contact matches {siblingMatches.length} existing student{siblingMatches.length === 1 ? '' : 's'}.
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-blue-700">
                {siblingMatches.length} sibling{siblingMatches.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="mt-3 space-y-1">
              {siblingMatches.slice(0, 3).map((student) => (
                <p key={student.id} className="text-xs text-blue-900">
                  {getFullName(student)}
                </p>
              ))}
              {siblingMatches.length > 3 && (
                <p className="text-xs text-blue-700">+{siblingMatches.length - 3} more</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Program Enrollment Section */}
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enrollInProgram}
            onChange={(e) => {
              setEnrollInProgram(e.target.checked);
              if (!e.target.checked) {
                setSelectedProgram('');
                setSelectedBatches([]);
              }
            }}
            className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
          />
          <span className="font-semibold text-gray-900">Enroll in an upcoming program?</span>
        </label>

        {enrollInProgram && (
          <div className="mt-4 space-y-4">
            {shouldSuggestSiblingDiscount && hasSiblingDiscountOption && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={applySiblingDiscount}
                    onChange={(e) => handleSiblingDiscountToggle(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-emerald-950">
                      Apply sibling discount to selected batches
                    </span>
                    <span className="mt-1 block text-xs text-emerald-800">
                      Suggested because this parent already has a student record. You can still choose a different price per batch below.
                    </span>
                  </span>
                </label>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Program</label>
              {programs.length === 0 ? (
                <p className="text-gray-500 text-sm">No programs available</p>
              ) : (
                <select
                  value={selectedProgram}
                  onChange={(e) => {
                    setSelectedProgram(e.target.value);
                    setSelectedBatches([]); // Reset batches when program changes
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Select a program --</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name} - {program.season} {program.year}
                    </option>
                  ))}
                </select>
              )}
              {errors.selectedProgram && <p className="text-red-600 text-xs mt-1">{errors.selectedProgram}</p>}
            </div>

            {selectedProgram && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Select Batches and Pricing</label>
                {(() => {
                  const program = programs.find((p) => p.id === selectedProgram);
                  return (
                    <div className="space-y-4">
                      {Array.from({ length: program?.batches || 1 }, (_, i) => i + 1).map((batchNum) => {
                        const isBatchSelected = selectedBatches.some((b) => b.batchNumber === batchNum);
                        const batchPriceType = selectedBatches.find((b) => b.batchNumber === batchNum)?.priceType || 'FULL_PRICE';

                        return (
                          <div key={batchNum} className="border rounded-lg p-4 bg-white">
                            <div className="mb-3">
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isBatchSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedBatches([
                                        ...selectedBatches,
                                        {
                                          batchNumber: batchNum,
                                          priceType:
                                            applySiblingDiscount && shouldSuggestSiblingDiscount
                                              ? 'SIBLING_DISCOUNT'
                                              : 'FULL_PRICE',
                                        },
                                      ]);
                                    } else {
                                      setSelectedBatches(selectedBatches.filter((b) => b.batchNumber !== batchNum));
                                    }
                                  }}
                                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                                />
                                <span className="font-semibold text-gray-900">Batch {batchNum}</span>
                              </label>
                            </div>

                            {isBatchSelected && (
                              <div className="ml-7 space-y-2">
                                <p className="text-xs text-gray-600 mb-2">Select pricing option:</p>
                                {priceOptions.map((option) => (
                                  <label key={option.type} className="flex items-start gap-3 p-2 border rounded-lg cursor-pointer hover:bg-purple-50" style={{borderColor: batchPriceType === option.type ? '#9333ea' : '#d1d5db', backgroundColor: batchPriceType === option.type ? '#f3e8ff' : '#ffffff'}}>
                                    <input
                                      type="radio"
                                      name={`batch-${batchNum}-price`}
                                      value={option.type}
                                      checked={batchPriceType === option.type}
                                      onChange={() => {
                                        setSelectedBatches(
                                          selectedBatches.map((b) =>
                                            b.batchNumber === batchNum
                                              ? { ...b, priceType: option.type }
                                              : b
                                          )
                                        );
                                      }}
                                      className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 mt-0.5"
                                    />
                                    <div className="flex-1">
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm font-semibold text-gray-900">{option.label}</span>
                                        <span className="text-sm font-bold text-purple-600">{formatCurrency(option.amount)}</span>
                                      </div>
                                      <p className="text-xs text-gray-600 mt-0.5">{option.description}</p>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                {errors.selectedBatches && <p className="text-red-600 text-xs mt-2">{errors.selectedBatches}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Returning Student Section */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isReturningStudent}
            onChange={(e) => setFormData({ ...formData, isReturningStudent: e.target.checked })}
            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="font-semibold text-gray-900">Is this a returning student?</span>
        </label>

        {formData.isReturningStudent && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-3">
              Select courses this student has previously taken with us:
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
              {courses.length === 0 ? (
                <p className="text-gray-500 text-sm">No courses available</p>
              ) : (
                courses.map((course) => (
                  <label key={course.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPastCourses.includes(course.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPastCourses([...selectedPastCourses, course.id]);
                        } else {
                          setSelectedPastCourses(
                            selectedPastCourses.filter((id) => id !== course.id)
                          );
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">{course.name}</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 These courses are added to their history for reference only. Students still need to be enrolled in the current program.
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button type="submit" variant="primary" className="flex-1" disabled={isLoading}>
          {initialData ? 'Update Student' : 'Create Student'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
