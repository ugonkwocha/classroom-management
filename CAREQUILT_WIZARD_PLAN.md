# CareQuilt-Style Multi-Step Intake Wizard - Implementation Plan

## Overview

Build a multi-step intake/onboarding wizard similar to CareQuilt's caregiver matching flow. The wizard will collect user information through a series of questions with conditional branching, progress tracking, and a polished UI.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Wizard Container                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Progress Bar                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │                    Step Content                           │  │
│  │              (Dynamic based on step)                      │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │           [Previous]              [Next]                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Core Wizard Infrastructure

### 1.1 Create Wizard Types (`types/wizard.ts`)

```typescript
// Step configuration type
interface WizardStep {
  id: string;
  title: string;
  question: string;
  type: 'single-select' | 'multi-select' | 'text-input' | 'contact-form';
  options?: WizardOption[];
  required: boolean;
  conditionalNext?: Record<string, string>; // option value -> next step id
  defaultNext?: string;
  validation?: ValidationRule[];
}

// Option for select questions
interface WizardOption {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

// Form data collected throughout wizard
interface WizardData {
  [stepId: string]: string | string[] | Record<string, string>;
}

// Wizard state
interface WizardState {
  currentStepId: string;
  stepHistory: string[];
  data: WizardData;
  isComplete: boolean;
}
```

### 1.2 Create Wizard Hook (`lib/hooks/useWizard.ts`)

```typescript
export function useWizard(steps: WizardStep[], initialStepId: string) {
  // State management for:
  // - Current step
  // - Step history (for back navigation)
  // - Collected data
  // - Validation errors

  // Methods:
  // - goToNext(selectedValue)
  // - goToPrevious()
  // - setStepData(stepId, data)
  // - resetWizard()
  // - submitWizard()
}
```

### 1.3 Wizard Container Component (`components/Wizard/WizardContainer.tsx`)

Responsibilities:
- Render progress bar
- Handle step transitions with animations
- Manage navigation buttons
- Coordinate with useWizard hook

---

## Phase 2: Step Components

### 2.1 Single Select Step (`components/Wizard/steps/SingleSelectStep.tsx`)

For questions like:
- "Who will the caregiver be helping?" → My parent(s) / My spouse / Myself
- "Which parent needs help?" → My Mom / My Dad / Both

```tsx
interface SingleSelectStepProps {
  question: string;
  options: WizardOption[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
}
```

**UI Pattern:**
- Full-width button options (not radio buttons)
- Hover/focus states
- Selected state highlight
- Optional icons or descriptions

### 2.2 Multi Select Step (`components/Wizard/steps/MultiSelectStep.tsx`)

For questions like:
- "What led you to consider care today?" → Multiple checkbox options

```tsx
interface MultiSelectStepProps {
  question: string;
  options: WizardOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  minSelections?: number;
  maxSelections?: number;
}
```

**UI Pattern:**
- Checkbox list with labels
- Coral/accent color for checked state
- Optional "Select all" / "Clear all"

### 2.3 Text Input Step (`components/Wizard/steps/TextInputStep.tsx`)

For questions requiring free-text answers:
- Name input
- Address input
- Additional notes

### 2.4 Contact Form Step (`components/Wizard/steps/ContactFormStep.tsx`)

Final step collecting:
- Full name
- Email address
- Phone number
- Preferred contact method

---

## Phase 3: Progress & Navigation

### 3.1 Progress Bar (`components/Wizard/ProgressBar.tsx`)

```tsx
interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  // Or percentage-based:
  progress: number; // 0-100
}
```

**Design:**
- Thin horizontal bar at top of card
- Coral/accent color for filled portion
- Smooth transition animation on step change

### 3.2 Navigation Buttons (`components/Wizard/NavigationButtons.tsx`)

```tsx
interface NavigationButtonsProps {
  onPrevious: () => void;
  onNext: () => void;
  showPrevious: boolean;
  nextLabel?: string; // "Next" or "Submit"
  isNextDisabled: boolean;
  isLoading?: boolean;
}
```

---

## Phase 4: Styling (CareQuilt-Inspired)

### 4.1 Color Palette

Add to `tailwind.config.ts`:

```javascript
colors: {
  // CareQuilt-inspired palette
  carequilt: {
    bg: '#F8F5F1',           // Warm cream background
    card: '#FFFFFF',          // White card
    accent: '#D4845C',        // Coral/salmon accent
    accentHover: '#C17347',   // Darker coral for hover
    text: '#2D2D2D',          // Dark text
    textMuted: '#6B7280',     // Muted text
    border: '#E5E7EB',        // Light border
  }
}
```

### 4.2 Typography

```javascript
fontFamily: {
  serif: ['Georgia', 'Cambria', 'serif'],      // Headlines
  sans: ['Inter', 'system-ui', 'sans-serif'],   // Body text
}
```

