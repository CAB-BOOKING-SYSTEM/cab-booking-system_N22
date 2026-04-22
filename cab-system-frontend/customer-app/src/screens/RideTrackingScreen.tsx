// @ts-nocheck
// @ts-ignore
import { View, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { RideTrackingView, RideStatus } from "../features/ride";

export function RideTrackingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { driverInfo, rideId, pickupLocation, dropoffLocation } = (route.params as any) || {};

  // Mock locations if not provided for development/demo
  const mockPickup = pickupLocation || { latitude: 10.7769, longitude: 106.7009 };
  const mockDropoff = dropoffLocation || { latitude: 10.7626, longitude: 106.6602 };

  return (
    <View style={styles.container}>
      <RideTrackingView
        rideId={rideId || "RIDE_001"}
        initialStatus={RideStatus.ACCEPTED}
        initialDriver={driverInfo}
        pickupLocation={mockPickup}
        dropoffLocation={mockDropoff}
        onRideCancelled={() => navigation.navigate("Home")}
        onRideComplete={() => navigation.navigate("Home")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff", 
  },
});
