/**
 * @file MobileNotificationBadge.tsx — Driver App
 * Giống hệt customer-app/MobileNotificationBadge.
 */

import React from "react";
import { View, Text, StyleSheet, type ViewStyle, type StyleProp } from "react-native";

const styles = StyleSheet.create({
  wrapper: { position: "relative" },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  badgeText: { color: "#ffffff", fontSize: 10, fontWeight: "700", lineHeight: 13 },
});

export interface MobileNotificationBadgeProps {
  count: number;
  children: React.ReactNode;
  max?: number;
  style?: StyleProp<ViewStyle>;
}

export function MobileNotificationBadge({ count, children, max = 99, style }: MobileNotificationBadgeProps): React.ReactElement {
  const displayCount = count > max ? `${max}+` : String(count);
  return (
    <View style={[styles.wrapper, style]}>
      {children}
      {count > 0 && (
        <View style={styles.badge} accessibilityLabel={`${count} thông báo chưa đọc`}>
          <Text style={styles.badgeText}>{displayCount}</Text>
        </View>
      )}
    </View>
  );
}
export default MobileNotificationBadge;
