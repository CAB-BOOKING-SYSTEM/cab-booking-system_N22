import React from "react";
import { View, TextInput, StyleSheet, Text, TextInputProps } from "react-native";

interface TextAreaProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
}

export function TextArea({
  value,
  onChangeText,
  placeholder = "Nhập đánh giá của bạn (tùy chọn)...",
  maxLength = 500,
  ...props
}: TextAreaProps) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        multiline
        numberOfLines={4}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        textAlignVertical="top"
        placeholderTextColor="#9CA3AF"
        {...props}
      />
      <View style={styles.footer}>
        <Text style={styles.characterCount}>
          {value.length} / {maxLength}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB", // Gray-200
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937", // Gray-800
    backgroundColor: "#F9FAFB", // Gray-50
    minHeight: 120, // Enough for multiple lines
  },
  footer: {
    alignItems: "flex-end",
    marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
    color: "#6B7280", // Gray-500
  },
});
