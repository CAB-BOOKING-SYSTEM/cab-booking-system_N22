import { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { DriverHomeScreen } from "../../screens/DriverHomeScreen";
import { EarningsScreen } from "../../screens/EarningsScreen";
import { LoginScreen } from "../../screens/LoginScreen";
import { ProfileScreen } from "../../screens/ProfileScreen";

type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
};

type MainTabsParamList = {
  DriverHome: undefined;
  Earnings: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabsParamList>();

interface MainTabsProps {
  onLogout: () => void;
}

function MainTabs({ onLogout }: MainTabsProps) {
  const ProfileTabScreen = () => <ProfileScreen onLogout={onLogout} />;

  return (
    <Tabs.Navigator>
      <Tabs.Screen
        name="DriverHome"
        component={DriverHomeScreen}
        options={{ title: "Bản đồ" }}
      />
      <Tabs.Screen name="Earnings" component={EarningsScreen} options={{ title: "Thu nhập" }} />
      <Tabs.Screen
        name="Profile"
        component={ProfileTabScreen}
        options={{ title: "Tài khoản" }}
      />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="MainTabs">
            {() => <MainTabs onLogout={() => setIsLoggedIn(false)} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Auth">
            {() => <LoginScreen onLogin={() => setIsLoggedIn(true)} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
