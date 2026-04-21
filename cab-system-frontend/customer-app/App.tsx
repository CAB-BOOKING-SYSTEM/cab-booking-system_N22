// customer-app/App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/app/navigation';

import { AppProviders } from './src/app/providers';
import { 
  MobileNotificationToast, 
  useMobileNotificationContext 
} from './src/features/notifications';
import './src/index.css';

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
        <AppNavigator />
      </NavigationContainer>
 82a456d0cda5052c934e06079269b396df628a1b
    </SafeAreaProvider>
  );
}