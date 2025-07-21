#!/bin/bash

echo "🚀 Setting up Myon Health Mobile App for local development..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

# Check if Expo CLI is installed
if ! command -v expo &> /dev/null; then
    echo "📦 Installing Expo CLI..."
    npm install -g @expo/cli
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if iOS Simulator is available (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v xcrun &> /dev/null; then
        echo "✅ iOS Simulator is available (Xcode detected)"
    else
        echo "⚠️  iOS Simulator not available. Install Xcode to develop for iOS."
    fi
fi

# Check if Android Studio/Android SDK is available
if command -v adb &> /dev/null; then
    echo "✅ Android SDK is available"
else
    echo "⚠️  Android SDK not found. Install Android Studio to develop for Android."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update API_BASE_URL in src/services/api.ts if needed"
echo "2. Start the development server: npm start"
echo "3. Press 'i' for iOS simulator or 'a' for Android emulator"
echo ""
echo "For more information, see README.md" 