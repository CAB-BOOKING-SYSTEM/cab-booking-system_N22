import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AuthCard from '../components/AuthCard';
import AuthInput from '../components/AuthInput';
import { resetPassword } from '../apis/auth';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

const ResetPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text.replace(/[^0-9]/g, ''); // Chỉ cho nhập số
    setOtp(newOtp);

    // Tự động focus ô tiếp theo
    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    // Xóa → focus ô trước
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const onSubmit = async (): Promise<void> => {
    const otpCode = otp.join('');

    if (otpCode.length < 6) {
      Alert.alert('Thông báo', 'Vui lòng nhập đủ 6 số OTP');
      return;
    }
    if (!newPassword) {
      Alert.alert('Thông báo', 'Vui lòng nhập mật khẩu mới');
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

    setLoading(true);
    try {
      const data = await resetPassword(otpCode, newPassword);
      Alert.alert('Thành công 🎉', data.message || 'Đặt lại mật khẩu thành công', [
        { text: 'Đăng nhập', onPress: () => navigation.navigate('SignIn') },
      ]);
    } catch (error) {
      Alert.alert('Thất bại', error instanceof Error ? error.message : 'Đặt lại mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <AuthCard title="Đặt lại mật khẩu" subtitle="Nhập mã OTP từ email và mật khẩu mới">

          {/* 6 ô nhập OTP */}
          <Text style={styles.label}>Mã OTP</Text>
          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputs.current[index] = ref)}
                style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, index)}
                onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
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
            style={[styles.primaryBtn, loading && styles.disabled]}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Đặt lại mật khẩu</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.linkText}>Gửi lại mã OTP</Text>
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
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#ccc',
    borderRadius: 10,
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  otpBoxFilled: {
    borderColor: '#4F8EF7',
    backgroundColor: '#eef3ff',
  },
  primaryBtn: {
    backgroundColor: '#4F8EF7',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: '700' },
  linkText: {
    textAlign: 'center',
    color: '#4F8EF7',
    fontWeight: '700',
    marginTop: 8,
    textDecorationLine: 'underline',
  },
  disabled: { opacity: 0.75 },
});

export default ResetPasswordScreen;