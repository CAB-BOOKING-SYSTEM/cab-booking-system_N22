import React from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView 
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ReviewForm } from "../features/review/components/ReviewForm";

type RootStackParamList = {
  RatingFeedback: {
    bookingId: string;
    driverName: string;
    driverAvatarUrl?: string;
  };
  MainTabs: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "RatingFeedback">;

export function RatingFeedbackScreen({ route, navigation }: Props) {
  const { driverName } = route.params;

  const handleSubmit = () => {
    // In a real app, we would call an API here
    navigation.navigate("MainTabs");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="close" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đánh giá chuyến đi</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.driverInfo}>
          <View style={styles.avatarPlaceholder}>
            <MaterialCommunityIcons name="account" size={40} color="#9ca3af" />
          </View>
          <Text style={styles.driverName}>{driverName}</Text>
          <Text style={styles.rideStatus}>Chuyến đi đã hoàn thành</Text>
        </View>

        <ReviewForm onFormUpdate={() => {}} />

        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Gửi đánh giá</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  content: {
    padding: 20,
    alignItems: "center",
  },
  driverInfo: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  driverName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  rideStatus: {
    fontSize: 14,
    color: "#6b7280",
  },
  submitButton: {
    backgroundColor: "#00B14F",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 32,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
