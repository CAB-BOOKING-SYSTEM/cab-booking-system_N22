import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { register } from "../apis/auth";
import AuthCard from "../components/AuthCard";
import AuthInput from "../components/AuthInput";
import { RootStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "SignUp">;

const SignUpScreen: React.FC<Props> = ({ navigation }) => {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [submitError, setSubmitError] = useState("");

  const onSubmit = async (): Promise<void> => {
    if (!fullName.trim() || !phone.trim() || !email.trim() || !password) {
      setSubmitError("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    if (password.length < 6) {
      setSubmitError("Mật khẩu ít nhất 6 ký tự");
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError("Xác nhận mật khẩu không khớp");
      return;
    }

    setLoading(true);
    setSubmitError("");

    try {
      const data = await register({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
      });

      const message = data.message || "Đăng ký thành công";
      setSuccessMessage(message);

      setTimeout(() => {
        navigation.replace("SignIn");
      }, 800);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Đăng ký thất bại";
      setSubmitError(message);
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
        <View style={styles.header}>
          <Text style={styles.subtitle}>Tạo tài khoản để bắt đầu đặt xe.</Text>
        </View>

        <AuthCard title="Đăng ký" subtitle="Nhập thông tin cá nhân">
          {successMessage ? (
            <Text style={styles.successText}>{successMessage}</Text>
          ) : null}
          {submitError ? (
            <Text style={styles.errorText}>{submitError}</Text>
          ) : null}

          <AuthInput
            label="Họ và tên"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Nguyễn Văn A"
            autoCapitalize="words"
          />
          <AuthInput
            label="Số điện thoại"
            value={phone}
            onChangeText={setPhone}
            placeholder="0912345678"
            keyboardType="phone-pad"
          />
          <AuthInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="example@email.com"
            keyboardType="email-address"
          />
          <AuthInput
            label="Mật khẩu"
            value={password}
            onChangeText={setPassword}
            placeholder="Nhập mật khẩu"
            secureTextEntry
          />
          <AuthInput
            label="Nhập lại mật khẩu"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Nhập lại mật khẩu"
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.submitBtn, loading ? styles.disabled : null]}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Đăng ký</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
              <Text style={styles.linkText}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </AuthCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#4F8EF7" },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    gap: 28,
  },
  header: { gap: 8 },
  subtitle: { fontSize: 15, color: "rgba(255,255,255,0.9)" },
  submitBtn: {
    marginTop: 6,
    backgroundColor: "#4F8EF7",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.75 },
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
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: { color: "#6b7280", fontSize: 14 },
  linkText: { color: "#4F8EF7", fontWeight: "700" },
});

export default SignUpScreen;
