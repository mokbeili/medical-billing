# Myon Health Mobile App

A React Native mobile application for the Myon Health medical billing platform, featuring AI-powered search, document scanning, and service management.

## Features

### 1. Document Scanning & OCR

- Camera integration for document capture
- AWS Textract integration for accurate OCR
- Automatic patient information extraction
- Support for multiple document formats

### 2. Service Management

- Create and edit medical services
- Patient and physician selection
- ICD code integration
- Health institution management
- Billing code search and selection

### 3. AI-Powered Search

- Natural language billing code search
- Real-time search results
- Search history tracking
- Offline search capabilities

### 4. User Features

- Secure authentication
- Profile management
- Dashboard with key metrics
- Settings customization

## Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **React Navigation** for routing
- **React Native Paper** for UI
- **TanStack Query** for data management
- **AWS Textract** for OCR
- **Axios** for API communication

## Setup

### Prerequisites

- Node.js v16 or higher
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (macOS) or Android Studio

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment:

   ```bash
   cp .env.example .env
   # Update API endpoint and AWS credentials
   ```

3. Start development server:

   ```bash
   npm start
   ```

4. Run on device/emulator:
   - iOS: `npm run ios`
   - Android: `npm run android`
   - Physical device: Scan QR code with Expo Go

## AWS Textract Setup

1. Create AWS account or use existing one
2. Create IAM user with Textract permissions
3. Add credentials to .env:
   ```
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   AWS_REGION=us-east-1
   ```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── screens/            # Screen components
├── navigation/         # Navigation config
├── services/          # API services
├── utils/             # Utilities
│   ├── awsTextractService.ts
│   └── expoTextRecognitionService.ts
├── contexts/          # React contexts
└── types/            # TypeScript types
```

## Key Features Detail

### 1. Document Scanning

- High-quality image capture
- Document format detection
- Text extraction and parsing
- Data validation

### 2. Service Management

- Create/edit services
- Patient selection/creation
- Billing code search
- Service status tracking

### 3. OCR Processing

- AWS Textract integration
- High accuracy text extraction
- Error handling
- Retry mechanisms

### 4. Data Extraction

- Patient information parsing
- Service date detection
- Form auto-population
- Data validation

## Development

### Adding New Features

1. Create components in appropriate directories
2. Update navigation if needed
3. Add types and services
4. Test thoroughly

### Styling Guidelines

- Use theme constants
- Follow design system
- Maintain responsive layouts
- Support dark mode

## Building for Production

### Using EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Configure
eas configure

# Build
eas build --platform ios
eas build --platform android
```

### Manual Builds

```bash
# iOS
npx expo build:ios

# Android
npx expo build:android
```

## Troubleshooting

### Common Issues

1. **Camera/OCR Issues**

   - Check permissions
   - Verify AWS credentials
   - Test with sample documents

2. **API Connection**

   - Verify API endpoint
   - Check network connection
   - Validate authentication

3. **Build Issues**
   - Clear Metro cache
   - Rebuild node_modules
   - Update Expo SDK

## Performance

### Optimization Tips

- Optimize images before OCR
- Use caching strategies
- Implement offline support
- Monitor AWS usage

### AWS Textract Costs

- Free tier: 1,000 pages/month
- Standard pricing: $1.50/1,000 pages
- Monitor usage for cost control

## Security

### Best Practices

- Secure credential storage
- Data encryption
- Permission management
- Regular security updates

## Support

For technical issues:

1. Check documentation
2. Review error messages
3. Test with sample data
4. Contact development team

## Contributing

1. Follow code style guide
2. Write clear commit messages
3. Test thoroughly
4. Submit detailed PRs

## License

This project is proprietary software of Myon Health.
