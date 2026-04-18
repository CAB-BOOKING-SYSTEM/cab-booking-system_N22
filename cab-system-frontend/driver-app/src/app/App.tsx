import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { AppProviders } from "./providers/AppProviders";
import { RootNavigator } from "./navigation/RootNavigator";

export default function App() {
  return (
    <AppProviders>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <RootNavigator />
          <StatusBar style="auto" />
        </SafeAreaView>
      </SafeAreaProvider>
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },
});
