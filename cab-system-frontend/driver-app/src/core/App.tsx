import { StyleSheet, View } from "react-native";

import { AppProviders } from "./providers/AppProviders";
import { RootNavigator } from "./navigation/RootNavigator";

export default function App() {
  return (
    <AppProviders>
      <View style={styles.container}>
        <RootNavigator />
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
