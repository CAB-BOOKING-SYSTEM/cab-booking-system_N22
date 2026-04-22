import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AuthCard from '../components/AuthCard';
import AuthInput from '../components/AuthInput';
import { requestPasswordReset, resetPassword } from '../apis/auth';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingToken, setLoadingToken] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const onRequestToken = async (): Promise<void> => {
    if (!email.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập email');
      return;
    }

    setLoadingToken(true);
    try {
      const data = await requestPasswordReset(email.trim());
      if (data.resetToken) {
        setToken(data.resetToken);
      }
      Alert.alert('Thành công', data.message || 'Đã gửi reset token');
    } catch (error) {
      Alert.alert('Thất bại', error instanceof Error ? error.message : 'Không thể tạo reset token');
    } finally {
      setLoadingToken(false);
    }
  };

  const onResetPassword = async (): Promise<void> => {
    if (!token.trim() || !newPassword) {
      Alert.alert('Thông báo', 'Vui lòng nhập token và mật khẩu mới');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Thông báo', 'Mật khẩu mới ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Thông báo', 'Xác nhận mật khẩu không khớp');
      return;
    }

    setLoadingReset(true);
    try {
      const data = await resetPassword(token.trim(), newPassword);
      Alert.alert('Thành công', data.message || 'Đặt lại mật khẩu thành công', [
        { text: 'Đăng nhập', onPress: () => navigation.replace('SignIn') },
      ]);
    } catch (error) {
      Alert.alert('Thất bại', error instanceof Error ? error.message : 'Đặt lại mật khẩu thất bại');
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <AuthCard title="Quên mật khẩu" subtitle="Lấy token và đặt lại mật khẩu">
          <AuthInput label="Email" value={email} onChangeText={setEmail} placeholder="example@email.com" keyboardType="email-address" />
          <TouchableOpacity style={[styles.primaryBtn, loadingToken ? styles.disabled : null]} onPress={onRequestToken} disabled={loadingToken}>
            {loadingToken ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Lấy reset token</Text>}
          </TouchableOpacity>

          <AuthInput label="Reset token" value={token} onChangeText={setToken} placeholder="Nhập reset token" />
          <AuthInput label="Mật khẩu mới" value={newPassword} onChangeText={setNewPassword} placeholder="Nhập mật khẩu mới" secureTextEntry />
          <AuthInput label="Nhập lại mật khẩu mới" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Nhập lại mật khẩu mới" secureTextEntry />

          <TouchableOpacity style={[styles.primaryBtn, loadingReset ? styles.disabled : null]} onPress={onResetPassword} disabled={loadingReset}>
            {loadingReset ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Đặt lại mật khẩu</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
            <Text style={styles.linkText}>Quay lại đăng nhập</Text>
          </TouchableOpacity>
        </AuthCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#4F8EF7' },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 },
  primaryBtn: {
    backgroundColor: '#4F8EF7',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
  linkText: { textAlign: 'center', color: '#4F8EF7', fontWeight: '700' },
  disabled: { opacity: 0.75 },
});

export default ForgotPasswordScreen;
