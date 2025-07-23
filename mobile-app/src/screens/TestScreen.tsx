import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { testAPI } from "../services/api";

const TestScreen = () => {
  const [isLoading, setIsLoading] = useState(false);

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
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default TestScreen;