### 4.3 Component Styles

**Card Container:**
```css
- Rounded corners (rounded-2xl)
- Subtle shadow (shadow-lg)
- White background
- Generous padding (p-8)
- Max-width constraint (max-w-xl mx-auto)
```

**Option Buttons:**
```css
- Full width
- Rounded borders (rounded-lg)
- Border style (not filled background)
- Hover: border-accent, subtle background tint
- Selected: border-accent, accent background tint
```

**Navigation Buttons:**
```css
- Previous: outlined style, neutral color
- Next: filled style, accent color
```

---

## Phase 5: Database Schema

### 5.1 Prisma Models (`prisma/schema.prisma`)

```prisma
model IntakeSubmission {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Contact info
  fullName        String
  email           String
  phone           String?
  preferredContact String?

  // Wizard responses stored as JSON
  responses       Json

  // Status tracking
  status          IntakeStatus @default(NEW)
  assignedTo      String?
  notes           String?

  // Optional: link to matched caregiver/service
  matchedServiceId String?
}

enum IntakeStatus {
  NEW
  REVIEWING
  CONTACTED
  MATCHED
  CLOSED
}
```

### 5.2 API Routes

**POST `/api/intake`** - Submit completed wizard
**GET `/api/intake`** - List submissions (admin)
**GET `/api/intake/[id]`** - Get specific submission
**PATCH `/api/intake/[id]`** - Update status/notes

---

## Phase 6: Step Configuration

### 6.1 Define Steps (`lib/wizardSteps.ts`)

```typescript
export const caregiverMatchingSteps: WizardStep[] = [
  {
    id: 'care-recipient',
    title: 'Care Recipient',
    question: 'Who will the caregiver be helping?',
    type: 'single-select',
    required: true,
    options: [
      { id: 'parent', label: 'My parent(s)' },
      { id: 'spouse', label: 'My spouse' },
      { id: 'self', label: 'Myself' },
    ],
    conditionalNext: {
      'parent': 'which-parent',
      'spouse': 'first-time-care',
      'self': 'first-time-care',
    },
  },
  {
    id: 'which-parent',
    title: 'Which Parent',
    question: 'Which of your parents need help?',
    type: 'single-select',
    required: true,
    options: [
      { id: 'mom', label: 'My Mom' },
      { id: 'dad', label: 'My Dad' },
      { id: 'both', label: 'Both' },
    ],
    defaultNext: 'first-time-care',
  },
  {
    id: 'first-time-care',
    title: 'Care History',
    question: 'Is this their first time receiving care?',
    type: 'single-select',
    required: true,
    options: [
      { id: 'yes', label: 'Yes' },
      { id: 'no', label: 'No' },
    ],
    defaultNext: 'care-reasons',
  },
  {
    id: 'care-reasons',
    title: 'Care Reasons',
    question: 'What led you to consider care today?',
    type: 'multi-select',
    required: true,
    options: [
      { id: 'hospital', label: 'They recently came home from hospital' },
      { id: 'memory', label: "I've noticed changes in their memory" },
      { id: 'house-help', label: 'They need help around the house' },
      { id: 'daily-tasks', label: 'They need help with day to day tasks' },
      { id: 'personal-care', label: 'They need help with personal care' },
      { id: 'safety', label: "I'm worried about their safety" },
      { id: 'lonely', label: 'They seem lonely' },
      { id: 'caregiver-help', label: 'I need help providing care' },
      { id: 'break', label: 'I need a break' },
      { id: 'exploring', label: "I'm exploring care options" },
      { id: 'recommended', label: 'Someone recommended care to me' },
    ],
    defaultNext: 'mobility',
  },
  {
    id: 'mobility',
    title: 'Mobility',
    question: 'Does your loved one need help with mobility?',
    type: 'single-select',
    required: true,
    options: [
      { id: 'walker-wheelchair', label: 'Yes, they use a walker or wheelchair' },
      { id: 'support-needed', label: 'Yes, they need support while walking or transferring' },
      { id: 'independent', label: 'No, they move around independently' },
    ],
    defaultNext: 'contact-info',
  },
  {
    id: 'contact-info',
    title: 'Contact Information',
    question: 'How can we reach you?',
    type: 'contact-form',
    required: true,
    defaultNext: 'complete',
  },
];
```

---

## Phase 7: File Structure

