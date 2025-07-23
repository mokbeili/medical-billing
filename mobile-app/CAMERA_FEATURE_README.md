# Camera Scanning Feature

This document describes the camera scanning functionality added to the Myon Health mobile app for scanning patient documents and automatically extracting patient information.

## Overview

The camera scanning feature allows users to:

- Take photos of patient documents using the device camera
- Select existing images from the photo library
- Automatically extract patient information using OCR (Optical Character Recognition)
- Populate the service form with scanned data
- Set service dates from scanned documents

## Features

### 1. Document Scanning

- **Camera Integration**: Uses Expo Image Picker for camera access
- **Photo Library**: Allows selection of existing images
- **Image Processing**: Supports image editing and quality optimization

### 2. OCR Text Extraction

- **Text Recognition**: Extracts text from scanned images
- **Pattern Matching**: Identifies specific patient information patterns
- **Data Validation**: Ensures extracted data meets requirements

### 3. Patient Information Extraction

The system extracts the following information from patient documents:

- **Billing Number**: 9-digit number following "SK#"
- **Patient Name**: Parsed from "LASTNAME, FIRSTNAME" format
- **Date of Birth**: Converted from DD-MMM-YYYY format
- **Gender**: M or F from the document
- **Service Date**: Admit date if present (DD-MMM-YYYY format)

### 4. Form Integration

- **Auto-population**: Automatically fills patient form fields
- **Patient Matching**: Checks if patient already exists in system
- **Service Date**: Sets service date from scanned document
- **Validation**: Ensures data integrity before form submission

## Document Format

The system is designed to work with patient documents in this format:

```
SK# 790112233			V# 4433221100
MRN: 0123456
DOE, JORDAN
01-JAN-1975		50YR		M		RGH
Admit Date: 15-FEB-2025
….
```

### Required Fields

- **SK#**: Billing number (9 digits)
- **MRN**: Medical record number
- **Patient Name**: Last name, first name format
- **Date of Birth**: DD-MMM-YYYY format
- **Gender**: M or F

### Optional Fields

- **Admit Date**: Service date in DD-MMM-YYYY format

## Implementation Details

### Dependencies

```json
{
  "expo-camera": "~14.1.5",
  "expo-image-picker": "~15.0.0",
  "expo-image-manipulator": "~12.0.0",
  "expo-media-library": "~16.0.0"
}
```

### Permissions

The app requires the following permissions:

**iOS (app.json)**:

```json
{
  "infoPlist": {
    "NSCameraUsageDescription": "This app needs access to camera to scan patient information from documents.",
    "NSPhotoLibraryUsageDescription": "This app needs access to photo library to select patient documents for scanning."
  }
}
```

**Android (app.json)**:

```json
{
  "permissions": [
    "android.permission.CAMERA",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE"
  ]
}
```

### OCR Service

The OCR functionality is implemented in `src/utils/ocrService.ts`:

- **Mock Implementation**: Currently uses mock data for testing
- **Cloud Integration Ready**: Designed for easy integration with cloud OCR services
- **Text Parsing**: Extracts structured data from OCR text output

### Navigation Integration

The camera screen is integrated into the navigation stack:

```typescript
// In AppNavigator.tsx
<Stack.Screen name="CameraScan" component={CameraScanScreen} />
```

## Usage

### 1. Accessing Camera Scan

- Navigate to the Service Form screen
- Tap the camera icon next to "Patient" or "Service / Admit Date"
- Choose "Take Photo" or "Select from Gallery"

### 2. Scanning Process

1. **Capture/Select Image**: Take photo or choose existing image
2. **Processing**: OCR processes the image (2-3 seconds)
3. **Review**: View extracted information
4. **Confirm**: Use data or try again

### 3. Form Population

- **Existing Patient**: If patient exists, automatically selects them
- **New Patient**: Populates new patient form with scanned data
- **Service Date**: Sets service date if found in document

## Future Enhancements

### 1. Real OCR Integration

Use AWS Textract for OCR processing:

- **Google Cloud Vision API**
- **Azure Computer Vision**
- **AWS Textract**
- **Tesseract.js** (client-side)

### 2. Enhanced Pattern Recognition

- Support multiple document formats
- Improve text parsing accuracy
- Add support for handwritten text

### 3. Batch Processing

- Scan multiple documents at once
- Bulk patient creation
- Batch service date assignment

### 4. Image Quality Enhancement

- Auto-crop and rotate images
- Improve image quality before OCR
- Support for different lighting conditions

## Testing

### Mock Data

The current implementation uses AWS Textract for real OCR processing:

```typescript
const const mockText = `SK# 120887756			V# 1122334455
MRN: 6543210
TEXT, MOCK
11-NOV-1999		50YR		F		RGH
Admit Date: 30-JUN-2025
….`;
```

### Test Scenarios

1. **Valid Document**: Complete patient information
2. **Missing Fields**: Partial information handling
3. **Invalid Format**: Error handling for unrecognized formats
4. **Existing Patient**: Duplicate patient detection
5. **New Patient**: New patient creation flow

## Error Handling

### Common Issues

- **Permission Denied**: Camera/photo library access denied
- **OCR Failure**: Unable to extract text from image
- **Invalid Format**: Document doesn't match expected format
- **Network Issues**: Cloud OCR service unavailable

### User Feedback

- Clear error messages for each failure scenario
- Guidance on how to resolve issues
- Option to retry or manually enter data

## Security Considerations

### Data Privacy

- Images are processed locally or in secure cloud services
- No patient data is stored in image format
- OCR results are immediately converted to structured data

### Permission Management

- Minimal required permissions
- Clear permission descriptions
- Graceful handling of denied permissions

## Performance Considerations

### Image Processing

- Optimized image quality for OCR accuracy
- Reasonable file size limits
- Efficient memory usage

### Response Time

- AWS Textract: ~2-5 seconds
- Cloud OCR: Depends on service and network
- UI feedback during processing

## Troubleshooting

### Camera Not Working

1. Check camera permissions
2. Restart the app
3. Check device camera functionality

### OCR Not Working

1. Ensure clear, well-lit images
2. Check document format matches expected pattern
3. Verify image quality and orientation

### Form Not Populating

1. Check if patient already exists
2. Verify extracted data format
3. Check for validation errors

## Support

For issues with the camera scanning feature:

1. Check this documentation
2. Review error messages in the app
3. Test with sample documents
4. Contact development team for technical issues
