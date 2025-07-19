import { useNavigation } from "@react-navigation/native";
import React from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authAPI } from "../services/api";

const HomeScreen = () => {
  const navigation = useNavigation();

  const handleStartSearching = () => {
    console.log("Start Searching pressed");
    navigation.navigate("Main" as never);
  };

  const handleSignIn = () => {
    console.log("Sign In pressed");
    navigation.navigate("SignIn" as never);
  };

  const testAPIConnection = async () => {
    try {
      console.log("Testing API connection...");
      const session = await authAPI.getSession();
      console.log("API connection successful:", session);
      Alert.alert("Success", "API connection is working!");
    } catch (error: any) {
      console.error("API connection failed:", error);
      Alert.alert(
        "Connection Failed",
        "Cannot connect to the API. Please make sure your Next.js backend is running on http://172.16.1.172:3000"
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>MH</Text>
            </View>
          </View>

          <Text style={styles.title}>Myon Health</Text>

          <Text style={styles.subtitle}>
            Revolutionizing Medical Billing in Saskatchewan
          </Text>

          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>
              Myon Health is bringing cutting-edge AI-enabled search and mobile
              tools to Saskatchewan physicians, transforming the way medical
              billing is handled.
            </Text>

            <Text style={styles.description}>
              Our innovative platform will streamline your billing processes,
              reduce administrative burden, and help you focus on what matters
              most - patient care.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleStartSearching}
            >
              <Text style={styles.primaryButtonText}>Start Searching</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSignIn}
            >
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.testButton}
              onPress={testAPIConnection}
            >
              <Text style={styles.testButtonText}>Test API Connection</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>ALPHA</Text>
            </View>
            <Text style={styles.footerText}>
              Stay tuned for our launch. We're working hard to bring you the
              best medical billing solution.
            </Text>
          </View>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  content: {
    alignItems: "center",
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 64,
    height: 64,
    backgroundColor: "#2563eb",
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "bold",
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 20,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 28,
  },
  descriptionContainer: {
    marginBottom: 40,
  },
  description: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 16,
  },
  buttonContainer: {
    width: "100%",
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2563eb",
    alignItems: "center",
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: "#2563eb",
    fontSize: 18,
    fontWeight: "600",
  },
  testButton: {
    backgroundColor: "#f59e0b",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  testButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  footerText: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default HomeScreen;
