import { View } from "react-native";

import { DashboardScreen } from "../../screens/DashboardScreen";

export function RootNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <DashboardScreen />
    </View>
  );
}
