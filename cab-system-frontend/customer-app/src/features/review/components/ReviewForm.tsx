import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { RatingStars } from "./RatingStars";
import { TextArea } from "./TextArea";

interface ReviewFormProps {
  onFormUpdate: (data: { rating: number; comment: string; tags: string[] }) => void;
}

const POSITIVE_TAGS = [
  "Tài xế thân thiện",
  "Xe sạch sẽ",
  "Lái xe an toàn",
  "Đúng giờ",
  "Trò chuyện vui vẻ",
];

const NEGATIVE_TAGS = [
  "Thái độ không tốt",
  "Phóng nhanh vượt ẩu",
  "Xe có mùi hôi",
  "Đến quá trễ",
  "Đi sai tuyến đường",
];

export function ReviewForm({ onFormUpdate }: ReviewFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
    // Reset selected tags if shifting between positive/negative territory 
    // to avoid sending a negative tag with a 5-star rating and vice versa.
    const isCurrentlyPositive = rating >= 4;
    const isNewPositive = newRating >= 4;
    let nextTags = selectedTags;
    
    if (rating !== 0 && isCurrentlyPositive !== isNewPositive) {
      nextTags = [];
      setSelectedTags([]);
    }
    
    onFormUpdate({ rating: newRating, comment, tags: nextTags });
  };

  const handleCommentChange = (newComment: string) => {
    setComment(newComment);
    onFormUpdate({ rating, comment: newComment, tags: selectedTags });
  };

  const toggleTag = (tag: string) => {
    let newTags = [...selectedTags];
    if (newTags.includes(tag)) {
      newTags = newTags.filter((t) => t !== tag);
    } else {
      newTags.push(tag);
    }
    setSelectedTags(newTags);
    onFormUpdate({ rating, comment, tags: newTags });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Đánh giá tài xế của bạn</Text>
      
      {/* 1. Rating Stars Section */}
      <View style={styles.ratingSection}>
        <RatingStars rating={rating} onRatingChange={handleRatingChange} size={44} />
      </View>

      {/* 2. Tags Section - Only show when rating is given */}
      {rating > 0 && (
        <View style={styles.tagsContainer}>
          <Text style={styles.label}>
            {rating >= 4 ? "Điều gì làm bạn hài lòng?" : "Tài xế cần cải thiện điều gì?"}
          </Text>
          <View style={styles.tagsWrapper}>
            {(rating >= 4 ? POSITIVE_TAGS : NEGATIVE_TAGS).map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  activeOpacity={0.7}
                  onPress={() => toggleTag(tag)}
                  style={[
                    styles.tagBadge,
                    isSelected && styles.tagBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      isSelected && styles.tagTextActive,
                    ]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* 3. Comment Section */}
      <View style={styles.commentSection}>
        <Text style={styles.label}>Nhận xét thêm</Text>
        <TextArea
          value={comment}
          onChangeText={handleCommentChange}
          placeholder="Hãy chia sẻ thêm về trải nghiệm của bạn..."
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  ratingSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  tagsContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  tagsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tagBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#F3F4F6", // Gray-100
    borderWidth: 1,
    borderColor: "#E5E7EB", // Gray-200
  },
  tagBadgeActive: {
    backgroundColor: "#EFF6FF", // Blue-50
    borderColor: "#3B82F6", // Blue-500
  },
  tagText: {
    fontSize: 14,
    color: "#4B5563", // Gray-600
  },
  tagTextActive: {
    color: "#2563EB", // Blue-600
    fontWeight: "600",
  },
  commentSection: {
    marginTop: 8,
  },
});