```
components/
└── Wizard/
    ├── index.tsx                    # Main export
    ├── WizardContainer.tsx          # Main container
    ├── WizardCard.tsx               # Styled card wrapper
    ├── ProgressBar.tsx              # Progress indicator
    ├── NavigationButtons.tsx        # Previous/Next buttons
    ├── steps/
    │   ├── SingleSelectStep.tsx
    │   ├── MultiSelectStep.tsx
    │   ├── TextInputStep.tsx
    │   └── ContactFormStep.tsx
    └── WizardComplete.tsx           # Success/completion screen

lib/
├── hooks/
│   └── useWizard.ts                 # Wizard state management
└── wizardSteps.ts                   # Step configurations

app/
├── intake/
│   └── page.tsx                     # Intake wizard page
└── api/
    └── intake/
        ├── route.ts                 # POST/GET submissions
        └── [id]/
            └── route.ts             # GET/PATCH specific submission

types/
└── wizard.ts                        # Wizard type definitions
```

---

## Phase 8: Implementation Order

### Step 1: Foundation (Day 1)
- [ ] Create wizard types (`types/wizard.ts`)
- [ ] Create `useWizard` hook
- [ ] Build `WizardContainer` component
- [ ] Add CareQuilt color palette to Tailwind

### Step 2: Step Components (Day 2)
- [ ] Build `SingleSelectStep` component
- [ ] Build `MultiSelectStep` component
- [ ] Build `ContactFormStep` component
- [ ] Add Framer Motion transitions

### Step 3: Navigation & Progress (Day 2)
- [ ] Build `ProgressBar` component
- [ ] Build `NavigationButtons` component
- [ ] Implement step history for back navigation

### Step 4: Configuration & Page (Day 3)
- [ ] Define step configurations in `wizardSteps.ts`
- [ ] Create `/intake` page
- [ ] Wire up all components
- [ ] Test conditional branching

### Step 5: Backend Integration (Day 3)
- [ ] Add Prisma schema for IntakeSubmission
- [ ] Run Prisma migration
- [ ] Create API routes for submission
- [ ] Connect wizard to API on completion

### Step 6: Polish (Day 4)
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add form validation
- [ ] Mobile responsive testing
- [ ] Animation fine-tuning

### Step 7: Admin View (Optional)
- [ ] Create admin dashboard for viewing submissions
- [ ] Add status management
- [ ] Add notes/assignment features

---

## Key Considerations

### Accessibility
- Keyboard navigation support
- Focus management on step transitions
- ARIA labels for progress indicator
- Screen reader announcements

### Performance
- Lazy load step components
- Debounce form validation
- Optimistic UI updates

### User Experience
- Save progress to localStorage (optional)
- Allow browser back button navigation
- Clear validation feedback
- Mobile-friendly touch targets

### Analytics (Optional)
- Track step completion rates
- Identify drop-off points
- A/B test option ordering

---

## Sample Implementation Snippet

```tsx
// components/Wizard/WizardContainer.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWizard } from '@/lib/hooks/useWizard';
import { caregiverMatchingSteps } from '@/lib/wizardSteps';
import ProgressBar from './ProgressBar';
import NavigationButtons from './NavigationButtons';
import SingleSelectStep from './steps/SingleSelectStep';
import MultiSelectStep from './steps/MultiSelectStep';
import ContactFormStep from './steps/ContactFormStep';

export default function WizardContainer() {
  const {
    currentStep,
    stepHistory,
    data,
    progress,
    goToNext,
    goToPrevious,
    setStepData,
    canGoNext,
  } = useWizard(caregiverMatchingSteps, 'care-recipient');

  const renderStep = () => {
    switch (currentStep.type) {
      case 'single-select':
        return (
          <SingleSelectStep
            question={currentStep.question}
            options={currentStep.options!}
            selectedValue={data[currentStep.id] as string}
            onSelect={(value) => setStepData(currentStep.id, value)}
          />
        );
      case 'multi-select':
        return (
          <MultiSelectStep
            question={currentStep.question}
            options={currentStep.options!}
            selectedValues={data[currentStep.id] as string[] || []}
            onToggle={(value) => {
              const current = (data[currentStep.id] as string[]) || [];
              const updated = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value];
              setStepData(currentStep.id, updated);
            }}
          />
        );
      case 'contact-form':
        return (
          <ContactFormStep
            data={data[currentStep.id] as Record<string, string> || {}}
            onChange={(field, value) => {
              const current = (data[currentStep.id] as Record<string, string>) || {};
              setStepData(currentStep.id, { ...current, [field]: value });
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-carequilt-bg flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <ProgressBar progress={progress} />

          <h2 className="font-serif text-2xl text-carequilt-text mt-6 mb-2">
            Help us match you with the right caregiver.
          </h2>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          <NavigationButtons
            onPrevious={goToPrevious}
            onNext={() => goToNext(data[currentStep.id])}
            showPrevious={stepHistory.length > 0}
            isNextDisabled={!canGoNext}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## Ready to Start?

This plan provides a complete roadmap for building a CareQuilt-style multi-step wizard. The implementation leverages your existing tech stack (Next.js 14, Tailwind, Framer Motion, Prisma) and follows established patterns in your codebase.

Would you like me to begin implementation with Phase 1 (Core Wizard Infrastructure)?
