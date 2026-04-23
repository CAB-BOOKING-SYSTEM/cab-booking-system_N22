import { View, Text, ActivityIndicator } from "react-native";
import { useEffect } from "react";

const PAYMENT_API = "http://192.168.1.5:3005/api/payments";

export default function PaymentWaiting({ route, navigation }) {
  const { rideId } = route.params;

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${PAYMENT_API}/status/${rideId}`);
        const data = await res.json();

        console.log("STATUS:", data);

        if (data.status === "SUCCESS") {
          clearInterval(interval);
          navigation.replace("PaymentResult", {
            status: "success",
            rideId,
          });
        }

        if (data.status === "FAILED") {
          clearInterval(interval);
          navigation.replace("PaymentResult", {
            status: "failed",
            rideId,
          });
        }

      } catch (err) {
        console.log(err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ padding: 20 }}>
      <Text>Đang chờ thanh toán...</Text>
      <ActivityIndicator size="large" />
    </View>
  );
}