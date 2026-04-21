import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../../screens/HomeScreen';
import RideOptionsScreen from '../../screens/RideOptionsScreen';  // ← THÊM

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      
      {/* ← THÊM ĐOẠN NÀY */}
      <Stack.Screen 
        name="RideOptions" 
        component={RideOptionsScreen}
        options={{ title: 'Chọn phương tiện' }}
      />
      
    </Stack.Navigator>
  );
}