import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Image,
  ScrollView,
  Platform
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

import { ReviewForm } from "../features/review/components/ReviewForm";
import { reviewService } from "../features/review/review.service";

// Define the root stack param list to type the navigation route
type RootStackParamList = {
  MainTabs: { screen: string };
  RatingFeedback: {
    bookingId: string;
    driverName: string;
    driverAvatarUrl?: string;
  };
};

type RatingFeedbackScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "RatingFeedback">;
type RatingFeedbackScreenRouteProp = RouteProp<RootStackParamList, "RatingFeedback">;

interface Props {
  navigation: RatingFeedbackScreenNavigationProp;
  route: RatingFeedbackScreenRouteProp;
}

export function RatingFeedbackScreen({ navigation, route }: Props) {
  const { bookingId, driverName, driverAvatarUrl } = route.params;

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    rating: 0,
    comment: "",
    tags: [] as string[],
  });

  const handleSubmit = async () => {
    if (formData.rating === 0) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn số sao để đánh giá tài xế của bạn.");
      return;
    }

    setIsLoading(true);
    try {
      await reviewService.submitReview({
        bookingId,
        rating: formData.rating,
        comment: formData.comment,
        tags: formData.tags,
      });

      if (Platform.OS === "web") {
        window.alert("Thành công: Cảm ơn bạn đã gửi đánh giá!");
        navigation.navigate("MainTabs", { screen: "Home" });
      } else {
        Alert.alert("Thành công", "Cảm ơn bạn đã gửi đánh giá!", [
          { 
            text: "OK", 
            onPress: () => navigation.navigate("MainTabs", { screen: "Home" }) 
          }
        ]);
      }
    } catch (error) {
      console.error("Lỗi khi gửi đánh giá:", error);
      if (Platform.OS === "web") {
        window.alert("Có lỗi xảy ra: Không thể gửi đánh giá lúc này, vui lòng kiểm tra kết nối mạng và thử lại.");
      } else {
        Alert.alert(
          "Có lỗi xảy ra", 
          "Không thể gửi đánh giá lúc này, vui lòng kiểm tra kết nối mạng và thử lại."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Avatar placeholder in case none is provided
  const avatarSource = driverAvatarUrl 
    ? { uri: driverAvatarUrl } 
    : require("../../assets/favicon.png"); // Fallback to an existing local file if URL is missing

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.driverInfoContainer}>
          <Image source={avatarSource} style={styles.driverAvatar} />
          <Text style={styles.completedText}>Chuyến đi đã hoàn thành!</Text>
          <Text style={styles.driverName}>{driverName}</Text>
        </View>

        <View style={styles.formContainer}>
          <ReviewForm onFormUpdate={setFormData} />
        </View>
      </ScrollView>

      {/* Button placed at the bottom for one-hand usage */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitButton, formData.rating === 0 && styles.submitButtonDisabled]}
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={isLoading || formData.rating === 0}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Xác nhận đánh giá</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB", // Minimal clean background
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
  },
  driverInfoContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 32,
  },
  driverAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E5E7EB",
    marginBottom: 16,
  },
  completedText: {
    fontSize: 14,
    color: "#10B981", // Green indicating success
    fontWeight: "600",
    marginBottom: 4,
  },
  driverName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
  },
  formContainer: {
    flex: 1,
  },
  bottomBar: {
    padding: 16,
    paddingBottom: 32, // Safe area for notchless iphones usually
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  submitButton: {
    backgroundColor: "#2563EB", // Blue-600
    borderRadius: 14, // Rounded smooth corners
    height: 54, // Min 44dp as per rule for touch target
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#9CA3AF", // Gray-400
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});
