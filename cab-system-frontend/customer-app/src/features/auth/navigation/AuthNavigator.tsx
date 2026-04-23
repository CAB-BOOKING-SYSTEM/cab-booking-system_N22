import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import COLORS from '../constants/colors';
import ForgotPasswordScreen from '../screens/forgot-password';
import SignInScreen from '../screens/login';
import SignUpScreen from '../screens/register';
import SplashScreen from '../screens/splash';
import ResetPasswordScreen from '../screens/resetPassword';
import { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="SignIn"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.primary },
      }}
    >
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
