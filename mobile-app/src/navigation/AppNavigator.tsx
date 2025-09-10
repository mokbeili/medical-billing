import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import React from "react";

import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import BillingCodeSearchScreen from "../screens/BillingCodeSearchScreen";
import CameraScanScreen from "../screens/CameraScanScreen";
import HomeScreen from "../screens/HomeScreen";
import ICDCodeSearchScreen from "../screens/ICDCodeSearchScreen";
import ICDCodesScreen from "../screens/ICDCodesScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SearchScreen from "../screens/SearchScreen";
import ServiceFormScreen from "../screens/ServiceFormScreen";
import ServicesScreen from "../screens/ServicesScreen";
import SignInScreen from "../screens/SignInScreen";
import SignUpScreen from "../screens/SignUpScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const ServicesStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="ServicesList"
    >
      <Stack.Screen name="ServicesList" component={ServicesScreen} />
      <Stack.Screen name="ServiceForm" component={ServiceFormScreen} />
      <Stack.Screen name="CameraScan" component={CameraScanScreen} />
      <Stack.Screen
        name="BillingCodeSearch"
        component={BillingCodeSearchScreen}
      />
      <Stack.Screen name="ICDCodeSearch" component={ICDCodeSearchScreen} />
    </Stack.Navigator>
  );
};

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Search") {
            iconName = focused ? "search" : "search-outline";
          } else if (route.name === "Services") {
            iconName = focused ? "medical" : "medical-outline";
          } else if (route.name === "ICDCodes") {
            iconName = focused ? "code" : "code-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          } else {
            iconName = "home-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e2e8f0",
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: "Code Search" }}
      />
      <Tab.Screen
        name="Services"
        component={ServicesStack}
        options={{ title: "Claims" }}
      />
      <Tab.Screen
        name="ICDCodes"
        component={ICDCodesScreen}
        options={{ title: "ICD Codes" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {user ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
