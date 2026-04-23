// @ts-ignore
// @ts-nocheck

// driver-app/src/core/navigation/RootNavigator.tsx
import { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { DriverHomeScreen } from "../../screens/DriverHomeScreen";
import { EarningsScreen } from "../../screens/EarningsScreen";
import { LoginScreen } from "../../screens/LoginScreen";
import { ProfileScreen } from "../../screens/ProfileScreen";
import { IncomingRequestScreen } from "../../screens/IncomingRequestScreen";
import { RideDetailScreen } from "../../screens/RideDetailScreen";

type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  IncomingRequest: { requestData: any };
  RideDetail: { rideId: string; requestData: any };
};

type MainTabsParamList = {
  DriverHome: undefined;
  Earnings: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabsParamList>();

function MainTabs({ onLogout }: { onLogout: () => Promise<void> }) {
  return (
    <Tabs.Navigator>
      <Tabs.Screen
        name="DriverHome"
        component={DriverHomeScreen}
        options={{ title: "Bản đồ" }}
      />
      <Tabs.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{ title: "Thu nhập" }}
      />
      <Tabs.Screen
        name="Profile"
        children={() => <ProfileScreen onLogout={onLogout} />}
        options={{ title: "Tài khoản" }}
      />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const [isLoggedIn, setIsLoggedIn] = useState(true); // Set true để test

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <>
            <Stack.Screen name="MainTabs">
              {() => <MainTabs onLogout={async () => setIsLoggedIn(false)} />}
            </Stack.Screen>

            {/* Modal screen cho incoming request */}
            <Stack.Screen
              name="IncomingRequest"
              component={IncomingRequestScreen}
              options={{
                presentation: "transparentModal",
                animation: "slide_from_bottom",
                gestureEnabled: false,
              }}
            />

            {/* Screen cho chi tiết chuyến đi sau khi nhận */}
            <Stack.Screen
              name="RideDetail"
              component={RideDetailScreen}
              options={{
                gestureEnabled: false,
                presentation: "card",
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth">
            {() => <LoginScreen onLogin={() => setIsLoggedIn(true)} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}