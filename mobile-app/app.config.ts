import "dotenv/config";
import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  // Load environment variables
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION || "ca-central-1";
  const apiBaseUrl = process.env.API_BASE_URL || "https://www.myonhealth.ca";
  const appEnv = process.env.APP_ENV || "development";

  // Debug logging
  console.log("🔧 Environment Configuration:");
  console.log("AWS_ACCESS_KEY_ID:", awsAccessKeyId ? "✅ Set" : "❌ Not set");
  console.log(
    "AWS_SECRET_ACCESS_KEY:",
    awsSecretAccessKey ? "✅ Set" : "❌ Not set"
  );
  console.log("AWS_REGION:", awsRegion);
  console.log("API_BASE_URL:", apiBaseUrl);
  console.log("APP_ENV:", appEnv);

  return {
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
      awsAccessKeyId: awsAccessKeyId,
      awsSecretAccessKey: awsSecretAccessKey,
      awsRegion: awsRegion,
      awsConfigured: !!(awsAccessKeyId && awsSecretAccessKey),
      // API Configuration
      apiBaseUrl: apiBaseUrl,
      // App Environment
      appEnv: appEnv,
    },
  };
};
