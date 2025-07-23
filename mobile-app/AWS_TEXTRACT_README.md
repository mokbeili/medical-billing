# AWS Textract Integration

This document describes the AWS Textract integration for real OCR functionality in the Myon Health mobile app.

## Overview

AWS Textract is Amazon's machine learning service that automatically extracts text, handwriting, and data from scanned documents. This integration provides real, production-ready text extraction for the Myon Health mobile app.

## Features

### 1. Real OCR Processing

- **High Accuracy**: AWS Textract provides industry-leading OCR accuracy
- **Multiple Formats**: Supports various document formats and layouts
- **Handwriting Recognition**: Can extract handwritten text
- **Confidence Scores**: Provides confidence levels for extracted text

### 2. Environment-Based Configuration

- **Environment Variables**: Load AWS credentials from `.env` file
- **Auto-Loading**: Automatically loads configuration on app startup
- **No Manual Configuration**: Credentials must be set via environment variables

### 3. Error Handling

- **Comprehensive Error Handling**: Handles various AWS Textract failure scenarios
- **User Guidance**: Provides clear error messages and configuration guidance
- **Retry Options**: Users can retry failed operations

## Setup Instructions

### 1. Environment Variables Setup

1. **Create Environment File**

   ```bash
   cp .env.example .env
   ```

2. **Add AWS Credentials**
   Edit the `.env` file with your AWS credentials:

   ```env
   AWS_ACCESS_KEY_ID=your_aws_access_key_id
   AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
   AWS_REGION=us-east-1
   ```

3. **Install Dependencies**

   ```bash
   npm install
   ```

4. **Start the App**
   ```bash
   npm start
   ```

The app will automatically use these credentials. See `ENVIRONMENT_VARIABLES.md` for detailed instructions.

### 2. AWS Account Setup

