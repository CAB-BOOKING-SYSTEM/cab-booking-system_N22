import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import LoginScreen from "../auth/screens/login";
import { logout as logoutApi, DriverAuthResponse } from "../auth/apis/auth";
import {
  clearDriverSession,
  DriverAuthSession,
  getDriverSession,
} from "../features/auth";
import { DriverHomeScreen } from "../screens/DriverHomeScreen";
import { EarningsScreen } from "../screens/EarningsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { IncomingRequestScreen } from "../screens/IncomingRequestScreen";
import { RideDetailScreen } from "../screens/RideDetailScreen";

type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  IncomingRequest: { requestData: unknown };
  RideDetail: { rideId: string; requestData: unknown };
};

type MainTabParamList = {
  DriverHome: undefined;
  Earnings: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

function LaunchScreen(): React.JSX.Element {
  return (
    <View style={styles.launchScreen}>
      <Text style={styles.launchTitle}>Driver App</Text>
      <Text style={styles.launchSubtitle}>Đang khởi động ứng dụng...</Text>
      <ActivityIndicator size="large" color="#ffffff" />
    </View>
  );
}

function MainTabs({
  onLogout,
}: {
  onLogout: () => Promise<void>;
}): React.JSX.Element {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#00B14F",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarIcon: ({ color, size }) => {
          const iconMap: Record<keyof MainTabParamList, string> = {
            DriverHome: "map",
            Earnings: "cash-multiple",
            Profile: "account-circle",
          };

          return (
            <MaterialCommunityIcons
              name={iconMap[route.name]}
              size={size}
              color={color}
            />
          );
        },
        tabBarLabel:
          route.name === "DriverHome"
            ? "Bản đồ"
            : route.name === "Earnings"
              ? "Thu nhập"
              : "Tài khoản",
      })}
    >
      <Tabs.Screen name="DriverHome" component={DriverHomeScreen} />
      <Tabs.Screen name="Earnings" component={EarningsScreen} />
      <Tabs.Screen name="Profile">
        {() => <ProfileScreen onLogout={onLogout} />}
      </Tabs.Screen>
    </Tabs.Navigator>
  );
}

export default function AppRoot(): React.JSX.Element {
  const [isBooting, setIsBooting] = useState(true);
  const [session, setSession] = useState<DriverAuthSession | null>(null);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const [savedSession] = await Promise.all([
        getDriverSession(),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]);

      if (!mounted) {
        return;
      }

      setSession(savedSession);
      setIsBooting(false);
    };

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const handleLoginSuccess = (data: DriverAuthResponse) => {
    if (!data.accessToken || !data.user) {
      Alert.alert("Thông báo", "Thiếu dữ liệu phiên đăng nhập.");
      return;
    }

    setSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    });
  };

  const handleLogout = async (): Promise<void> => {
    try {
      if (session) {
        await logoutApi({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể gửi yêu cầu đăng xuất tới máy chủ";
      Alert.alert("Thông báo", message);
    } finally {
      await clearDriverSession();
      setSession(null);
      Alert.alert("Thông báo", "Bạn đã đăng xuất thành công.");
    }
  };

  if (isBooting) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LaunchScreen />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator
          key={session ? "driver-authenticated" : "driver-guest"}
          initialRouteName={session ? "MainTabs" : "Auth"}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Auth">
            {() => <LoginScreen onSuccess={handleLoginSuccess} />}
          </Stack.Screen>
          <Stack.Screen name="MainTabs">
            {() => <MainTabs onLogout={handleLogout} />}
          </Stack.Screen>
          <Stack.Screen
            name="IncomingRequest"
            component={IncomingRequestScreen}
            options={{
              presentation: "transparentModal",
              animation: "slide_from_bottom",
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="RideDetail"
            component={RideDetailScreen}
            options={{
              gestureEnabled: false,
              presentation: "card",
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  launchScreen: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  launchTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#ffffff",
  },
  launchSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
  },
});
