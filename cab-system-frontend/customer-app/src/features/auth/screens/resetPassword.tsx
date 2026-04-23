import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { resetPassword } from "../apis/auth";
import AuthCard from "../components/AuthCard";
import AuthInput from "../components/AuthInput";
import { RootStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "ResetPassword">;

const ResetPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleOtpChange = (text: string, index: number) => {
    const nextOtp = [...otp];
    nextOtp[index] = text.replace(/[^0-9]/g, "");
    setOtp(nextOtp);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const onSubmit = async (): Promise<void> => {
    const otpCode = otp.join("");

    if (otpCode.length < 6) {
      setSubmitError("Vui lòng nhập đủ 6 số OTP");
      return;
    }
    if (!newPassword) {
      setSubmitError("Vui lòng nhập mật khẩu mới");
      return;
    }
    if (newPassword.length < 6) {
      setSubmitError("Mật khẩu mới ít nhất 6 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSubmitError("Xác nhận mật khẩu không khớp");
      return;
    }

    setLoading(true);
    setSubmitError("");
    setSuccessMessage("");

    try {
      const data = await resetPassword(otpCode, newPassword);
      const message = data.message || "Đặt lại mật khẩu thành công";
      setSuccessMessage(message);

      setTimeout(() => {
        navigation.replace("SignIn");
      }, 900);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Đặt lại mật khẩu thất bại"
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
          title="Đặt lại mật khẩu"
          subtitle="Nhập mã OTP và mật khẩu mới"
        >
          {successMessage ? (
            <Text style={styles.successText}>{successMessage}</Text>
          ) : null}
          {submitError ? (
            <Text style={styles.errorText}>{submitError}</Text>
          ) : null}

          <Text style={styles.label}>Mã OTP</Text>
          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputs.current[index] = ref;
                }}
                style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, index)}
                onKeyPress={({ nativeEvent }) =>
                  handleOtpKeyPress(nativeEvent.key, index)
                }
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
              />
            ))}
          </View>

          <AuthInput
            label="Mật khẩu mới"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Nhập mật khẩu mới"
            secureTextEntry
          />
          <AuthInput
            label="Xác nhận mật khẩu mới"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Nhập lại mật khẩu mới"
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.primaryBtn, loading ? styles.disabled : null]}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Đặt lại mật khẩu</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
            <Text style={styles.linkText}>Gửi lại OTP</Text>
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
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderWidth: 1.5,
    borderColor: "#ccc",
    borderRadius: 10,
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    backgroundColor: "#f9f9f9",
  },
  otpBoxFilled: {
    borderColor: "#4F8EF7",
    backgroundColor: "#eef3ff",
  },
  primaryBtn: {
    backgroundColor: "#4F8EF7",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
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

export default ResetPasswordScreen;
