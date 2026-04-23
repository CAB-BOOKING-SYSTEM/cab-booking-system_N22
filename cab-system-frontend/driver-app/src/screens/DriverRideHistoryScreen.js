import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { styled } from "nativewind";
import axios from "axios";
import { RideCard } from "../components/RideCard";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledSafeAreaView = styled(SafeAreaView);

const FILTER_OPTIONS = ["All", "Completed", "Cancelled"];

const mockDriverRideData = [
  {
    id: 1,
    date: "Today at 2:45 PM",
    pickupLocation: "123 Main St",
    dropoffLocation: "456 Business Ave",
    amount: 12.5,
    earnings: 10.0,
    status: "Completed",
  },
  {
    id: 2,
    date: "Today at 11:15 AM",
    pickupLocation: "789 Park Ave",
    dropoffLocation: "321 Center St",
    amount: 18.75,
    earnings: 15.0,
    status: "Completed",
  },
  {
    id: 3,
    date: "Yesterday at 6:45 PM",
    pickupLocation: "555 Oak Rd",
    dropoffLocation: "999 Pine St",
    amount: 9.25,
    earnings: 0,
    status: "Cancelled",
  },
  {
    id: 4,
    date: "2 days ago at 11:20 AM",
    pickupLocation: "111 Elm St",
    dropoffLocation: "222 Maple Ave",
    amount: 15.0,
    earnings: 12.0,
    status: "Completed",
  },
  {
    id: 5,
    date: "3 days ago at 4:00 PM",
    pickupLocation: "333 Cedar Ln",
    dropoffLocation: "444 Birch Rd",
    amount: 22.0,
    earnings: 17.6,
    status: "Completed",
  },
];

const FilterBar = ({ selectedFilter, onFilterChange }) => {
  return (
    <StyledView className="px-4 py-4 flex-row space-x-2 bg-white dark:bg-gray-900">
      {FILTER_OPTIONS.map((filter) => (
        <StyledTouchableOpacity
          key={filter}
          onPress={() => onFilterChange(filter)}
          className={`px-5 py-2 rounded-full ${
            selectedFilter === filter
              ? "bg-green-500"
              : "bg-gray-200 dark:bg-gray-700"
          }`}
        >
          <StyledText
            className={`text-sm font-semibold ${
              selectedFilter === filter
                ? "text-white"
                : "text-gray-700 dark:text-gray-300"
            }`}
          >
            {filter}
          </StyledText>
        </StyledTouchableOpacity>
      ))}
    </StyledView>
  );
};

const EarningsSummary = ({ completedRides, totalEarnings }) => {
  return (
    <StyledView className="px-4 py-4">
      <StyledView className="rounded-2xl overflow-hidden">
        <StyledView className="p-5 bg-emerald-600 bg-opacity-90">
          <StyledView className="flex-row items-center justify-between">
            <StyledView>
              <StyledText className="text-sm text-green-100 font-semibold">
                Today's Earnings
              </StyledText>
              <StyledText className="text-3xl font-bold text-white mt-2">
                ${totalEarnings.toFixed(2)}
              </StyledText>
              <StyledText className="text-xs text-green-100 mt-2">
                {completedRides} completed ride{completedRides !== 1 ? "s" : ""}
              </StyledText>
            </StyledView>
            <View className="w-16 h-16 rounded-2xl bg-white bg-opacity-20 items-center justify-center">
              <StyledText className="text-3xl">💰</StyledText>
            </View>
          </StyledView>
        </StyledView>
      </StyledView>
    </StyledView>
  );
};

export const DriverRideHistoryScreen = () => {
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDriverRideHistory = async () => {
      try {
        setLoading(true);
        // Simulate API call with mock data
        await new Promise((resolve) => setTimeout(resolve, 800));
        setRides(mockDriverRideData);
        setError(null);
      } catch (err) {
        setError("Failed to load ride history");
        console.error("Error fetching rides:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDriverRideHistory();
  }, []);

  const filteredRides = rides.filter((ride) => {
    if (selectedFilter === "All") return true;
    return ride.status.toLowerCase() === selectedFilter.toLowerCase();
  });

  const completedRides = filteredRides.filter(
    (ride) => ride.status.toLowerCase() === "completed",
  ).length;

  const totalEarnings = filteredRides.reduce(
    (sum, ride) => sum + ride.earnings,
    0,
  );

  const handleRidePress = (ride) => {
    console.log("Driver ride pressed:", ride);
    // Handle navigation or details view
  };

  return (
    <StyledSafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <StyledView className="border-b border-gray-200 dark:border-gray-700">
        <StyledView className="px-4 pt-4 pb-3">
          <StyledText className="text-2xl font-bold text-gray-900 dark:text-white">
            My Rides
          </StyledText>
        </StyledView>
      </StyledView>

      {/* Earnings Summary */}
      {!loading && !error && (
        <EarningsSummary
          completedRides={completedRides}
          totalEarnings={totalEarnings}
        />
      )}

      {/* Filter Bar */}
      <FilterBar
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
      />

      {/* Rides List */}
      {loading ? (
        <StyledView className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#00B14F" />
          <StyledText className="text-gray-600 dark:text-gray-400 mt-3">
            Loading rides...
          </StyledText>
        </StyledView>
      ) : error ? (
        <StyledView className="flex-1 items-center justify-center">
          <StyledText className="text-red-500 font-semibold">
            {error}
          </StyledText>
        </StyledView>
      ) : filteredRides.length === 0 ? (
        <StyledView className="flex-1 items-center justify-center">
          <StyledText className="text-gray-500 dark:text-gray-400 text-center">
            No{" "}
            {selectedFilter.toLowerCase() === "all"
              ? "rides"
              : selectedFilter.toLowerCase()}{" "}
            rides found
          </StyledText>
        </StyledView>
      ) : (
        <StyledScrollView className="px-4 py-4">
          {filteredRides.map((ride) => (
            <RideCard
              key={ride.id}
              date={ride.date}
              pickupLocation={ride.pickupLocation}
              dropoffLocation={ride.dropoffLocation}
              amount={ride.amount}
              earnings={ride.earnings}
              status={ride.status}
              isDriver={true}
              onPress={() => handleRidePress(ride)}
            />
          ))}
          <StyledView className="h-6" />
        </StyledScrollView>
      )}

      {/* Bottom Navigation */}
      <StyledView className="border-t border-gray-200 dark:border-gray-700">
        <StyledView className="flex-row items-center justify-around py-4">
          <StyledTouchableOpacity className="flex-1 items-center py-2">
            <StyledText className="text-2xl mb-1">👤</StyledText>
            <StyledText className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Profile
            </StyledText>
          </StyledTouchableOpacity>

          <StyledTouchableOpacity className="flex-1 items-center py-2">
            <StyledText className="text-2xl mb-1">🕐</StyledText>
            <StyledText className="text-xs font-semibold text-green-500">
              History
            </StyledText>
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>
    </StyledSafeAreaView>
  );
};
