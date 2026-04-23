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
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import AuthCard from "../components/AuthCard";
import AuthInput from "../components/AuthInput";
import { requestPasswordReset } from "../apis/auth";
import { RootStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (): Promise<void> => {
    if (!email.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập email");
      return;
    }

    setLoading(true);
    try {
      const data = await requestPasswordReset(email.trim());
      Alert.alert(
        "Đã gửi",
        data.message ||
          "Kiểm tra email của bạn để lấy liên kết đặt lại mật khẩu.",
        [{ text: "OK" }], // ← user tự vào email lấy link, deep link sẽ tự navigate
      );
    } catch (error) {
      Alert.alert(
        "Thất bại",
        error instanceof Error ? error.message : "Không thể gửi email",
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
          subtitle="Nhập email để nhận liên kết đặt lại mật khẩu"
        >
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
              <Text style={styles.btnText}>Gửi liên kết đặt lại</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("ResetPassword", { token: "" })}
          >
            <Text style={styles.linkText}>
              Tôi đã có token đặt lại mật khẩu
            </Text>
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
  textAlign: 'center', 
  color: '#4F8EF7', 
  fontWeight: '700', 
  marginTop: 8,
  textDecorationLine: 'underline' // ← thêm dòng này
},
  disabled: { opacity: 0.75 },
});

export default ForgotPasswordScreen;
