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
import { Avatar, Card, List, Switch } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          // Navigation will be handled automatically by the AuthProvider
        },
      },
    ]);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const userInitials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        <Card style={styles.profileCard} mode="outlined">
          <Card.Content style={styles.profileContent}>
            <Avatar.Text size={80} label={userInitials} style={styles.avatar} />
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{user.roles.join(", ")}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.settingsCard} mode="outlined">
          <Card.Content>
            <List.Section>
              <List.Subheader style={styles.sectionTitle}>
                Account Settings
              </List.Subheader>

              <List.Item
                title="Edit Profile"
                description="Update your personal information"
                left={(props) => <List.Icon {...props} icon="account-edit" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {
                  // Navigate to edit profile
                }}
              />

              <List.Item
                title="Change Password"
                description="Update your password"
                left={(props) => <List.Icon {...props} icon="lock" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {
                  // Navigate to change password
                }}
              />

              <List.Item
                title="Notifications"
                description="Manage notification preferences"
                left={(props) => <List.Icon {...props} icon="bell" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {
                  // Navigate to notifications
                }}
              />
            </List.Section>
          </Card.Content>
        </Card>

        <Card style={styles.settingsCard} mode="outlined">
          <Card.Content>
            <List.Section>
              <List.Subheader style={styles.sectionTitle}>
                App Settings
              </List.Subheader>

              <List.Item
                title="Dark Mode"
                description="Toggle dark theme"
                left={(props) => (
                  <List.Icon {...props} icon="theme-light-dark" />
                )}
                right={() => <Switch value={false} onValueChange={() => {}} />}
              />

              <List.Item
                title="Auto-refresh"
                description="Automatically refresh data"
                left={(props) => <List.Icon {...props} icon="refresh" />}
                right={() => <Switch value={true} onValueChange={() => {}} />}
              />
            </List.Section>
          </Card.Content>
        </Card>

        <Card style={styles.settingsCard} mode="outlined">
          <Card.Content>
            <List.Section>
              <List.Subheader style={styles.sectionTitle}>
                Support
              </List.Subheader>

              <List.Item
                title="Help & Support"
                description="Get help and contact support"
                left={(props) => <List.Icon {...props} icon="help-circle" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {
                  // Navigate to help
                }}
              />

              <List.Item
                title="About"
                description="App version and information"
                left={(props) => <List.Icon {...props} icon="information" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {
                  // Show about dialog
                }}
              />
            </List.Section>
          </Card.Content>
        </Card>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
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
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
  },
  content: {
    flex: 1,
  },
  profileCard: {
    margin: 16,
    backgroundColor: "#ffffff",
  },
  profileContent: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatar: {
    backgroundColor: "#2563eb",
    marginBottom: 16,
  },
  profileInfo: {
    alignItems: "center",
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563eb",
  },
  settingsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#ffffff",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  signOutButton: {
    margin: 16,
    paddingVertical: 16,
    backgroundColor: "#dc2626",
    borderRadius: 8,
    alignItems: "center",
  },
  signOutText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    fontSize: 18,
    color: "#64748b",
  },
});

export default ProfileScreen;
