import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CommonActions } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { login } from "../apis/auth";
import AuthCard from "../components/AuthCard";
import AuthInput from "../components/AuthInput";
import { saveCustomerSession } from "../session";
import { useCustomerAuthSession } from "../AuthSessionContext";
import { RootStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "SignIn">;

const ALLOWED_ROLES = new Set(["CUSTOMER", "ADMIN", "SUPER_ADMIN"]);

const SignInScreen: React.FC<Props> = ({ navigation }) => {
  const { setSession } = useCustomerAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );

  const validate = (): boolean => {
    const nextErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      nextErrors.email = "Vui lòng nhập email";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      nextErrors.email = "Email không hợp lệ";
    }

    if (!password) {
      nextErrors.password = "Vui lòng nhập mật khẩu";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (): Promise<void> => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    setSubmitError("");
    setSuccessMessage("");

    try {
      const data = await login({
        email: email.trim(),
        password,
        appType: "CUSTOMER_APP",
      });

      const role = data.user?.role;

      if (!role || !ALLOWED_ROLES.has(role)) {
        throw new Error(
          "Chỉ tài khoản khách hàng hoặc quản trị viên mới được vào ứng dụng khách hàng"
        );
      }

      if (!data.accessToken || !data.user) {
        throw new Error("Thiếu dữ liệu phiên đăng nhập từ máy chủ");
      }

      await saveCustomerSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });

      const message = data.message || "Đăng nhập thành công";
      setSuccessMessage(message);

      setTimeout(() => {
        const parentNavigation = navigation.getParent();

        if (!parentNavigation) {
          Alert.alert("Thông báo", "Không thể chuyển sang trang chủ.");
          return;
        }

        parentNavigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "MainTabs" }],
          })
        );
      }, 700);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Đăng nhập thất bại";
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
          <Text style={styles.title}>Đăng nhập</Text>
          <Text style={styles.subtitle}>
            Sau splash mở đầu, người dùng sẽ đăng nhập để vào trang chủ đặt xe
            có bản đồ.
          </Text>
        </View>

        <AuthCard title="Đăng nhập" subtitle="Nhập thông tin để tiếp tục">
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
            error={errors.email}
          />

          <AuthInput
            label="Mật khẩu"
            value={password}
            onChangeText={setPassword}
            placeholder="Nhập mật khẩu"
            secureTextEntry
            error={errors.password}
            rightText="Quên mật khẩu?"
            onRightPress={() => navigation.navigate("ForgotPassword")}
          />

          <TouchableOpacity
            style={[styles.submitBtn, loading ? styles.disabled : null]}
            disabled={loading}
            onPress={onSubmit}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
              <Text style={styles.linkText}>Đăng ký ngay</Text>
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
  title: { fontSize: 32, fontWeight: "800", color: "#fff" },
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

export default SignInScreen;
