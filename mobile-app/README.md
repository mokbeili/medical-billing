# Myon Health Mobile App

A React Native mobile application for medical billing with AI-powered search, document scanning, and service management.

## Quick Start

### Prerequisites

- Node.js v16+
- Expo CLI: `npm install -g @expo/cli`
- AWS Account (for OCR functionality)

### Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env
   # Add your AWS credentials and API endpoint
   ```

3. **Start development:**

   ```bash
   npm start
   ```

## Features

- **Document Scanning**: Camera integration with AWS Textract OCR
- **Service Management**: Create and edit medical services
- **AI Search**: Natural language billing code search
- **Patient Management**: Add and manage patients
- **Billing Codes**: Search and select billing codes

## AWS Setup

1. Create AWS account
2. Create IAM user with Textract permissions:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["textract:DetectDocumentText", "textract:AnalyzeDocument"],
         "Resource": "*"
       }
     ]
   }
   ```

3. Add credentials to `.env`:

   ```env
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   AWS_REGION=us-east-1
   ```

## Build Commands

```bash
# Preview builds
npm run build:preview

# Production builds
npm run build:production
```

## Key Screens

### Services Management

- **ServicesScreen**: View and filter all services
- **NewServiceScreen**: Create new services
- **EditServiceScreen**: Edit existing services
- **BillingCodeSearchScreen**: Search billing codes

### Document Scanning

- Camera integration for patient document scanning
- AWS Textract OCR for text extraction
- Auto-population of patient information
- Supports documents with SK# billing numbers

## Document Scanning Details

### Patient Information Extraction

Extracts the following from patient documents:

- **Billing Number**: 9-digit number following "SK#"
- **Patient Name**: Parsed from "LASTNAME, FIRSTNAME" format
- **Date of Birth**: Converted from DD-MMM-YYYY format
- **Gender**: M or F from document
- **Service Date**: Admit date if present (DD-MMM-YYYY format)

### Document Format

Designed for documents in this format:

```
SK# 790112233			V# 4433221100
MRN: 0123456
DOE, JORDAN
01-JAN-1975		50YR		M		RGH
Admit Date: 15-FEB-2025
```

### Required Fields

- **SK#**: Billing number (9 digits)
- **MRN**: Medical record number
- **Patient Name**: Last name, first name format
- **Date of Birth**: DD-MMM-YYYY format
- **Gender**: M or F

### Optional Fields

- **Admit Date**: Service date in DD-MMM-YYYY format

## Services Screens

### ServicesScreen (Services List)

- **Location**: `src/screens/ServicesScreen.tsx`
- **Purpose**: Display all services with filtering and selection
- **Features**:
  - View services with patient info, dates, and billing codes
  - Filter by patient name, billing number, service date, code, section
  - Select multiple services for claim creation
  - Create claims from selected services
  - Navigate to edit individual services
  - Add new services

### NewServiceScreen (Create Service)

- **Location**: `src/screens/NewServiceScreen.tsx`
- **Purpose**: Form to create new services
- **Features**:
  - Select physician and patient
  - Create new patients inline
  - Set service date
  - Search and select ICD codes
  - Search and select referring physicians
  - Select health institution
  - Add billing codes via search
  - Write service summary

### EditServiceScreen (Edit Service)

- **Location**: `src/screens/EditServiceScreen.tsx`
- **Purpose**: Form to edit existing services
- **Features**:
  - Pre-populated with existing service data
  - Same form fields as NewServiceScreen
  - Update service information
  - Modify billing codes

### BillingCodeSearchScreen (Billing Code Search)

- **Location**: `src/screens/BillingCodeSearchScreen.tsx`
- **Purpose**: Search and select billing codes
- **Features**:
  - Search billing codes by title or code
  - Display code details with section and jurisdiction
  - Select codes to add to services

## Navigation Structure

```
MainTabs
├── Search (AI Search)
├── Services (ServicesStack)
│   ├── ServicesList (ServicesScreen)
│   ├── NewService (NewServiceScreen)
│   ├── EditService (EditServiceScreen)
│   └── BillingCodeSearch (BillingCodeSearchScreen)
└── Profile
```

## API Integration

The screens use these API endpoints:

- `servicesAPI.getAll()` - Get all services
- `servicesAPI.getById(id)` - Get specific service
- `servicesAPI.create(data)` - Create new service
- `servicesAPI.update(id, data)` - Update service
- `physiciansAPI.getAll()` - Get all physicians
- `patientsAPI.getAll()` - Get all patients
- `patientsAPI.create(data)` - Create new patient
- `icdCodesAPI.search(query)` - Search ICD codes
- `referringPhysiciansAPI.search(query)` - Search referring physicians
- `healthInstitutionsAPI.getAll()` - Get all health institutions
- `billingCodesAPI.search(query)` - Search billing codes

## Key Features

### Service Selection and Claim Creation

- Select multiple services with same physician and jurisdiction
- Group selected services into claims
- Services already claimed are marked and cannot be selected

### Patient Management

- View existing patients
- Create new patients directly from service form
- Patient validation with required fields

### Billing Code Management

- Search and add billing codes to services
- Remove billing codes from services
- Display code details including section and jurisdiction

### Search and Filtering

- Real-time search for ICD codes and referring physicians
- Filter services by various criteria
- Responsive search results

## AWS Textract Integration

### Features

- **Real OCR Processing**: High accuracy text extraction
- **Multiple Formats**: Supports various document layouts
- **Handwriting Recognition**: Extracts handwritten text
- **Confidence Scores**: Provides extraction confidence levels

### Implementation

