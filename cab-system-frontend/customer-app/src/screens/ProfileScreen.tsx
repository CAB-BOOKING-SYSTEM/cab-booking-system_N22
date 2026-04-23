import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ProfileScreen as ProfileScreenComponent } from "./UserProfileView";
import { LinearGradient } from "../shims/ui";

interface ProfileScreenProps {
  onLogout: () => Promise<void>;
}

export function ProfileScreen({ onLogout }: ProfileScreenProps) {
  return (
    <View style={styles.container}>
      <ProfileScreenComponent />

      <View style={styles.logoutContainer}>
        <TouchableOpacity
          style={styles.logoutButtonWrapper}
          activeOpacity={0.85}
          onPress={() => {
            void onLogout();
          }}
        >
          <LinearGradient
            colors={["#00B14F", "#00d963"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoutButtonGradient}
          >
            <View style={styles.logoutButton}>
              <MaterialCommunityIcons
                name="logout"
                size={20}
                color="#ffffff"
                style={styles.logoutIcon}
              />
              <Text style={styles.logoutButtonText}>Đăng xuất</Text>
            </View>
          </LinearGradient>
          <View style={styles.neonGlow} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logoutContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 24,
    backgroundColor: "#ffffff",
  },
  logoutButtonWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  logoutButtonGradient: {
    borderRadius: 12,
    overflow: "hidden",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  neonGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#00B14F",
    opacity: 0.16,
    borderRadius: 12,
    shadowColor: "#00B14F",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 18,
  },
});
