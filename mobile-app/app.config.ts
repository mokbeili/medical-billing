import "dotenv/config";
import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Myon Health",
  slug: "myon-health-mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#2563eb",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.myonhealth.mobile",
    buildNumber: "1",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription:
        "This app needs access to camera to scan patient information from documents.",
      NSPhotoLibraryUsageDescription:
        "This app needs access to photo library to select patient documents for scanning.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#2563eb",
    },
    package: "com.myonhealth.mobile",
    permissions: [
      "android.permission.CAMERA",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
    ],
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  scheme: "myon-health",
  platforms: ["ios", "android"],
  plugins: [
    [
      "expo-camera",
      {
        cameraPermission:
          "Allow Myon Health to access your camera to scan patient documents.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow Myon Health to access your photo library to select patient documents.",
      },
    ],
  ],
  extra: {
    eas: {
      projectId: "f9c07c7d-ab5b-4f93-9a4a-5c8b5b4472fb",
    },
    // AWS Textract environment variables
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || null,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || null,
    awsRegion: process.env.AWS_REGION || "us-east-1",
    awsConfigured:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? true
        : false,
    // API Configuration
    apiBaseUrl: process.env.API_BASE_URL || "https://your-backend-api.com",
    // App Environment
    appEnv: process.env.APP_ENV || "development",
  },
});
