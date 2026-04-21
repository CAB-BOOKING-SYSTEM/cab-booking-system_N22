import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from './src/screens/HomeScreen';
import RideOptionsScreen from './src/screens/RideOptionsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen 
          name="RideOptions" 
          component={RideOptionsScreen}
          options={{ title: 'Chọn phương tiện' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}