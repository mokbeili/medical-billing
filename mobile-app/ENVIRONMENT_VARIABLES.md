# Environment Variables for AWS Textract

This document explains how to configure AWS Textract credentials using environment variables in the Myon Health mobile app.

## Overview

The app now supports loading AWS Textract credentials from environment variables, with AsyncStorage as a fallback for user-configured credentials. This allows for easier deployment and configuration management.

## Setup Instructions

### 1. Create Environment File

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file with your AWS credentials:
   ```env
   # AWS Textract Configuration
   AWS_ACCESS_KEY_ID=your_actual_access_key_id
   AWS_SECRET_ACCESS_KEY=your_actual_secret_access_key
   AWS_REGION=us-east-1
   ```

### 2. Install Dependencies

Install the required dependencies:

```bash
npm install
```

### 3. Build and Run

The environment variables will be automatically loaded when you build and run the app:

```bash
npm start
```

## Configuration Priority

The app uses the following priority order for AWS credentials:

1. **Environment Variables** (highest priority)

   - Loaded from `.env` file
   - Embedded in app bundle
   - Used if both `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set

2. **AsyncStorage** (fallback)
   - User-configured credentials via the app UI
   - Stored locally on device
   - Used if environment variables are not set

**Note**: The app requires AWS Textract to be configured to function. There is no mock OCR fallback.

## Security Considerations

### Environment Variables

- **Pros**: Easy deployment, no user interaction required
- **Cons**: Credentials embedded in app bundle (visible in decompiled app)
- **Best for**: Development, testing, internal apps

### AsyncStorage (User Configuration)

- **Pros**: Credentials not in app bundle, user controls
- **Cons**: Requires user setup, credentials stored on device
- **Best for**: Production apps, user-controlled credentials

## Production Recommendations

For production apps, consider these more secure approaches:

### 1. AWS Cognito Identity Pools

- Use temporary credentials
- No permanent credentials in app
- Automatic credential rotation

### 2. Backend Proxy

- Make AWS API calls through your backend
- Credentials stored securely on server
- App only communicates with your API

### 3. AWS STS Temporary Credentials

- Generate temporary credentials on backend
- Pass to app for limited time use
- Automatic expiration

## Troubleshooting

### Environment Variables Not Loading

1. Ensure `.env` file exists in the mobile-app directory
2. Check that variable names match exactly (case-sensitive)
3. Restart the development server after changing `.env`
4. Verify `dotenv` dependency is installed

### Credentials Not Working

1. Verify AWS credentials are valid
2. Check IAM permissions for Textract
3. Ensure Textract is available in the specified region
4. Test credentials in AWS Console

### App Still Using AsyncStorage

1. Check that both `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set
2. Verify `.env` file is in the correct location
3. Restart the app completely
4. Check console logs for configuration messages

## Example Configuration

### Development (.env)

```env
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
```

### Production (Backend Proxy)

```env
# No AWS credentials in app
# Use backend API endpoints instead
API_BASE_URL=https://your-backend-api.com
```

## Migration from AsyncStorage

If you previously used AsyncStorage for credentials and want to switch to environment variables:

1. Set up environment variables as described above
2. The app will automatically use environment variables if available
3. User-configured AsyncStorage credentials will be ignored
4. You can clear AsyncStorage credentials if desired

## File Structure

```
mobile-app/
├── .env                    # Environment variables (create this)
├── .env.example           # Example environment file
├── app.config.js          # Expo configuration with env vars
├── src/utils/
│   └── awsTextractService.ts  # Updated to use env vars
└── ENVIRONMENT_VARIABLES.md   # This documentation
```
