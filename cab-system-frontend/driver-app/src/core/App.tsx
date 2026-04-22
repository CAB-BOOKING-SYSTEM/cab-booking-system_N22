import { StyleSheet, View } from "react-native";

import { AppProviders } from "./providers/AppProviders";
import { RootNavigator } from "./navigation/RootNavigator";
import { 
  MobileNotificationToast, 
  useMobileNotificationContext 
} from "../features/notifications";

function MobileNotificationToastAdapter() {
  const { latestToast, dismissToast } = useMobileNotificationContext();
  if (!latestToast) return null;
  return <MobileNotificationToast notification={latestToast} onDismiss={dismissToast} />;
}

export default function App() {
  return (
    <AppProviders>
      <View style={styles.container}>
        <RootNavigator />
        <MobileNotificationToastAdapter />
      </View>
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },
});
