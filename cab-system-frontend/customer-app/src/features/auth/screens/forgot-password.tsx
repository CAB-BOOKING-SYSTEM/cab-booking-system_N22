import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { requestPasswordReset } from "../apis/auth";
import AuthCard from "../components/AuthCard";
import AuthInput from "../components/AuthInput";
import { RootStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [submitError, setSubmitError] = useState("");

  const onSubmit = async (): Promise<void> => {
    if (!email.trim()) {
      setSubmitError("Vui lòng nhập email");
      return;
    }

    setLoading(true);
    setSubmitError("");
    setSuccessMessage("");

    try {
      const data = await requestPasswordReset(email.trim());
      const message =
        data.message || "Đã gửi OTP về email, vui lòng nhập OTP và mật khẩu mới.";

      setSuccessMessage(message);

      setTimeout(() => {
        navigation.navigate("ResetPassword", { email: email.trim() });
      }, 700);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Không thể gửi OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <AuthCard
          title="Quên mật khẩu"
          subtitle="Nhập email để nhận OTP đặt lại mật khẩu"
        >
          {successMessage ? (
            <Text style={styles.successText}>{successMessage}</Text>
          ) : null}
          {submitError ? (
            <Text style={styles.errorText}>{submitError}</Text>
          ) : null}

          <AuthInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="example@email.com"
            keyboardType="email-address"
          />

          <TouchableOpacity
            style={[styles.primaryBtn, loading ? styles.disabled : null]}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Gửi OTP</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate("ResetPassword", { email: email.trim() })
            }
          >
            <Text style={styles.linkText}>Tôi đã có OTP</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
            <Text style={styles.linkText}>Quay lại đăng nhập</Text>
          </TouchableOpacity>
        </AuthCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#4F8EF7" },
  container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20 },
  primaryBtn: {
    backgroundColor: "#4F8EF7",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
  linkText: {
    textAlign: "center",
    color: "#4F8EF7",
    fontWeight: "700",
    marginTop: 8,
    textDecorationLine: "underline",
  },
  successText: {
    backgroundColor: "#dcfce7",
    color: "#166534",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: "600",
  },
  errorText: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: "600",
  },
  disabled: { opacity: 0.75 },
});

export default ForgotPasswordScreen;
