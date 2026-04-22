// @ts-nocheck
// @ts-ignore
import { useState, useEffect, useRef } from "react";
import {
  Text, View, TouchableOpacity, StyleSheet, Animated, Dimensions, Alert, ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { matchingService } from "../features/matching/services/matching.service";

const { width } = Dimensions.get("window");

export function SearchingDriverScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as any;
  
  const [searchTime, setSearchTime] = useState(0);
  const [status, setStatus] = useState<"searching" | "found" | "error">("searching");
  const [errorMessage, setErrorMessage] = useState("");
  
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    startMatching();
    const interval = setInterval(() => setSearchTime(prev => prev + 1), 1000);
    startAnimations();
    return () => clearInterval(interval);
  }, []);
  
  const startAnimations = () => {
    Animated.loop(Animated.sequence([
      Animated.timing(rippleAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(rippleAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();
  };
  
  const startMatching = async () => {
    try {
      const response = await matchingService.findDriver({
        rideId: params?.rideId || "RIDE_001",
        userId: params?.userId || "USER_001",
        pickupLat: params?.pickupLocation?.lat || 10.7769,
        pickupLng: params?.pickupLocation?.lng || 106.7009,
      });
      
      if (response.success && response.data) {
        setStatus("found");
        setTimeout(() => {
          navigation.replace("RideTracking", { driverInfo: response.data });
        }, 1000);
      } else {
        setStatus("error");
        setErrorMessage(response.error || "Không tìm thấy tài xế");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("Có lỗi xảy ra");
    }
  };
  
  const handleCancel = () => {
    Alert.alert("Hủy tìm kiếm", "Bạn có chắc muốn hủy?", [
      { text: "Không", style: "cancel" },
      { text: "Có", onPress: () => navigation.goBack() },
    ]);
  };
  
  const rippleScale = rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 3] });
  const rippleOpacity = rippleAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.3, 0] });
  
  if (status === "error") {
    return (
      <View style={styles.container}>
        <View style={styles.mapPlaceholder}><Text style={styles.mapText}>🗺️ Bản đồ</Text></View>
        <View style={styles.bottomPanel}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>❌</Text>
            <Text style={styles.errorTitle}>Không tìm thấy tài xế</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={startMatching}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}><Text style={styles.mapText}>🗺️ Bản đồ</Text></View>
        <View style={styles.rippleContainer}>
          <Animated.View style={[styles.ripple, { transform: [{ scale: rippleScale }], opacity: rippleOpacity }]} />
          <Animated.View style={[styles.centerDot, { transform: [{ scale: pulseAnim }] }]} />
        </View>
      </View>
      <View style={styles.bottomPanel}>
        <View style={styles.statusContainer}>
          <View style={styles.searchingIndicator}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <Text style={styles.statusText}>Đang tìm tài xế gần bạn...</Text>
          </View>
          <Text style={styles.timeText}>{Math.floor(searchTime / 60)}:{(searchTime % 60).toString().padStart(2, "0")}</Text>
        </View>
        <View style={styles.routeInfo}>
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, styles.pickupDot]} />
            <Text style={styles.routeAddress}>{params?.pickupLocation?.address || "Điểm đón"}</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, styles.dropoffDot]} />
            <Text style={styles.routeAddress}>{params?.dropoffLocation?.address || "Điểm đến"}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Hủy tìm chuyến</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  mapContainer: { flex: 1, position: "relative" },
  mapPlaceholder: { flex: 1, backgroundColor: "#e0e0e0", justifyContent: "center", alignItems: "center" },
  mapText: { color: "#666", fontSize: 16 },
  rippleContainer: { position: "absolute", top: "50%", left: "50%", marginLeft: -40, marginTop: -40, width: 80, height: 80, alignItems: "center", justifyContent: "center" },
  ripple: { position: "absolute", width: 80, height: 80, borderRadius: 40, backgroundColor: "#4CAF50" },
  centerDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#4CAF50" },
  bottomPanel: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  statusContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  searchingIndicator: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusText: { fontSize: 16, fontWeight: "500", color: "#333" },
  timeText: { fontSize: 14, color: "#666" },
  routeInfo: { backgroundColor: "#f5f5f5", borderRadius: 12, padding: 16, marginBottom: 20 },
  routePoint: { flexDirection: "row", alignItems: "center", gap: 12 },
  routeDot: { width: 12, height: 12, borderRadius: 6 },
  pickupDot: { backgroundColor: "#4CAF50" },
  dropoffDot: { backgroundColor: "#f44336" },
  routeAddress: { flex: 1, fontSize: 14, color: "#333" },
  routeLine: { width: 2, height: 20, backgroundColor: "#ddd", marginLeft: 5, marginVertical: 4 },
  cancelButton: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#f44336", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  cancelButtonText: { color: "#f44336", fontSize: 16, fontWeight: "600" },
  errorContainer: { alignItems: "center", padding: 20 },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 8 },
  errorMessage: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 20 },
  retryButton: { backgroundColor: "#4CAF50", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40, marginBottom: 12 },
  retryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});