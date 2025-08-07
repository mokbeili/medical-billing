# Migration from AWS Textract to Expo Text Recognition

This document describes the migration from AWS Textract to expo-text-recognition for text extraction in the mobile app.

## Overview

The mobile app has been updated to use `expo-text-recognition` instead of AWS Textract for OCR (Optical Character Recognition) functionality. This change provides several benefits:

### Benefits of the Migration

1. **No AWS Configuration Required**: No need to set up AWS credentials or configure AWS services
2. **Offline Capability**: Text recognition works entirely on-device without internet connectivity
3. **Faster Processing**: Local processing eliminates network latency
4. **Privacy**: No data is sent to external services
5. **Cost Savings**: No AWS charges for text recognition

### Technical Changes

#### New Service: `expoTextRecognitionService.ts`

- **Location**: `src/utils/expoTextRecognitionService.ts`
- **API**: Maintains the same interface as the previous AWS Textract service
- **Method**: Uses `TextRecognition.getTextFromFrame()` for text extraction
- **Configuration**: Always configured (no external dependencies)

#### Updated Components

- **CameraScanScreen**: Updated to use the new service
- **UI Updates**: Changed references from "AWS Textract" to "Local Text Recognition"
- **Error Handling**: Updated error messages to reflect local processing

### API Compatibility

The new service maintains the same interface as the AWS Textract service:

```typescript
interface TextRecognitionResult {
  text: string;
  confidence: number;
  blocks: any[];
}

interface PatientData {
  billingNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  serviceDate?: string;
}
```

### Usage

The service is used exactly the same way as before:

```typescript
import textRecognitionService from "../utils/expoTextRecognitionService";

// Extract text from image
const result = await textRecognitionService.extractText(imageUri);

// Parse patient data
const patientData = textRecognitionService.parsePatientData(result.text);
```

### Dependencies

The following dependency has been added to `package.json`:

```json
{
  "expo-text-recognition": "^0.1.1"
}
```

### Migration Steps Completed

1. ✅ Created new `expoTextRecognitionService.ts` with same interface
2. ✅ Updated `CameraScanScreen.tsx` to use new service
3. ✅ Updated UI text and error messages
4. ✅ Maintained all existing functionality
5. ✅ Verified TypeScript compilation

### Testing

To test the new implementation:

1. Run the app: `npm start`
2. Navigate to the camera scan screen
3. Take a photo or select an image
4. Verify that text recognition works as expected
5. Check that patient data parsing still works correctly

### Rollback

If you need to rollback to AWS Textract:

1. Replace the import in `CameraScanScreen.tsx`:
   ```typescript
   import textractService from "../utils/awsTextractService";
   ```
2. Update all references from `textRecognitionService` to `textractService`
3. Restore AWS configuration in environment variables

### Notes

- The `awsTextractService.ts` file has been kept for reference but is no longer used
- All patient data parsing logic remains identical
- The confidence score is set to 0.8 (80%) as a default since expo-text-recognition doesn't provide per-block confidence
- The service is always considered "configured" since it doesn't require external setup