- **Key Files**:
  - `src/utils/awsTextractService.ts` - AWS Textract service
  - `src/screens/CameraScanScreen.tsx` - Camera interface

### Data Flow

1. **Image Capture** → User takes photo
2. **AWS Processing** → Textract extracts text
3. **Text Parsing** → Extract patient information
4. **Form Population** → Auto-fill service form

### Error Handling

- **InvalidSignatureException**: Check credentials
- **AccessDenied**: Verify IAM permissions
- **ThrottlingException**: Wait and retry
- **No text detected**: Try clearer image

### Performance & Costs

- **Response Time**: 2-5 seconds per document
- **Free Tier**: 1,000 pages/month
- **Standard Pricing**: $1.50/1,000 pages

### Security

- Credentials loaded from environment variables
- No local credential storage
- Images processed locally before AWS

## Environment Variables

### Quick Setup

1. Create `.env` file: `cp .env.example .env`
2. Add AWS credentials:
   ```env
   AWS_ACCESS_KEY_ID=your_actual_access_key_id
   AWS_SECRET_ACCESS_KEY=your_actual_secret_access_key
   AWS_REGION=us-east-1
   ```
3. Start app: `npm start`

### Configuration

- **Environment Variables**: Loaded from `.env` file
- **Embedded in app bundle**: Credentials included in build
- **Required**: Both `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

**Note**: AWS Textract must be configured for the app to function.

### Security Considerations

- **Current Approach**: Easy deployment, credentials embedded in app bundle
- **Best for**: Development, testing, internal apps
- **Production Recommendations**:
  1. **AWS Cognito Identity Pools** - Temporary credentials
  2. **Backend Proxy** - Make AWS calls through your server
  3. **AWS STS Temporary Credentials** - Generate temporary keys

## Build Configuration

### Build Profiles

| Profile    | Distribution | Format  | Use Case   |
| ---------- | ------------ | ------- | ---------- |
| Preview    | Internal     | APK     | Testing    |
| Production | Store-ready  | AAB/iOS | App stores |

### Environment Variables

#### Required

- `AWS_ACCESS_KEY_ID` - AWS access key for Textract
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for Textract
- `AWS_REGION` - AWS region (e.g., us-east-1)

#### Optional

- `API_BASE_URL` - Backend API URL
- `APP_ENV` - App environment (development/production)

## Usage

### Services

1. **View Services**: Navigate to Services tab to see all services
2. **Create Service**: Tap "+" button to create new service
3. **Edit Service**: Tap on any service card to edit it
4. **Create Claims**: Select multiple services and tap "Create Claim"
5. **Filter Services**: Use filter inputs to find specific services

### Document Scanning

1. **Access Camera Scan**: Navigate to Service Form screen, tap camera icon
2. **Scanning Process**: Take photo or choose existing image, OCR processes (2-3 seconds)
3. **Form Population**: Automatically selects existing patient or populates new patient form

## Project Structure

```
src/
├── components/     # Reusable UI components
├── screens/        # Screen components
├── navigation/     # Navigation config
├── services/       # API services
├── utils/          # Utilities (OCR, etc.)
├── contexts/       # React contexts
└── types/          # TypeScript types
```

## Tech Stack

- React Native with Expo
- TypeScript
- React Navigation
- React Native Paper
- AWS Textract for OCR
- TanStack Query for data management

## Dependencies

- React Navigation for screen navigation
- React Query for data fetching and caching
- React Native Paper for UI components
- Expo Vector Icons for icons
- Axios for API communication

## Permissions

### iOS (app.json)

```json
{
  "infoPlist": {
    "NSCameraUsageDescription": "This app needs access to camera to scan patient information from documents.",
    "NSPhotoLibraryUsageDescription": "This app needs access to photo library to select patient documents for scanning."
  }
}
```

### Android (app.json)

```json
{
  "permissions": [
    "android.permission.CAMERA",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE"
  ]
}
```

## Troubleshooting

### Common Issues

1. **AWS Credentials**: Verify access key and secret
2. **Environment Variables**: Check `.env` file format and restart server
3. **Build Issues**: Clear Metro cache and rebuild node_modules

### AWS Configuration Issues

#### Credentials Not Working

1. Verify access key and secret
2. Check IAM permissions
3. Test in AWS Console

#### App Issues

1. Check `.env` file exists and format
2. Restart development server
3. Verify environment variable names

### Build Issues

1. **Build Fails with AWS Errors**

   - Verify AWS credentials
   - Check IAM permissions for Textract
   - Ensure region is correct

2. **Environment Variables Not Loading**

   - Restart development server after changing `.env`
   - Verify `.env` file location and format
   - Check variable names (case-sensitive)

3. **EAS Build Fails**
   - Ensure logged in: `eas login`
   - Check project ID in `app.config.ts`
   - Verify EAS CLI version: `eas --version`

### Camera/OCR Issues

1. **Camera Not Working**

   - Check camera permissions
   - Restart the app
   - Check device camera functionality

2. **OCR Not Working**

   - Ensure clear, well-lit images
   - Check document format matches expected pattern
   - Verify image quality and orientation

3. **Form Not Populating**
   - Check if patient already exists
   - Verify extracted data format
   - Check for validation errors

### Performance

- AWS Textract: 2-5 seconds per document
- Free tier: 1,000 pages/month
- Standard pricing: $1.50/1,000 pages

## Security

### Development

- Use separate AWS credentials for development
- Never commit `.env` files to version control

### Production

- Consider AWS Cognito Identity Pools
- Use backend proxy for AWS API calls
- Implement credential rotation

## Support

For issues:

1. Check the documentation files
2. Review error messages
3. Contact development team

## License

Proprietary software of Myon Health.
