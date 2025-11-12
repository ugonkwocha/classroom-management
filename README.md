# Academy Enrollment System

A modern web application for managing student enrollment and class assignments at Transcend AI Academy. Built with Next.js, React, and Tailwind CSS.

## Features

### 📊 Dashboard
- Real-time statistics on students, classes, and enrollment
- Program distribution overview
- Auto-assignment functionality
- Class availability tracking

### 👥 Student Management
- Add, edit, and delete students
- Automatic age calculation and program assignment
- Track returning students and siblings
- Search and filter students by name or program

### 🏫 Class Management
- Create and manage classes with capacity limits (max 6 students)
- Track class schedules and instructors
- Visual capacity indicators
- Program-based organization

### ⏳ Waitlist System
- Automatic waitlist management when classes are full
- Priority-based scoring system
  - Returning students get priority
  - Siblings of enrolled students get priority
  - Time-based consideration for fairness
- Auto-assignment from waitlist when spaces open

### 🎯 Auto-Assignment Algorithm
- Intelligent student-to-class assignment
- Age-based program matching:
  - AI Explorers (ages 6-8)
  - AI Creators (ages 9-12)
  - AI Innovators (ages 13-16)
- Priority consideration (returning students, siblings)
- Automatic waitlist creation when needed

## Tech Stack

- **Frontend Framework**: Next.js 14+ with App Router
- **UI Library**: React 18+
- **Styling**: Tailwind CSS v3
- **Animations**: Framer Motion
- **Language**: TypeScript
- **Storage**: Browser Local Storage (no backend required)

## Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

1. Clone the repository:
```bash
cd "Academy Enrollment"
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## Project Structure

```
Academy Enrollment/
├── app/                          # Next.js app directory
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Main page
│   └── globals.css              # Global styles
│
├── components/                   # Reusable components
│   ├── Dashboard/               # Dashboard component
│   ├── StudentManagement/       # Student CRUD operations
│   ├── ClassManagement/         # Class CRUD operations
│   ├── Waitlist/                # Waitlist management
│   └── ui/                      # Base UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Badge.tsx
│       └── Modal.tsx
│
├── lib/                          # Utilities and hooks
│   ├── hooks/
│   │   ├── useStudents.ts       # Student state management
│   │   ├── useClasses.ts        # Class state management
│   │   └── useWaitlist.ts       # Waitlist state management
│   ├── utils.ts                 # Helper functions
│   ├── assignment.ts            # Auto-assignment algorithm
│   └── index.ts
│
├── types/                        # TypeScript type definitions
│   └── index.ts
│
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.ts            # Tailwind configuration
└── next.config.js                # Next.js configuration
```

## Usage Guide

### Adding a Student
1. Go to the "Students" tab
2. Click "+ Add Student"
3. Enter student details (name, date of birth, contact info)
4. Select if they're returning or have siblings in the academy
5. The system automatically calculates age and assigns the appropriate program level

### Creating a Class
1. Go to the "Classes" tab
2. Click "+ Create Class"
3. Enter class details (name, program level, schedule, teacher)
4. Classes automatically have a capacity of 6 students

### Auto-Assigning Students
1. Go to the "Dashboard" tab
2. Click "Run Auto-Assign" button
3. The system will:
   - Assign unassigned students to classes based on age and availability
   - Prioritize returning students and those with siblings
   - Create waitlist entries for students when no spaces are available
4. View results in the confirmation modal

### Managing Waitlists
1. Go to the "Waitlist" tab
2. View all students waiting for placement (sorted by priority)
3. Click "Auto-Assign Available Spots" to promote waitlisted students
4. Remove students from waitlist if needed

## Data Persistence

All data is stored in the browser's local storage:
- `academy_students` - Student records
- `academy_classes` - Class records
- `academy_waitlist` - Waitlist entries

**Note**: Data persists only on the same browser. Clearing local storage will delete all data.

## Key Algorithms

### Age-to-Program Mapping
```
Age 6-8   → AI Explorers
Age 9-12  → AI Creators
Age 13-16 → AI Innovators
```

### Priority Scoring
```
Returning Student: +100 points
Has Siblings: +50 points
Time in Waitlist: +10 points per day (max 100)
```

### Assignment Order
1. Unassigned students are sorted by priority
2. Students are matched to classes with available capacity
3. If no space available, student is added to waitlist
4. Waitlist maintains priority order for future assignments

## Responsive Design

- **Mobile**: Single column layout, optimized for touch
- **Tablet**: Two column layout
- **Desktop**: Multi-column grid layouts with expanded features

## Future Enhancements

- Backend API integration for data persistence
- User authentication and role-based access
- Parent/student portal
- Email notifications for assignments
- Sibling pairing logic improvements
- Advanced filtering and reporting
- Export to CSV/PDF
- Calendar integration
- Payment processing

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

© 2024 Transcend AI Academy. All rights reserved.
