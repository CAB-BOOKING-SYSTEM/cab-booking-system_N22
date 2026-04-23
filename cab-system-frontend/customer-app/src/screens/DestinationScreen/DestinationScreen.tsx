// src/screens/DestinationScreen/DestinationScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Alert, Text } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

// Components
import {
  DestinationSearchInput,
  PlaceList,
} from "../../features/booking/components";

// Services
import {
  getPlaceDetails,
  getNearbyPlaces,
} from "../../features/booking/services/locationApi";

// Hooks
import { usePlaceAutocomplete } from "../../features/booking/hooks/usePlaceAutocomplete";

// Utils
import {
  saveRecentPlace,
  getRecentPlaces,
} from "../../features/booking/utils/storage";

// Types
import { RootStackParamList } from "../../app/navigation/types";
import {
  PlaceDetails,
  NearbyPlace,
  PlacePrediction,
} from "../../features/booking/types";

type DestinationScreenRouteProp = RouteProp<RootStackParamList, "Destination">;

// Type cho item trong FlatList (có thể là header hoặc place)
type ListItem =
  | { type: "header"; title: string }
  | PlaceDetails
  | NearbyPlace
  | PlacePrediction;

const DestinationScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<DestinationScreenRouteProp>();
  const { pickupLocation } = route.params;

  // 🔍 LOG: Kiểm tra dữ liệu nhận từ HomeScreen
  console.log("=== 📍 DỮ LIỆU NHẬN TỪ HOME ===");
  console.log("Pickup Lat:", pickupLocation.lat);
  console.log("Pickup Lng:", pickupLocation.lng);
  console.log("Pickup Address:", pickupLocation.address);
  console.log("================================");

  // States với type rõ ràng
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [recentPlaces, setRecentPlaces] = useState<PlaceDetails[]>([]);
  const [suggestedPlaces, setSuggestedPlaces] = useState<NearbyPlace[]>([]);

  const { predictions, searchPlaces, loading } = usePlaceAutocomplete();

  // Load dữ liệu ban đầu
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async (): Promise<void> => {
    try {
      // Load lịch sử địa điểm
      const recents = await getRecentPlaces();
      setRecentPlaces(recents);

      // Load địa điểm gợi ý gần pickup
      const nearby = await getNearbyPlaces(pickupLocation);
      setSuggestedPlaces(nearby);

    } catch (error) {
      console.error("❌ Error loading initial data:", error);
    }
  };

  // Xử lý tìm kiếm
  const handleSearch = useCallback(
    (text: string): void => {
      setSearchQuery(text);
      searchPlaces(text);
    },
    [searchPlaces],
  );

  // Xử lý khi chọn địa điểm
  const handleSelectPlace = async (
    place: PlaceDetails | NearbyPlace | PlacePrediction,
  ): Promise<void> => {
    try {
      // Lấy chi tiết địa điểm (tọa độ)
      const details = await getPlaceDetails(place);

      if (!details) {
        Alert.alert(
          "Lỗi",
          "Không thể lấy chi tiết địa điểm. Vui lòng thử lại.",
        );
        return;
      }

      // Lưu vào lịch sử
      await saveRecentPlace(details);

      // Chuyển sang màn hình chọn xe (RideOptions)
      (navigation.navigate as any)('RideOptions', {
        pickupLocation,
        dropoffLocation: {
          lat: details.geometry.location.lat,
          lng: details.geometry.location.lng,
          address: details.formatted_address,
          name: details.name,
          placeId: details.place_id,
        },
      });
      
    } catch (error) {
      console.error("❌ Lỗi khi chọn địa điểm:", error);
      Alert.alert("Lỗi", "Không thể chọn địa điểm này. Vui lòng thử lại.");
    }
  };

  // Tạo dữ liệu hiển thị cho FlatList
  const getDisplayData = (): ListItem[] => {
    if (searchQuery.length > 0) {
      return predictions;
    }

    const data: ListItem[] = [];

    // Thêm recent places nếu có
    if (recentPlaces.length > 0) {
      data.push({ type: "header", title: "Địa điểm gần đây" });
      data.push(...recentPlaces);
    }

    // Thêm suggested places
    if (suggestedPlaces.length > 0) {
      data.push({ type: "header", title: "Địa điểm gợi ý gần bạn" });
      data.push(...suggestedPlaces);
    }

    return data;
  };

  const displayData = getDisplayData();

  return (
    <View style={styles.container}>
      {/* Pickup Info - Hiển thị điểm đón */}
      <View style={styles.pickupContainer}>
        <View style={styles.pickupDot} />
        <View style={styles.pickupInfo}>
          <View style={styles.pickupLabelContainer}>
            <View style={styles.greenDot} />
            <Text style={styles.pickupLabel}>Điểm đón</Text>
          </View>
          <Text style={styles.pickupAddress} numberOfLines={1}>
            {pickupLocation.address}
          </Text>
        </View>
      </View>

      {/* Search Input */}
      <DestinationSearchInput
        value={searchQuery}
        onChangeText={handleSearch}
        placeholder="Nhập điểm đến"
        autoFocus
      />

      {/* Place List */}
      <PlaceList
        data={displayData}
        onSelectPlace={handleSelectPlace}
        loading={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  pickupContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#FFFFFF",
  },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
    marginRight: 12,
  },
  pickupInfo: {
    flex: 1,
  },
  pickupLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4CAF50",
    marginRight: 6,
  },
  pickupLabel: {
    fontSize: 12,
    color: "#666666",
  },
  pickupAddress: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333333",
  },
});

export default DestinationScreen;
