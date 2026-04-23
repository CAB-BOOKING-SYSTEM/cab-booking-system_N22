import { View, Text, Button } from "react-native";

export default function PaymentResult({ route, navigation }) {
  const { status, rideId } = route.params;

  return (
    <View style={{ padding: 20 }}>
      <Text>
        {status === "success"
          ? "✅ Thanh toán thành công"
          : "❌ Thanh toán thất bại"}
      </Text>

      <Text>Ride: {rideId}</Text>

      <Button title="Về Home" onPress={() => navigation.navigate("Home")} />
    </View>
  );
}