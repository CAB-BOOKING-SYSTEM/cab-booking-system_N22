// @ts-nocheck
// @ts-ignore
// driver-app/src/screens/RideDetailScreen.tsx
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";

export function RideDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { rideId, requestData } = route.params as any;

  const handleStartRide = () => {
    console.log("Bắt đầu chuyến đi:", rideId);
    // TODO: Gọi API start ride
  };

  const handleCompleteRide = () => {
    console.log("Hoàn thành chuyến đi:", rideId);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chi tiết chuyến đi</Text>
        <Text style={styles.rideId}>Mã chuyến: {rideId}</Text>
      </View>

      <View style={styles.content}>
        {/* Thông tin khách hàng */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
          <Text style={styles.customerName}>
            {requestData?.customerInfo?.customerName || "Khách hàng"}
          </Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingStar}>⭐</Text>
            <Text style={styles.ratingText}>
              {requestData?.customerInfo?.customerRating || 4.5}
            </Text>
          </View>
        </View>

        {/* Tuyến đường */}
        <View style={styles.routeCard}>
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, styles.pickupDot]} />
            <View style={styles.routeContent}>
              <Text style={styles.routeLabel}>Điểm đón</Text>
              <Text style={styles.routeAddress}>
                {requestData?.pickupLocation?.address || "Địa chỉ đón"}
              </Text>
            </View>
          </View>

          <View style={styles.routeLine} />

          <View style={styles.routePoint}>
            <View style={[styles.routeDot, styles.dropoffDot]} />
            <View style={styles.routeContent}>
              <Text style={styles.routeLabel}>Điểm đến</Text>
              <Text style={styles.routeAddress}>
                {requestData?.dropoffLocation?.address || "Địa chỉ đến"}
              </Text>
            </View>
          </View>
        </View>

        {/* Giá */}
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Giá ước tính</Text>
          <Text style={styles.priceValue}>
            {(requestData?.estimatedPrice || 50000).toLocaleString()}đ
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.startButton} onPress={handleStartRide}>
          <Text style={styles.startButtonText}>Bắt đầu chuyến</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  rideId: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingStar: {
    fontSize: 14,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 14,
    color: "#666",
  },
  routeCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 2,
  },
  pickupDot: {
    backgroundColor: "#4CAF50",
  },
  dropoffDot: {
    backgroundColor: "#f44336",
  },
  routeContent: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  routeAddress: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  routeLine: {
    width: 2,
    height: 30,
    backgroundColor: "#ddd",
    marginLeft: 5,
    marginVertical: 8,
  },
  priceCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 16,
    color: "#666",
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f44336",
  },
  footer: {
    padding: 20,
    paddingBottom: 30,
  },
  startButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  startButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});