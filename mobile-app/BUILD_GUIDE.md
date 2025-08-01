# Myon Health Mobile App - Build Guide

This guide explains how to set up preview builds for iOS and Android, and configure AWS environment variables.

## Prerequisites

1. **Expo Account**: Sign up at [expo.dev](https://expo.dev)
2. **EAS CLI**: Install the Expo Application Services CLI
   ```bash
   npm install -g @expo/eas-cli
   ```
3. **AWS Account**: For AWS Textract functionality
4. **Apple Developer Account**: For iOS builds (optional for preview)
5. **Google Play Console**: For Android builds (optional for preview)

## Quick Start

### 1. Setup Environment Variables

```bash
# Run the setup script
chmod +x scripts/setup-env.sh
./scripts/setup-env.sh

# Or manually create .env file
cp .env.example .env
```

Edit the `.env` file with your credentials:

```env
AWS_ACCESS_KEY_ID=your_actual_access_key_id
AWS_SECRET_ACCESS_KEY=your_actual_secret_access_key
AWS_REGION=us-east-1
API_BASE_URL=https://your-backend-api.com
APP_ENV=development
```

### 2. Login to Expo

```bash
eas login
```

### 3. Build Preview Versions

```bash
# Build for both platforms
npm run build:preview

# Or build individually
npm run build:preview:ios
npm run build:preview:android
```

## Build Profiles

### Preview Builds

- **Distribution**: Internal (for testing)
- **iOS**: APK format, Release configuration
- **Android**: APK format
- **Environment**: Preview environment variables

### Production Builds

- **Distribution**: Store-ready
- **iOS**: App Store format
- **Android**: AAB format
- **Environment**: Production environment variables

## Environment Variables

### Required Variables

| Variable                | Description                 | Example                                    |
| ----------------------- | --------------------------- | ------------------------------------------ |
| `AWS_ACCESS_KEY_ID`     | AWS access key for Textract | `AKIAIOSFODNN7EXAMPLE`                     |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for Textract | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION`            | AWS region for services     | `us-east-1`                                |

### Optional Variables

| Variable       | Description     | Default                        |
| -------------- | --------------- | ------------------------------ |
| `API_BASE_URL` | Backend API URL | `https://your-backend-api.com` |
| `APP_ENV`      | App environment | `development`                  |

## Build Commands

### Available Scripts

```bash
# Setup environment variables
npm run setup:env

# Build preview for both platforms
npm run build:preview

# Build preview for specific platform
npm run build:preview:ios
npm run build:preview:android

# Build production for both platforms
npm run build:production
```

### Manual EAS Commands

```bash
# Preview builds
eas build --platform ios --profile preview
eas build --platform android --profile preview

# Production builds
eas build --platform all --profile production

# Development builds
eas build --platform all --profile development
```

## Build Configuration

### EAS Configuration (`eas.json`)

The build profiles are configured in `eas.json`:

- **Development**: Internal distribution, APK format
- **Preview**: Internal distribution, Release configuration
- **Production**: Store-ready, auto-incrementing versions

### App Configuration (`app.config.ts`)

Environment variables are loaded in `app.config.ts` and made available to the app through the `extra` object.

## Troubleshooting

### Common Issues

1. **Build Fails with AWS Errors**

   - Verify AWS credentials are correct
   - Check IAM permissions for Textract
   - Ensure region is correct

2. **Environment Variables Not Loading**

   - Restart development server after changing `.env`
   - Verify `.env` file is in the correct location
   - Check variable names are correct (case-sensitive)

3. **EAS Build Fails**
   - Ensure you're logged in: `eas login`
   - Check project ID in `app.config.ts`
   - Verify EAS CLI version: `eas --version`

### Build Logs

View build logs and status:

```bash
# List recent builds
eas build:list

# View specific build
eas build:view [BUILD_ID]
```

## Security Best Practices

### Development

- Use separate AWS credentials for development
- Never commit `.env` files to version control
- Use environment-specific configurations

### Production

- Consider using AWS Cognito Identity Pools
- Use backend proxy for AWS API calls
- Implement proper credential rotation

## Next Steps

After successful builds:

1. **Download builds** from the Expo dashboard
2. **Test on devices** to ensure functionality
3. **Distribute to testers** using internal distribution
4. **Submit to stores** when ready for production

## Support

- **Expo Documentation**: [docs.expo.dev](https://docs.expo.dev)
- **EAS Build Documentation**: [docs.expo.dev/build/introduction](https://docs.expo.dev/build/introduction)
- **AWS Textract Documentation**: [docs.aws.amazon.com/textract](https://docs.aws.amazon.com/textract)
