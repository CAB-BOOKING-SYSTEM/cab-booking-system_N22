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
} from 'react-native';
import { login } from '../auth/apis/auth'; // Giả định apis vẫn ở đó

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
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
      setTimeout(() => onLogin(), 1000);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể đăng nhập', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      {toast && (
        <View style={[styles.toast, { backgroundColor: toast.type === 'success' ? '#22c55e' : toast.type === 'error' ? '#ef4444' : '#3b82f6' }]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.appName}>Driver App</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Đăng nhập</Text>
          <Text style={styles.cardDesc}>Nhập thông tin tài khoản tài xế</Text>

          <View style={styles.form}>
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
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#1a1a2e' },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40, gap: 28 },
  toast: { position: 'absolute', top: 60, left: 16, right: 16, zIndex: 999, borderRadius: 12, padding: 12 },
  toastText: { fontSize: 14, color: '#fff', fontWeight: '500', textAlign: 'center' },
  header: { alignItems: 'center' },
  appName: { fontSize: 28, fontWeight: '800', color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, gap: 8 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a2e' },
  cardDesc: { fontSize: 13, color: '#888', marginBottom: 8 },
  form: { gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: '#333' },
  input: { height: 48, borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 10, paddingHorizontal: 14, fontSize: 15 },
  inputError: { borderColor: '#ef4444' },
  inputWrapper: { height: 48, borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  inputInner: { flex: 1, paddingHorizontal: 14, fontSize: 15 },
  eyeBtn: { paddingHorizontal: 12 },
  eyeIcon: { fontSize: 12, color: '#4F8EF7', fontWeight: '700' },
  errorText: { fontSize: 12, color: '#ef4444' },
  loginBtn: { backgroundColor: '#1a1a2e', height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnDisabled: { opacity: 0.6 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default LoginScreen;
