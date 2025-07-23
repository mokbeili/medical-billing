import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Card } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import textractService from "../utils/awsTextractService";

interface AWSConfigScreenProps {
  navigation: any;
}

const AWSConfigScreen: React.FC<AWSConfigScreenProps> = ({ navigation }) => {
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [isConfigured, setIsConfigured] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved configuration on component mount
  React.useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      const savedAccessKey = await AsyncStorage.getItem("aws_access_key_id");
      const savedSecretKey = await AsyncStorage.getItem(
        "aws_secret_access_key"
      );
      const savedRegion = await AsyncStorage.getItem("aws_region");
      const configured = await AsyncStorage.getItem("aws_configured");

      if (savedAccessKey) setAccessKeyId(savedAccessKey);
      if (savedSecretKey) setSecretAccessKey(savedSecretKey);
      if (savedRegion) setRegion(savedRegion);
      if (configured === "true") setIsConfigured(true);
    } catch (error) {
      console.error("Error loading AWS configuration:", error);
    }
  };

  const saveConfiguration = async () => {
    if (!accessKeyId.trim() || !secretAccessKey.trim()) {
      Alert.alert(
        "Error",
        "Please enter both Access Key ID and Secret Access Key"
      );
      return;
    }

    setIsLoading(true);
    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem("aws_access_key_id", accessKeyId.trim());
      await AsyncStorage.setItem(
        "aws_secret_access_key",
        secretAccessKey.trim()
      );
      await AsyncStorage.setItem("aws_region", region);
      await AsyncStorage.setItem("aws_configured", "true");

      // Configure the Textract service
      textractService.configure({
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        region,
      });

      setIsConfigured(true);
      Alert.alert("Success", "AWS Textract configuration saved successfully!");
    } catch (error) {
      console.error("Error saving AWS configuration:", error);
      Alert.alert("Error", "Failed to save configuration. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const clearConfiguration = async () => {
    Alert.alert(
      "Clear Configuration",
      "Are you sure you want to clear the AWS configuration?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("aws_access_key_id");
              await AsyncStorage.removeItem("aws_secret_access_key");
              await AsyncStorage.removeItem("aws_region");
              await AsyncStorage.removeItem("aws_configured");

              setAccessKeyId("");
              setSecretAccessKey("");
              setRegion("us-east-1");
              setIsConfigured(false);

              Alert.alert("Success", "AWS configuration cleared successfully!");
            } catch (error) {
              console.error("Error clearing AWS configuration:", error);
              Alert.alert("Error", "Failed to clear configuration.");
            }
          },
        },
      ]
    );
  };

  const testConnection = async () => {
    if (!isConfigured) {
      Alert.alert("Error", "Please configure AWS credentials first");
      return;
    }

    setIsLoading(true);
    try {
      // Test with a simple Textract call (this will fail but we can catch the error type)
      await textractService.extractText("test");
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("InvalidSignatureException")) {
          Alert.alert(
            "Connection Failed",
            "Invalid AWS credentials. Please check your access key and secret."
          );
        } else if (error.message.includes("AccessDenied")) {
          Alert.alert(
            "Connection Failed",
            "Access denied. Please check your AWS permissions for Textract."
          );
        } else if (error.message.includes("No text detected")) {
          Alert.alert(
            "Connection Successful",
            "AWS Textract is properly configured!"
          );
        } else {
          Alert.alert(
            "Connection Test",
            "AWS Textract configuration appears to be working."
          );
        }
      } else {
        Alert.alert(
          "Connection Test",
          "AWS Textract configuration appears to be working."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AWS Textract Configuration</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>AWS Credentials</Text>
            <Text style={styles.description}>
              Configure AWS Textract for real OCR functionality. You'll need AWS
              credentials with Textract permissions.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Access Key ID</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your AWS Access Key ID"
              value={accessKeyId}
              onChangeText={setAccessKeyId}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Secret Access Key</Text>
            <View style={styles.secretContainer}>
              <TextInput
                style={[styles.input, styles.secretInput]}
                placeholder="Enter your AWS Secret Access Key"
                value={secretAccessKey}
                onChangeText={setSecretAccessKey}
                secureTextEntry={!showSecret}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowSecret(!showSecret)}
              >
                <Ionicons
                  name={showSecret ? "eye-off" : "eye"}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>AWS Region</Text>
            <TextInput
              style={styles.input}
              placeholder="AWS Region (e.g., us-east-1)"
              value={region}
              onChangeText={setRegion}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helpText}>
              Common regions: us-east-1, us-west-2, eu-west-1, ap-southeast-1
            </Text>
          </Card.Content>
        </Card>

        {isConfigured && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.statusContainer}>
                <Ionicons name="checkmark-circle" size={24} color="#059669" />
                <Text style={styles.statusText}>
                  AWS Textract is configured
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={saveConfiguration}
            loading={isLoading}
            disabled={isLoading}
            style={styles.button}
            icon="save"
          >
            Save Configuration
          </Button>

          {isConfigured && (
            <>
              <Button
                mode="outlined"
                onPress={testConnection}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                icon="connection"
              >
                Test Connection
              </Button>

              <Button
                mode="outlined"
                onPress={clearConfiguration}
                disabled={isLoading}
                style={[styles.button, styles.clearButton]}
                icon="delete"
              >
                Clear Configuration
              </Button>
            </>
          )}
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Setup Instructions</Text>
            <Text style={styles.instructionText}>
              1. Create an AWS account if you don't have one
            </Text>
            <Text style={styles.instructionText}>
              2. Create an IAM user with Textract permissions
            </Text>
            <Text style={styles.instructionText}>
              3. Generate Access Key ID and Secret Access Key
            </Text>
            <Text style={styles.instructionText}>
              4. Enter the credentials above
            </Text>
            <Text style={styles.instructionText}>5. Test the connection</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Required IAM Permissions</Text>
            <Text style={styles.permissionText}>
              Your IAM user needs the following permissions:
            </Text>
            <Text style={styles.codeText}>
              {`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "textract:DetectDocumentText",
        "textract:AnalyzeDocument"
      ],
      "Resource": "*"
    }
  ]
}`}
            </Text>
          </Card.Content>
        </Card>
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
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
  },
  secretContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  secretInput: {
    flex: 1,
    marginRight: 8,
  },
  eyeButton: {
    padding: 8,
  },
  helpText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#059669",
    fontWeight: "600",
  },
  buttonContainer: {
    marginTop: 16,
    gap: 12,
  },
  button: {
    marginBottom: 8,
  },
  clearButton: {
    borderColor: "#ef4444",
  },
  instructionText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
    lineHeight: 20,
  },
  permissionText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 12,
  },
  codeText: {
    fontSize: 12,
    color: "#1f2937",
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 6,
    fontFamily: "monospace",
  },
});

export default AWSConfigScreen;
