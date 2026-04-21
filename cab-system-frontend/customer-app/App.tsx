// @ts-ignore
// @ts-nocheck
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import DestinationScreen from './src/screens/DestinationScreen';
import RideOptionsScreen from './src/screens/RideOptionsScreen';
import { SearchingDriverScreen } from './src/screens/SearchingDriverScreen';
import { RideTrackingScreen } from './src/screens/RideTrackingScreen';

const Stack = createNativeStackNavigator();

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
    </SafeAreaProvider>
  );
}