import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface ProfileScreenProps {
  onLogout: () => Promise<void>;
}

export function ProfileScreen({ onLogout }: ProfileScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tài khoản tài xế</Text>
      <Text style={styles.subtitle}>
        Bạn có thể đăng xuất để xóa phiên hiện tại khỏi ứng dụng.
      </Text>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => {
          void onLogout();
        }}
      >
        <MaterialCommunityIcons name="logout" size={20} color="#fff" />
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#ffffff",
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    maxWidth: 320,
  },
  logoutButton: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ef4444",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  logoutText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
});
