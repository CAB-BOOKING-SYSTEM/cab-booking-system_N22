import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { styled } from "nativewind";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

const getStatusColor = (status) => {
  switch (status.toLowerCase()) {
    case "completed":
      return {
        bg: "bg-green-100 dark:bg-green-900",
        text: "text-green-700 dark:text-green-300",
      };
    case "cancelled":
      return {
        bg: "bg-red-100 dark:bg-red-900",
        text: "text-red-700 dark:text-red-300",
      };
    case "ongoing":
      return {
        bg: "bg-blue-100 dark:bg-blue-900",
        text: "text-blue-700 dark:text-blue-300",
      };
    default:
      return {
        bg: "bg-gray-100 dark:bg-gray-800",
        text: "text-gray-700 dark:text-gray-300",
      };
  }
};

export const RideCard = ({
  date,
  pickupLocation,
  dropoffLocation,
  amount,
  status,
  isDriver = false,
  earnings,
  onPress,
}) => {
  const statusColor = getStatusColor(status);

  return (
    <StyledView className="mb-3 rounded-2xl overflow-hidden">
      <StyledTouchableOpacity
        onPress={onPress}
        className="p-4 bg-white dark:bg-gray-800 bg-opacity-95 dark:bg-opacity-95 active:opacity-70"
      >
        {/* Route Section */}
        <StyledView className="flex-row items-center mb-4">
          {/* Left Column with Route Dots and Line */}
          <StyledView className="items-center mr-3 pt-1">
            {/* Pickup Dot */}
            <View className="w-3 h-3 rounded-full bg-green-500" />

            {/* Vertical Line */}
            <View className="w-0.5 h-12 bg-gray-300 dark:bg-gray-600 my-0.5" />

            {/* Dropoff Dot */}
            <View className="w-3 h-3 rounded-full bg-red-500" />
          </StyledView>

          {/* Right Column with Location Details */}
          <StyledView className="flex-1">
            <StyledText className="text-sm font-semibold text-gray-900 dark:text-white">
              {pickupLocation}
            </StyledText>
            <StyledView className="h-8" />
            <StyledText className="text-sm font-semibold text-gray-900 dark:text-white">
              {dropoffLocation}
            </StyledText>
          </StyledView>
        </StyledView>

        {/* Info Footer */}
        <StyledView className="flex-row items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
          <StyledView className="flex-row items-center space-x-3">
            <StyledView>
              <StyledText className="text-xs text-gray-600 dark:text-gray-400">
                {date}
              </StyledText>
              <StyledText className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                ${amount.toFixed(2)}
              </StyledText>
            </StyledView>
          </StyledView>

          <StyledView className="flex-row items-center space-x-2">
            {isDriver && earnings ? (
              <View className={`px-3 py-1.5 ${statusColor.bg} rounded-lg`}>
                <StyledText className={`text-xs font-bold ${statusColor.text}`}>
                  +${earnings.toFixed(2)}
                </StyledText>
              </View>
            ) : null}

            <View className={`px-3 py-1.5 ${statusColor.bg} rounded-lg`}>
              <StyledText className={`text-xs font-bold ${statusColor.text}`}>
                {status}
              </StyledText>
            </View>
          </StyledView>
        </StyledView>
      </StyledTouchableOpacity>
    </StyledView>
  );
};
