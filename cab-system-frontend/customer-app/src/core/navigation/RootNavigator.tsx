import { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ActivityScreen } from "../../screens/ActivityScreen";
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
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        tabBarLabel: ({ focused }) => {
          let label = "";
          if (route.name === "Activity") {
            label = "History";
          } else if (route.name === "Profile") {
            label = "Profile";
          }
          return (
            <Text
              style={{
                color: focused ? "#00B14F" : "#9ca3af",
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {label}
            </Text>
          );
        },
        tabBarIcon: ({ focused }) => {
          let iconName = "";
          if (route.name === "Profile") {
            iconName = "account";
          } else if (route.name === "Activity") {
            iconName = "history";
          }
          return (
            <MaterialCommunityIcons 
              name={iconName as any}
              size={24}
              color={focused ? "#00B14F" : "#9ca3af"}
            />
          );
        },
        headerShown: false,
        tabBarActiveTintColor: "#00B14F",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#f3f4f6",
        },
      })}
    >
      <Tabs.Screen
        name="Activity"
        component={ActivityScreen}
        options={{ title: "History" }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileTabScreen}
        options={{ title: "Profile" }}
      />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const [isLoggedIn, setIsLoggedIn] = useState(true); // Set to true by default for testing

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
