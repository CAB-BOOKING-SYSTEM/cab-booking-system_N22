import { View, Text, Button, Alert } from "react-native";
import * as Linking from "expo-linking";

const PAYMENT_API = "http://192.168.56.1:3005/api/payments"; // ⚠️ đổi IP

export default function PaymentPage({ route, navigation }) {
  const { rideId, amount } = route.params;

  const handlePay = async () => {
    try {
      const res = await fetch(`${PAYMENT_API}/vnpay/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rideId, amount }),
      });

      const data = await res.json();

      if (data.url) {
        // 🔥 MỞ VNPay
        await Linking.openURL(data.url);

        // 👉 sau khi mở VNPay → chuyển sang màn polling
        navigation.navigate("PaymentWaiting", { rideId });

      } else {
        Alert.alert("Lỗi", "Không tạo được link thanh toán");
      }
    } catch (err) {
      Alert.alert("Lỗi", err.message);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Ride: {rideId}</Text>
      <Text>Amount: {amount}</Text>

      <Button title="Thanh toán VNPay" onPress={handlePay} />
    </View>
  );
}