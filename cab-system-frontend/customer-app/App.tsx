// @ts-ignore
// @ts-nocheck
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/app/navigation';

import { AppProviders } from './src/app/providers';
import { 
  MobileNotificationToast, 
  useMobileNotificationContext 
} from './src/features/notifications';
import './src/index.css';

import HomeScreen from './src/screens/HomeScreen';
import DestinationScreen from './src/screens/DestinationScreen';
import RideOptionsScreen from './src/screens/RideOptionsScreen';
import { SearchingDriverScreen } from './src/screens/SearchingDriverScreen';
import { RideTrackingScreen } from './src/screens/RideTrackingScreen';

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

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <NavigationContainer>
          <AppNavigator />
          {/* Global Toast Overlay */}
          <MobileNotificationToastAdapter />
        </NavigationContainer>
      </AppProviders>



export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Destination" component={DestinationScreen} options={{ title: 'Chọn điểm đến' }} />
          <Stack.Screen name="RideOptions" component={RideOptionsScreen} options={{ title: 'Chọn phương tiện' }} />
          <Stack.Screen name="SearchingDriver" component={SearchingDriverScreen} options={{ headerShown: false }} />
          <Stack.Screen name="RideTracking" component={RideTrackingScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
 82a456d0cda5052c934e06079269b396df628a1b
    </SafeAreaProvider>
  );
}