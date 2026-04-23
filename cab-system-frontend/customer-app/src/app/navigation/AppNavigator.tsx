// src/app/navigation/AppNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';  // ✅ Sửa: dùng native-stack
import { RootStackParamList } from './types';

// Screens - import default
import DestinationScreen from '../../screens/DestinationScreen';      // ✅ Sửa: import default
import HomeScreen from '../../screens/HomeScreen';
import RideOptionsScreen from '../../screens/RideOptionsScreen';  // ← THÊM DÒNG NÀY


const Stack = createNativeStackNavigator<RootStackParamList>();  // ✅ Sửa: NativeStack

export const AppNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Destination" 
        component={DestinationScreen}
        options={{ 
          title: 'Chọn điểm đến',
          headerBackTitle: 'Quay lại',
        }}
      />

      {/* ← THÊM MÀN HÌNH RIDEOPTIONS */}
      <Stack.Screen 
        name="RideOptions" 
        component={RideOptionsScreen}
        options={{ 
          title: 'Chọn phương tiện',
          headerBackTitle: 'Quay lại',
        }}
      />
    </Stack.Navigator>
  );
};