import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Button, Card } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import textractService from "../utils/awsTextractService";

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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedPatientData | null>(
    null
  );

  const handleTakePhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Camera Permission Required",
          "Please grant camera permission to scan patient documents."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Photo Library Permission Required",
          "Please grant photo library permission to select patient documents."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const processImage = async (imageUri: string) => {
    setIsProcessing(true);
    try {
      if (!textractService.configured) {
        Alert.alert(
          "AWS Textract Not Configured",
          "Please configure AWS Textract credentials using environment variables. See the documentation for setup instructions.",
          [
            {
              text: "OK",
              style: "cancel",
            },
          ]
        );
        setIsProcessing(false);
        return;
      }

      // Use AWS Textract
      const textractResult = await textractService.extractText(imageUri);
      await processExtractedText(
        textractResult.text,
        textractResult.confidence
      );
    } catch (error) {
      console.error("AWS Textract error:", error);
      Alert.alert(
        "AWS Textract Error",
        "Failed to process image with AWS Textract. Please check your environment configuration and try again.",
        [
          {
            text: "OK",
            style: "cancel",
          },
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const processExtractedText = async (text: string, confidence: number) => {
    try {
      const parsedData = textractService.parsePatientData(text);

      if (parsedData) {
        setScannedData(parsedData);
        Alert.alert(
          "Success",
          `Patient information extracted successfully! (Confidence: ${Math.round(
            confidence * 100
          )}%)`,
          [
            {
              text: "Use This Data",
              onPress: () => {
                navigation.navigate("ServiceForm", {
                  scannedPatientData: parsedData,
                });
              },
            },
            {
              text: "Try Again",
              style: "cancel",
            },
          ]
        );
      } else {
        Alert.alert(
          "No Data Found",
          "Could not extract patient information from this image. Please try again with a clearer image."
        );
      }
    } catch (error) {
      console.error("Error processing extracted text:", error);
      Alert.alert(
        "Error",
        "Failed to process extracted text. Please try again."
      );
    }
  };

  const handleRetry = () => {
    setSelectedImage(null);
    setScannedData(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Patient Document</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Scan Patient Information</Text>
            <Text style={styles.description}>
              Take a photo or select an image of a patient document to
              automatically extract patient information and service date.
            </Text>

            <View style={styles.ocrStatusContainer}>
              <View style={styles.ocrStatus}>
                <Ionicons name="cloud" size={20} color="#059669" />
                <Text style={styles.ocrStatusText}>AWS Textract</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {selectedImage && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Selected Image</Text>
              <Image source={{ uri: selectedImage }} style={styles.image} />
              {isProcessing && (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color="#2563eb" />
                  <Text style={styles.processingText}>
                    Processing image with AWS Textract...
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {scannedData && (
          <Card style={styles.card}>
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
                  <Text style={styles.dataValue}>
                    {scannedData.dateOfBirth}
                  </Text>
                </View>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Gender:</Text>
                  <Text style={styles.dataValue}>{scannedData.gender}</Text>
                </View>
                {scannedData.serviceDate && (
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Service Date:</Text>
                    <Text style={styles.dataValue}>
                      {scannedData.serviceDate}
                    </Text>
                  </View>
                )}
              </View>
            </Card.Content>
          </Card>
        )}

        <View style={styles.buttonContainer}>
          {!selectedImage ? (
            <>
              <Button
                mode="contained"
                onPress={handleTakePhoto}
                style={styles.button}
                icon="camera"
              >
                Take Photo
              </Button>
              <Button
                mode="outlined"
                onPress={handlePickImage}
                style={styles.button}
                icon="image"
              >
                Select from Gallery
              </Button>
            </>
          ) : (
            <>
              <Button
                mode="contained"
                onPress={() => {
                  if (scannedData) {
                    navigation.navigate("ServiceForm", {
                      scannedPatientData: scannedData,
                    });
                  }
                }}
                style={styles.button}
                disabled={!scannedData || isProcessing}
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
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    backgroundColor: "#ffffff",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 16,
  },
  ocrStatusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  ocrStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  ocrStatusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
  processingContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  processingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#6b7280",
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
