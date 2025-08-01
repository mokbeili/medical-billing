#!/bin/bash

# Myon Health Mobile App - Preview Build Script
# This script creates preview builds for iOS and Android

set -e

echo "🚀 Starting Myon Health Mobile App Preview Builds..."

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI is not installed. Please install it first:"
    echo "npm install -g @expo/eas-cli"
    exit 1
fi

# Check if logged in to Expo
if ! eas whoami &> /dev/null; then
    echo "❌ Not logged in to Expo. Please run:"
    echo "eas login"
    exit 1
fi

# Function to build for a specific platform
build_platform() {
    local platform=$1
    echo "📱 Building for $platform..."
    
    if eas build --platform $platform --profile preview; then
        echo "✅ $platform preview build completed successfully!"
    else
        echo "❌ $platform preview build failed!"
        exit 1
    fi
}

# Build for both platforms
echo "🔨 Building preview for iOS..."
build_platform ios

echo "🔨 Building preview for Android..."
build_platform android

echo "🎉 All preview builds completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Check your email for build notifications"
echo "2. Download builds from the Expo dashboard"
echo "3. Test the builds on your devices"
echo ""
echo "🔗 Expo Dashboard: https://expo.dev/accounts/[your-username]/projects/myon-health-mobile" 