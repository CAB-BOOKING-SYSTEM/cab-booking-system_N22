import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Text, Button } from "react-native";

// import screens
import PaymentPage from "./src/screens/PaymentPage";
import PaymentWaiting from "./src/screens/PaymentWaiting";
import PaymentResult from "./src/screens/PaymentResult";

const Stack = createNativeStackNavigator();

// 👉 màn home test
function HomeScreen({ navigation }) {
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>
        🚗 DRIVER APP
      </Text>

      <Button
        title="Test Payment"
        onPress={() =>
          navigation.navigate("PaymentPage", {
            rideId: "TEST_RIDE_123",
            amount: 60000,
          })
        }
      />
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>

        <Stack.Screen name="Home" component={HomeScreen} />

        <Stack.Screen name="PaymentPage" component={PaymentPage} />

        <Stack.Screen name="PaymentWaiting" component={PaymentWaiting} />

        <Stack.Screen name="PaymentResult" component={PaymentResult} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}