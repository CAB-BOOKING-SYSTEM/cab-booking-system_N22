import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { DriverAuthResponse, login } from '../apis/auth';

interface LoginScreenProps {
  onSuccess?: (data: DriverAuthResponse) => void;
  onNavigateKYC?: () => void;
}

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  message: string;
  type: ToastType;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess, onNavigateKYC }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const validate = (): boolean => {
    const e: { email?: string; password?: string } = {};
    if (!email.trim()) e.email = 'Vui lòng nhập email';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email không hợp lệ';
    if (!password) e.password = 'Vui lòng nhập mật khẩu';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async (): Promise<void> => {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await login(email.trim(), password);

      if (data.user?.role !== 'DRIVER') {
        showToast('Tài khoản này không phải tài khoản tài xế.', 'error');
        return;
      }

      showToast(data.message || 'Đăng nhập thành công', 'success');
      setTimeout(() => onSuccess?.(data), 1000);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể đăng nhập', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toastColors: Record<ToastType, string> = {
    success: '#22c55e',
    error: '#ef4444',
    info: '#3b82f6',
  };

  const toastIcons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      {/* Toast Notification */}
      {toast && (
        <View style={[styles.toast, { backgroundColor: toastColors[toast.type] }]}>
          <Text style={styles.toastIcon}>{toastIcons[toast.type]}</Text>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.appName}>Driver</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Đăng nhập</Text>
          <Text style={styles.cardDesc}>Nhập thông tin tài khoản tài xế của bạn</Text>

          <View style={styles.form}>
            {/* Email Field */}
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                placeholder="Nhập email"
                placeholderTextColor="#aaa"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            {/* Password Field */}
            <View style={styles.field}>
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={[styles.inputWrapper, errors.password ? styles.inputError : null]}>
                <TextInput
                  style={styles.inputInner}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor="#aaa"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((prev) => !prev)}>
                  <Text style={styles.eyeIcon}>{showPassword ? 'Ẩn' : 'Hiện'}</Text>
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading ? styles.btnDisabled : null]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Đăng nhập</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Register Button */}
            <TouchableOpacity style={styles.kycBtn} onPress={onNavigateKYC}>
              <Text style={styles.kycBtnText}>Đăng ký</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#1a1a2e' },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40, gap: 28 },

  // Toast
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    zIndex: 999,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    boxShadow: "0px 4px 8px rgba(0,0,0,0.3)",
  },
  toastIcon: { fontSize: 16, color: '#fff', fontWeight: '700' },
  toastText: { fontSize: 14, color: '#fff', fontWeight: '500', flex: 1 },

  // Header
  header: { alignItems: 'center', gap: 10 },
  appName: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    gap: 8,
    boxShadow: "0px 4px 12px rgba(0,0,0,0.2)",
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a2e' },
  cardDesc: { fontSize: 13, color: '#888', marginBottom: 8 },

  // Form
  form: { gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: '#333' },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#fafafa',
  },
  inputError: { borderColor: '#ef4444' },
  inputWrapper: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  inputInner: { flex: 1, paddingHorizontal: 14, fontSize: 15, color: '#1a1a1a' },
  eyeBtn: { paddingHorizontal: 12 },
  eyeIcon: { fontSize: 12, color: '#4F8EF7', fontWeight: '700' },
  errorText: { fontSize: 12, color: '#ef4444' },

  // Buttons
  loginBtn: {
    backgroundColor: '#1a1a2e',
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  dividerText: { fontSize: 13, color: '#aaa' },
  kycBtn: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycBtnText: { color: '#1a1a2e', fontSize: 15, fontWeight: '600' },
});

export default LoginScreen;