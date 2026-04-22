// @ts-nocheck
// @ts-ignore
// driver-app/src/screens/IncomingRequestScreen.tsx
import { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Vibration,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { driverService } from "../features/matching/services/driver.service";

const { width } = Dimensions.get("window");

type RootStackParamList = {
  RideDetail: {
    rideId: string;
    requestData: any;
  };
};

interface IncomingRequestParams {
  requestData: {
    requestId: string;
    rideId: string;
    pickupLocation: { address: string; lat: number; lng: number };
    dropoffLocation: { address: string; lat: number; lng: number };
    distance: number;
    estimatedPrice: number;
    estimatedDuration: number;
    customerInfo: { customerId: string; customerName: string; customerRating: number };
  };
}

export function IncomingRequestScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const params = route.params as IncomingRequestParams;
  const requestData = params?.requestData;

  const [remainingTime, setRemainingTime] = useState(15);
  const [isExpired, setIsExpired] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const timerBarAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Rung điện thoại khi có request
    Vibration.vibrate([500, 500, 500]);

    // Animation thanh timer
    Animated.timing(timerBarAnim, {
      toValue: 0,
      duration: 15000,
      useNativeDriver: false,
    }).start();

    // Countdown timer
    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Animation lắc
    startShakeAnimation();

    return () => {
      clearInterval(timer);
      Vibration.cancel();
    };
  }, []);

  const startShakeAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.delay(2000),
      ]),
      { iterations: 3 }
    ).start();
  };

  const handleAccept = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const success = await driverService.acceptRide("DRIVER_001", requestData?.rideId || "");
      if (success) {
        Vibration.cancel();
        navigation.replace("RideDetail", {
          rideId: requestData?.rideId,
          requestData,
        });
      } else {
        Alert.alert("Lỗi", "Không thể nhận chuyến, vui lòng thử lại");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Có lỗi xảy ra");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      await driverService.rejectRide("DRIVER_001", requestData?.rideId || "");
      Vibration.cancel();
      navigation.goBack();
    } catch (error) {
      navigation.goBack();
    } finally {
      setIsProcessing(false);
    }
  };

  const shakeTransform = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-5, 5],
  });

  const timerBarWidth = timerBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  if (isExpired) {
    return (
      <View style={styles.container}>
        <View style={styles.expiredCard}>
          <Text style={styles.expiredIcon}>⏰</Text>
          <Text style={styles.expiredTitle}>Hết thời gian</Text>
          <Text style={styles.expiredText}>
            Bạn đã không phản hồi kịp thời. Chuyến đi đã được gửi đến tài xế khác.
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleReject}>
            <Text style={styles.closeButtonText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Animated.View
        style={[styles.requestCard, { transform: [{ translateX: shakeTransform }] }]}
      >
        {/* Timer bar */}
        <View style={styles.timerBarContainer}>
          <Animated.View style={[styles.timerBar, { width: timerBarWidth }]} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.requestTitle}>Yêu cầu chuyến đi mới</Text>
            <Text style={styles.timerText}>Còn {remainingTime} giây để phản hồi</Text>
          </View>
          <View style={styles.soundWave}>
            <View style={styles.waveBar} />
            <View style={[styles.waveBar, { height: 20 }]} />
            <View style={[styles.waveBar, { height: 30 }]} />
            <View style={[styles.waveBar, { height: 20 }]} />
            <View style={styles.waveBar} />
          </View>
        </View>

        {/* Customer info */}
        <View style={styles.customerInfo}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {requestData?.customerInfo?.customerName?.charAt(0) || "K"}
            </Text>
          </View>
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>
              {requestData?.customerInfo?.customerName || "Khách hàng"}
            </Text>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingStar}>⭐</Text>
              <Text style={styles.ratingText}>
                {requestData?.customerInfo?.customerRating || 4.5}
              </Text>
            </View>
          </View>
        </View>

        {/* Route info */}
        <View style={styles.routeContainer}>
          <View style={styles.routeItem}>
            <View style={[styles.routeDot, styles.pickupDot]} />
            <View style={styles.routeContent}>
              <Text style={styles.routeLabel}>Đón tại</Text>
              <Text style={styles.routeAddress}>
                {requestData?.pickupLocation?.address || "Địa chỉ đón"}
              </Text>
            </View>
          </View>

          <View style={styles.routeLine} />

          <View style={styles.routeItem}>
            <View style={[styles.routeDot, styles.dropoffDot]} />
            <View style={styles.routeContent}>
              <Text style={styles.routeLabel}>Đến</Text>
              <Text style={styles.routeAddress}>
                {requestData?.dropoffLocation?.address || "Địa chỉ đến"}
              </Text>
            </View>
          </View>
        </View>

        {/* Trip details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>📏</Text>
            <Text style={styles.detailValue}>
              {requestData?.distance?.toFixed(1) || "2.5"} km
            </Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>⏱️</Text>
            <Text style={styles.detailValue}>
              {requestData?.estimatedDuration || 10} phút
            </Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>💰</Text>
            <Text style={styles.priceValue}>
              {(requestData?.estimatedPrice || 50000).toLocaleString()}đ
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.rejectButton} onPress={handleReject} disabled={isProcessing}>
            <Text style={styles.rejectButtonText}>{isProcessing ? "Đang xử lý..." : "Từ chối"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptButton} onPress={handleAccept} disabled={isProcessing}>
            <Text style={styles.acceptButtonText}>{isProcessing ? "Đang xử lý..." : "Nhận chuyến"}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  requestCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  timerBarContainer: {
    height: 4,
    backgroundColor: "#e0e0e0",
  },
  timerBar: {
    height: "100%",
    backgroundColor: "#4CAF50",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  headerLeft: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  timerText: {
    fontSize: 14,
    color: "#f44336",
    fontWeight: "500",
  },
  soundWave: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  waveBar: {
    width: 3,
    height: 12,
    backgroundColor: "#4CAF50",
    borderRadius: 2,
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1976d2",
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingStar: {
    fontSize: 12,
  },
  ratingText: {
    fontSize: 12,
    color: "#666",
  },
  routeContainer: {
    padding: 20,
  },
  routeItem: {
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
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#f8f9fa",
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  detailItem: {
    alignItems: "center",
    gap: 4,
  },
  detailIcon: {
    fontSize: 18,
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  priceValue: {
    fontSize: 16,
    color: "#f44336",
    fontWeight: "bold",
  },
  detailDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#ddd",
  },
  actionContainer: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    paddingBottom: 30,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f44336",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  rejectButtonText: {
    color: "#f44336",
    fontSize: 16,
    fontWeight: "600",
  },
  acceptButton: {
    flex: 2,
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  expiredCard: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  expiredIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  expiredTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  expiredText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: "#1976d2",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});