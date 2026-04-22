
import { useEffect, useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { driverService } from "../features/matching/services/driver.service";

type RideStatus = "ACCEPTED" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED";

export function RideDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { rideId, requestData } = route.params as any;

  const [status, setStatus] = useState<RideStatus>("ACCEPTED");
  const [isUpdating, setIsUpdating] = useState(false);

  // Giả lập cập nhật vị trí mỗi 5 giây
  useEffect(() => {
    if (status === "COMPLETED") return;

    const interval = setInterval(() => {
      // Mock location change
      const mockLat = 10.7769 + (Math.random() - 0.5) * 0.001;
      const mockLng = 106.7009 + (Math.random() - 0.5) * 0.001;
      
      driverService.updateLocation("DRIVER_001", { lat: mockLat, lng: mockLng });
    }, 5000);

    return () => clearInterval(interval);
  }, [status]);

  const handleUpdateStatus = async (nextStatus: RideStatus) => {
    setIsUpdating(true);
    const success = await driverService.updateRideStatus(rideId, nextStatus);
    if (success) {
      setStatus(nextStatus);
      if (nextStatus === "COMPLETED") {
        Alert.alert("Thành công", "Chuyến đi đã hoàn thành", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      }
    } else {
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái");
    }
    setIsUpdating(false);
  };

  const getButtonText = () => {
    switch (status) {
      case "ACCEPTED": return "Đã đến điểm đón";
      case "ARRIVED": return "Bắt đầu chuyến đi";
      case "IN_PROGRESS": return "Kết thúc chuyến đi";
      default: return "Hoàn thành";
    }
  };

  const getNextStatus = (): RideStatus => {
    switch (status) {
      case "ACCEPTED": return "ARRIVED";
      case "ARRIVED": return "IN_PROGRESS";
      case "IN_PROGRESS": return "COMPLETED";
      default: return "COMPLETED";
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {status === "ACCEPTED" ? "Đang tới điểm đón" : 
           status === "ARRIVED" ? "Khách đã lên xe" : 
           status === "IN_PROGRESS" ? "Đang di chuyển" : "Hoàn thành"}
        </Text>
        <Text style={styles.rideId}>Mã chuyến: {rideId}</Text>
      </View>

      <View style={styles.content}>
        {/* Tuyến đường */}
        <View style={styles.routeCard}>
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, styles.pickupDot]} />
            <View style={styles.routeContent}>
              <Text style={styles.routeLabel}>Điểm đón</Text>
              <Text style={styles.routeAddress}>{requestData?.pickupLocation?.address}</Text>
            </View>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, styles.dropoffDot]} />
            <View style={styles.routeContent}>
              <Text style={styles.routeLabel}>Điểm đến</Text>
              <Text style={styles.routeAddress}>{requestData?.dropoffLocation?.address}</Text>
            </View>
          </View>
        </View>

        {/* Thông tin khách */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Khách hàng</Text>
          <Text style={styles.customerName}>{requestData?.customerInfo?.customerName}</Text>
          <Text style={styles.priceValue}>💰 {requestData?.estimatedPrice?.toLocaleString()}đ</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.actionButton, status === "IN_PROGRESS" && styles.endButton]} 
          onPress={() => handleUpdateStatus(getNextStatus())}
          disabled={isUpdating}
        >
          <Text style={styles.buttonText}>
            {isUpdating ? "Đang xử lý..." : getButtonText()}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  header: { backgroundColor: "#fff", padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#333" },
  rideId: { fontSize: 14, color: "#666", marginTop: 4 },
  content: { flex: 1, padding: 20 },
  routeCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 16 },
  routePoint: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  routeDot: { width: 12, height: 12, borderRadius: 6, marginTop: 2 },
  pickupDot: { backgroundColor: "#4CAF50" },
  dropoffDot: { backgroundColor: "#f44336" },
  routeContent: { flex: 1 },
  routeLabel: { fontSize: 12, color: "#999", marginBottom: 4 },
  routeAddress: { fontSize: 14, color: "#333", fontWeight: "500" },
  routeLine: { width: 2, height: 30, backgroundColor: "#ddd", marginLeft: 5, marginVertical: 4 },
  infoCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 12, color: "#999", marginBottom: 8 },
  customerName: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 8 },
  priceValue: { fontSize: 20, fontWeight: "bold", color: "#f44336" },
  footer: { padding: 20, paddingBottom: 40 },
  actionButton: { backgroundColor: "#4CAF50", paddingVertical: 18, borderRadius: 12, alignItems: "center" },
  endButton: { backgroundColor: "#f44336" },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});