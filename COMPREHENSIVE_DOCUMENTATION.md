# Myon Health Medical Billing Platform - Comprehensive Documentation

## Overview

A comprehensive medical billing platform built with Next.js and React Native, designed for healthcare providers in Saskatchewan. Features AI-powered search, patient management, service management, billing claims, and OCR document scanning.

## Core Features

- **AI-Powered Search**: Natural language search for medical billing codes
- **Patient Management**: Track and manage patient information
- **Service Management**: Create and manage medical services
- **Billing Claims**: Generate and process billing claims
- **OCR Document Scanning**: Extract patient information from documents (mobile app)
- **Real-time Updates**: Live status tracking for claims and services

## Tech Stack

### Web Application (Next.js)

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **AI/ML**: OpenAI API for semantic search
- **Vector Search**: pgvector for efficient similarity search
- **Authentication**: NextAuth.js

### Mobile Application (React Native)

- **Framework**: React Native with Expo
- **OCR**: Expo Text Recognition (local processing)
- **UI Components**: React Native Paper
- **State Management**: TanStack Query
- **Navigation**: React Navigation

## Enhanced Camera Text Recognition

### Supported Patient Data Formats

The mobile app now supports multiple patient data formats from different medical institutions:

#### Format 1: Traditional

```
999 999 999 (billing number)
RUH 0055555 V#1310061 (visit number)
PATIENT, NAME L (middle initial)
JAN-01-1954 (birth date) 71y ER M (gender)
ADM: Aug-09-2025 (service date)
UNASSIGEND, PHYSICIAN (attending physician)
```

#### Format 2: MRN Format

```
999 999 999 (billing number)
MRN: RUH 0055555
Admin Date: Aug-01-2025 ER
PATIENT, NAME L
jan-1-1950 (birth date) 75y V#12312324 (visit number) M (gender)
ATN: PHYSICIAN, NAME (attending physician)
FAM: LAST, FIRST MIDDLE (family physician)
```

#### Format 3: Admit Date Format

```
999 999 999
MRN: RUH 1413241
Admit Date: Aug-09-2025 ER
LAST, FIRST (patient name)
SEP-11-1971 (birth date) 53Y V#13100000 (visit number) M (gender)
ATN: LAST, FIRST (attending physician)
FAM: last, first (family physician)
```

#### Format 4: Full Format

```
999 999 999
MRN: SPH 0048106
Admit Date: Aug-08-2025 ER
LAST, FIRST MIDDLE (patient name)
Jun-10-1951 74y V#13099999 (visit number) M (gender)
ATN: LAST, FIRST (attending physician)
FAM: LAST, FIRST (family physician)
```

### New Data Fields

```typescript
export interface PatientData {
  billingNumber: string;
  firstName: string;
  lastName: string;
  middleInitial?: string; // NEW: Middle initial support
  dateOfBirth: string;
  gender: string;
  serviceDate?: string;
  visitNumber?: string; // NEW: Visit number extraction
  attendingPhysician?: string; // NEW: Attending physician name
  familyPhysician?: string; // NEW: Family physician name
}
```

### Key Improvements

1. **Visit Number Extraction**: Handles both "V#12345678" and "V12345678" formats
2. **Family Physician Detection**: Works with "FAM: NAME" and "FAM NAME" patterns
3. **Attending Physician Logic**: Properly handles empty ATN fields
4. **Date Parsing**: Supports Month-Day-Year format with age-based birth date detection
5. **Name Parsing**: Handles middle names and various name formats

### API Integration

- **New Camera Endpoint**: `/api/services/camera` for direct service creation
- **Physician Service**: Automatic physician matching and linking
- **Service Creation**: Complete workflow from camera to database

## Advanced Billing Features

### Day Range Functionality

When a billing code has a day range defined, the system automatically maintains that the difference between the service start date and service end date equals the day range (inclusive).

**Example**: If a code has a day range of 10 days and the start date is June 1, the end date will automatically be set to June 10.

### Previous Codes for Type 57 Billing Codes

When a billing code with billing record type 57 is selected and has previous codes defined, the system automatically sets the service start date to be equal to the previous code's end date + 1 day.

### Max Units Validation

The system prevents users from requesting more units than the maximum allowed for a billing code.

## Getting Started

### Prerequisites

- Node.js 18.x or later
- PostgreSQL 12.x or later
- OpenAI API key

### Web Application Setup

1. Clone and install dependencies:

   ```bash
   git clone [repository-url]
   cd medical-billing
   npm install
   ```

2. Set up environment variables:

   ```bash
   cp .env.example .env
   # Update .env with your database URL, OpenAI API key, etc.
   ```

3. Set up the database:

   ```bash
   npx prisma migrate dev
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Mobile Application Setup

1. Navigate to mobile app directory:

   ```bash
   cd mobile-app
   npm install
   ```

2. Configure environment:

   ```bash
   cp .env.example .env
   # Update API endpoint
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## Usage Examples

### Camera Text Recognition

```typescript
import { textRecognitionService } from "./utils/expoTextRecognitionService";

// Extract text from image
const textResult = await textRecognitionService.extractText(imageUri);

// Parse patient data
const patientData = textRecognitionService.parsePatientData(textResult.text);
```

### Physician Search

```typescript
import { physicianService } from "./services/physicianService";

// Search for physicians
const results = await physicianService.searchReferringPhysicians("SMITH");

// Find best match
const bestMatch = await physicianService.findBestMatchingPhysician(
  "DR. SMITH, JOHN"
);
```

## Project Structure

```
medical-billing/
├── app/                 # Next.js application
│   ├── api/            # API routes
│   ├── components/     # React components
│   └── lib/           # Utility functions
├── mobile-app/         # React Native application
│   ├── src/           # Source code
│   └── assets/        # Mobile assets
├── prisma/            # Database schema and migrations
└── utils/             # Shared utilities
```

## Development Guidelines

1. **Code Style**: Use TypeScript, follow ESLint, use Prettier
2. **Git Workflow**: Create feature branches, write descriptive commits, submit PRs
3. **Testing**: Write unit tests, test on multiple devices, verify OCR accuracy
4. **Security**: Never commit credentials, use environment variables, follow best practices

## Support

For technical support or feature requests:

1. Check existing documentation
2. Review error messages
3. Contact development team

## License

This project is proprietary software of Myon Health.
