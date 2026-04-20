import { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ActivityScreen } from "../../screens/ActivityScreen";
import { HomeScreen } from "../../screens/HomeScreen";
import { LoginScreen } from "../../screens/LoginScreen";
import { ProfileScreen } from "../../screens/ProfileScreen";
import { RatingFeedbackScreen } from "../../screens/RatingFeedbackScreen";

type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  RatingFeedback: {
    bookingId: string;
    driverName: string;
    driverAvatarUrl?: string;
  };
};

type MainTabsParamList = {
  Home: undefined;
  Activity: undefined;
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
      <Tabs.Screen name="Home" component={HomeScreen} options={{ title: "Home" }} />
      <Tabs.Screen
        name="Activity"
        component={ActivityScreen}
        options={{ title: "Hoạt động" }}
      />
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
          <>
            <Stack.Screen name="MainTabs">
              {() => <MainTabs onLogout={() => setIsLoggedIn(false)} />}
            </Stack.Screen>
            <Stack.Screen name="RatingFeedback" component={RatingFeedbackScreen} />
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
