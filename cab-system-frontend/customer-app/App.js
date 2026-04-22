import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import COLORS from "./src/auth/constants/colors";
import SplashScreen from "./src/auth/screens/splash";
import SignInScreen from "./src/auth/screens/login";
import SignUpScreen from "./src/auth/screens/register";
import ForgotPasswordScreen from "./src/auth/screens/forgot-password";

import { HomeScreen } from "./src/screens/HomeScreen";
import RideOptionsScreen from "./src/screens/RideOptionsScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false, // Ẩn header mặc định cho toàn bộ stack (từ HEAD)
            contentStyle: { backgroundColor: COLORS.primary },
          }}
        >
          {/* Nhóm màn hình Xác thực (Auth) */}
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
          />

          {/* Nhóm màn hình Chính (Main) */}
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen
            name="RideOptions"
            component={RideOptionsScreen}
            options={{
              title: "Chọn phương tiện",
              headerShown: true, // Ghi đè lại để hiển thị tiêu đề của nhánh main
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
