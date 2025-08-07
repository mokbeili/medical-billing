# Myon Health Medical Billing Platform

A comprehensive medical billing platform built with Next.js and React Native, designed for healthcare providers in Saskatchewan.

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
- **OCR**: AWS Textract integration
- **UI Components**: React Native Paper
- **State Management**: TanStack Query
- **Navigation**: React Navigation

## Getting Started

### Prerequisites

- Node.js 18.x or later
- PostgreSQL 12.x or later
- OpenAI API key
- AWS credentials (for mobile app OCR)

### Web Application Setup

1. Clone the repository:

   ```bash
   git clone [repository-url]
   cd medical-billing
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   # Update .env with your database URL, OpenAI API key, etc.
   ```

4. Set up the database:

   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Mobile Application Setup

1. Navigate to mobile app directory:

   ```bash
   cd mobile-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment:

   ```bash
   cp .env.example .env
   # Update API endpoint and AWS credentials
   ```

4. Start the development server:

   ```bash
   npm start
   ```

5. Run on emulators:
   - iOS: Press 'i' in terminal or `npm run ios`
   - Android: Press 'a' in terminal or `npm run android`

## Key Features

### 1. AI-Powered Search

- Natural language search for billing codes
- Semantic understanding of medical terminology
- Search history and suggestions
- Vector-based similarity search

### 2. Service Management

- Create and track medical services
- Link services to patients and physicians
- Automatic code validation
- Service status tracking

### 3. Billing Claims

- Generate claims from services
- Track claim status
- Validate claim requirements
- Process batch claims

### 4. Mobile Features

- Document scanning with OCR
- Patient information extraction
- Real-time service creation
- Offline support

### 5. Security

- End-to-end encryption for sensitive data
- Role-based access control
- Secure authentication
- Data privacy compliance

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

1. **Code Style**

   - Use TypeScript for type safety
   - Follow ESLint configuration
   - Use Prettier for formatting

2. **Git Workflow**

   - Create feature branches
   - Write descriptive commit messages
   - Submit PRs for review

3. **Testing**

   - Write unit tests for critical functions
   - Test on multiple devices/browsers
   - Verify OCR accuracy

4. **Security**
   - Never commit sensitive credentials
   - Use environment variables
   - Follow security best practices

## Support

For technical support or feature requests:

1. Check existing documentation
2. Review error messages
3. Contact development team

## License

This project is proprietary software of Myon Health.
