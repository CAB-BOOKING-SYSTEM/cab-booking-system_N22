import React from "react";
import { View, Text } from "react-native";
import { styled } from "nativewind";

const StyledView = styled(View);
const StyledText = styled(Text);

export const ProfileHeader = ({
  userName = "Dong Cao",
  phoneNumber = "090**567",
}) => {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <StyledView className="w-full">
      <StyledView className="w-full bg-green-500 bg-opacity-80 px-4 pt-8 pb-8">
        <StyledView className="flex-row items-center">
          {/* Avatar Circle with Initials */}
          <View className="w-20 h-20 rounded-full border-2 border-white bg-green-400 items-center justify-center">
            <StyledText className="text-4xl font-bold text-white">
              {initials}
            </StyledText>
          </View>

          {/* User Info */}
          <StyledView className="ml-5 flex-1">
            <StyledText className="text-2xl font-bold text-white">
              {userName}
            </StyledText>
            <StyledText className="text-sm text-green-100 mt-1">
              {phoneNumber}
            </StyledText>
            <StyledView className="flex-row items-center mt-2">
              <View className="w-1.5 h-1.5 rounded-full bg-white" />
              <StyledText className="text-xs text-green-100 ml-2">
                Verified Member
              </StyledText>
            </StyledView>
          </StyledView>
        </StyledView>
      </StyledView>
    </StyledView>
  );
};
