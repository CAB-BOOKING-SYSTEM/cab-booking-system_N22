import React from "react";
import { View, StyleSheet, Alert } from "react-native";
import { RideTrackingMap } from "./RideTrackingMap";
import { DriverInfoCard } from "./DriverInfoCard";
import { useRideTracking } from "../hooks/useRideTracking";
import { RideStatus, Location, DriverInfo } from "../types/ride.types";

interface RideTrackingViewProps {
  rideId: string;
  initialStatus: RideStatus;
  initialDriver?: DriverInfo;
  pickupLocation: Location;
  dropoffLocation: Location;
  onRideComplete?: () => void;
  onRideCancelled?: () => void;
}

export function RideTrackingView({
  rideId,
  initialStatus,
  initialDriver,
  pickupLocation,
  dropoffLocation,
  onRideComplete,
  onRideCancelled,
}: RideTrackingViewProps) {
  const { status, driver, driverLocation, error } = useRideTracking({
    rideId,
    initialStatus,
    initialDriver,
  });

  const handleCancel = () => {
    Alert.alert("Hủy chuyến", "Bạn có chắc muốn hủy chuyến đi này?", [
      { text: "Không", style: "cancel" },
      { 
        text: "Có, Hủy", 
        style: "destructive", 
        onPress: () => {
          // Implement cancellation logic (API call)
          onRideCancelled?.();
        } 
      },
    ]);
  };

  const handleCall = () => {
    Alert.alert("Gọi tài xế", `Đang kết nối tới ${driver?.driverName}...`);
  };

  const handleMessage = () => {
    Alert.alert("Nhắn tin", "Mở cửa sổ chat...");
  };

  return (
    <View style={styles.container}>
      <RideTrackingMap
        driverLocation={driverLocation}
        pickupLocation={pickupLocation}
        dropoffLocation={dropoffLocation}
        status={status}
      />
      
      <View style={styles.bottomSheet}>
        <DriverInfoCard
          driver={driver}
          status={status}
          onCancel={handleCancel}
          onCall={handleCall}
          onMessage={handleMessage}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
});
