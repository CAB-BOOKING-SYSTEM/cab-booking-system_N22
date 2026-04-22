import { useEffect, useState, useRef } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { driverService } from "../features/matching/services/driver.service";

const { width } = Dimensions.get("window");

// Backend Status: ASSIGNED, PICKUP, IN_PROGRESS, COMPLETED
type RideStatus = "ASSIGNED" | "PICKUP" | "IN_PROGRESS" | "COMPLETED";

export function RideDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { rideId, requestData } = route.params as any;

  // Mặc định là ASSIGNED khi mới nhận chuyến
  const [status, setStatus] = useState<RideStatus>("ASSIGNED");
  const [isUpdating, setIsUpdating] = useState(false);

  // Giả lập cập nhật vị trí mỗi 5 giây khi đang trong chuyến
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
    } else {
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái. Vui lòng kiểm tra lại kết nối backend.");
    }
    setIsUpdating(false);
  };

  const renderHeader = () => {
    let title = "";
    let color = "#333";

    switch (status) {
      case "ASSIGNED":
        title = "Đang tới điểm đón";
        color = "#1a73e8";
        break;
      case "PICKUP":
        title = "Đã đến điểm đón";
        color = "#4CAF50";
        break;
      case "IN_PROGRESS":
        title = "Đang trong chuyến đi";
        color = "#f44336";
        break;
      case "COMPLETED":
        title = "Chuyến đi hoàn tất";
        color = "#333";
        break;
    }

    return (
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color }]}>{title}</Text>
          <View style={{ width: 28 }} />
        </View>
        <Text style={styles.rideId}>Mã chuyến: {rideId}</Text>
      </View>
    );
  };

  const renderRouteInfo = () => {
    return (
      <View style={styles.card}>
        <View style={styles.routeContainer}>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: "#4CAF50" }]} />
            <View style={styles.routeText}>
              <Text style={styles.routeLabel}>ĐIỂM ĐÓN</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {requestData?.pickupLocation?.address || "Địa chỉ đón"}
              </Text>
            </View>
          </View>
          <View style={[styles.routePoint, { marginTop: 20 }]}>
            <View style={[styles.dot, { backgroundColor: "#f44336" }]} />
            <View style={styles.routeText}>
              <Text style={styles.routeLabel}>ĐIỂM ĐẾN</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {requestData?.dropoffLocation?.address || "Địa chỉ đến"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderCustomerCard = () => {
    return (
      <View style={styles.card}>
        <View style={styles.customerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {requestData?.customerInfo?.customerName?.charAt(0) || "K"}
            </Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>
              {requestData?.customerInfo?.customerName || "Khách hàng"}
            </Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingText}>
                {requestData?.customerInfo?.customerRating || 5.0}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.callBtn}>
            <Ionicons name="call" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderActionArea = () => {
    if (status === "COMPLETED") {
      return (
        <View style={styles.completedContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          <Text style={styles.completedTitle}>Tuyệt vời!</Text>
          <Text style={styles.completedSubtitle}>
            Bạn đã hoàn thành chuyến đi an toàn.
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>
                {(requestData?.estimatedPrice || 0).toLocaleString()}đ
              </Text>
              <Text style={styles.summaryLab}>Thu nhập</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>{requestData?.distance || 0} km</Text>
              <Text style={styles.summaryLab}>Quãng đường</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.navigate("MainTabs" as never)}
          >
            <Text style={styles.doneBtnText}>VỀ TRANG CHỦ</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.footer}>
        {status === "ASSIGNED" && (
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => handleUpdateStatus("PICKUP")}
            disabled={isUpdating}
          >
            <Ionicons name="navigate" size={24} color="#fff" />
            <Text style={styles.btnText}>ĐÃ ĐẾN ĐIỂM ĐÓN</Text>
          </TouchableOpacity>
        )}

        {status === "PICKUP" && (
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: "#4CAF50" }]}
            onPress={() => handleUpdateStatus("IN_PROGRESS")}
            disabled={isUpdating}
          >
            <Ionicons name="play" size={24} color="#fff" />
            <Text style={styles.btnText}>BẮT ĐẦU CHUYẾN ĐI</Text>
          </TouchableOpacity>
        )}

        {status === "IN_PROGRESS" && (
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: "#f44336" }]}
            onPress={() => handleUpdateStatus("COMPLETED")}
            disabled={isUpdating}
          >
            <Ionicons name="flag" size={24} color="#fff" />
            <Text style={styles.btnText}>KẾT THÚC CHUYẾN ĐI</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      <View style={styles.content}>
        {status !== "COMPLETED" && (
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map" size={40} color="#ccc" />
            <Text style={styles.mapText}>Dẫn đường thời gian thực</Text>
          </View>
        )}
        
        {status !== "COMPLETED" && (
          <View style={styles.infoOverlay}>
            {renderCustomerCard()}
            {renderRouteInfo()}
          </View>
        )}

        {status === "COMPLETED" && renderActionArea()}
      </View>
      {status !== "COMPLETED" && renderActionArea()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  header: {
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  rideId: { fontSize: 12, color: "#999", marginTop: 4, textAlign: "center" },
  content: { flex: 1 },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: "#e0e4e8",
    justifyContent: "center",
    alignItems: "center",
  },
  mapText: { color: "#666", marginTop: 10, fontWeight: "500" },
  infoOverlay: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  customerRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1a73e8",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  customerInfo: { flex: 1, marginLeft: 12 },
  customerName: { fontSize: 16, fontWeight: "bold", color: "#333" },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 2, gap: 4 },
  ratingText: { fontSize: 13, color: "#666" },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
  },
  routeContainer: { paddingLeft: 10, position: "relative" },
  routeLine: {
    position: "absolute",
    left: 4,
    top: 10,
    bottom: 10,
    width: 2,
    backgroundColor: "#eee",
  },
  routePoint: { flexDirection: "row", alignItems: "flex-start" },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  routeText: { marginLeft: 15, flex: 1 },
  routeLabel: { fontSize: 10, color: "#999", fontWeight: "bold" },
  addressText: { fontSize: 14, color: "#333", fontWeight: "500", marginTop: 2 },
  footer: {
    backgroundColor: "#fff",
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  navBtn: {
    backgroundColor: "#1a73e8",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold", letterSpacing: 0.5 },
  completedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  completedTitle: { fontSize: 28, fontWeight: "900", color: "#333", marginTop: 20 },
  completedSubtitle: { fontSize: 16, color: "#666", textAlign: "center", marginTop: 8 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    backgroundColor: "#f8f9fa",
    borderRadius: 20,
    padding: 24,
    marginTop: 40,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryVal: { fontSize: 22, fontWeight: "bold", color: "#333" },
  summaryLab: { fontSize: 14, color: "#999", marginTop: 4 },
  summaryDivider: { width: 1, height: "100%", backgroundColor: "#ddd" },
  doneBtn: {
    backgroundColor: "#333",
    width: "100%",
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 40,
  },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});