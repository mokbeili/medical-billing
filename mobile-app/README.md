# Myon Health Mobile App

A React Native mobile application that mirrors the Myon Health web application for medical billing in Saskatchewan. This mobile app provides AI-powered search functionality for medical billing codes and administrative features.

## Features

- **AI-Powered Search**: Search medical billing codes using natural language or code numbers
- **Dashboard**: Admin interface for managing billing codes and AI prompts
- **User Authentication**: Sign in/sign up functionality
- **Profile Management**: User profile and settings
- **Responsive Design**: Optimized for mobile devices

## Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **React Navigation** for navigation
- **React Native Paper** for UI components
- **TanStack Query** for data fetching
- **Axios** for API communication

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development) - requires Xcode on macOS
- Android Studio (for Android development) - requires Android SDK and emulator

## Local Development Setup

This app is configured to run locally on iOS and Android emulators without requiring development builds from Expo/EAS.

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Endpoint

Update the `API_BASE_URL` in `src/services/api.ts` to point to your Next.js backend:

```typescript
const API_BASE_URL = __DEV__
  ? "http://localhost:3000"
  : "https://www.myonhealth.ca";
```

### 3. Start the Development Server

```bash
npm start
```

### 4. Run on Emulators

- **iOS Simulator**: Press `i` in the terminal or run `npm run ios`
- **Android Emulator**: Press `a` in the terminal or run `npm run android`
- **Physical Device**: Scan the QR code with the Expo Go app

### 5. Development Workflow

The app will automatically reload when you make changes to the code. You can:

- Use the Expo DevTools in your browser for debugging
- Enable React Native Debugger for better debugging experience
- Use the React Native Flipper plugin for advanced debugging

## Project Structure

```
src/
├── components/          # Reusable UI components
├── navigation/          # Navigation configuration
├── screens/            # Screen components
│   ├── HomeScreen.tsx
│   ├── SearchScreen.tsx
│   ├── DashboardScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── SignInScreen.tsx
│   └── SignUpScreen.tsx
├── services/           # API services
│   └── api.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── utils/              # Utility functions
│   └── theme.ts
└── hooks/              # Custom React hooks
```

## API Integration

The mobile app communicates with the Next.js backend through REST API endpoints:

- **Search**: `/api/search` - AI-powered billing code search
- **Authentication**: `/api/auth/*` - User authentication endpoints
- **Billing Codes**: `/api/billing-codes` - Billing code management
- **AI Prompts**: `/api/ai-prompts` - AI prompt management

## Development

### Adding New Screens

1. Create a new screen component in `src/screens/`
2. Add the screen to the navigation in `src/navigation/AppNavigator.tsx`
3. Update types if needed in `src/types/index.ts`

### Styling

The app uses a consistent design system with:

- Primary color: `#2563eb` (blue)
- Background: `#f8fafc` (light gray)
- Text colors: `#1e293b` (dark), `#64748b` (medium), `#94a3b8` (light)

### State Management

- **TanStack Query**: For server state management
- **React State**: For local component state
- **Navigation State**: Managed by React Navigation

## Building for Production

### Using EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Build for production
eas build --platform ios
eas build --platform android
```

### Using Expo Classic Build (Deprecated)

```bash
npx expo build:ios
npx expo build:android
```

## Troubleshooting

### Common Issues

1. **API Connection Error**: Ensure the Next.js backend is running and the API_BASE_URL is correct
2. **Navigation Issues**: Check that all screen components are properly exported
3. **TypeScript Errors**: Run `npx tsc --noEmit` to check for type errors
4. **Emulator Not Found**: Make sure you have Xcode (iOS) or Android Studio (Android) properly installed
5. **Metro Bundler Issues**: Try clearing the cache with `npx expo start --clear`

### Development Tips

- Use Expo DevTools for debugging
- Enable React Native Debugger for better debugging experience
- Use the React Native Flipper plugin for advanced debugging
- Keep your Expo CLI updated: `npm install -g @expo/cli@latest`

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for new features
3. Test on both iOS and Android
4. Update documentation as needed

## License

This project is part of the Myon Health medical billing platform.
