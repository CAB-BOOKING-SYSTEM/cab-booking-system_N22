import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  MobileNotificationProvider,
  MobileNotificationToast,
  useMobileNotificationContext,
} from "./src/features/notifications";
import "./src/index.css";
import CoreApp from "./src/core/App";

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
      <MobileNotificationProvider userId="" accessToken="">
        <CoreApp />
        <MobileNotificationToastAdapter />
      </MobileNotificationProvider>
    </SafeAreaProvider>
  );
}
