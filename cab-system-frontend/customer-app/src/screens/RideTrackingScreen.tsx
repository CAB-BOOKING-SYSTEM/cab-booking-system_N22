// @ts-nocheck
// @ts-ignore
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

export function RideTrackingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { driverInfo } = (route.params as any) || {};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚗 Đang theo dõi chuyến đi</Text>
      <View style={styles.driverCard}>
        <Text style={styles.driverName}>Tài xế: {driverInfo?.driverName || "Đang tìm..."}</Text>
        <Text style={styles.driverInfo}>Xe: {driverInfo?.vehicleType || "Đang cập nhật"}</Text>
        <Text style={styles.driverInfo}>Biển số: {driverInfo?.vehiclePlate || "Đang cập nhật"}</Text>
        <Text style={styles.driverInfo}>⏱️ ETA: {Math.ceil(driverInfo?.estimatedArrivalSec / 60) || 0} phút</Text>
      </View>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>Quay lại</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#f5f7fb", 
    padding: 20 
  },
  title: { 
    fontSize: 24, 
    fontWeight: "bold", 
    color: "#333", 
    marginBottom: 30 
  },
  driverCard: { 
    backgroundColor: "#fff", 
    padding: 20, 
    borderRadius: 16, 
    width: "100%", 
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  driverName: { 
    fontSize: 18, 
    fontWeight: "bold", 
    color: "#333", 
    marginBottom: 8 
  },
  driverInfo: { 
    fontSize: 14, 
    color: "#666", 
    marginTop: 4 
  },
  backButton: { 
    backgroundColor: "#4CAF50", 
    paddingHorizontal: 40, 
    paddingVertical: 12, 
    borderRadius: 30 
  },
  backButtonText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "600" 
  },
});