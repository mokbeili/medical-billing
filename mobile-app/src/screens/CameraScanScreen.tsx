import { Ionicons } from "@expo/vector-icons";
import { scanOCR } from "@ismaelmoreiraa/vision-camera-ocr";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button, Card } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Camera,
  runAtTargetFps,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from "react-native-vision-camera";
import { Worklets } from "react-native-worklets-core";

import { formatFullDate } from "../utils/dateUtils";
import textRecognitionService from "../utils/expoTextRecognitionService";

interface ScannedPatientData {
  billingNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  serviceDate?: string;
}

interface CameraScanScreenProps {
  navigation: any;
  route: any;
}

const CameraScanScreen: React.FC<CameraScanScreenProps> = ({
  navigation,
  route,
}) => {
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();
  const [liveText, setLiveText] = useState<string>("");
  const [scannedData, setScannedData] = useState<ScannedPatientData | null>(
    null
  );
  const [isScanning, setIsScanning] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isScanningEnabled, setIsScanningEnabled] = useState(false);
  const [scanTimer, setScanTimer] = useState<NodeJS.Timeout | null>(null);
  const [scanTimeRemaining, setScanTimeRemaining] = useState(0);

  React.useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (scanTimer) {
        clearInterval(scanTimer);
      }
    };
  }, [scanTimer]);

  const autoSubmit = React.useCallback(
    async (text: string) => {
      if (hasSubmitted) return;
      try {
        const parsed = textRecognitionService.parsePatientData(text);
        if (parsed) {
          setHasSubmitted(true);
          setIsScanning(false);
          setIsScanningEnabled(false);
          setIsClosing(true);

          // Clear the scan timer
          if (scanTimer) {
            clearInterval(scanTimer);
            setScanTimer(null);
          }

          await AsyncStorage.setItem(
            "scannedPatientData",
            JSON.stringify(parsed)
          );
          // Allow UI to update (unmount Camera) before navigating back
          setTimeout(() => {
            navigation.goBack();
          }, 50);
        }
      } catch (e) {
        // ignore and keep scanning
      }
    },
    [hasSubmitted, navigation, scanTimer]
  );

  // Create runOnJS callbacks compatible with VisionCamera's Worklets runtime
  const onSetLiveText = React.useMemo(
    () => Worklets.createRunOnJS(setLiveText),
    []
  );
  const onAutoSubmit = React.useMemo(
    () => Worklets.createRunOnJS(autoSubmit),
    [autoSubmit]
  );

  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      if (!isScanning || !isScanningEnabled) return;

      runAtTargetFps(10, () => {
        "worklet";
        const ocr = scanOCR(frame);
        if (ocr?.result?.text?.length > 3) {
          onSetLiveText(ocr.result.text);
          onAutoSubmit(ocr.result.text);
        }
      });
    },
    [isScanning, isScanningEnabled, onSetLiveText, onAutoSubmit]
  );

  const processExtractedText = async (text: string) => {
    try {
      const parsedData = textRecognitionService.parsePatientData(text);

      if (parsedData) {
        setScannedData(parsedData);
        setIsScanning(false);
        Alert.alert("Success", "Patient information extracted successfully!", [
          {
            text: "Use This Data",
            onPress: async () => {
              // Store scanned data in AsyncStorage
              await AsyncStorage.setItem(
                "scannedPatientData",
                JSON.stringify(parsedData)
              );
              // Go back to the previous screen
              navigation.goBack();
            },
          },
          {
            text: "Continue Scanning",
            onPress: () => {
              setIsScanning(false);
              setIsScanningEnabled(false);
              setScannedData(null);
            },
          },
        ]);
      }
    } catch (error) {
      console.error("Error processing extracted text:", error);
    }
  };

  const handleRetry = () => {
    setLiveText("");
    setScannedData(null);
    setIsScanning(false);
    setIsScanningEnabled(false);
    setHasSubmitted(false);
    setScanTimeRemaining(0);
    if (scanTimer) {
      clearInterval(scanTimer);
      setScanTimer(null);
    }
  };

  const handleStartScanning = () => {
    setIsScanningEnabled(true);
    setIsScanning(true);
    setScanTimeRemaining(5);

    // Start 5-second countdown timer
    const timer = setInterval(() => {
      setScanTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up, stop scanning
          clearInterval(timer);
          setIsScanning(false);
          setIsScanningEnabled(false);
          setScanTimer(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setScanTimer(timer);
  };

  if (device == null || !hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admission Scanner</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Camera permission is required for live scanning.
          </Text>
          <Button mode="contained" onPress={requestPermission}>
            Grant Permission
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admission Scanner</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.cameraContainer}>
        {!hasSubmitted ? (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            frameProcessor={isScanningEnabled ? frameProcessor : undefined}
            pixelFormat="yuv"
          />
        ) : (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]}
          />
        )}

        {/* Overlay for scanning guidance */}
        {!isClosing && (
          <View style={styles.overlay}>
            <View style={styles.scanFrame}>
              <View style={styles.corner} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
            <Text style={styles.scanText}>
              {isScanningEnabled
                ? `Scanning... ${scanTimeRemaining}s remaining`
                : "Position document then scan"}
            </Text>
            {!isScanningEnabled && (
              <Button
                mode="contained"
                onPress={handleStartScanning}
                style={styles.startScanButton}
                icon="camera"
              >
                Start Scan
              </Button>
            )}
          </View>
        )}
      </View>

      {/* Optional: small closing hint */}
      {isClosing && (
        <View style={{ padding: 16 }}>
          <Text style={{ color: "#fff", textAlign: "center" }}>
            Processing…
          </Text>
        </View>
      )}

      {/* Extracted data display (fallback manual flow) */}
      {scannedData && (
        <Card style={styles.dataCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Extracted Information</Text>
            <View style={styles.dataContainer}>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Billing Number:</Text>
                <Text style={styles.dataValue}>
                  {scannedData.billingNumber}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Name:</Text>
                <Text style={styles.dataValue}>
                  {scannedData.firstName} {scannedData.lastName}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Date of Birth:</Text>
                <Text style={styles.dataValue}>{scannedData.dateOfBirth}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Gender:</Text>
                <Text style={styles.dataValue}>{scannedData.gender}</Text>
              </View>
              {scannedData.serviceDate && (
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Service Date:</Text>
                  <Text style={styles.dataValue}>
                    {formatFullDate(scannedData.serviceDate)}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={async () => {
                  await AsyncStorage.setItem(
                    "scannedPatientData",
                    JSON.stringify(scannedData)
                  );
                  navigation.goBack();
                }}
                style={styles.button}
                icon="check"
              >
                Use This Data
              </Button>
              <Button
                mode="outlined"
                onPress={handleRetry}
                style={styles.button}
                icon="refresh"
              >
                Try Again
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.8)",
    zIndex: 1000,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 20,
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 280,
    height: 200,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: "#00ff00",
    borderWidth: 3,
    top: -2,
    left: -2,
  },
  cornerTopRight: {
    top: -2,
    right: -2,
    left: "auto",
  },
  cornerBottomLeft: {
    bottom: -2,
    top: "auto",
  },
  cornerBottomRight: {
    bottom: -2,
    right: -2,
    top: "auto",
    left: "auto",
  },
  scanText: {
    color: "#ffffff",
    fontSize: 16,
    marginTop: 20,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 10,
    borderRadius: 8,
  },
  startScanButton: {
    marginTop: 20,
    backgroundColor: "#00ff88",
  },
  liveTextContainer: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 16,
    borderRadius: 8,
  },
  liveTextLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  liveText: {
    color: "#ffffff",
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  dataCard: {
    margin: 16,
    backgroundColor: "#ffffff",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  dataContainer: {
    marginTop: 8,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  dataValue: {
    fontSize: 14,
    color: "#1e40af",
    fontWeight: "600",
  },
  buttonContainer: {
    marginTop: 16,
    gap: 12,
  },
  button: {
    marginBottom: 8,
  },
});

export default CameraScanScreen;
