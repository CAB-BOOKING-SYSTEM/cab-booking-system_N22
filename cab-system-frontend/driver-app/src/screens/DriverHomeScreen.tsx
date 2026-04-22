// @ts-nocheck
// @ts-ignore
// driver-app/src/screens/DriverHomeScreen.tsx
import { useEffect, useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { driverService } from "../features/matching/services/driver.service";

type RootStackParamList = {
  IncomingRequest: { requestData: any };
};

export function DriverHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isOnline, setIsOnline] = useState(true);
  const [driverId] = useState("DRIVER_001"); // TODO: Lấy từ auth context

  // Giả lập nhận request mới sau 3 giây
  useEffect(() => {
    if (!isOnline) return;

    const timer = setTimeout(() => {
      const mockRequest = {
        requestId: `REQ_${Date.now()}`,
        rideId: `RIDE_${Date.now()}`,
        pickupLocation: {
          address: "123 Nguyễn Huệ, Quận 1, TP.HCM",
          lat: 10.7769,
          lng: 106.7009,
        },
        dropoffLocation: {
          address: "456 Lê Lợi, Quận 1, TP.HCM",
          lat: 10.7761,
          lng: 106.7035,
        },
        distance: 2.5,
        estimatedPrice: 45000,
        estimatedDuration: 10,
        customerInfo: {
          customerId: "CUST001",
          customerName: "Trần Thị B",
          customerRating: 4.8,
        },
      };

      navigation.navigate("IncomingRequest", { requestData: mockRequest });
    }, 3000);

    return () => clearTimeout(timer);
  }, [isOnline, navigation]);

  const toggleOnlineStatus = async () => {
    const newStatus = !isOnline;
    const success = await driverService.toggleStatus(driverId, newStatus ? "online" : "offline");
    if (success) {
      setIsOnline(newStatus);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapText}>🗺️ Bản đồ sẽ hiển thị ở đây</Text>
      </View>

      <View style={styles.bottomPanel}>
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusDot, isOnline && styles.onlineDot]} />
            <Text style={styles.statusTitle}>
              {isOnline ? "Đang trực tuyến" : "Đang ngoại tuyến"}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={toggleOnlineStatus}
              trackColor={{ false: "#767577", true: "#4CAF50" }}
              thumbColor={isOnline ? "#fff" : "#f4f3f4"}
            />
          </View>

          <Text style={styles.statusDescription}>
            {isOnline
              ? "Hệ thống đang tìm kiếm chuyến đi cho bạn"
              : "Bật trạng thái trực tuyến để nhận chuyến"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
  mapText: {
    color: "#666",
    fontSize: 16,
  },
  bottomPanel: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  statusCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    padding: 20,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ccc",
    marginRight: 8,
  },
  onlineDot: {
    backgroundColor: "#4CAF50",
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  statusDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    lineHeight: 20,
  },
});