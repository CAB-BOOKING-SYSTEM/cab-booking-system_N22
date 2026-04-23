import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export function EarningsScreen() {
  // Dữ liệu giả lập - Trong thực tế sẽ lấy từ API
  const stats = {
    totalEarnings: "1.250.000",
    totalTrips: 15,
    rating: 4.9,
    onlineHours: "8.5",
  };

  const recentTrips = [
    { id: "1", date: "22/04", time: "14:30", amount: "85.000", status: "Hoàn thành" },
    { id: "2", date: "22/04", time: "11:15", amount: "120.000", status: "Hoàn thành" },
    { id: "3", date: "21/04", time: "18:45", amount: "250.000", status: "Hoàn thành" },
    { id: "4", date: "21/04", time: "09:20", amount: "65.000", status: "Hoàn thành" },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Summary */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Thu nhập tuần này</Text>
        <Text style={styles.headerValue}>{stats.totalEarnings}đ</Text>
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Ionicons name="car-outline" size={16} color="#fff" />
            <Text style={styles.chipText}>{stats.totalTrips} Chuyến</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.chipText}>{stats.rating}</Text>
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Thời gian bật app</Text>
          <Text style={styles.statValue}>{stats.onlineHours}h</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Tỷ lệ nhận chuyến</Text>
          <Text style={styles.statValue}>98%</Text>
        </View>
      </View>

      {/* Recent Trips */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Chuyến đi gần đây</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        {recentTrips.map((trip) => (
          <View key={trip.id} style={styles.tripItem}>
            <View style={styles.tripIcon}>
              <Ionicons name="location-outline" size={24} color="#1a1a2e" />
            </View>
            <View style={styles.tripInfo}>
              <Text style={styles.tripDate}>
                {trip.date} • {trip.time}
              </Text>
              <Text style={styles.tripStatus}>{trip.status}</Text>
            </View>
            <View style={styles.tripAmountContainer}>
              <Text style={styles.tripAmount}>+{trip.amount}đ</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FE",
  },
  header: {
    backgroundColor: "#1a1a2e",
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: "center",
  },
  headerLabel: {
    color: "#ffffff90",
    fontSize: 16,
    marginBottom: 8,
  },
  headerValue: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "800",
    marginBottom: 20,
  },
  chipRow: {
    flexDirection: "row",
    gap: 12,
  },
  chip: {
    backgroundColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  chipText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: -20,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0px 4px 10px rgba(0,0,0,0.05)",
  },
  statLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  section: {
    padding: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  seeAllText: {
    color: "#4F8EF7",
    fontSize: 14,
    fontWeight: "600",
  },
  tripItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  tripIcon: {
    width: 48,
    height: 48,
    backgroundColor: "#F0F2FF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  tripInfo: {
    flex: 1,
  },
  tripDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  tripStatus: {
    fontSize: 12,
    color: "#22c55e",
    fontWeight: "500",
  },
  tripAmountContainer: {
    alignItems: "flex-end",
  },
  tripAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a2e",
  },
});
