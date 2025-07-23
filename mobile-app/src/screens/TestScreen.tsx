import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api, { testAPI } from "../services/api";

const TestScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isNetworkTesting, setIsNetworkTesting] = useState(false);

  const testAPIConnection = async () => {
    setIsLoading(true);
    try {
      const result = await testAPI.test();
      Alert.alert(
        "Success",
        `API Test: ${result.message}\nTimestamp: ${result.timestamp}`
      );
    } catch (error: any) {
      console.error("API Test Error:", error);
      Alert.alert(
        "Error",
        `API Test Failed: ${error?.message || "Network error"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const testNetworkConnectivity = async () => {
    setIsNetworkTesting(true);
    try {
      // Test basic connectivity to the server
      const response = await api.get("/api/test", { timeout: 5000 });
      Alert.alert(
        "Network Test Success",
        `Connected to: ${api.defaults.baseURL}\nStatus: ${
          response.status
        }\nResponse: ${JSON.stringify(response.data)}`
      );
    } catch (error: any) {
      console.error("Network Test Error:", error);
      let errorMessage = "Network connectivity test failed";

      if (error.code === "ECONNABORTED") {
        errorMessage = "Request timed out - server may be unreachable";
      } else if (error.code === "ENOTFOUND") {
        errorMessage = "DNS resolution failed - check your network connection";
      } else if (error.code === "ECONNREFUSED") {
        errorMessage =
          "Connection refused - server may not be running on the expected port";
      } else if (error.message === "Network Error") {
        errorMessage =
          "Network error - check if device and computer are on same WiFi network";
      }

      Alert.alert(
        "Network Test Failed",
        `${errorMessage}\n\nError: ${error.message}\nURL: ${api.defaults.baseURL}`
      );
    } finally {
      setIsNetworkTesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Test Screen</Text>
        <Text style={styles.subtitle}>
          If you can see this, navigation is working!
        </Text>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={testAPIConnection}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Testing..." : "Test API Connection"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.secondaryButton,
            isNetworkTesting && styles.buttonDisabled,
          ]}
          onPress={testNetworkConnectivity}
          disabled={isNetworkTesting}
        >
          <Text style={styles.buttonText}>
            {isNetworkTesting ? "Testing..." : "Test Network Connectivity"}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            API Base URL: {api.defaults.baseURL}
          </Text>
          <Text style={styles.infoText}>Timeout: {api.defaults.timeout}ms</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 200,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: "#059669",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  infoContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    width: "100%",
  },
  infoText: {
    fontSize: 12,
    color: "#475569",
    marginBottom: 4,
  },
});

export default TestScreen;