1. **Create AWS Account**

   - Go to [AWS Console](https://aws.amazon.com/)
   - Create a new account or sign in to existing account

2. **Create IAM User**
   - Navigate to IAM (Identity and Access Management)
   - Create a new user for the mobile app
   - Attach the following policy:

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

3. **Generate Access Keys**
   - Select the created IAM user
   - Go to "Security credentials" tab
   - Create new access key
   - Save the Access Key ID and Secret Access Key

## Implementation Details

### Files Structure

```
src/
├── utils/
│   └── awsTextractService.ts    # AWS Textract service
├── screens/
│   └── CameraScanScreen.tsx    # Camera scanning interface
└── navigation/
    └── AppNavigator.tsx        # Navigation
```

### Key Components

#### 1. AWSTextractService (`src/utils/awsTextractService.ts`)

```typescript
export class AWSTextractService {
  // Configure AWS credentials
  configure(credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    region?: string;
  });

  // Extract text from image
  async extractText(imageUri: string): Promise<TextractResult>;

  // Parse patient data from extracted text
  parsePatientData(text: string): PatientData | null;
}
```

#### 2. CameraScanScreen (`src/screens/CameraScanScreen.tsx`)

- Detects if AWS is configured
- Shows OCR status (AWS Textract)
- Handles AWS Textract errors gracefully
- Displays confidence scores

### Data Flow

1. **Image Capture**: User takes photo or selects image
2. **Configuration Check**: App checks if AWS is configured via environment variables
3. **OCR Processing**:
   - If AWS configured: Use AWS Textract
   - If AWS not configured: Show error message
   - If AWS fails: Show error and retry options
4. **Text Parsing**: Extract patient information from OCR text
5. **Form Population**: Auto-populate service form

## Security Considerations

### Credential Storage

- **Environment Variables**: Credentials loaded from `.env` file
- **No Local Storage**: Credentials not stored on device
- **Build-time Configuration**: Credentials embedded in app bundle

### AWS Security

- **IAM Best Practices**: Use least privilege principle
- **Access Key Rotation**: Regularly rotate access keys
- **Monitoring**: Monitor AWS usage and costs

### Data Privacy

- **Local Processing**: Images processed locally before sending to AWS
- **No Image Storage**: Images not stored in AWS
- **Text Only**: Only extracted text is processed

## Error Handling

### Common AWS Errors

1. **InvalidSignatureException**

   - Invalid access key or secret
   - Solution: Check credentials

2. **AccessDenied**

   - Insufficient IAM permissions
   - Solution: Add required Textract permissions

3. **ThrottlingException**

   - Too many requests
   - Solution: Wait and retry

4. **No text detected**
   - Image quality issues
   - Solution: Retry with clearer image

### Error Handling Strategy

```typescript
try {
  // Try AWS Textract
  const result = await textractService.extractText(imageUri);
} catch (error) {
  // Show error and provide configuration options
  Alert.alert(
    "AWS Error",
    "Failed to process image. Please check your configuration.",
    [
      {
        text: "Configure AWS",
        onPress: () => navigation.navigate("AWSConfig"),
      },
      { text: "Try Again", style: "cancel" },
    ]
  );
}
```

## Performance Considerations

### Response Times

- **AWS Textract**: 2-5 seconds (depends on image size)
- **Network**: Additional latency for AWS API calls

### Image Optimization

- **Quality**: 0.8 (80% quality for good balance)
- **Size**: Automatic compression
- **Format**: JPEG for optimal AWS processing

### Cost Management

- **AWS Pricing**: Pay per document processed
- **Free Tier**: 1,000 pages per month free
- **Monitoring**: Track usage to manage costs

## Testing

### Test Scenarios

1. **Valid Document**

   - Complete patient information
   - High confidence extraction

2. **Partial Information**

   - Missing some fields
   - Graceful handling

3. **Poor Image Quality**

   - Blurry or low-resolution images
   - Error handling and retry options

4. **AWS Failures**
   - Network issues
   - Invalid credentials
   - Fallback behavior

## Troubleshooting

### AWS Configuration Issues

1. **Credentials Not Working**

   - Verify access key and secret
   - Check IAM permissions
   - Test in AWS Console

2. **Region Issues**

   - Ensure Textract is available in selected region
   - Use us-east-1 for best availability

3. **Network Issues**
   - Check internet connection
   - Verify firewall settings
   - Test AWS connectivity

### App Issues

1. **Configuration Not Loading**

   - Check that `.env` file exists and has correct format
   - Verify environment variable names are correct
   - Restart the development server after changing `.env`

2. **OCR Not Working**
   - Verify image quality
   - Check document format
   - Try different image

## Future Enhancements

### 1. Advanced Textract Features

- **Form Analysis**: Extract form fields and tables
- **Handwriting Recognition**: Better handwritten text support
- **Multi-page Documents**: Process multiple pages

### 2. Enhanced Security

- **Key Encryption**: Encrypt stored credentials
- **Biometric Auth**: Require biometric for AWS access
- **Credential Rotation**: Automatic key rotation

### 3. Performance Improvements

- **Caching**: Cache OCR results
- **Batch Processing**: Process multiple images
- **Offline Support**: Queue for later processing

### 4. Analytics

- **Usage Tracking**: Monitor OCR usage
- **Accuracy Metrics**: Track extraction accuracy
- **Cost Monitoring**: Track AWS costs

## Support

For AWS Textract issues:

1. Check AWS Console for service status
2. Review AWS Textract documentation
3. Contact AWS support if needed

For app integration issues:

1. Check this documentation
2. Review error messages in app
3. Test with sample documents
4. Contact development team

## Cost Estimation

### AWS Textract Pricing (US East - N. Virginia)

- **Synchronous Operations**: $1.50 per 1,000 pages
- **Asynchronous Operations**: $0.60 per 1,000 pages
- **Free Tier**: 1,000 pages per month

### Example Usage

- 100 documents per month = $0.15
- 1,000 documents per month = $1.50
- 10,000 documents per month = $15.00

_Prices may vary by region and are subject to change_
