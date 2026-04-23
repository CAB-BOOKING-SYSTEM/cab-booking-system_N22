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
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { AppProviders } from "./providers";
import AuthNavigator from "../features/auth/navigation/AuthNavigator";
import {
  clearCustomerSession,
  CustomerAuthSessionProvider,
  CustomerAuthSession,
  getCustomerSession,
} from "../features/auth";
import { logout as logoutApi } from "../features/auth/apis/auth";
import {
  MobileNotificationToast,
  useMobileNotificationContext,
} from "../features/notifications";
import HomeScreen from "../screens/HomeScreen";
import DestinationScreen from "../screens/DestinationScreen";
import RideOptionsScreen from "../screens/RideOptionsScreen";
import { SearchingDriverScreen } from "../screens/SearchingDriverScreen";
import { RideTrackingScreen } from "../screens/RideTrackingScreen";
import { ActivityScreen } from "../screens/ActivityScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import "../index.css";

type AppStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  Destination: {
    pickupLocation: {
      lat: number;
      lng: number;
      address: string;
    };
  };
  RideOptions: {
    pickupLocation: {
      lat: number;
      lng: number;
      address: string;
    };
    dropoffLocation: {
      lat: number;
      lng: number;
      address: string;
      name?: string;
    };
    distance?: number;
    duration?: number;
  };
  SearchingDriver: {
    rideId: string;
    userId: string;
    pickupLocation: {
      lat: number;
      lng: number;
      address: string;
    };
    dropoffLocation: {
      lat: number;
      lng: number;
      address: string;
      name?: string;
    };
    selectedRide: unknown;
  };
  RideTracking: {
    rideId?: string;
  };
};

type MainTabParamList = {
  HomeTab: undefined;
  Activity: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

function MobileNotificationToastAdapter() {
  const { latestToast, dismissToast } = useMobileNotificationContext();

  if (!latestToast) {
    return null;
  }

  return (
    <MobileNotificationToast
      notification={latestToast}
      onDismiss={dismissToast}
    />
  );
}

function LaunchScreen(): React.JSX.Element {
  return (
    <View style={styles.launchScreen}>
      <Text style={styles.launchTitle}>Cab Booking</Text>
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
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e5e7eb",
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarIcon: ({ color, size }) => {
          const iconMap: Record<keyof MainTabParamList, string> = {
            HomeTab: "map-marker-radius",
            Activity: "history",
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
          route.name === "HomeTab"
            ? "Trang chủ"
            : route.name === "Activity"
              ? "Hoạt động"
              : "Tài khoản",
      })}
    >
      <Tabs.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: "Trang chủ" }}
      />
      <Tabs.Screen
        name="Activity"
        component={ActivityScreen}
        options={{ title: "Hoạt động" }}
      />
      <Tabs.Screen name="Profile" options={{ title: "Tài khoản" }}>
        {() => <ProfileScreen onLogout={onLogout} />}
      </Tabs.Screen>
    </Tabs.Navigator>
  );
}

export default function AppRoot(): React.JSX.Element {
  const [isBooting, setIsBooting] = useState(true);
  const [session, setSession] = useState<CustomerAuthSession | null>(null);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const [savedSession] = await Promise.all([
        getCustomerSession(),
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
      await clearCustomerSession();
      setSession(null);
      Alert.alert("Thông báo", "Bạn đã đăng xuất thành công.");
    }
  };

  if (isBooting) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <LaunchScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <CustomerAuthSessionProvider value={{ session, setSession }}>
        <AppProviders>
          <NavigationContainer>
            <Stack.Navigator
              key={session ? "customer-authenticated" : "customer-guest"}
              initialRouteName={session ? "MainTabs" : "Auth"}
            >
              <Stack.Screen
                name="Auth"
                component={AuthNavigator}
                options={{ headerShown: false }}
              />
              <Stack.Screen name="MainTabs" options={{ headerShown: false }}>
                {() => <MainTabs onLogout={handleLogout} />}
              </Stack.Screen>
              <Stack.Screen
                name="Destination"
                component={DestinationScreen}
                options={{ title: "Chọn điểm đến" }}
              />
              <Stack.Screen
                name="RideOptions"
                component={RideOptionsScreen}
                options={{ title: "Chọn phương tiện" }}
              />
              <Stack.Screen
                name="SearchingDriver"
                component={SearchingDriverScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="RideTracking"
                component={RideTrackingScreen}
                options={{ headerShown: false }}
              />
            </Stack.Navigator>

            <MobileNotificationToastAdapter />
          </NavigationContainer>
        </AppProviders>
      </CustomerAuthSessionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  launchScreen: {
    flex: 1,
    backgroundColor: "#4F8EF7",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  launchTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#ffffff",
  },
  launchSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.9)",
  },
});
