// @ts-ignore
// @ts-nocheck
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

// --- Providers & Notifications (từ nhánh main) ---
import { AppProviders } from "./src/app/providers";
import {
  MobileNotificationToast,
  useMobileNotificationContext,
} from "./src/features/notifications";
import "./src/index.css";

// --- Navigators & Screens ---
import AuthNavigator from "./src/auth/navigation/AuthNavigator"; // Từ HEAD
import HomeScreen from "./src/screens/HomeScreen"; // Từ main
import DestinationScreen from "./src/screens/DestinationScreen";
import RideOptionsScreen from "./src/screens/RideOptionsScreen";
import { SearchingDriverScreen } from "./src/screens/SearchingDriverScreen";
import { RideTrackingScreen } from "./src/screens/RideTrackingScreen";

const Stack = createNativeStackNavigator();

/**
 * Adapter component to render the global toast from context
 */
function MobileNotificationToastAdapter() {
  const { latestToast, dismissToast } = useMobileNotificationContext();

  if (!latestToast) return null;

  return (
    <MobileNotificationToast
      notification={latestToast}
      onDismiss={dismissToast}
    />
  );
}

import { Platform } from "react-native";

export default function App(): React.JSX.Element {
  React.useEffect(() => {
    if (Platform.OS === "web") {
      // Đảm bảo Leaflet CSS được tải
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement("link");
        link.id = 'leaflet-css';
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
    }
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AppProviders>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Home">
            {/* Flow Xác thực (Auth) */}
            <Stack.Screen
              name="Auth"
              component={AuthNavigator}
              options={{ headerShown: false }}
            />

            {/* Flow Chính (Main App) */}
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
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

          {/* Global Toast Overlay */}
          <MobileNotificationToastAdapter />
        </NavigationContainer>
      </AppProviders>
    </SafeAreaProvider>
  );
}
