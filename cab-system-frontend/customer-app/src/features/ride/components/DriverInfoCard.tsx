import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { DriverInfo, RideStatus } from "../types/ride.types";

interface DriverInfoCardProps {
  driver?: DriverInfo;
  status: RideStatus;
  onCancel?: () => void;
  onCall?: () => void;
  onMessage?: () => void;
}

export function DriverInfoCard({
  driver,
  status,
  onCancel,
  onCall,
  onMessage,
}: DriverInfoCardProps) {
  const getStatusText = () => {
    switch (status) {
      case RideStatus.ASSIGNED:
      case RideStatus.ACCEPTED: return "Tài xế đã nhận chuyến";
      case RideStatus.PICKUP:
      case RideStatus.ARRIVING: return "Tài xế đang đến";
      case RideStatus.IN_PROGRESS: return "Đang di chuyển...";
      case RideStatus.COMPLETED: return "Chuyến đi đã hoàn thành";
      case RideStatus.PAID: return "Đã thanh toán";
      case RideStatus.CANCELLED: return "Chuyến đi đã bị hủy";
      default: return "Đang cập nhật...";
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
        <Text style={styles.etaText}>
          {driver?.estimatedArrivalSec ? `${Math.ceil(driver.estimatedArrivalSec / 60)} phút` : '--'}
        </Text>
      </View>

      <View style={styles.driverInfo}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            <Text style={{ fontSize: 24 }}>👤</Text>
          </View>
        </View>
        
        <View style={styles.details}>
          <Text style={styles.driverName}>{driver?.driverName || "Tài xế"}</Text>
          <Text style={styles.vehicleInfo}>
            {driver?.vehiclePlate} • {driver?.vehicleType}
          </Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>⭐ {driver?.rating || "5.0"}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={onCall}>
            <Text style={styles.actionIcon}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onMessage}>
            <Text style={styles.actionIcon}>💬</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Hủy chuyến</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  statusBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: "#2E7D32",
    fontWeight: "bold",
    fontSize: 14,
  },
  etaText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  details: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  vehicleInfo: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  ratingContainer: {
    marginTop: 4,
  },
  ratingText: {
    fontSize: 14,
    color: "#FFA000",
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  actionIcon: {
    fontSize: 20,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    paddingTop: 16,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: "#F44336",
    fontSize: 16,
    fontWeight: "600",
  },
});
