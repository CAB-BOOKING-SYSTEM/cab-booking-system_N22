import React, { useEffect, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { driverService } from "../features/matching/services/driver.service";
import { WebMapView } from "../components/Map/WebMapView";

const { width, height } = Dimensions.get("window");

type RootStackParamList = {
  IncomingRequest: { requestData: any };
};

export function DriverHomeScreen({ authData }: { authData: any }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isOnline, setIsOnline] = useState(true);
  const [location, setLocation] = useState({ latitude: 10.762622, longitude: 106.660172 }); // Quận 1, TP.HCM
  const driverId = authData?.userId || "UNKNOWN_DRIVER";
  const token = authData?.accessToken;

  useEffect(() => {
    if (isOnline && token) {
      driverService.connectWebSocket(driverId, token, (request) => {
        navigation.navigate("IncomingRequest", { requestData: request });
      });
    } else {
      driverService.disconnectWebSocket();
    }

    return () => {
      driverService.disconnectWebSocket();
    };
  }, [isOnline, navigation, driverId, token]);

  const toggleOnlineStatus = async () => {
    const newStatus = !isOnline;
    const success = await driverService.toggleStatus(driverId, newStatus ? "online" : "offline");
    if (success) {
      setIsOnline(newStatus);
    }
  };

  return (
    <View style={styles.container}>
      {/* Real Map View */}
      <View style={styles.mapContainer}>
        <WebMapView latitude={location.latitude} longitude={location.longitude} />

        {/* Thông tin vị trí giả lập */}
        <View style={styles.locationTag}>
          <Ionicons name="navigate" size={16} color="#4F8EF7" />
          <Text style={styles.locationText}>Quận 1, TP. Hồ Chí Minh</Text>
        </View>
      </View>

      {/* Bottom Panel */}
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
              trackColor={{ false: "#E0E0E0", true: "#4CAF50" }}
              thumbColor="#fff"
            />
          </View>

          <Text style={styles.statusDescription}>
            {isOnline
              ? "Hệ thống đang tìm kiếm chuyến đi tốt nhất xung quanh bạn."
              : "Bật trạng thái trực tuyến để bắt đầu nhận các yêu cầu đặt xe."}
          </Text>

          {isOnline && (
            <View style={styles.statsRow}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatLabel}>Chấp nhận</Text>
                <Text style={styles.miniStatValue}>100%</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatLabel}>Đánh giá</Text>
                <Text style={styles.miniStatValue}>5.0 ⭐</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatLabel}>Hôm nay</Text>
                <Text style={styles.miniStatValue}>0đ</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mapContainer: {
    flex: 1,
    backgroundColor: "#F0F2F5",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  mapLine: {
    height: 1,
    backgroundColor: "#1a1a2e",
    width: "200%",
    marginVertical: 40,
    marginLeft: "-50%",
  },
  driverMarkerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  driverMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    boxShadow: "0px 4px 5px rgba(0,0,0,0.3)",
  },
  pulseCircle: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(26, 26, 46, 0.15)",
    transform: [{ scale: 1 }],
  },
  locationTag: {
    position: "absolute",
    top: 50,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30,
    boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
    boxShadow: "0px -10px 15px rgba(0,0,0,0.1)",
  },
  statusCard: {
    backgroundColor: "#F8F9FE",
    borderRadius: 24,
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
    backgroundColor: "#FF5252",
    marginRight: 10,
  },
  onlineDot: {
    backgroundColor: "#4CAF50",
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a2e",
    flex: 1,
  },
  statusDescription: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    paddingTop: 16,
  },
  miniStat: {
    alignItems: "center",
  },
  miniStatLabel: {
    fontSize: 11,
    color: "#888",
    marginBottom: 4,
  },
  miniStatValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a2e",
  },
});