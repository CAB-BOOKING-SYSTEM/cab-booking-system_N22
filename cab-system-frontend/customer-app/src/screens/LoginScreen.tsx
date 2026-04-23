import React from "react";
import { 
  Button, 
  Text, 
  View, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity 
} from "react-native";

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Cab Booking</Text>
        <Text style={styles.subtitle}>Welcome back! Please login to continue.</Text>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={onLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Đăng nhập để tiếp tục</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This is a simplified login for testing purposes.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#00B14F",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#00B14F",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    marginTop: 24,
  },
  footerText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
  },
});
