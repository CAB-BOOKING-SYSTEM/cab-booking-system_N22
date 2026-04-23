import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { AppProviders } from "./providers";
import AuthNavigator from "../features/auth/navigation/AuthNavigator";
import {
  MobileNotificationToast,
  useMobileNotificationContext,
} from "../features/notifications";
import HomeScreen from "../screens/HomeScreen";
import DestinationScreen from "../screens/DestinationScreen";
import RideOptionsScreen from "../screens/RideOptionsScreen";
import { SearchingDriverScreen } from "../screens/SearchingDriverScreen";
import { RideTrackingScreen } from "../screens/RideTrackingScreen";
import "../index.css";

type AppStackParamList = {
  Auth: undefined;
  Home: undefined;
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

const Stack = createNativeStackNavigator<AppStackParamList>();

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

export default function AppRoot(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AppProviders>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Auth">
            <Stack.Screen
              name="Auth"
              component={AuthNavigator}
              options={{ headerShown: false }}
            />
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

          <MobileNotificationToastAdapter />
        </NavigationContainer>
      </AppProviders>
    </SafeAreaProvider>
  );
}
