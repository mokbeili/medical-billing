import { MD3LightTheme } from "react-native-paper";

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#2563eb", // blue-600
    primaryContainer: "#dbeafe", // blue-100
    secondary: "#64748b", // slate-500
    secondaryContainer: "#f1f5f9", // slate-100
    surface: "#ffffff",
    surfaceVariant: "#f8fafc", // slate-50
    background: "#f8fafc", // slate-50
    error: "#dc2626", // red-600
    onPrimary: "#ffffff",
    onSecondary: "#ffffff",
    onSurface: "#1e293b", // slate-800
    onSurfaceVariant: "#475569", // slate-600
    outline: "#cbd5e1", // slate-300
  },
  roundness: 8,
};
