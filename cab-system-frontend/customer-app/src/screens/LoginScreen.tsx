import React from 'react';
import { View, Text, Button } from 'react-native';

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <View>
      <Text>Login</Text>
      <Button title="Login" onPress={onLogin} />
    </View>
  );
}
