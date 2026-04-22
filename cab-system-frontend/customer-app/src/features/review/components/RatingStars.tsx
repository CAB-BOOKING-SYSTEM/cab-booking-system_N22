import React, { useRef, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface RatingStarsProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  maxStars?: number;
  size?: number;
}

export function RatingStars({
  rating,
  onRatingChange,
  maxStars = 5,
  size = 40,
}: RatingStarsProps) {
  // Array array for zoom animation values
  const scales = useRef(
    Array(maxStars).fill(0).map(() => new Animated.Value(1))
  ).current;

  const handlePress = (selectedRating: number) => {
    onRatingChange(selectedRating);
    
    // Animate the clicked star
    Animated.sequence([
      Animated.timing(scales[selectedRating - 1], {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scales[selectedRating - 1], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const renderStars = () => {
    return Array.from({ length: maxStars }).map((_, index) => {
      const starNumber = index + 1;
      const isSelected = starNumber <= rating;

      return (
        <TouchableOpacity
          key={starNumber}
          activeOpacity={0.8}
          onPress={() => handlePress(starNumber)}
          style={styles.starWrapper}
        >
          <Animated.View style={{ transform: [{ scale: scales[index] }] }}>
            <Ionicons
              name={isSelected ? "star" : "star-outline"}
              size={size}
              color={isSelected ? "#F59E0B" : "#D1D5DB"} // Amber-500/Gray-300
            />
          </Animated.View>
        </TouchableOpacity>
      );
    });
  };

  return <View style={styles.container}>{renderStars()}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  starWrapper: {
    paddingHorizontal: 6,
  },
});
