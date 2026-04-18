import { View } from "react-native";

import { HomeScreen } from "../../screens/HomeScreen";

export function RootNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <HomeScreen />
    </View>
  );
}
