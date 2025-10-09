import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Avatar, Card, List, RadioButton, Switch } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { authAPI, billingTypesAPI } from "../services/api";
import { User } from "../types";

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, signOut, updateActiveBillingType } = useAuth();
  const [userWithPhysicians, setUserWithPhysicians] = useState<User | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingBillingTypeId, setLoadingBillingTypeId] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (user) {
      fetchUserWithPhysicians();
    }
  }, [user]);

  const fetchUserWithPhysicians = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const userData = await authAPI.getUserWithPhysicians();
      setUserWithPhysicians(userData);

      // Find the active billing type and update global state
      const activeType = userData.physicians
        ?.find((physician) =>
          physician.physicianBillingTypes?.find((bt) => bt.active)
        )
        ?.physicianBillingTypes?.find((bt) => bt.active);

      updateActiveBillingType(activeType || null);
      return userData; // Return the data for immediate use
    } catch (error) {
      console.error("Error fetching user with physicians:", error);
      return null;
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleBillingTypeChange = async (
    physicianId: string,
    physicianBillingTypeId: number
  ) => {
    try {
      setLoadingBillingTypeId(physicianBillingTypeId);
      await billingTypesAPI.updateActiveBillingType(
        physicianId,
        physicianBillingTypeId
      );

      // Refresh data and get the updated user data
      const updatedUserData = await fetchUserWithPhysicians(false);

      // Find the newly active billing type from the fresh data
      if (updatedUserData) {
        const activeType = updatedUserData.physicians
          ?.find((physician) => physician.id === physicianId)
          ?.physicianBillingTypes?.find(
            (bt) => bt.id === physicianBillingTypeId
          );

        if (activeType) {
          updateActiveBillingType(activeType);
        }
      }
    } catch (error) {
      console.error("Error updating billing type:", error);
      Alert.alert("Error", "Failed to update billing type. Please try again.");
    } finally {
      setLoadingBillingTypeId(null);
    }
  };

  const onRefresh = async () => {
    await fetchUserWithPhysicians(true);
  };

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

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2563eb"]} // Android
            tintColor="#2563eb" // iOS
          />
        }
      >
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

        {userWithPhysicians?.physicians &&
          userWithPhysicians.physicians.length > 0 &&
          userWithPhysicians.physicians.some(
            (physician) => (physician.physicianBillingTypes?.length || 0) >= 2
          ) && (
            <Card style={styles.settingsCard} mode="outlined">
              <Card.Content>
                <List.Section>
                  <List.Subheader style={styles.sectionTitle}>
                    Billing Types
                  </List.Subheader>
                  {userWithPhysicians.physicians.map((physician) => (
                    <View key={physician.id}>
                      <Text style={styles.physicianName}>
                        Dr. {physician.firstName} {physician.lastName}
                      </Text>
                      {physician.physicianBillingTypes
                        ?.sort((a, b) =>
                          a.billingType.title.localeCompare(b.billingType.title)
                        )
                        .map((billingType) => {
                          const isLoading =
                            loadingBillingTypeId === billingType.id;
                          const isDisabled = loadingBillingTypeId !== null;

                          return (
                            <TouchableOpacity
                              key={billingType.id}
                              style={[
                                styles.billingTypeRow,
                                billingType.active &&
                                  styles.billingTypeRowActive,
                                isDisabled && styles.billingTypeRowDisabled,
                              ]}
                              onPress={() => {
                                if (!isDisabled) {
                                  handleBillingTypeChange(
                                    physician.id,
                                    billingType.id
                                  );
                                }
                              }}
                              disabled={isDisabled}
                              activeOpacity={0.7}
                            >
                              <View
                                style={[
                                  styles.colorIndicator,
                                  { backgroundColor: billingType.colorCode },
                                ]}
                              />
                              <View style={styles.billingTypeContent}>
                                <Text style={styles.billingTypeTitle}>
                                  {billingType.billingType.title}
                                </Text>
                                <Text style={styles.billingTypeCode}>
                                  Code: {billingType.billingType.code}
                                </Text>
                              </View>
                              {isLoading ? (
                                <ActivityIndicator
                                  size="small"
                                  color="#2563eb"
                                />
                              ) : (
                                <RadioButton
                                  value={billingType.id.toString()}
                                  status={
                                    billingType.active ? "checked" : "unchecked"
                                  }
                                  onPress={() => {}}
                                  disabled={true}
                                />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  ))}
                </List.Section>
              </Card.Content>
            </Card>
          )}

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
  physicianName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
    marginTop: 8,
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  billingTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  billingTypeRowActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  billingTypeRowDisabled: {
    opacity: 0.6,
  },
  billingTypeContent: {
    flex: 1,
    marginLeft: 8,
  },
  billingTypeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  billingTypeCode: {
    fontSize: 12,
    color: "#64748b",
  },
});

export default ProfileScreen;
