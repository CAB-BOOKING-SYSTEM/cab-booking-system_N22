import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { DriverAuthResponse, login } from '../apis/auth';

interface LoginScreenProps {
  onSuccess?: (data: DriverAuthResponse) => void;
  onNavigateKYC?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess, onNavigateKYC }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = (): boolean => {
    const e: { email?: string; password?: string } = {};
    if (!email.trim()) e.email = 'Vui long nhap email';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email khong hop le';
    if (!password) e.password = 'Vui long nhap mat khau';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async (): Promise<void> => {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      if (data.user?.role !== 'DRIVER') {
        Alert.alert('Loi', 'Tai khoan nay khong phai tai khoan tai xe.');
        return;
      }
      Alert.alert('Thanh cong', data.message || 'Dang nhap thanh cong');
      onSuccess?.(data);
    } catch (err) {
      Alert.alert('Dang nhap that bai', err instanceof Error ? err.message : 'Khong the dang nhap');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>DRV</Text>
          </View>
          <Text style={styles.appName}>Express Driver</Text>
          <Text style={styles.tagline}>Ung dung danh cho tai xe</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dang nhap</Text>
          <Text style={styles.cardDesc}>Nhap thong tin tai khoan tai xe cua ban</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                placeholder="Nhap email"
                placeholderTextColor="#aaa"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Mat khau</Text>
              <View style={[styles.inputWrapper, errors.password ? styles.inputError : null]}>
                <TextInput
                  style={styles.inputInner}
                  placeholder="Nhap mat khau"
                  placeholderTextColor="#aaa"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((prev) => !prev)}>
                  <Text style={styles.eyeIcon}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            <TouchableOpacity style={[styles.loginBtn, loading ? styles.btnDisabled : null]} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Dang nhap</Text>}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoac</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.kycBtn} onPress={onNavigateKYC}>
              <Text style={styles.kycBtnText}>Dang ky lam tai xe moi</Text>
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
  header: { alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 20, color: '#fff', fontWeight: '700' },
  appName: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a2e' },
  cardDesc: { fontSize: 13, color: '#888', marginBottom: 8 },
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