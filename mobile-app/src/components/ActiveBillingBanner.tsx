import React from "react";
import { StyleSheet, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";

const ActiveBillingBanner: React.FC = () => {
  const { activeBillingType } = useAuth();

  if (!activeBillingType) {
    return null;
  }

  const bannerColor = activeBillingType.colorCode;

  return (
    <>
      {/* Top border */}
      <View style={[styles.topBorder, { backgroundColor: bannerColor }]} />
      {/* Left border */}
      <View style={[styles.leftBorder, { backgroundColor: bannerColor }]} />
      {/* Right border */}
      <View style={[styles.rightBorder, { backgroundColor: bannerColor }]} />
      {/* Bottom border */}
      <View style={[styles.bottomBorder, { backgroundColor: bannerColor }]} />
    </>
  );
};

const styles = StyleSheet.create({
  topBorder: {
    height: 64,
    width: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  leftBorder: {
    height: "100%",
    width: 4,
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  rightBorder: {
    height: "100%",
    width: 4,
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  bottomBorder: {
    height: 16,
    width: "100%",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
});

export default ActiveBillingBanner;
