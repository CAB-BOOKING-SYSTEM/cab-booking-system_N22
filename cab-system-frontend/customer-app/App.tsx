import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform } from "react-native";
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

export default function App(): React.JSX.Element {
  React.useEffect(() => {
    if (Platform.OS === "web") {
      // Đảm bảo Leaflet CSS được tải
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement("link");
        link.id = 'leaflet-css';
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
    }
  }, []);

  return (
    <SafeAreaProvider>
      <MobileNotificationProvider userId="" accessToken="">
        <CoreApp />
        <MobileNotificationToastAdapter />
      </MobileNotificationProvider>
    </SafeAreaProvider>
  );
}
